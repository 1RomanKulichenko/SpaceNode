// ─────────────────────────────────────────────
// SpaceNode — Test Suite: Pipeline
// ─────────────────────────────────────────────

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { runPipeline, runAfterHooks } from '../lib/pipeline.js'

describe('Pipeline', () => {
  function makeRequest(overrides = {}) {
    return {
      method: 'GET',
      path: '/test',
      url: '/test',
      params: {},
      query: {},
      headers: {},
      cookies: {},
      body: null,
      files: null,
      ip: '127.0.0.1',
      db: null,
      config: {},
      _req: null,
      _res: null,
      _sent: false,
      _statusCode: 200,
      _app: null,
      send() { this._sent = true },
      check(c) { return c },
      guard() {},
      error() {},
      emit() {},
      setHeader() { return this },
      redirect() {},
      html() {},
      cookie() { return this },
      ...overrides,
    }
  }

  describe('runPipeline', () => {
    it('should run pipes sequentially', async () => {
      const order = []
      const pipes = [
        () => { order.push(1) },
        () => { order.push(2) },
        () => { order.push(3) },
      ]
      const req = makeRequest()
      await runPipeline(pipes, req, {})
      assert.deepStrictEqual(order, [1, 2, 3])
    })

    it('should merge returned data into request', async () => {
      const pipes = [
        () => ({ user: { id: 1, name: 'Test' } }),
      ]
      const req = makeRequest()
      await runPipeline(pipes, req, {})
      assert.deepStrictEqual(req.user, { id: 1, name: 'Test' })
    })

    it('should PROTECT built-in keys from overwrite', async () => {
      const pipes = [
        () => ({ method: 'HACKED', send: 'broken', user: { ok: true } }),
      ]
      const req = makeRequest()
      const originalSend = req.send
      await runPipeline(pipes, req, {})

      // Protected keys should NOT be overwritten
      assert.strictEqual(req.method, 'GET')
      assert.strictEqual(req.send, originalSend)
      // Non-protected keys should be merged
      assert.deepStrictEqual(req.user, { ok: true })
    })

    it('should collect after hooks', async () => {
      const afterCalls = []
      const pipes = [
        () => ({ after: (status) => afterCalls.push(status) }),
      ]
      const req = makeRequest()
      const hooks = await runPipeline(pipes, req, {})
      assert.strictEqual(hooks.length, 1)
      await runAfterHooks(hooks, 200)
      assert.deepStrictEqual(afterCalls, [200])
    })

    it('should stop if send() was called by a pipe', async () => {
      const order = []
      const pipes = [
        (req) => { req.send(); order.push('first') },
        () => { order.push('second') },
      ]
      const req = makeRequest()
      await runPipeline(pipes, req, {})
      assert.deepStrictEqual(order, ['first'])
    })

    it('should skip non-function pipes', async () => {
      const pipes = [null, undefined, 'string', 42]
      const req = makeRequest()
      await runPipeline(pipes, req, {}) // Should not throw
    })
  })

  describe('runAfterHooks', () => {
    it('should run hooks in reverse order (LIFO)', async () => {
      const order = []
      const hooks = [
        () => order.push('first'),
        () => order.push('second'),
        () => order.push('third'),
      ]
      await runAfterHooks(hooks, 200)
      assert.deepStrictEqual(order, ['third', 'second', 'first'])
    })

    it('should continue running even if a hook throws', async () => {
      const order = []
      const hooks = [
        () => order.push('first'),
        () => { throw new Error('hook error') },
        () => order.push('third'),
      ]
      const errors = await runAfterHooks(hooks, 200)
      assert.deepStrictEqual(order, ['third', 'first'])
      assert.strictEqual(errors.length, 1)
    })
  })
})
