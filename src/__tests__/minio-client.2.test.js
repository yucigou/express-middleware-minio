require('dotenv').config()

const uuidv1 = require('uuid/v1')
process.env.MINIO_BUCKET = uuidv1()

const fs = require('fs')
const config = require('config')
const Minio = require('minio')
const sinon = require('sinon')
const Promise = require('bluebird').Promise

const tempDir = (config && config.minioTmpDir) || '/tmp'
const { MINIO_UPLOADS_FOLDER_NAME } = process.env
const { removeBucket } = require('./test-helper')

let minioClient
beforeAll(() => {
  minioClient = require('../minio-client')
})

afterAll(() => {
  removeBucket(() => {})
})

describe('MinioClient', () => {
  const originalFileName = 'original-file-name'
  const newFileName = 'new-file-name'
  const tmpFilePath = `${tempDir}/my-express-middleware-minio-utils-test-file.txt`
  const fileType = 'text/plain'
  const testData = 'Test data'

  afterEach(() => {
    sinon.restore()
  })

  it('ensures a given bucket is created', done => {
    expect.hasAssertions()
    minioClient.listFiles((err, list) => {
      expect(err).toBe(null)
      done()
    })
  })

  it('uploads a file', done => {
    expect.hasAssertions()

    fs.writeFileSync(tmpFilePath, testData)
    minioClient.uploadFile(
      newFileName,
      originalFileName,
      fileType,
      tmpFilePath,
      (err, etag) => {
        expect(err).toBe(null)
        fs.unlinkSync(tmpFilePath)
        done()
      }
    )
  })

  it('downloads a file', done => {
    minioClient.getFile(newFileName, tmpFilePath, err => {
      expect(err).toBe(null)
      expect(fs.existsSync(tmpFilePath)).toBe(true)
      fs.unlinkSync(tmpFilePath)
      done()
    })
  })

  it('lists files with certain prefix in the S3 bucket', done => {
    expect.hasAssertions()
    minioClient.listFiles((err, list) => {
      expect(err).toBe(null)
      expect(list).not.toBe(null)
      const fileFound = list.filter(
        file => file.name === `${MINIO_UPLOADS_FOLDER_NAME}/${newFileName}`
      )
      expect(fileFound).not.toBe(null)
      expect(fileFound.length).toBe(1)
      done()
    })
  })

  it('downloads a file as a stream', done => {
    let size = 0
    minioClient.getFileStream(newFileName, (err, dataStream) => {
      expect(err).toBe(null)
      dataStream.on('data', chunk => {
        size += chunk.length
      })
      dataStream.on('end', () => {
        console.log('End. Total size = ' + size)
        expect(size).toBe(testData.length)
        done()
      })
      dataStream.on('error', err => {
        expect(err).toBe(null)
      })
    })
  })

  it('uploads a file from a stream', async () => {
    fs.writeFileSync(tmpFilePath, testData)
    const fileStream = fs.createReadStream(tmpFilePath)
    const ret = await minioClient.uploadFileSteam(
      newFileName,
      originalFileName,
      fileType,
      fileStream
    )
    expect(ret).not.toBe(null)
  })

  it('gets the stats of a file', async () => {
    const stats = await minioClient.getFileStat(newFileName)
    expect(stats).not.toBe(null)
    expect(stats.metaData['content-type']).toBe(fileType)
  })

  it('rejects promise when getting the stats of a non-existing file', async done => {
    try {
      await minioClient.getFileStat('there-is-no-such-a-file')
    } catch (err) {
      expect(err).not.toBe(null)
      done()
    }
  })

  it('delets a file', async () => {
    const error = await minioClient.deleteFile(newFileName)
    expect(error).toBe(null)
  })

  it('returns error when throwing an exception for deleting a file', async () => {
    const removeObject = await sinon.stub(
      Minio.Client.prototype,
      'removeObject'
    )
    await removeObject.returns(
      Promise.reject(new Error('Error deleting a file'))
    )
    const error = await minioClient.deleteFile(newFileName)
    expect(error).not.toBe(null)
  })
})
