import assert from 'node:assert/strict'
import test from 'node:test'

import { launchRequestsSafeMode, readWindowsShiftKey } from '../src/launch-safe-mode.mjs'

test('safe mode launch accepts an explicit switch without probing the keyboard', async () => {
  let probed = false
  assert.equal(await launchRequestsSafeMode({
    argv: ['desktop.exe', '--safe-mode'],
    environment: {},
    platform: 'win32',
    readShiftKey: async () => { probed = true; return false },
  }), true)
  assert.equal(probed, false)
})

test('Windows Shift state is read in-process and failures degrade to normal launch', async () => {
  assert.equal(await launchRequestsSafeMode({
    argv: [],
    environment: {},
    platform: 'win32',
    readShiftKey: async () => true,
  }), true)
  assert.equal(await launchRequestsSafeMode({
    argv: [],
    environment: {},
    platform: 'win32',
    readShiftKey: async () => { throw new Error('native API unavailable') },
  }), false)
  assert.equal(await launchRequestsSafeMode({ platform: 'linux', argv: [], environment: {} }), false)
})

test('Windows key reader checks the high-order Shift bit and releases the library', async () => {
  let unloaded = false
  const loadKoffi = async () => ({
    load: () => ({
      func: () => () => 0x8001,
      unload: () => { unloaded = true },
    }),
  })
  assert.equal(await readWindowsShiftKey({ loadKoffi }), true)
  assert.equal(unloaded, true)
})
