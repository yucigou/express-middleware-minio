const fs = require('fs')
const uuidv1 = require('uuid/v1')
const config = require('config')

const logger = (config && config.logger) || console
const tempDir = (config && config.minioTmpDir) || '/tmp'

const getTempPath = filename => `${tempDir}/${filename}.${uuidv1()}`

const removeFile = tmpFile => {
  const regex = new RegExp(`^${tempDir}/`)
  if (!tmpFile || !tmpFile.match(regex)) {
    const errMsg = `Invalid file: ${tmpFile}`
    logger.warn(errMsg)
    throw new Error(errMsg)
  }

  fs.unlink(tmpFile, err => {
    if (err) {
      logger.warn(`Error deleting file ${tmpFile}: `, err)
    }
  })
}

module.exports = {
  getTempPath,
  removeFile
}
