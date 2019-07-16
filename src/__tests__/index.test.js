'use strict'

const request = require('supertest')
const express = require('express')
const config = require('config')
const fs = require('fs')

const expressMinio = require('../index')
const minioMiddleware = expressMinio.middleware()

const tempDir = (config && config.minioTmpDir) || '/tmp'
const tmpFilePath = `${tempDir}/my-express-middleware-minio-utils-test-file.txt`
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
          filenameInS3 = req.minio.post.filename
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
})
