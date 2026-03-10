// ─────────────────────────────────────────────
// SpaceNode — Test Suite: Context (createRequest, parseBody)
// ─────────────────────────────────────────────

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequest, parseBody, setBodyParser } from '../lib/context.js'
import { Readable } from 'node:stream'

// Helper: mock IncomingMessage (readable stream with headers)
function mockReq({ method = 'GET', url = '/test', headers = {}, body = null } = {}) {
  const readable = new Readable({
    read() {
      if (body !== null) {
        this.push(Buffer.isBuffer(body) ? body : Buffer.from(body))
      }
      this.push(null)
    }
  })
  readable.method = method
  readable.url = url
  readable.headers = { host: 'localhost', ...headers }
  readable.socket = { remoteAddress: '127.0.0.1' }
  return readable
}

// Helper: mock ServerResponse
function mockRes() {
  const res = {
    _headers: {},
    _headersWritten: false,
    _body: null,
    _status: null,
    _ended: false,
    setHeader(k, v) { res._headers[k] = v },
    getHeader(k) { return res._headers[k] },
    writeHead(status, headers) {
      res._status = status
      res._headersWritten = true
      if (headers) Object.assign(res._headers, headers)
    },
    end(data) { res._body = data; res._ended = true },
  }
  return res
}

describe('Context — createRequest', () => {
  it('should create request object with core properties', () => {
    const req = mockReq({ method: 'POST', url: '/api/test?foo=bar' })
    const res = mockRes()
    const request = createRequest(req, res, { params: { id: '1' } })

    assert.strictEqual(request.method, 'POST')
    assert.strictEqual(request.path, '/api/test')
    assert.deepStrictEqual(request.params, { id: '1' })
    assert.strictEqual(request.query.foo, 'bar')
    assert.strictEqual(request.ip, '127.0.0.1')
    assert.strictEqual(request._sent, false)
  })

  it('should parse cookies from header', () => {
    const req = mockReq({ headers: { cookie: 'session=abc123; lang=en' } })
    const res = mockRes()
    const request = createRequest(req, res)

    assert.strictEqual(request.cookies.session, 'abc123')
    assert.strictEqual(request.cookies.lang, 'en')
  })

  it('should skip dangerous cookie keys (__proto__)', () => {
    const req = mockReq({ headers: { cookie: '__proto__=evil; ok=fine' } })
    const res = mockRes()
    const request = createRequest(req, res)

    assert.strictEqual(Object.prototype.hasOwnProperty.call(request.cookies, '__proto__'), false)
    assert.strictEqual(request.cookies.ok, 'fine')
  })

  it('should use x-forwarded-for for IP when trustProxy is enabled', () => {
    const req = mockReq({ headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } })
    const res = mockRes()
    const request = createRequest(req, res, { app: { config: { trustProxy: true } } })

    assert.strictEqual(request.ip, '10.0.0.1')
  })

  it('should ignore x-forwarded-for when trustProxy is off', () => {
    const req = mockReq({ headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } })
    const res = mockRes()
    const request = createRequest(req, res)

    assert.strictEqual(request.ip, '127.0.0.1')
  })

  describe('send()', () => {
    it('should send JSON by default', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      request.send({ hello: 'world' })

      assert.strictEqual(request._sent, true)
      assert.strictEqual(res._status, 200)
    })

    it('should send with custom status code', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      request.send(201, { id: 1 })

      assert.strictEqual(res._status, 201)
    })

    it('should send 204 with no body', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      request.send(204)

      assert.strictEqual(res._status, 204)
    })

    it('should not send twice', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      request.send({ first: true })
      request.send({ second: true })

      // First response should win
      assert.strictEqual(res._status, 200)
    })
  })

  describe('check()', () => {
    it('should pass for truthy condition', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      assert.strictEqual(request.check(true), true)
    })

    it('should throw for falsy condition', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      assert.throws(() => request.check(false, 404, 'Not found'), { status: 404 })
    })
  })

  describe('guard()', () => {
    it('should pass for falsy condition', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      request.guard(false) // should not throw
    })

    it('should throw for truthy condition', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      assert.throws(() => request.guard(true, 409, 'Conflict'), { status: 409 })
    })
  })

  describe('error()', () => {
    it('should throw HttpError', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      assert.throws(() => request.error(503, 'Down'), { status: 503 })
    })
  })

  describe('redirect()', () => {
    it('should set Location header and 302', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      request.redirect('/login')

      assert.strictEqual(res._status, 302)
      assert.strictEqual(res._headers.Location, '/login')
      assert.strictEqual(request._sent, true)
    })
  })

  describe('setHeader()', () => {
    it('should set response header', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      const ret = request.setHeader('X-Custom', 'value')

      assert.strictEqual(res._headers['X-Custom'], 'value')
      assert.strictEqual(ret, request) // chainable
    })
  })

  describe('cookie()', () => {
    it('should set Set-Cookie header', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      request.cookie('token', 'abc', { maxAge: 3600, secure: true })

      const cookies = res._headers['Set-Cookie']
      assert.ok(Array.isArray(cookies))
      assert.ok(cookies[0].includes('token=abc'))
      assert.ok(cookies[0].includes('Max-Age=3600'))
      assert.ok(cookies[0].includes('Secure'))
    })
  })

  describe('flash()', () => {
    it('should set flash messages in cookie', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      request.flash('success', 'Done!')

      const cookies = res._headers['Set-Cookie']
      assert.ok(Array.isArray(cookies))
      assert.ok(cookies.some(c => c.includes('_flash=')))
    })

    it('should accumulate multiple flash messages of same type', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      request.flash('error', 'Error 1')
      request.flash('error', 'Error 2')

      assert.deepStrictEqual(request._flashOut.error, ['Error 1', 'Error 2'])
    })

    it('should parse incoming flash cookie and clear it', () => {
      const flashData = { success: ['Logged in!'] }
      const encoded = Buffer.from(JSON.stringify(flashData)).toString('base64')
      const req = mockReq({ headers: { cookie: `_flash=${encoded}` } })
      const res = mockRes()
      const request = createRequest(req, res)

      assert.deepStrictEqual(request.flashes, { success: ['Logged in!'] })
      // Should have set a clearing cookie
      const cookies = res._headers['Set-Cookie']
      assert.ok(cookies.some(c => c.includes('_flash=') && c.includes('Max-Age=0')))
    })

    it('should have empty flashes when no flash cookie', () => {
      const req = mockReq()
      const res = mockRes()
      const request = createRequest(req, res)
      assert.deepStrictEqual(request.flashes, {})
    })
  })
})

