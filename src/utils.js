const fs = require('fs')
const uuidv1 = require('uuid/v1')

const tempDir = '/tmp'
const getTempPath = filename => `${tempDir}/${filename}.${uuidv1()}`

const removeFile = tmpFile => {
  fs.unlink(tmpFile, err => {
    if (err) {
      console.warn(`Error deleting file ${tmpFile}: `, err)
    }
  })
}

module.exports = {
  getTempPath,
  removeFile
}
