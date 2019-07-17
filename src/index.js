require('dotenv').config()
const formidable = require('formidable')
const uuidv1 = require('uuid/v1')
const config = require('config')
const { PassThrough } = require('stream')

const minioClient = require('./minio-client.js')
const utils = require('./utils')

const logger = (config && config.logger) || console

const Ops = Object.freeze({
  post: 1,
  list: 2,
  get: 3,
  getStream: 4,
  delete: 5,
  postStream: 6
})

const extractFileExtension = filename => {
  return filename.split('.').pop()
}

const validityCheck = (req, options) => {
  if (!options) {
    const error = 'Options not provided'
    req.minio = { error }
    return false
  }

  let supported = false
  Object.keys(Ops).forEach(key => {
    if (Ops[key] === options.op) {
      supported = true
    }
  })

  if (!supported) {
    const error = 'Operation not supported'
    req.minio = { error }
    return false
  }

  return true
}

const getFileMetaData = stat => {
  if (stat && stat.metaData) {
    return {
      filename: Buffer.from(stat.metaData['file-name'], 'base64').toString(
        'utf8'
      ),
      contentType: stat.metaData['content-type']
    }
  }
  return {}
}

const handlePost = (req, next, fields, files) => {
  let filename = uuidv1()
  if (files.file && files.file.name) {
    const extension = extractFileExtension(files.file.name)
    if (extension) {
      filename += `.${extension}`
    }
  }
  minioClient.uploadFile(
    filename,
    (files.file && files.file.name) || '',
    (files.file && files.file.type) || '',
    (files.file && files.file.path) || '',
    (error, etag) => {
      if (error) {
        req.minio = { error }
      } else {
        req.minio = { post: { filename: `${filename}`, etag } }
      }
      next()
    }
  )
}

const handlePostStream = async (req, next, files, fileStream) => {
  let filename = uuidv1()
  if (files.file && files.file.name) {
    const extension = extractFileExtension(files.file.name)
    if (extension) {
      filename += `.${extension}`
    }
  }
  try {
    const etag = await minioClient.uploadFileSteam(
      filename,
      (files.file && files.file.name) || '',
      (files.file && files.file.type) || '',
      fileStream
    )
    req.minio = { post: { filename: `${filename}`, etag } }
  } catch (error) {
    console.log('error: ', error)
    req.minio = { error }
  }
  next()
}

const handleList = (req, next) => {
  minioClient.listFiles((error, list) => {
    if (error) {
      req.minio = { error }
    } else {
      req.minio = { list }
    }
    next()
  })
}

const handleGet = async (req, next) => {
  let stat
  try {
    stat = await minioClient.getFileStat(req.params.filename)
  } catch (error) {
    req.minio = { error }
    next()
    return
  }

  const tmpFile = utils.getTempPath(req.params.filename)
  minioClient.getFile(req.params.filename, tmpFile, error => {
    if (error) {
      req.minio = { error }
    } else {
      let { filename, contentType } = getFileMetaData(stat)
      if (!filename) {
        filename = req.params.filename
      }
      req.minio = {
        get: {
          path: tmpFile,
          originalName: filename,
          contentType,
          contentLength: stat.size
        }
      }
    }
    next()
  })
}

const handleGetStream = async (req, next) => {
  let stat
  try {
    stat = await minioClient.getFileStat(req.params.filename)
  } catch (error) {
    logger.error('minio handleGetSteam error: ', error)
    req.minio = { error }
    next()
    return
  }

  minioClient.getFileStream(req.params.filename, (error, stream) => {
    if (error) {
      req.minio = { error }
    } else {
      let { filename, contentType } = getFileMetaData(stat)
      if (!filename) {
        filename = req.params.filename
      }
      req.minio = {
        get: {
          stream,
          originalName: filename,
          contentLength: stream.headers['content-length'],
          contentType
        }
      }
    }
    next()
  })
}

const handleDelete = async (req, next) => {
  if (!req.params.filename || req.params.filename === 'undefined') {
    req.minio = { error: 'File name not specified' }
    next()
    return
  }
  const error = await minioClient.deleteFile(req.params.filename)
  if (error) {
    req.minio = { error }
  } else {
    req.minio = { delete: 'Success' }
  }
  next()
}

const handleRequests = (req, next, options) => {
  if (!validityCheck(req, options)) {
    next()
    return
  }

  if (options.op === Ops.post) {
    const form = new formidable.IncomingForm()
    form.parse(req, (err, fields, files) => {
      if (err) {
        req.minio = { error: err }
        next()
      } else if (!files.file) {
        req.minio = { error: 'No file attached to post' }
        next()
      } else {
        handlePost(req, next, fields, files)
      }
    })
  } else if (options.op === Ops.postStream) {
    const form = new formidable.IncomingForm()
    const pass = new PassThrough()
    const files = { file: {} }
    form.onPart = part => {
      if (!part.filename) {
        form.handlePart(part)
        return
      }
      files.file.name = part.filename
      files.file.type = part.mime
      part.on('data', function (buffer) {
        pass.write(buffer)
      })
      part.on('end', function () {
        pass.end()
      })
    }
    form.parse(req, err => {
      if (err) {
        req.minio = { error: err }
        next()
      } else {
        handlePostStream(req, next, files, pass)
      }
    })
  } else if (options.op === Ops.list) {
    handleList(req, next)
  } else if (options.op === Ops.get) {
    handleGet(req, next)
  } else if (options.op === Ops.getStream) {
    handleGetStream(req, next)
  } else if (options.op === Ops.delete) {
    handleDelete(req, next)
  }
}

module.exports = {
  Ops,
  utils,
  minioClient,
  middleware () {
    return options => (req, res, next) => {
      handleRequests(req, next, options)
    }
  }
}
