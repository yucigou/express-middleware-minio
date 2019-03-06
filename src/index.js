require('dotenv').config()
const formidable = require('formidable')
const uuidv1 = require('uuid/v1')
const config = require('config')

const minioClient = require('./minio-client.js')
const utils = require('./utils')

const logger = (config && config.logger) || console

const Ops = Object.freeze({ post: 1, list: 2, get: 3, getStream: 4, delete: 5 })

const extractFileExtension = filename => {
  if (filename) {
    return filename.split('.').pop()
  }

  return ''
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
    logger.error('minio handleGet error: ', error)
    req.minio = { error }
    next()
    return
  }

  const tmpFile = utils.getTempPath(req.params.filename)
  minioClient.getFile(req.params.filename, tmpFile, error => {
    if (error) {
      req.minio = { error }
    } else {
      let fielname = req.params.filename
      if (stat.metaData && stat.metaData['file-name']) {
        fielname = stat.metaData['file-name']
      }
      req.minio = {
        get: {
          path: tmpFile,
          originalName: fielname
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
      let fielname = req.params.filename
      if (stat.metaData && stat.metaData['file-name']) {
        fielname = stat.metaData['file-name']
      }
      req.minio = {
        get: {
          stream,
          originalName: fielname
        }
      }
    }
    next()
  })
}

const handleDelete = (req, next) => {
  minioClient.deleteFile(req.params.filename, error => {
    if (error) {
      req.minio = { error }
    } else {
      req.minio = { delete: 'Success' }
    }
    next()
  })
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
      } else {
        handlePost(req, next, fields, files)
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
