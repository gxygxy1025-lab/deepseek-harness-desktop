import assert from 'node:assert/strict'
import test from 'node:test'

import {
  configureDesktopGraphics,
  DESKTOP_METADATA,
  terminateDesktopAfterBootstrapFailure,
} from '../src/main.mjs'

test('desktop metadata is stable and identifies the embedded DSH surface', () => {
  assert.deepEqual(DESKTOP_METADATA, {
    appId: 'ai.deepseek.harness.desktop',
    productName: 'DeepSeek Harness Desktop',
    profile: 'desktop',
    protocol: 'dsh',
  })
})

test('desktop graphics use normal Electron rendering unless the fallback is explicitly enabled', () => {
  const calls = []
  const app = {
    commandLine: { appendSwitch: (...values) => calls.push(['appendSwitch', ...values]) },
    disableHardwareAcceleration: () => calls.push(['disableHardwareAcceleration']),
  }

  assert.equal(configureDesktopGraphics(app), false)
  assert.deepEqual(calls, [])
  assert.equal(configureDesktopGraphics(app, { disableHardwareAcceleration: true }), true)
  assert.deepEqual(calls, [
    ['appendSwitch', 'disable-gpu'],
    ['appendSwitch', 'in-process-gpu'],
    ['disableHardwareAcceleration'],
  ])
})

test('bootstrap failure shows one bounded diagnostic and exits Electron', async () => {
  const calls = []
  const longError = new Error(`profile failed: ${'x'.repeat(4_000)}`)
  await terminateDesktopAfterBootstrapFailure(longError, {
    loadElectron: async () => ({
      app: { exit: (code) => calls.push(['exit', code]) },
      dialog: { showErrorBox: (title, message) => calls.push(['dialog', title, message]) },
    }),
    log: (...values) => calls.push(['log', ...values]),
    forceExit: (code) => calls.push(['force-exit', code]),
  })

  assert.equal(calls[0][0], 'log')
  assert.equal(calls[1][0], 'dialog')
  assert.match(calls[1][1], /启动失败/u)
  assert.match(calls[1][2], /^profile failed:/u)
  assert.ok(calls[1][2].length <= 2_000)
  assert.deepEqual(calls[2], ['exit', 1])
  assert.equal(calls.some(([name]) => name === 'force-exit'), false)
})

test('bootstrap failure force-exits when Electron termination is unavailable', async () => {
  const calls = []
  await terminateDesktopAfterBootstrapFailure(new Error('electron import failed'), {
    loadElectron: async () => { throw new Error('module unavailable') },
    log: (...values) => calls.push(['log', ...values]),
    forceExit: (code) => calls.push(['force-exit', code]),
  })

  assert.deepEqual(calls.at(-1), ['force-exit', 1])
  assert.equal(calls.filter(([name]) => name === 'log').length, 2)
})
