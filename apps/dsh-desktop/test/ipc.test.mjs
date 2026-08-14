import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeDesktopAction, normalizeWindowChromeTheme, publicRuntimeStatus } from '../src/ipc.mjs'

test('desktop action validation exposes only fixed recovery operations', () => {
  for (const action of ['retry', 'repair', 'open-logs', 'exit']) {
    assert.equal(normalizeDesktopAction(action), action)
  }
  for (const action of ['run-command', '../repair', '', 42]) {
    assert.throws(() => normalizeDesktopAction(action), /desktop action/)
  }
})

test('window chrome IPC accepts only supported themes', () => {
  assert.equal(normalizeWindowChromeTheme('light'), 'light')
  assert.equal(normalizeWindowChromeTheme('dark'), 'dark')
  for (const theme of ['', 'system', 42]) {
    assert.throws(() => normalizeWindowChromeTheme(theme), /window chrome theme/)
  }
})

test('public status omits process and filesystem internals', () => {
  assert.deepEqual(
    publicRuntimeStatus({ state: 'crashed', error: 'failed', url: 'http://127.0.0.1:1/', pid: 1234 }),
    { state: 'crashed', error: 'failed', url: undefined, restartAttempt: 0 },
  )
})
