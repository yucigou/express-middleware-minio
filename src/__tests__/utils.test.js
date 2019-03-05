const fs = require('fs')
const utils = require('../utils')

describe('Utils', () => {
  it('should return a file with dot UUID as its suffix from the /tmp directory', () => {
    const filename = 'my-file.pdf'
    const filepath = utils.getTempPath(filename)
    const regex = new RegExp(`^/tmp/${filename}.[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, 'i')
    expect(filepath).toMatch(regex)
  })

  it('should remove a given file in the /tmp directory', () => {
    const filepath = '/tmp/my-express-middleware-minio-utils-test-file.txt'

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
})
