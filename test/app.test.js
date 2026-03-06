// ─────────────────────────────────────────────
// SpaceNode — Test Suite: App (createApp, inject, addModule, etc.)
// ─────────────────────────────────────────────

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createApp, createModule, Container } from '../lib/index.js'

describe('App', () => {
  let app

  beforeEach(async () => {
    app = await createApp({ port: 0 })
  })

  describe('createApp', () => {
    it('should create an app instance', () => {
      assert.ok(app)
      assert.ok(app.router)
      assert.ok(app.events)
      assert.ok(app.container)
    })

    it('should apply config defaults', () => {
      assert.strictEqual(app.db, null)
    })

    it('should set db via setDb()', () => {
      const db = { query: () => {} }
      const ret = app.setDb(db)
      assert.strictEqual(app.db, db)
      assert.strictEqual(ret, app) // chainable
    })
  })

  describe('setRoute', () => {
    it('should register an imperative route', async () => {
      app.setRoute('GET', '/hello', (req) => req.send({ msg: 'hi' }))
      const result = await app.inject({ method: 'GET', url: '/hello' })
      assert.strictEqual(result.statusCode, 200)
      assert.deepStrictEqual(result.json, { msg: 'hi' })
    })

    it('should support POST routes with body', async () => {
      app.setRoute('POST', '/echo', (req) => req.send(req.body))
      const result = await app.inject({
        method: 'POST',
        url: '/echo',
        body: { data: 'hello' },
      })
      assert.strictEqual(result.statusCode, 200)
      assert.deepStrictEqual(result.json, { data: 'hello' })
    })

    it('should support route parameters', async () => {
      app.setRoute('GET', '/users/:id', (req) => req.send({ id: req.params.id }))
      const result = await app.inject({ method: 'GET', url: '/users/42' })
      assert.strictEqual(result.statusCode, 200)
      assert.deepStrictEqual(result.json, { id: '42' })
    })

    it('should return 404 for unregistered routes', async () => {
      const result = await app.inject({ method: 'GET', url: '/nonexistent' })
      assert.strictEqual(result.statusCode, 404)
    })

    it('should throw if handler is not a function', () => {
      assert.throws(
        () => app.setRoute('GET', '/bad', 'not a function'),
        { message: /handler must be a function/ }
      )
    })
  })

  describe('inject', () => {
    it('should inject with default values', async () => {
      app.setRoute('GET', '/', (req) => req.send({ ok: true }))
      const result = await app.inject()
      assert.strictEqual(result.statusCode, 200)
    })

    it('should handle errors in handlers', async () => {
      app.setRoute('GET', '/fail', (req) => {
        req.error(500, 'Something broke')
      })
      const result = await app.inject({ url: '/fail' })
      assert.strictEqual(result.statusCode, 500)
    })

    it('should handle check assertions', async () => {
      app.setRoute('GET', '/check', (req) => {
        req.check(false, 400, 'Validation failed')
      })
      const result = await app.inject({ url: '/check' })
      assert.strictEqual(result.statusCode, 400)
      assert.ok(result.json.error.includes('Validation'))
    })

    it('should support custom headers', async () => {
      app.setRoute('GET', '/headers', (req) => {
        req.send({ auth: req.headers['x-custom'] || 'none' })
      })
      const result = await app.inject({
        url: '/headers',
        headers: { 'X-Custom': 'test-value' },
      })
      assert.strictEqual(result.json.auth, 'test-value')
    })

    it('should support query parameters', async () => {
      app.setRoute('GET', '/search', (req) => {
        req.send({ q: req.query.q || 'none' })
      })
      const result = await app.inject({ url: '/search?q=hello' })
      assert.deepStrictEqual(result.json, { q: 'hello' })
    })
  })

  describe('addModule', () => {
    it('should register module routes', async () => {
      app.addModule({
        name: 'health',
        prefix: '/health',
        routes: [['GET', '/', 'check']],
        controllers: { check: (req) => req.send({ status: 'ok' }) },
      })

      const result = await app.inject({ url: '/health/' })
      assert.strictEqual(result.statusCode, 200)
      assert.deepStrictEqual(result.json, { status: 'ok' })
    })

    it('should register module services in container', () => {
      app.addModule({
        name: 'auth',
        prefix: '/auth',
        routes: [],
        controllers: {},
        services: { authService: { validate: () => true } },
      })

      assert.ok(app.container.has('authService'))
      assert.ok(app.container.has('auth.authService'))
    })

    it('should be chainable', () => {
      const ret = app.addModule({
        name: 'test',
        routes: [],
        controllers: {},
      })
      assert.strictEqual(ret, app)
    })
  })

  describe('setAuth', () => {
    it('should set per-app auth verifier', () => {
      const verifier = (token) => ({ id: 1 })
      app.setAuth(verifier)
      assert.strictEqual(app._authVerifier, verifier)
    })

    it('should throw if not a function', () => {
      assert.throws(
        () => app.setAuth('not a function'),
        { message: /setAuth\(\) requires a function/ }
      )
    })

    it('should be chainable', () => {
      const ret = app.setAuth(() => null)
      assert.strictEqual(ret, app)
    })
  })

  describe('addGuard', () => {
    it('should register per-app guard', () => {
      app.addGuard('premium', (param) => (req) => {})
      assert.ok(app._appGuards.has('premium'))
    })

    it('should be chainable', () => {
      const ret = app.addGuard('test', () => {})
      assert.strictEqual(ret, app)
    })
  })

  describe('onError', () => {
    it('should register error handler', () => {
      app.onError((err, req, res) => {})
      assert.strictEqual(app._onErrorHandlers.length, 1)
    })

    it('should call error handler on route error', async () => {
      let caughtError = null
      app.onError((err) => { caughtError = err })
      app.setRoute('GET', '/boom', () => {
        throw new Error('kaboom')
      })
      await app.inject({ url: '/boom' })
      assert.ok(caughtError)
      assert.strictEqual(caughtError.message, 'kaboom')
    })
  })

  describe('ws', () => {
    it('should register WebSocket handler', () => {
      app.ws('/chat', (ws, req) => {})
      assert.ok(app._wsHandlers.has('/chat'))
    })

    it('should be chainable', () => {
      const ret = app.ws('/test', () => {})
      assert.strictEqual(ret, app)
    })
  })

  describe('events', () => {
    it('should support event bus on app', async () => {
      const calls = []
      app.events.on('test:event', (data) => calls.push(data))
      await app.events.emit('test:event', { x: 1 })
      assert.deepStrictEqual(calls, [{ x: 1 }])
    })
  })

  describe('container (DI)', () => {
    it('should give access to container via app', () => {
      assert.ok(app.container instanceof Container)
    })

    it('should register and resolve services', () => {
      app.container.register('config', { apiKey: 'secret' })
      assert.deepStrictEqual(app.container.resolve('config'), { apiKey: 'secret' })
    })
  })

  describe('pipes (middleware)', () => {
    it('should run pipes before handler', async () => {
      const pipeRan = []
      app.setRoute('GET', '/piped', (req) => {
        req.send({ piped: req._pipeData })
      }, ['cors'])

      const result = await app.inject({ url: '/piped' })
      assert.strictEqual(result.statusCode, 200)
      // CORS headers should be set
    })
  })

  describe('status codes', () => {
    it('should support send(201, data)', async () => {
      app.setRoute('POST', '/item', (req) => req.send(201, { id: 1 }))
      const result = await app.inject({ method: 'POST', url: '/item', body: {} })
      assert.strictEqual(result.statusCode, 201)
    })

    it('should support send(204)', async () => {
      app.setRoute('DELETE', '/item/:id', (req) => req.send(204))
      const result = await app.inject({ method: 'DELETE', url: '/item/1' })
      assert.strictEqual(result.statusCode, 204)
    })
  })
})
