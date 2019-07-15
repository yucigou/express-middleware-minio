'use strict'

const minioMiddleware = require('../index')

describe('MinioMiddleware', () => {
  it('Operations cannot be changed', () => {
    expect(minioMiddleware.Ops).not.toBe(null)
    expect(minioMiddleware.Ops.post).toBe(1)
    expect(() => {
      minioMiddleware.Ops.post = 100
    }).toThrowError()
    expect(minioMiddleware.Ops.post).toBe(1)
  })
})
