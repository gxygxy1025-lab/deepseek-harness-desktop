import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'

import {
  normalizeDesktopAction,
  normalizeHelpAction,
  normalizeToolAction,
  normalizeWindowChromeTheme,
  publicRuntimeStatus,
  publicUpdateStatus,
  registerDesktopIpc,
} from '../src/ipc.mjs'

test('desktop action validation exposes only fixed recovery operations', () => {
  for (const action of ['retry', 'repair', 'disable-plugin', 'safe-mode', 'open-logs', 'exit']) {
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

test('window chrome Help IPC accepts only fixed application actions', () => {
  for (const action of ['community', 'feedback', 'project', 'updates']) {
    assert.equal(normalizeHelpAction(action), action)
  }
  for (const action of ['open-url', 'https://example.com', '', 42]) {
    assert.throws(() => normalizeHelpAction(action), /Help action/)
  }
})

test('window chrome Tools IPC exposes only the Extension Dock action', () => {
  assert.equal(normalizeToolAction('extensions'), 'extensions')
  for (const action of ['run-command', 'open-url', '', 42]) {
    assert.throws(() => normalizeToolAction(action), /Tools action/)
  }
})

test('window action IPC returns a clone-safe acknowledgement instead of BrowserWindow objects', async () => {
  const handlers = new Map()
  const ipcMain = {
    handle: (channel, handler) => handlers.set(channel, handler),
    removeHandler: (channel) => handlers.delete(channel),
  }
  const controller = new EventEmitter()
  controller.status = { state: 'ready', url: 'http://127.0.0.1:43125/' }
  const browserWindow = { self: undefined }
  browserWindow.self = browserWindow
  const handled = []
  const unregister = registerDesktopIpc({
    ipcMain,
    controller,
    getWindow: () => undefined,
    metadata: { appId: 'desktop', productName: 'Desktop' },
    version: '2.0.0',
    platform: 'win32',
    ensureProfile: async () => {},
    openLogs: async () => {},
    exitApp: () => {},
    handleHelpAction: async (action) => {
      handled.push(action)
      return browserWindow
    },
    handleToolAction: async (action) => {
      handled.push(action)
      return browserWindow
    },
    setWindowChromeTheme: () => {},
    getUpdateController: () => undefined,
  })

  assert.equal(await handlers.get('desktop:help-action')({}, 'community'), true)
  assert.equal(await handlers.get('desktop:tool-action')({}, 'extensions'), true)
  assert.deepEqual(handled, ['community', 'extensions'])
  unregister()
})

test('public status omits process and filesystem internals', () => {
  assert.deepEqual(
    publicRuntimeStatus({ state: 'crashed', error: 'failed', url: 'http://127.0.0.1:1/', pid: 1234 }),
    { state: 'crashed', error: 'failed', url: undefined, restartAttempt: 0 },
  )
  assert.deepEqual(
    publicRuntimeStatus({ state: 'crashed', error: 'failed', restartBlocked: 'repeated-crash' }),
    {
      state: 'crashed',
      error: 'failed',
      url: undefined,
      restartAttempt: 0,
      restartBlocked: 'repeated-crash',
    },
  )
})

test('public update status exposes only renderer-safe release state', () => {
  assert.deepEqual(publicUpdateStatus({
    phase: 'ready',
    currentVersion: '0.1.8',
    version: '0.1.9',
    releaseName: 'Desktop polish',
    releaseNotes: 'Copy and startup fixes.',
    source: '国内镜像 ghproxy.net',
    percent: 110,
    visible: true,
    token: 'secret',
  }), {
    phase: 'ready',
    currentVersion: '0.1.8',
    version: '0.1.9',
    releaseName: 'Desktop polish',
    releaseNotes: 'Copy and startup fixes.',
    source: '国内镜像 ghproxy.net',
    percent: 100,
    message: undefined,
    visible: true,
  })
  assert.equal(publicUpdateStatus({ phase: 'install-command' }).phase, 'idle')
  assert.equal(publicUpdateStatus({ phase: 'installing' }).phase, 'installing')
})
