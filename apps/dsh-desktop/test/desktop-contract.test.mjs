import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DESKTOP_API_VERSION,
  DESKTOP_ERROR_CODES,
  desktopContractForSurface,
  isDesktopContractCompatible,
} from '../src/desktop-contract.mjs'

test('Desktop Contract v1 capability snapshots stay exact', () => {
  assert.equal(DESKTOP_API_VERSION, '1.0.0')
  assert.deepEqual(desktopContractForSurface('main'), {
    apiVersion: '1.0.0',
    surface: 'main',
    capabilities: [
      'runtime.read',
      'updates.read',
      'updates.install',
      'skills.read',
      'notifications.show',
      'deep-links.subscribe',
    ],
  })
  assert.deepEqual(desktopContractForSurface('extensions'), {
    apiVersion: '1.0.0',
    surface: 'extensions',
    capabilities: [
      'runtime.read',
      'extensions.manage',
      'skills.import',
      'notifications.show',
    ],
  })
  assert.deepEqual(desktopContractForSurface('community'), {
    apiVersion: '1.0.0',
    surface: 'community',
    capabilities: [],
  })
  assert.deepEqual(DESKTOP_ERROR_CODES, {
    SURFACE_UNKNOWN: 'desktop-surface-unknown',
    CAPABILITY_DENIED: 'desktop-capability-denied',
    INVALID_ARGUMENT: 'desktop-invalid-argument',
  })
})

test('Desktop Contract v1 compatibility is major-version based', () => {
  assert.equal(isDesktopContractCompatible({ apiVersion: '1.9.0', capabilities: [] }), true)
  assert.equal(isDesktopContractCompatible({ apiVersion: '2.0.0', capabilities: [] }), false)
  assert.equal(isDesktopContractCompatible({ apiVersion: '1.0.0' }), false)
})
