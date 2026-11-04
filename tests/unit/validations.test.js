/**
 * Unit tests cho Joi validation middlewares (mock req/res/next, không cần DB).
 * Chạy: npm test (cần `npm run build` trước)
 */
const { test, describe } = require('node:test')
const assert = require('node:assert/strict')

const { userValidation } = require('../../build/src/validations/userValidation.js')

const mockRes = () => {
  const res = {}
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (data) => { res.body = data; return res }
  return res
}

const runMiddleware = (middleware, req) => new Promise((resolve) => {
  const res = mockRes()
  let nextArg = null
  middleware(req, res, (arg) => { nextArg = arg; resolve({ nextArg, res }) })
})

describe('userValidation.createNew (đăng ký)', () => {
  test('email + password hợp lệ -> next() không tham số', async () => {
    const { nextArg } = await runMiddleware(userValidation.createNew, {
      body: { email: 'user@example.com', password: 'Passw0rd!' }
    })
    assert.equal(nextArg, undefined)
  })

  test('password yếu -> next(ApiError) với status 422', async () => {
    const { nextArg } = await runMiddleware(userValidation.createNew, {
      body: { email: 'user@example.com', password: 'short' }
    })
    assert.ok(nextArg, 'phải gọi next với lỗi')
    assert.equal(nextArg.statusCode, 422)
  })

  test('email sai định dạng -> 422', async () => {
    const { nextArg } = await runMiddleware(userValidation.createNew, {
      body: { email: 'not-an-email', password: 'Passw0rd!' }
    })
    assert.equal(nextArg.statusCode, 422)
  })
})
