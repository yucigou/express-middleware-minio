require('dotenv').config()
const fs = require('fs')
const config = require('config')
const minioClient = require('../minio-client')

const tempDir = (config && config.minioTmpDir) || '/tmp'

describe('MinioClient', () => {
  it('ensures a given bucket is created', done => {
    expect.hasAssertions()
    minioClient.listFiles((err, list) => {
      expect(err).toBe(null)
      done()
    })
  })

  it('uploads a file', done => {
    expect.hasAssertions()
    const filepath = `${tempDir}/my-express-middleware-minio-utils-test-file.txt`
    fs.writeFileSync(filepath, 'Test data')
    minioClient.uploadFile(
      'new-file-name',
      'original-file-name',
      'text/plain',
      filepath,
      (err, etag) => {
        expect(err).toBe(null)
        done()
      }
    )
  })
})
