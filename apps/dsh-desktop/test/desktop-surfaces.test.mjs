import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'

import { DESKTOP_ERROR_CODES } from '../src/desktop-contract.mjs'
import { DesktopSurfaceRegistry } from '../src/desktop-surfaces.mjs'

class FakeWebContents extends EventEmitter {
  destroyed = false
  isDestroyed() { return this.destroyed }
  destroy() {
    this.destroyed = true
    this.emit('destroyed')
  }
}

test('surface registry binds identity and removes it at destruction', () => {
  const registry = new DesktopSurfaceRegistry()
  const contents = new FakeWebContents()
  const dispose = registry.register(contents, 'extensions')
  assert.equal(registry.surfaceOf(contents), 'extensions')
  assert.equal(registry.assert(contents, ['main', 'extensions']), 'extensions')
  contents.destroy()
  assert.equal(registry.surfaceOf(contents), undefined)
  dispose()
})

test('surface registry rejects unknown and disallowed renderer identities', () => {
  const registry = new DesktopSurfaceRegistry()
  const main = new FakeWebContents()
  registry.register(main, 'main')
  assert.throws(
    () => registry.assert(new FakeWebContents(), 'main'),
    (error) => error.code === DESKTOP_ERROR_CODES.SURFACE_UNKNOWN,
  )
  assert.throws(
    () => registry.assert(main, 'extensions'),
    (error) => error.code === DESKTOP_ERROR_CODES.CAPABILITY_DENIED,
  )
})
