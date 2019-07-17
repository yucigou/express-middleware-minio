'use strict'

const request = require('supertest')
const express = require('express')
const config = require('config')
const fs = require('fs')

const expressMinio = require('../index')
const minioMiddleware = expressMinio.middleware()

const tempDir = (config && config.minioTmpDir) || '/tmp'
const tmpFilePath = `${tempDir}/my-express-middleware-minio-index-test-file.txt`
const tmpFilePath2 = `${tempDir}/my-express-middleware-minio-index-test-file2.txt`
const testData = 'Test data'

describe('MinioMiddleware', () => {
  it('Operations cannot be changed', () => {
    expect(expressMinio.Ops).not.toBe(null)
    expect(expressMinio.Ops.post).toBe(1)
    expect(() => {
      expressMinio.Ops.post = 100
    }).toThrowError()
    expect(expressMinio.Ops.post).toBe(1)
  })

  let filenameInS3
  it('posts a file', done => {
    fs.writeFileSync(tmpFilePath, testData)

    const app = express()
    app.post(
      '/api/upload',
      minioMiddleware({ op: expressMinio.Ops.post }),
      (req, res) => {
        if (req.minio.error) {
          res.status(400).json({ error: req.minio.error })
        } else {
          res.send(`${req.minio.post.filename}`)
        }
      }
    )

    request(app)
      .post('/api/upload')
      .attach('file', tmpFilePath)
      .expect(200, res => {
        fs.unlinkSync(tmpFilePath)
        done()
      })
  })

  it('returns error when posts a file which is not present', done => {
    const app = express()
    app.post(
      '/api/upload',
      minioMiddleware({ op: expressMinio.Ops.post }),
      (req, res) => {
        if (req.minio.error) {
          res.status(400).json({ error: req.minio.error })
        } else {
          res.send(`${req.minio.post.filename}`)
        }
      }
    )

    request(app)
      .post('/api/upload')
      .expect(400)
      .then(response => {
        expect(response.body).not.toBe(null)
        expect(response.body.error).toBe('No file attached to post')
        done()
      })
  })

  it('posts a file via stream', done => {
    fs.writeFileSync(tmpFilePath2, testData)

    const app = express()
    app.post(
      '/api/upload',
      minioMiddleware({ op: expressMinio.Ops.postStream }),
      (req, res) => {
        if (req.minio.error) {
          res.status(400).json({ error: req.minio.error })
        } else {
          filenameInS3 = req.minio.post.filename
          res.send(`${req.minio.post.filename}`)
        }
      }
    )

    request(app)
      .post('/api/upload')
      .attach('file', tmpFilePath2)
      .expect(200, res => {
        fs.unlinkSync(tmpFilePath2)
        done()
      })
  })

  it('shows correct metadata.', async done => {
    const app = express()
    app.get(
      '/api/files/:filename',
      minioMiddleware({ op: expressMinio.Ops.get }),
      async (req, res) => {
        if (req.minio.error) {
          res.status(400).json({ error: req.minio.error })
          return
        }

        res.send(req.minio.get)
      }
    )
    request(app)
      .get(`/api/files/${filenameInS3}`)
      .expect(200)
      .then(response => {
        expect(response.body).not.toBe(null)
        expect(response.body.contentLength).toBe(testData.length)
        expect(response.body.contentType).toBe('text/plain')
        done()
      })
  })

  it('lists files', done => {
    const app = express()
    app.get(
      '/api/files',
      minioMiddleware({ op: expressMinio.Ops.list }),
      (req, res) => {
        if (req.minio.error) {
          res.status(400).json({ error: req.minio.error })
        } else {
          res.send(req.minio.list)
        }
      }
    )
    request(app)
      .get('/api/files')
      .expect(200)
      .then(response => {
        expect(response.body).not.toBe(null)
        expect(response.body[0]).not.toBe(null)
        expect(response.body[0].size).toBe(9)
        done()
      })
  })

  it('returns error if a file to get does not exist', done => {
    const app = express()
    app.get(
      '/api/files/:filename',
      minioMiddleware({ op: expressMinio.Ops.get }),
      async (req, res) => {
        if (req.minio.error) {
          res.status(400).json({ error: req.minio.error })
          return
        }

        req.minio.get.contentLength &&
          res.set('Content-Length', req.minio.get.contentLength)

        res.download(req.minio.get.path)
      }
    )
    request(app)
      .get(`/api/files/non-existant-file`)
      .expect(400)
      .then(response => {
        expect(response.body).not.toBe(null)
        expect(response.body.error).not.toBe(null)
        expect(response.body.error.code).toBe('NotFound')
        done()
      })
  })

  it('returns error if a file to get as stream does not exist', done => {
    const app = express()
    app.get(
      '/api/files/:filename',
      minioMiddleware({ op: expressMinio.Ops.getStream }),
      async (req, res) => {
        if (req.minio.error) {
          res.status(400).json({ error: req.minio.error })
          return
        }

        req.minio.get.contentLength &&
          res.set('Content-Length', req.minio.get.contentLength)

        res.download(req.minio.get.path)
      }
    )
    request(app)
      .get(`/api/files/non-existant-file`)
      .expect(400)
      .then(response => {
        expect(response.body).not.toBe(null)
        expect(response.body.error).not.toBe(null)
        expect(response.body.error.code).toBe('NotFound')
        done()
      })
  })

  it('gets a file', done => {
    const app = express()
    app.get(
      '/api/files/:filename',
      minioMiddleware({ op: expressMinio.Ops.get }),
      async (req, res) => {
        if (req.minio.error) {
          res.status(400).json({ error: req.minio.error })
          return
        }

        req.minio.get.contentLength &&
          res.set('Content-Length', req.minio.get.contentLength)

        res.download(req.minio.get.path)
      }
    )
    request(app)
      .get(`/api/files/${filenameInS3}`)
      .expect(200)
      .then(response => {
        expect(response.body).not.toBe(null)
        expect(response.body.toString()).toBe(testData)
        done()
      })
  })

  it('gets a file as stream', done => {
    const app = express()
    app.get(
      '/api/files/:filename',
      minioMiddleware({ op: expressMinio.Ops.getStream }),
      async (req, res) => {
        if (req.minio.error) {
          res.status(400).json({ error: req.minio.error })
          return
        }

        req.minio.get.contentLength &&
          res.set('Content-Length', req.minio.get.contentLength)

        req.minio.get.stream.pipe(res)
      }
    )
    request(app)
      .get(`/api/files/${filenameInS3}`)
      .expect(200, done)
  })

  it('deletes a file', done => {
    const app = express()
    app.delete(
      '/api/files/:filename',
      minioMiddleware({ op: expressMinio.Ops.delete }),
      (req, res) => {
        if (req.minio.error) {
          res.status(400).json({ error: req.minio.error })
        } else {
          res.send(req.minio.delete)
        }
      }
    )
    request(app)
      .delete(`/api/files/${filenameInS3}`)
      .expect(200, done)
  })

  it('returns error when no operation is specified', done => {
    const app = express()
    app.get('/api/files', minioMiddleware(), (req, res) => {
      if (req.minio.error) {
        res.status(500).json({ error: req.minio.error })
      } else {
        res.send(req.minio.list)
      }
    })
    request(app)
      .get('/api/files')
      .expect(500, done)
  })

  it('returns error when the operation is not supported', done => {
    const app = express()
    app.get('/api/files', minioMiddleware({ op: 10 }), (req, res) => {
      if (req.minio.error) {
        res.status(500).json({ error: req.minio.error })
      } else {
        res.send(req.minio.list)
      }
    })
    request(app)
      .get('/api/files')
      .expect(500, done)
  })
})

afterAll(async done => {
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
})
