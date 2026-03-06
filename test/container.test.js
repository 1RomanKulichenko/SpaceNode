// ─────────────────────────────────────────────
// SpaceNode — Test Suite: Container
// ─────────────────────────────────────────────

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { Container, ScopedContainer } from '../lib/container.js'

describe('Container', () => {
  let container

  beforeEach(() => {
    container = new Container()
  })

  describe('register / resolve', () => {
    it('should register and resolve a plain object', () => {
      const svc = { hello: 'world' }
      container.register('myService', svc)
      assert.strictEqual(container.resolve('myService'), svc)
    })

    it('should return null for unknown service', () => {
      assert.strictEqual(container.resolve('unknown'), null)
    })

    it('should report has() correctly', () => {
      container.register('a', { x: 1 })
      assert.strictEqual(container.has('a'), true)
      assert.strictEqual(container.has('b'), false)
    })

    it('should list registered services', () => {
      container.register('a', {})
      container.register('b', {})
      assert.deepStrictEqual(container.list(), ['a', 'b'])
    })

    it('should registerAll', () => {
      container.registerAll({ x: { v: 1 }, y: { v: 2 } })
      assert.deepStrictEqual(container.resolve('x'), { v: 1 })
      assert.deepStrictEqual(container.resolve('y'), { v: 2 })
    })
  })

  describe('singleton factory', () => {
    it('should create instance lazily on first resolve', () => {
      let calls = 0
      container.singleton('svc', () => {
        calls++
        return { id: 42 }
      })
      assert.strictEqual(calls, 0)
      const result = container.resolve('svc')
      assert.strictEqual(calls, 1)
      assert.deepStrictEqual(result, { id: 42 })
    })

    it('should return same instance on subsequent resolves', () => {
      container.singleton('svc', () => ({ id: Math.random() }))
      const a = container.resolve('svc')
      const b = container.resolve('svc')
      assert.strictEqual(a, b)
    })

    it('should pass container to factory for dependency resolution', () => {
      container.register('config', { port: 3000 })
      container.singleton('db', (c) => ({
        port: c.resolve('config').port
      }))
      assert.deepStrictEqual(container.resolve('db'), { port: 3000 })
    })
  })

  describe('transient factory', () => {
    it('should create new instance each time', () => {
      let count = 0
      container.transient('counter', () => ({ id: ++count }))
      assert.deepStrictEqual(container.resolve('counter'), { id: 1 })
      assert.deepStrictEqual(container.resolve('counter'), { id: 2 })
    })
  })

  describe('circular dependency detection', () => {
    it('should throw on circular dependencies', () => {
      container.singleton('a', (c) => c.resolve('b'))
      container.singleton('b', (c) => c.resolve('a'))
      assert.throws(() => container.resolve('a'), /Circular dependency/)
    })

    it('should include dependency chain in error message', () => {
      container.singleton('x', (c) => c.resolve('y'))
      container.singleton('y', (c) => c.resolve('z'))
      container.singleton('z', (c) => c.resolve('x'))
      assert.throws(() => container.resolve('x'), /x → y → z → x/)
    })
  })

  describe('getAll', () => {
    it('should return frozen object with all services', () => {
      container.register('a', { v: 1 })
      container.register('b', { v: 2 })
      const all = container.getAll()
      assert.deepStrictEqual(all.a, { v: 1 })
      assert.deepStrictEqual(all.b, { v: 2 })
      assert.throws(() => { all.c = 3 }, TypeError)
    })

    it('should cache until registration changes', () => {
      container.register('a', { v: 1 })
      const all1 = container.getAll()
      const all2 = container.getAll()
      assert.strictEqual(all1, all2) // Same reference
      container.register('b', { v: 2 })
      const all3 = container.getAll()
      assert.notStrictEqual(all1, all3) // Cache invalidated
    })
  })

  describe('scoped container', () => {
    it('should create per-scope instances for scoped services', () => {
      let count = 0
      container.scoped('requestId', () => ({ id: ++count }))
      const scope1 = container.createScope()
      const scope2 = container.createScope()

      const r1a = scope1.resolve('requestId')
      const r1b = scope1.resolve('requestId')
      const r2 = scope2.resolve('requestId')

      assert.strictEqual(r1a, r1b) // Same within scope
      assert.notStrictEqual(r1a, r2) // Different across scopes
    })

    it('should delegate singletons to parent', () => {
      container.register('config', { port: 3000 })
      const scope = container.createScope()
      assert.deepStrictEqual(scope.resolve('config'), { port: 3000 })
    })
  })

  describe('unregister / clear', () => {
    it('should unregister a service', () => {
      container.register('a', { v: 1 })
      container.unregister('a')
      assert.strictEqual(container.resolve('a'), null)
    })

    it('should clear all services', () => {
      container.register('a', {})
      container.register('b', {})
      container.clear()
      assert.deepStrictEqual(container.list(), [])
    })
  })

  describe('function registration (backward compat)', () => {
    it('should treat function as singleton factory', () => {
      let calls = 0
      container.register('svc', () => { calls++; return { ok: true } })
      const a = container.resolve('svc')
      const b = container.resolve('svc')
      assert.strictEqual(calls, 1)
      assert.strictEqual(a, b)
    })
  })
})
