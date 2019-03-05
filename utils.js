const fs = require('fs')
const uuidv1 = require('uuid/v1')

const temp_dir = '/tmp'
const getTempPath = filename => `${temp_dir}/${filename}.${uuidv1()}`

const removeFile = tmpFile => {
  fs.unlink(tmpFile, err => {
    if (err) {
      console.warn(`Error deleting file ${tmpFile}: `, err)
    }
  })
}

module.exports = {
  getTempPath,
  removeFile,
}
