const expressMinio = require('../index')

const clearBucket = async done => {
  const filePrefixRegex = new RegExp(
    '^' + process.env.MINIO_UPLOADS_FOLDER_NAME + '/'
  )
  expressMinio.minioClient.listFiles(async (err, list) => {
    if (err) {
      console.error(err)
      return
    }

    const promises = list.map(file =>
      expressMinio.minioClient.deleteFile(
        file.name.replace(filePrefixRegex, '')
      )
    )
    await Promise.all(promises)

    done()
  })
}

const removeBucket = done => {
  clearBucket(async () => {
    const coreClient = await expressMinio.minioClient.getInstance()
    coreClient.removeBucket(process.env.MINIO_BUCKET, err => {
      if (err) {
        console.error('Error message: ', err)
      }
      done()
    })
  })
}

module.exports = {
  clearBucket,
  removeBucket
}
