require('dotenv').config()
const minioClient = require('../minio-client')

describe('MinioClient', () => {
  it('fails to get client instance with an invalid connection port.', async done => {
    process.env.MINIO_PORT = 9203
    try {
      await minioClient.getInstance()
    } catch (err) {
      expect(err).not.toBe(null)
      expect(err.toString()).toMatch('connect ECONNREFUSED')
      done()
    }
  })
})
