const Minio = require('minio')
const config = require('config')

const logger = (config && config.logger) || console
const { MINIO_UPLOADS_FOLDER_NAME, MINIO_BUCKET } = process.env
console.log('bucket:: ', MINIO_BUCKET)
let minioClient

const initBucket = async minioClient => {
  logger.info('Initialzing S3 bucket: ', MINIO_BUCKET)

  let exists
  try {
    exists = await minioClient.bucketExists(MINIO_BUCKET)
  } catch (err) {
    const errMsg = `initBucket - bucketExists: ${err}`
    logger.error(errMsg)
    throw new Error(errMsg)
  }

  if (exists) {
    logger.info('initBucket: bucket exists', MINIO_BUCKET)
  } else {
    try {
      await minioClient.makeBucket(
        MINIO_BUCKET,
        process.env.MINIO_REGION || 'eu-west-2'
      )
      console.log('Bucket creatd')
    } catch (err) {
      const errMsg = `initBucket - makeBucket: ${err}`
      logger.error(errMsg)
      throw new Error(errMsg)
    }
    logger.info('initBucket: bucket created', MINIO_BUCKET)
  }

  return true
}

const getInstance = async () => {
  if (minioClient) {
    return minioClient
  }
  minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: Number(process.env.MINIO_PORT),
    useSSL: process.env.MINIO_SECURITY === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    region: process.env.MINIO_REGION || 'eu-west-2'
  })

  await initBucket(minioClient)
  return minioClient
}

module.exports = {
  getInstance,
  async uploadFile (filename, oriFilename, fileType, tempFilePath, callback) {
    const uploads = MINIO_UPLOADS_FOLDER_NAME
    const filePath = `${uploads}/${filename}`
    const encodedOriFileName = Buffer.from(oriFilename).toString('base64')

    const metaData = {
      'content-type': fileType,
      'file-name': encodedOriFileName
    }

    const minioClient = await getInstance()
    minioClient.fPutObject(
      MINIO_BUCKET,
      filePath,
      tempFilePath,
      metaData,
      callback
    )
  },

  async uploadFileSteam (filename, oriFilename, fileType, fileStream) {
    const uploads = MINIO_UPLOADS_FOLDER_NAME
    const filePath = `${uploads}/${filename}`
    const encodedOriFileName = Buffer.from(oriFilename).toString('base64')

    const metaData = {
      'content-type': fileType,
      'file-name': encodedOriFileName
    }

    const minioClient = await getInstance()
    return minioClient.putObject(MINIO_BUCKET, filePath, fileStream, metaData)
  },

  async listFiles (callback) {
    const uploads = MINIO_UPLOADS_FOLDER_NAME
    const prefix = `${uploads}`

    const minioClient = await getInstance()
    const stream = minioClient.listObjects(MINIO_BUCKET, prefix, true)
    const list = []
    stream.on('data', obj => {
      list.push(obj)
    })
    stream.on('error', err => {
      callback(err)
    })
    stream.on('end', () => {
      callback(null, list)
    })
  },

  async getFile (fileName, tmpFile, callback) {
    const uploads = MINIO_UPLOADS_FOLDER_NAME
    const objectName = `${uploads}/${fileName}`
    const minioClient = await getInstance()
    minioClient.fGetObject(MINIO_BUCKET, objectName, tmpFile, callback)
  },

  async getFileStream (fileName, callback) {
    const uploads = MINIO_UPLOADS_FOLDER_NAME
    const objectName = `${uploads}/${fileName}`
    const minioClient = await getInstance()
    minioClient.getObject(MINIO_BUCKET, objectName, callback)
  },

  async getFileStat (filename) {
    const minioClient = await getInstance()
    return new Promise((resolve, reject) => {
      const uploads = MINIO_UPLOADS_FOLDER_NAME
      const objectName = `${uploads}/${filename}`
      minioClient.statObject(MINIO_BUCKET, objectName, (err, stat) => {
        if (err) {
          return reject(err)
        }
        resolve(stat)
      })
    })
  },

  async deleteFile (fileName) {
    const uploads = MINIO_UPLOADS_FOLDER_NAME
    const objectName = `${uploads}/${fileName}`
    const minioClient = await getInstance()
    try {
      await minioClient.removeObject(MINIO_BUCKET, objectName)
    } catch (err) {
      return err
    }
    return null
  }
}
