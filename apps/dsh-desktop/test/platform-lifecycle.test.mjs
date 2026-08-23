import assert from 'node:assert/strict'
import test from 'node:test'

import {
  keepsApplicationActiveWithoutWindows,
  shouldHideMainWindowOnClose,
  supportsPackagedUpdater,
} from '../src/platform-lifecycle.mjs'

test('packaged updates are enabled only on supported desktop platforms', () => {
  assert.equal(supportsPackagedUpdater({ isPackaged: true, platform: 'win32' }), true)
  assert.equal(supportsPackagedUpdater({ isPackaged: true, platform: 'darwin' }), true)
  assert.equal(supportsPackagedUpdater({ isPackaged: true, platform: 'linux' }), false)
  assert.equal(supportsPackagedUpdater({ isPackaged: false, platform: 'darwin' }), false)
  assert.equal(supportsPackagedUpdater({ isPackaged: true, platform: 'darwin', disabled: true }), false)
})

test('macOS remains active after its last window closes', () => {
  assert.equal(keepsApplicationActiveWithoutWindows('darwin'), true)
  assert.equal(keepsApplicationActiveWithoutWindows('win32'), false)
})

test('macOS close hides the window unless an explicit shutdown is underway', () => {
  assert.equal(shouldHideMainWindowOnClose({ platform: 'darwin' }), true)
  assert.equal(shouldHideMainWindowOnClose({ platform: 'darwin', explicitQuit: true }), false)
  assert.equal(shouldHideMainWindowOnClose({ platform: 'darwin', shutdownRequested: true }), false)
  assert.equal(shouldHideMainWindowOnClose({ platform: 'win32' }), false)
})
