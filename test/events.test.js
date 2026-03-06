// ─────────────────────────────────────────────
// SpaceNode — Test Suite: EventBus
// ─────────────────────────────────────────────

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { EventBus } from '../lib/events.js'

describe('EventBus', () => {
  let bus

  beforeEach(() => {
    bus = new EventBus()
  })

  describe('on / emit', () => {
    it('should register and call listeners', async () => {
      const calls = []
      bus.on('test', (d) => calls.push(d))
      await bus.emit('test', 'hello')
      assert.deepStrictEqual(calls, ['hello'])
    })

    it('should support multiple listeners per event', async () => {
      const calls = []
      bus.on('ev', () => calls.push(1))
      bus.on('ev', () => calls.push(2))
      await bus.emit('ev')
      assert.deepStrictEqual(calls, [1, 2])
    })

    it('should return this for chaining', () => {
      const ret = bus.on('x', () => {})
      assert.strictEqual(ret, bus)
    })

    it('should not throw for emitting unknown event', async () => {
      await bus.emit('nonexistent', { a: 1 }) // no listeners — no error
    })
  })

  describe('once', () => {
    it('should call handler only once', async () => {
      const calls = []
      bus.once('ev', (d) => calls.push(d))
      await bus.emit('ev', 'first')
      await bus.emit('ev', 'second')
      assert.deepStrictEqual(calls, ['first'])
    })
  })

  describe('off', () => {
    it('should remove specific handler', async () => {
      const calls = []
      const handler = () => calls.push('a')
      bus.on('ev', handler)
      bus.on('ev', () => calls.push('b'))
      bus.off('ev', handler)
      await bus.emit('ev')
      assert.deepStrictEqual(calls, ['b'])
    })

    it('should remove all listeners when no handler given', async () => {
      bus.on('ev', () => {})
      bus.once('ev', () => {})
      bus.off('ev')
      const events = bus.listEvents()
      assert.strictEqual(events.find(e => e.event === 'ev'), undefined)
    })

    it('should return this for chaining', () => {
      assert.strictEqual(bus.off('x'), bus)
    })
  })

  describe('error surfacing', () => {
    it('should surface handler errors via event:error', async () => {
      const surfacedErrors = []
      bus.on('event:error', (d) => surfacedErrors.push(d))
      bus.on('fail', () => { throw new Error('boom') })
      await bus.emit('fail')
      assert.strictEqual(surfacedErrors.length, 1)
      assert.strictEqual(surfacedErrors[0].event, 'fail')
      assert.strictEqual(surfacedErrors[0].errors.length, 1)
      assert.strictEqual(surfacedErrors[0].errors[0].error.message, 'boom')
    })

    it('should continue calling other handlers after error', async () => {
      const calls = []
      bus.on('ev', () => { throw new Error('nope') })
      bus.on('ev', () => calls.push('called'))
      await bus.emit('ev')
      assert.deepStrictEqual(calls, ['called'])
    })
  })

  describe('listEvents', () => {
    it('should list all events with listener count', () => {
      bus.on('a', () => {})
      bus.on('a', () => {})
      bus.on('b', () => {})
      const list = bus.listEvents()
      assert.strictEqual(list.find(e => e.event === 'a').listeners, 2)
      assert.strictEqual(list.find(e => e.event === 'b').listeners, 1)
    })
  })

  describe('clear / destroy', () => {
    it('clear() should remove all listeners', async () => {
      bus.on('a', () => {})
      bus.once('b', () => {})
      bus.clear()
      assert.deepStrictEqual(bus.listEvents(), [])
    })

    it('destroy() should clear all listeners', () => {
      bus.on('x', () => {})
      bus.destroy()
      assert.deepStrictEqual(bus.listEvents(), [])
    })
  })
})
