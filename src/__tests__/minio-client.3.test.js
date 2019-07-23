require('dotenv').config()

const uuidv1 = require('uuid/v1')
process.env.MINIO_BUCKET = uuidv1()

const { removeBucket } = require('./test-helper')

let minioClient
beforeAll(() => {
  minioClient = require('../minio-client')
})

afterAll(() => {
  removeBucket(() => {})
})

describe('MinioClient', () => {
  it('can get inner client instance, which creates a bucket', async done => {
    const instance = await minioClient.getInstance()
    expect(instance).not.toBe(null)
    let exists = await instance.bucketExists(process.env.MINIO_BUCKET)
    expect(exists).toBe(true)
    done()
  })
})
