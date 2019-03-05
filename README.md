# Introduction

This Minio middleware is written for Node.js Express apps to use Minio to store files.

Files can be uploaded to a predefined folder in a predefined bucket in a Minio sever. Once a file has been uploaded successfully, you will be informed of the filename known to Minio for this file. Later on, you can use this filename to download or delete the file.

The Minio middleware also allows you to list all files stored inside the predefined folder in the predefined bucket in Minio.

# How to use the package?

## First of all, install the package:

```shell
npm i express-middleware-minio
```
Or
```shell
yarn add express-middleware-minio
```

## Second, you need to add .env to get it up running, e.g.:

```shell
MINIO_ACCESS_KEY=xxx
MINIO_SECRET_KEY=xxx
MINIO_ENDPOINT='192.111.111.131'
MINIO_PORT=9000
MINIO_SECURITY=false
MINIO_BUCKET=manuscripts
MINIO_UPLOADS_FOLDER_NAME=uploads
```

## Then you can use the Minio middleware in your Express application:
Four operations are provided:
* post
* get
* delete
* list

You can use them the following way:
```javascript
const expressMinio = require('express-middleware-minio')
console.log(expressMinio.Ops.post)
```

You can find below an example.

```javascript
const expressMinio = require('express-middleware-minio')
const minioMiddleware = expressMinio.middleware();

app.post('/api/files', minioMiddleware({op: expressMinio.Ops.post}), (req, res) => {
  if (req.minio.error) {
    res.status(400).json({ error: req.minio.error })
  } else {
    res.send({ filename: req.minio.post.filename })
  }
})

app.get('/api/files',
  minioMiddleware({op: expressMinio.Ops.list}),
  (req, res) => {
    if (req.minio.error) {
      res.status(400).json({ error: req.minio.error })
    } else {
      res.send(req.minio.list)
    }
  }
)

app.get('/api/files/:filename',
  minioMiddleware({op: expressMinio.Ops.get}),
  (req, res) => {
    if (req.minio.error) {
      res.status(400).json({ error: req.minio.error })
      return
    }
    res.download(req.minio.get.path, req.minio.get.originalName, err => {
      if (err) {
        console.warn('Download failed: ', err)
      }
      expressMinio.utils.removeFile(req.minio.get.path)
    })
  }
)

app.delete('/api/files/:filename',
  minioMiddleware({op: expressMinio.Ops.delete}),
  (req, res) => {
    if (req.minio.error) {
      res.status(400).json({ error: req.minio.error })
    } else {
      res.send(req.minio.delete)
    }
  }
)
```
