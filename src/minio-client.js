const Minio = require('minio')
const logger = require('@pubsweet/logger')

const { MINIO_UPLOADS_FOLDER_NAME, MINIO_BUCKET } = process.env

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const MinioClientClass = (() => {
  let minioClient
  let bucketCreationInProcess = false
  let bucketExists

  const initBucket = async minioClient => {
    let exists
    try {
      exists = await minioClient.bucketExists(MINIO_BUCKET)
    } catch (err) {
      logger.error('initBucket - bucketExists: ', err)
      return false
    }
    if (exists) {
      logger.debug('initBucket: bucket exists', MINIO_BUCKET)
      bucketExists = true
      return true
    }

    if (bucketCreationInProcess) {
      await sleep(10000)
    }

    if (!bucketExists) {
      bucketCreationInProcess = true
      try {
        await minioClient.makeBucket(MINIO_BUCKET, 'eu-west-2')
      } catch (err) {
        bucketCreationInProcess = false
        logger.error('initBucket - makeBucket: ', err)
        return false
      }
      bucketExists = true
      bucketCreationInProcess = false
      logger.info('initBucket: bucket created', MINIO_BUCKET)
    }

    return true
  }

  const getInstance = async () => {
    if (minioClient && bucketExists) {
      return minioClient
    }

    minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT,
      port: Number(process.env.MINIO_PORT),
      useSSL: process.env.MINIO_SECURITY === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    })

    await initBucket(minioClient)
    return minioClient
  }

  return {
    getInstance,
  }
})()

module.exports = {
  async uploadFile(filename, oriFilename, fileType, tempFilePath, callback) {
    const uploads = MINIO_UPLOADS_FOLDER_NAME
    const filePath = `${uploads}/${filename}`

    const metaData = {
      'content-type': fileType,
      'file-name': oriFilename,
    }

    const minioClient = await MinioClientClass.getInstance()
    minioClient.fPutObject(
      MINIO_BUCKET,
      filePath,
      tempFilePath,
      metaData,
      callback,
    )
  },

  async uploadFileSteam(filename, oriFilename, fileType, fileStream, callback) {
    const uploads = MINIO_UPLOADS_FOLDER_NAME
    const filePath = `${uploads}/${filename}`

    const metaData = {
      'content-type': fileType,
      'file-name': oriFilename,
    }

    const minioClient = await MinioClientClass.getInstance()
    minioClient.putObject(
      MINIO_BUCKET,
      filePath,
      fileStream,
      metaData,
      callback,
    )
  },

  async listFiles(callback) {
    const uploads = MINIO_UPLOADS_FOLDER_NAME
    const prefix = `${uploads}`

    const minioClient = await MinioClientClass.getInstance()
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

  async getFile(fileName, tmpFile, callback) {
    const uploads = MINIO_UPLOADS_FOLDER_NAME
    const objectName = `${uploads}/${fileName}`
    const minioClient = await MinioClientClass.getInstance()
    minioClient.fGetObject(MINIO_BUCKET, objectName, tmpFile, callback)
  },

  getFileStat(filename) {
    return new Promise(async (resolve, reject) => {
      const uploads = MINIO_UPLOADS_FOLDER_NAME
      const objectName = `${uploads}/${filename}`
      const minioClient = await MinioClientClass.getInstance()
      minioClient.statObject(MINIO_BUCKET, objectName, (err, stat) => {
        if (err) {
          return reject(err)
        }
        resolve(stat)
      })
    })
  },

  async deleteFile(fileName, callback) {
    const uploads = MINIO_UPLOADS_FOLDER_NAME
    const objectName = `${uploads}/${fileName}`
    const minioClient = await MinioClientClass.getInstance()
    minioClient.removeObject(MINIO_BUCKET, objectName, err => {
      callback(err)
    })
  },
}
