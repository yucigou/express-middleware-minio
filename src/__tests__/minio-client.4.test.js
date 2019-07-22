require('dotenv').config()

const Minio = require('minio')
const sinon = require('sinon')
var bluebird = require('bluebird')
const Promise = bluebird.Promise
const minioClient = require('../minio-client')

describe('MinioClient', () => {
  let makeBucket, bucketExists
  beforeEach(() => {
    makeBucket = sinon.stub(Minio.Client.prototype, 'makeBucket')
    bucketExists = sinon.stub(Minio.Client.prototype, 'bucketExists')
  })

  afterEach(() => {
    makeBucket.restore()
    bucketExists.restore()
  })

  it('should fail to get Minio client instance when being unable to create a bucket', async done => {
    makeBucket.returns(
      Promise.reject(new Error('Pretend to fail in making an S3 bucket'))
    )
    bucketExists.returns(Promise.resolve(false))
    await expect(minioClient.getInstance()).rejects.toThrow()
    done()
  })
})
