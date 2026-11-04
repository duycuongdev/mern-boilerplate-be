/**
 * Integration smoke test - chạyagainst server tự spawn.
 * Mở rộng: thêm các suite mới vào tests/integration/ theo mẫu này
 * (xem tests/integration/helpers.js - có sẵn startServer/api/signToken/getDb)
 * Chạy: npm run build && npm run test:e2e
 */
const { test, describe, before, after } = require('node:test')
const { BASE, hasDbConfig, startServer, stopServer, api } = require('./helpers.js')

const d = hasDbConfig ? describe : describe.skip
d('API smoke', () => {
  before(async () => { await startServer() })
  after(() => { stopServer() })

  test('GET /v1/health -> 200, db up', async () => {
    const res = await api('GET', '/health')
    assertEquals(res.status, 200, 'health')
    assertEquals(res.data.db, 'up', 'db status')
  })

  test('GET /v1/status -> 200', async () => {
    const res = await api('GET', '/status')
    assertEquals(res.status, 200, 'status')
  })

  test('GET /v1/users/me chưa đăng nhập -> 401', async () => {
    const res = await api('GET', '/users/me')
    assertEquals(res.status, 401, 'me without token')
  })
})

function assertEquals(actual, expected, label) {
  if (actual !== expected) throw new Error(`FAILED: ${label} - expected ${expected}, got ${actual}`)
}
