require('dotenv').config()

const Minio = require('minio')
const sinon = require('sinon')
var bluebird = require('bluebird')
const Promise = bluebird.Promise
const minioClient = require('../minio-client')

describe('MinioClient', () => {
  let bucketExists, makeBucket
  beforeEach(() => {
    bucketExists = sinon.stub(Minio.Client.prototype, 'bucketExists')
    makeBucket = sinon.stub(Minio.Client.prototype, 'makeBucket')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should fail to get Minio client instance when being unable to create a bucket', async done => {
    bucketExists.returns(Promise.resolve(false))
    makeBucket.returns(
      Promise.reject(new Error('Pretend to fail in making an S3 bucket'))
    )
    await expect(minioClient.getInstance()).rejects.toThrow()
    done()
  })
})
