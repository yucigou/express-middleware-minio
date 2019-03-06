const fs = require('fs')
const utils = require('../utils')
const config = require('config')

const tempDir = (config && config.minioTmpDir) || '/tmp'

describe('Utils', () => {
  it('should return a file with dot UUID as its suffix from the tempDir directory', () => {
    const filename = 'my-file.pdf'
    const filepath = utils.getTempPath(filename)
    const regex = new RegExp(`^${tempDir}/${filename}.[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, 'i')
    expect(filepath).toMatch(regex)
  })

  it('should remove a given file in the tempDir directory', () => {
    const filepath = `${tempDir}/my-express-middleware-minio-utils-test-file.txt`

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath)
    }
    fs.writeFileSync(filepath, 'Test data')
    if (!fs.existsSync(filepath)) {
      throw new Error('Test failed.')
    }

    utils.removeFile(filepath)

    setTimeout(() => {
      const exists = fs.existsSync(filepath)
      expect(exists).toBe(false)
    }, 1000)
  })

  it('should throw error if the given file is not in the tempDir directory', () => {
    const filepath = `${tempDir}__/my-express-middleware-minio-utils-test-file.txt`
    expect(() => utils.removeFile(filepath)).toThrowError(/Invalid file/)
  })

  it('should not throw error if the given file is in the tempDir directory', (done) => {
    const filepath = `${tempDir}/my-express-middleware-minio-utils-test-file.txt`
    expect(() => utils.removeFile(filepath)).not.toThrowError(/Invalid file/)
    setTimeout(() => {
      done()
    }, 1000)
  })
})
