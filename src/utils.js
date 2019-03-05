const fs = require('fs')
const uuidv1 = require('uuid/v1')
const config = require('config')

const logger = (config && config.logger) || console

const tempDir = '/tmp'
const getTempPath = filename => `${tempDir}/${filename}.${uuidv1()}`

const removeFile = tmpFile => {
  const regex = new RegExp(`^${tempDir}/`)
  if (!tmpFile || !tmpFile.match(regex)) {
    logger.error('Invalid file: ', tmpFile)
    return
  }

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
