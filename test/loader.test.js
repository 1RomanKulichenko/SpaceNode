// ─────────────────────────────────────────────
// SpaceNode — Test Suite: Loader (buildRoutes, resolvePipes, createModule)
// ─────────────────────────────────────────────

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildRoutes, resolvePipes, createModule } from '../lib/loader.js'
import { defineGuard } from '../lib/guards.js'

describe('Loader', () => {
  describe('resolvePipes', () => {
    it('should pass through function pipes', () => {
      const fn = () => {}
      const pipes = resolvePipes([fn], {})
      assert.strictEqual(pipes[0], fn)
    })

    it('should resolve built-in guard names', () => {
      const pipes = resolvePipes(['auth'], {})
      assert.strictEqual(typeof pipes[0], 'function')
    })

    it('should resolve dto: pipes with validation', () => {
      const dtos = {
        loginDto: { email: { type: 'string' }, password: { type: 'string' } }
      }
      const pipes = resolvePipes(['dto:loginDto'], dtos)
      assert.strictEqual(typeof pipes[0], 'function')
    })

    it('should throw on unknown DTO schema', () => {
      assert.throws(
        () => resolvePipes(['dto:nonexistent'], {}),
        { message: /DTO "nonexistent" not found/ }
      )
    })

    it('should throw on unknown pipe name', () => {
      assert.throws(
        () => resolvePipes(['unknownPipeName'], {}),
        { message: /Pipe "unknownPipeName" not found/ }
      )
    })

    it('should resolve custom guards', () => {
      defineGuard('testGuard', () => (req) => { req._testGuard = true })
      const pipes = resolvePipes(['testGuard'], {})
      assert.strictEqual(typeof pipes[0], 'function')
    })

    it('should prefer app-level guards', () => {
      const appGuards = new Map()
      appGuards.set('custom', (param) => (req) => { req._custom = param })
      const pipes = resolvePipes(['custom:hello'], {}, appGuards)
      assert.strictEqual(typeof pipes[0], 'function')
    })
  })

  describe('buildRoutes', () => {
    it('should build routes from tuple format', () => {
      const mod = createModule({
        name: 'test',
        prefix: '/test',
        routes: [
          ['GET', '/items', 'list'],
          ['POST', '/items', 'create'],
        ],
        controllers: {
          list: (req) => req.send([]),
          create: (req) => req.send(201, {}),
        },
      })

      const routes = buildRoutes(mod)
      assert.strictEqual(routes.length, 2)
      assert.strictEqual(routes[0].method, 'GET')
      assert.strictEqual(routes[0].path, '/test/items')
      assert.strictEqual(routes[1].method, 'POST')
      assert.strictEqual(routes[1].path, '/test/items')
    })

    it('should build routes from object format', () => {
      const mod = createModule({
        name: 'obj',
        prefix: '/obj',
        routes: [
          { method: 'PUT', path: '/item', handlerName: 'update' },
        ],
        controllers: {
          update: (req) => req.send({}),
        },
      })

      const routes = buildRoutes(mod)
      assert.strictEqual(routes.length, 1)
      assert.strictEqual(routes[0].method, 'PUT')
      assert.strictEqual(routes[0].path, '/obj/item')
    })

    it('should THROW on string route format', () => {
      const mod = createModule({
        name: 'bad',
        routes: ['GET /items => list'],
        controllers: { list: () => {} },
      })
      assert.throws(
        () => buildRoutes(mod),
        { message: /String route format is no longer supported/ }
      )
    })

    it('should throw on missing handler', () => {
      const mod = createModule({
        name: 'missing',
        routes: [['GET', '/', 'nonexistent']],
        controllers: {},
      })
      assert.throws(
        () => buildRoutes(mod),
        { message: /Handler "nonexistent" not found/ }
      )
    })

    it('should merge module-level pipes into each route', () => {
      const pipeFn = (req) => { req._pipeRan = true }
      const mod = createModule({
        name: 'piped',
        prefix: '/piped',
        pipe: [pipeFn],
        routes: [['GET', '/', 'index']],
        controllers: { index: () => {} },
      })

      const routes = buildRoutes(mod)
      assert.strictEqual(routes[0].pipes.length, 1)
      assert.strictEqual(routes[0].pipes[0], pipeFn)
    })

    it('should detect DTO schema in pipe names', () => {
      const mod = createModule({
        name: 'dto',
        prefix: '/dto',
        routes: [['POST', '/', 'create', ['dto:createDto']]],
        controllers: { create: () => {} },
        dtos: { createDto: { name: { type: 'string', required: true } } },
      })

      const routes = buildRoutes(mod)
      assert.ok(routes[0].dtoSchema)
      assert.strictEqual(routes[0].dtoSchema.name, 'createDto')
    })
  })

  describe('createModule', () => {
    it('should create a module with defaults', () => {
      const mod = createModule({ name: 'test' })
      assert.strictEqual(mod.name, 'test')
      assert.strictEqual(mod.config.prefix, '/test')
      assert.deepStrictEqual(mod.config.routes, [])
      assert.strictEqual(mod.path, null) // programmatic
    })

    it('should include controllers and services', () => {
      const ctrl = { handler: () => {} }
      const svc = { doWork: () => {} }
      const mod = createModule({
        name: 'my',
        controllers: ctrl,
        services: svc,
      })
      assert.strictEqual(mod.controllers, ctrl)
      assert.strictEqual(mod.services, svc)
    })

    it('should include lifecycle hooks', () => {
      const init = () => {}
      const destroy = () => {}
      const mod = createModule({
        name: 'hooks',
        onInit: init,
        onDestroy: destroy,
      })
      assert.strictEqual(mod.hooks.onInit, init)
      assert.strictEqual(mod.hooks.onDestroy, destroy)
    })
  })
})
