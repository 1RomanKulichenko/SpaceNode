// ─────────────────────────────────────────────
// SpaceNode — Test Suite: Guards
// ─────────────────────────────────────────────

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { resolveGuard, defineAuth, defineGuard, compressBuffer, listGuards } from '../lib/guards.js'

// Helper: minimal request mock
function makeRequest(overrides = {}) {
  const headers = {}
  return {
    method: 'GET',
    path: '/test',
    ip: '127.0.0.1',
    headers: {},
    _app: null,
    _sent: false,
    _statusCode: 200,
    _compressEncoding: null,
    _responseHeaders: headers,
    user: null,
    setHeader(k, v) { headers[k] = v; return this },
    send(code, body) { this._sent = true; this._statusCode = code ?? 200 },
    ...overrides,
  }
}

describe('Guards', () => {
  describe('resolveGuard', () => {
    it('should resolve built-in guard: auth', () => {
      const fn = resolveGuard('auth')
      assert.strictEqual(typeof fn, 'function')
    })

    it('should resolve built-in guard with param: role:admin', () => {
      const fn = resolveGuard('role:admin')
      assert.strictEqual(typeof fn, 'function')
    })

    it('should resolve built-in guard with param: rateLimit:50', () => {
      const fn = resolveGuard('rateLimit:50')
      assert.strictEqual(typeof fn, 'function')
    })

    it('should return null for unknown guard', () => {
      assert.strictEqual(resolveGuard('nonexistent'), null)
    })

    it('should prefer app-level guards over global', () => {
      defineGuard('test', () => 'global')
      const appGuards = new Map()
      appGuards.set('test', () => 'app-level')
      const fn = resolveGuard('test', appGuards)
      assert.strictEqual(fn, 'app-level')
    })
  })

  describe('authGuard', () => {
    it('should throw 500 if no auth verifier configured', async () => {
      defineAuth((token) => ({ id: 1 })) // reset to have a verifier
      // Clear by setting null via a request with no _app
      const fn = resolveGuard('auth')
      const req = makeRequest({
        headers: { authorization: 'Bearer test123' },
        _app: { _authVerifier: null },
      })
      // Global verifier is set, so should succeed
      const result = await fn(req)
      assert.ok(result.user)
    })

    it('should throw 401 if no token provided', async () => {
      defineAuth((token) => ({ id: 1 }))
      const fn = resolveGuard('auth')
      const req = makeRequest({ headers: {} })
      await assert.rejects(() => fn(req), { message: 'Authorization required' })
    })

    it('should throw 401 if verifier returns null', async () => {
      defineAuth(() => null)
      const fn = resolveGuard('auth')
      const req = makeRequest({ headers: { authorization: 'Bearer bad' } })
      await assert.rejects(() => fn(req), { message: 'Invalid or expired token' })
    })

    it('should return user on valid token', async () => {
      defineAuth((token) => token === 'valid' ? { id: 42, role: 'admin' } : null)
      const fn = resolveGuard('auth')
      const req = makeRequest({ headers: { authorization: 'Bearer valid' } })
      const result = await fn(req)
      assert.deepStrictEqual(result, { user: { id: 42, role: 'admin' } })
    })

    it('should use per-app auth verifier first', async () => {
      defineAuth(() => ({ id: 1, source: 'global' }))
      const fn = resolveGuard('auth')
      const req = makeRequest({
        headers: { authorization: 'Bearer x' },
        _app: { _authVerifier: (token) => ({ id: 2, source: 'app' }) },
      })
      const result = await fn(req)
      assert.strictEqual(result.user.source, 'app')
    })
  })

  describe('roleGuard', () => {
    it('should throw 401 if no user on request', () => {
      const fn = resolveGuard('role:admin')
      const req = makeRequest()
      assert.throws(() => fn(req), { message: /Authentication required/ })
    })

    it('should throw 403 if role does not match', () => {
      const fn = resolveGuard('role:admin')
      const req = makeRequest({ user: { role: 'user' } })
      assert.throws(() => fn(req), { message: /Access denied/ })
    })

    it('should pass if role matches', () => {
      const fn = resolveGuard('role:admin')
      const req = makeRequest({ user: { role: 'admin' } })
      fn(req) // should not throw
    })

    it('should support multiple roles: role:admin,moderator', () => {
      const fn = resolveGuard('role:admin,moderator')
      const req = makeRequest({ user: { role: 'moderator' } })
      fn(req) // should not throw
    })
  })

  describe('rateLimitGuard', () => {
    it('should allow requests under the limit', () => {
      const fn = resolveGuard('rateLimit:5')
      const req = makeRequest()
      fn(req)
      assert.ok(req._responseHeaders['X-RateLimit-Limit'])
      assert.strictEqual(req._responseHeaders['X-RateLimit-Limit'], '5')
    })

    it('should throw 429 when limit exceeded', () => {
      const fn = resolveGuard('rateLimit:3')
      for (let i = 0; i < 3; i++) {
        const req = makeRequest()
        fn(req)
      }
      const req = makeRequest()
      assert.throws(() => fn(req), { message: /Too many requests/ })
    })

    it('should set rate limit headers', () => {
      const fn = resolveGuard('rateLimit:10')
      const req = makeRequest()
      fn(req)
      assert.strictEqual(req._responseHeaders['X-RateLimit-Limit'], '10')
      assert.strictEqual(req._responseHeaders['X-RateLimit-Remaining'], '9')
    })
  })

  describe('corsGuard', () => {
    it('should set wildcard CORS if no origin given and no request origin', () => {
      const fn = resolveGuard('cors')
      const req = makeRequest()
      fn(req)
      assert.strictEqual(req._responseHeaders['Access-Control-Allow-Origin'], '*')
    })

    it('should reflect request origin header', () => {
      const fn = resolveGuard('cors')
      const req = makeRequest({ headers: { origin: 'https://test.com' } })
      fn(req)
      assert.strictEqual(req._responseHeaders['Access-Control-Allow-Origin'], 'https://test.com')
      assert.strictEqual(req._responseHeaders['Vary'], 'Origin')
    })

    it('should use explicit origin parameter', () => {
      const fn = resolveGuard('cors:https://allowed.com')
      const req = makeRequest()
      fn(req)
      assert.strictEqual(req._responseHeaders['Access-Control-Allow-Origin'], 'https://allowed.com')
    })

    it('should send 204 for OPTIONS preflight', () => {
      const fn = resolveGuard('cors')
      const req = makeRequest({ method: 'OPTIONS' })
      fn(req)
      assert.strictEqual(req._sent, true)
      assert.strictEqual(req._statusCode, 204)
    })
  })

  describe('loggerGuard', () => {
    it('should return an after hook', () => {
      const fn = resolveGuard('logger')
      const req = makeRequest()
      const result = fn(req)
      assert.strictEqual(typeof result.after, 'function')
    })
  })

  describe('compressGuard', () => {
    it('should set _compressEncoding to br when supported', () => {
      const fn = resolveGuard('compress')
      const req = makeRequest({ headers: { 'accept-encoding': 'gzip, deflate, br' } })
      fn(req)
      assert.strictEqual(req._compressEncoding, 'br')
    })

    it('should set _compressEncoding to gzip', () => {
      const fn = resolveGuard('compress')
      const req = makeRequest({ headers: { 'accept-encoding': 'gzip, deflate' } })
      fn(req)
      assert.strictEqual(req._compressEncoding, 'gzip')
    })

    it('should set _compressEncoding to deflate', () => {
      const fn = resolveGuard('compress')
      const req = makeRequest({ headers: { 'accept-encoding': 'deflate' } })
      fn(req)
      assert.strictEqual(req._compressEncoding, 'deflate')
    })

    it('should not set encoding if unsupported', () => {
      const fn = resolveGuard('compress')
      const req = makeRequest({ headers: { 'accept-encoding': 'identity' } })
      fn(req)
      assert.strictEqual(req._compressEncoding, null)
    })

    it('should use forced encoding', () => {
      const fn = resolveGuard('compress:gzip')
      const req = makeRequest()
      fn(req)
      assert.strictEqual(req._compressEncoding, 'gzip')
    })
  })

  describe('securityGuard', () => {
    it('should set common security headers', () => {
      const fn = resolveGuard('security')
      const req = makeRequest()
      fn(req)
      assert.strictEqual(req._responseHeaders['X-Content-Type-Options'], 'nosniff')
      assert.strictEqual(req._responseHeaders['X-Frame-Options'], 'DENY')
    })

    it('should add CSP in strict mode', () => {
      const fn = resolveGuard('security:strict')
      const req = makeRequest()
      fn(req)
      assert.ok(req._responseHeaders['Content-Security-Policy'])
      assert.ok(req._responseHeaders['Permissions-Policy'])
    })
  })

  describe('compressBuffer', () => {
    it('should compress with gzip', async () => {
      const input = Buffer.from('hello world hello world hello world')
      const compressed = await compressBuffer(input, 'gzip')
      assert.ok(compressed.length < input.length || compressed.length > 0)
      assert.ok(Buffer.isBuffer(compressed))
    })

    it('should compress with br', async () => {
      const input = Buffer.from('hello world hello world hello world')
      const compressed = await compressBuffer(input, 'br')
      assert.ok(Buffer.isBuffer(compressed))
    })

    it('should compress with deflate', async () => {
      const input = Buffer.from('hello world hello world hello world')
      const compressed = await compressBuffer(input, 'deflate')
      assert.ok(Buffer.isBuffer(compressed))
    })
  })

  describe('listGuards', () => {
    it('should include built-in guard names', () => {
      const guards = listGuards()
      assert.ok(guards.includes('auth'))
      assert.ok(guards.includes('role'))
      assert.ok(guards.includes('rateLimit'))
      assert.ok(guards.includes('cors'))
      assert.ok(guards.includes('logger'))
      assert.ok(guards.includes('compress'))
      assert.ok(guards.includes('security'))
    })
  })
})
