import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'

import {
  normalizeDesktopAction,
  normalizeHelpAction,
  normalizeWindowChromeTheme,
  publicBackgroundStatus,
  publicRuntimeStatus,
  publicUpdateStatus,
  registerDesktopIpc,
} from '../src/ipc.mjs'
import { DESKTOP_ERROR_CODES } from '../src/desktop-contract.mjs'
import { DesktopSurfaceRegistry } from '../src/desktop-surfaces.mjs'

test('desktop action validation exposes only fixed recovery and diagnostic operations', () => {
  for (const action of ['retry', 'repair', 'open-logs', 'export-diagnostics', 'exit']) {
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
  for (const action of ['community', 'downloads', 'feedback', 'project', 'privacy', 'updates']) {
    assert.equal(normalizeHelpAction(action), action)
  }
  for (const action of ['open-url', 'https://example.com', '', 42]) {
    assert.throws(() => normalizeHelpAction(action), /Help action/)
  }
})

test('window action IPC returns a clone-safe acknowledgement instead of BrowserWindow objects', async () => {
  const handlers = new Map()
  const ipcMain = {
    handle: (channel, handler) => handlers.set(channel, handler),
    removeHandler: (channel) => handlers.delete(channel),
  }
  const sender = {}
  const surfaceRegistry = new DesktopSurfaceRegistry()
  surfaceRegistry.register(sender, 'main')
  const controller = new EventEmitter()
  controller.status = { state: 'ready', url: 'http://127.0.0.1:43125/' }
  controller.restart = async () => {}
  const browserWindow = { self: undefined }
  browserWindow.self = browserWindow
  const handled = []
  const observed = []
  const exported = []
  const unregister = registerDesktopIpc({
    ipcMain,
    surfaceRegistry,
    controller,
    getWindow: () => undefined,
    metadata: { appId: 'desktop', productName: 'Desktop' },
    version: '2.0.0',
    platform: 'win32',
    ensureProfile: async () => {},
    openLogs: async () => {},
    exportDiagnostics: async () => {
      exported.push('startup-diagnostics')
      return { canceled: false, exported: true }
    },
    exitApp: () => {},
    handleHelpAction: async (action) => {
      handled.push(action)
      return browserWindow
    },
    setWindowChromeTheme: () => {},
    claimStarPrompt: async () => true,
    getUpdateController: () => undefined,
    onRecoveryAction: (action) => observed.push(['recovery', action]),
    onSettingsOpened: () => observed.push(['settings']),
    onUpdateCheck: () => observed.push(['updates']),
  })

  assert.equal(await handlers.get('desktop:help-action')({ sender }, 'community'), true)
  assert.equal(await handlers.get('desktop:star-prompt-claim')({ sender }), true)
  await handlers.get('desktop:action')({ sender }, 'retry')
  assert.deepEqual(
    await handlers.get('desktop:action')({ sender }, 'export-diagnostics'),
    { canceled: false, exported: true },
  )
  assert.equal(await handlers.get('desktop:settings-opened')({ sender }), true)
  await handlers.get('desktop:update-check')({ sender })
  assert.equal(handlers.has('desktop:background-status'), false)
  assert.equal(handlers.has('desktop:close-behavior-get'), false)
  assert.equal(handlers.has('desktop:close-behavior-set'), false)
  assert.deepEqual(handled, ['community'])
  assert.deepEqual(exported, ['startup-diagnostics'])
  assert.deepEqual(observed, [['recovery', 'retry'], ['settings'], ['updates']])
  unregister()
})

test('desktop IPC rejects unregistered and wrong-surface senders with stable codes', async () => {
  const handlers = new Map()
  const ipcMain = {
    handle: (channel, handler) => handlers.set(channel, handler),
    removeHandler: (channel) => handlers.delete(channel),
  }
  const controller = new EventEmitter()
  controller.status = { state: 'ready' }
  const surfaceRegistry = new DesktopSurfaceRegistry()
  const mainSender = {}
  const communitySender = {}
  surfaceRegistry.register(mainSender, 'main')
  surfaceRegistry.register(communitySender, 'community')
  const unregister = registerDesktopIpc({
    ipcMain,
    surfaceRegistry,
    controller,
    getWindow: () => undefined,
    metadata: { appId: 'desktop', productName: 'Desktop' },
    version: '2.4.0',
    platform: 'win32',
    ensureProfile: async () => {},
    openLogs: async () => {},
    exitApp: () => {},
    handleHelpAction: async () => {},
    setWindowChromeTheme: () => {},
    getUpdateController: () => undefined,
  })

  await assert.rejects(
    handlers.get('desktop:update-install')({ sender: communitySender }),
    (error) => error.code === DESKTOP_ERROR_CODES.CAPABILITY_DENIED,
  )
  await assert.rejects(
    handlers.get('desktop:action')({ sender: communitySender }, 'export-diagnostics'),
    (error) => error.code === DESKTOP_ERROR_CODES.CAPABILITY_DENIED,
  )
  await assert.rejects(
    handlers.get('desktop:contract')({ sender: {} }),
    (error) => error.code === DESKTOP_ERROR_CODES.SURFACE_UNKNOWN,
  )
  await assert.rejects(
    handlers.get('desktop:window-chrome-theme')({ sender: mainSender }, 'system'),
    (error) => error.code === DESKTOP_ERROR_CODES.INVALID_ARGUMENT,
  )
  unregister()
})

test('workspace-file IPC is main-surface-only and delegates the native-open authority', async () => {
  const handlers = new Map()
  const ipcMain = {
    handle: (channel, handler) => handlers.set(channel, handler),
    removeHandler: (channel) => handlers.delete(channel),
  }
  const controller = new EventEmitter()
  controller.status = { state: 'ready', url: 'http://127.0.0.1:43125/' }
  const surfaceRegistry = new DesktopSurfaceRegistry()
  const mainSender = {}
  const communitySender = {}
  surfaceRegistry.register(mainSender, 'main')
  surfaceRegistry.register(communitySender, 'community')
  const calls = []
  const shell = {
    openPath: async () => {
      throw new Error('IPC must delegate before any direct shell call')
    },
  }
  const unregister = registerDesktopIpc({
    ipcMain,
    surfaceRegistry,
    controller,
    getWindow: () => undefined,
    metadata: { appId: 'desktop', productName: 'Desktop' },
    version: '2.7.0',
    platform: 'win32',
    ensureProfile: async () => {},
    openLogs: async () => {},
    exportDiagnostics: async () => {
      exported.push('startup-diagnostics')
      return { canceled: false, exported: true }
    },
    exitApp: () => {},
    handleHelpAction: async () => {},
    setWindowChromeTheme: () => {},
    getUpdateController: () => undefined,
    shell,
    getRuntimeOrigin: () => 'http://127.0.0.1:43125/',
    getWorkspaceFileOpenToken: () => 'a'.repeat(43),
    openWorkspaceTarget: async (input) => {
      calls.push(input)
      return { opened: true }
    },
  })
  const request = { root: 'C:\\workspace', path: 'README.md' }
  try {
    assert.deepEqual(
      await handlers.get('desktop:workspace-file-open')({ sender: mainSender }, request),
      { opened: true },
    )
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].request, request)
    assert.equal(calls[0].shell, shell)
    assert.equal(calls[0].getRuntimeOrigin(), 'http://127.0.0.1:43125/')
    assert.equal(calls[0].getWorkspaceFileOpenToken(), 'a'.repeat(43))

    await assert.rejects(
      handlers.get('desktop:workspace-file-open')({ sender: communitySender }, request),
      (error) => error.code === DESKTOP_ERROR_CODES.CAPABILITY_DENIED,
    )
    await assert.rejects(
      handlers.get('desktop:workspace-file-open')({ sender: {} }, request),
      (error) => error.code === DESKTOP_ERROR_CODES.SURFACE_UNKNOWN,
    )
    assert.equal(calls.length, 1)
  } finally {
    unregister()
  }
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

test('public runtime status carries only a read-only background summary', () => {
  assert.deepEqual(
    publicBackgroundStatus({ enabled: true, trayAvailable: true, closeBehavior: 'minimize-to-tray', nativeTray: { destroy() {} } }),
    { enabled: true, trayAvailable: true, closeBehavior: 'minimize-to-tray' },
  )
  assert.equal(publicBackgroundStatus({ enabled: true, trayAvailable: 'yes' }), undefined)
  assert.deepEqual(
    publicRuntimeStatus({ state: 'ready' }, undefined, { enabled: false, trayAvailable: true, closeBehavior: 'quit' }),
    {
      state: 'ready',
      error: undefined,
      url: undefined,
      restartAttempt: 0,
      background: { enabled: false, trayAvailable: true, closeBehavior: 'quit' },
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