describe('Context — parseBody', () => {
  it('should return null body for GET requests', async () => {
    const req = mockReq({ method: 'GET' })
    const result = await parseBody(req)
    assert.strictEqual(result.body, null)
    assert.strictEqual(result.files, null)
  })

  it('should parse JSON body', async () => {
    const body = JSON.stringify({ name: 'test', age: 25 })
    const req = mockReq({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    })
    const result = await parseBody(req)
    assert.deepStrictEqual(result.body, { name: 'test', age: 25 })
  })

  it('should reject invalid JSON body', async () => {
    const req = mockReq({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid json}',
    })
    await assert.rejects(parseBody(req), { status: 400 })
  })

  it('should parse URL-encoded body', async () => {
    const req = mockReq({
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'name=test&age=25',
    })
    const result = await parseBody(req)
    assert.strictEqual(result.body.name, 'test')
    assert.strictEqual(result.body.age, '25')
  })

  it('should reject body exceeding size limit', async () => {
    const bigBody = 'x'.repeat(2 * 1024 * 1024) // 2MB
    const req = mockReq({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: bigBody,
    })
    await assert.rejects(parseBody(req, { bodyLimit: 1024 * 1024 }), { status: 413 })
  })

  it('should handle multipart form data', async () => {
    const boundary = '----TestBoundary123'
    const body = [
      `------TestBoundary123`,
      `Content-Disposition: form-data; name="field1"`,
      ``,
      `value1`,
      `------TestBoundary123`,
      `Content-Disposition: form-data; name="file"; filename="test.txt"`,
      `Content-Type: text/plain`,
      ``,
      `file contents here`,
      `------TestBoundary123--`,
    ].join('\r\n')

    const req = mockReq({
      method: 'POST',
      headers: { 'content-type': `multipart/form-data; boundary=----TestBoundary123` },
      body,
    })
    const result = await parseBody(req)
    assert.strictEqual(result.body.field1, 'value1')
    assert.ok(result.files)
    assert.strictEqual(result.files[0].filename, 'test.txt')
    assert.strictEqual(result.files[0].data.toString(), 'file contents here')
  })

  it('should protect against prototype pollution in form data', async () => {
    const req = mockReq({
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: '__proto__=evil&constructor=bad&name=ok',
    })
    const result = await parseBody(req)
    assert.strictEqual(result.body.__proto__, undefined)
    assert.strictEqual(result.body.constructor, undefined)
    assert.strictEqual(result.body.name, 'ok')
  })
})
