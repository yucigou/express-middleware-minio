require('dotenv').config()
const fs = require('fs')
const config = require('config')
const minioClient = require('../minio-client')

const tempDir = (config && config.minioTmpDir) || '/tmp'

describe('MinioClient', () => {
  const newFileName = 'new-file-name'
  const tmpFilePath = `${tempDir}/my-express-middleware-minio-utils-test-file.txt`

  it('ensures a given bucket is created', done => {
    expect.hasAssertions()
    minioClient.listFiles((err, list) => {
      expect(err).toBe(null)
      done()
    })
  })

  it('uploads a file', done => {
    expect.hasAssertions()

    fs.writeFileSync(tmpFilePath, 'Test data')
    minioClient.uploadFile(
      newFileName,
      'original-file-name',
      'text/plain',
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
})
