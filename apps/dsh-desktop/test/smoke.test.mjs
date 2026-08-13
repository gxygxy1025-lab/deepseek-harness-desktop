import assert from 'node:assert/strict'
import test from 'node:test'

import { DESKTOP_METADATA } from '../src/main.mjs'

test('desktop metadata is stable and identifies the embedded DSH surface', () => {
  assert.deepEqual(DESKTOP_METADATA, {
    appId: 'ai.deepseek.harness.desktop',
    productName: 'DeepSeek Harness Desktop',
    profile: 'desktop',
    protocol: 'dsh',
  })
})
