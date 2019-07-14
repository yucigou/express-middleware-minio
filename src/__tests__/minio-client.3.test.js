require('dotenv').config()
const minioClient = require('../minio-client')

const { MINIO_BUCKET } = process.env

describe('MinioClient', () => {
  it('can get inner client instance, which creates a bucket', async done => {
    const instance = await minioClient.getInstance()
    expect(instance).not.toBe(null)
    let exists = await instance.bucketExists(MINIO_BUCKET)
    expect(exists).toBe(true)
    done()
  })
})
