import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { startQrConnect } from '@tencent-connect/qqbot-connector'

import { applyWindowIcon, resolveAppIconPath } from './app-icon.mjs'
import { BoundedLogStore } from './log-store.mjs'
import { registerExtensionIpc } from './extension-ipc.mjs'
import { PluginManager, resolvePnpmCliPath } from './extensions/plugins.mjs'
import {
  QqBotBindingService,
  QqBotCredentialStore,
  setQqBotProfileEnabled,
} from './extensions/qqbot.mjs'
import { registerDesktopIpc } from './ipc.mjs'
import { installApplicationMenu } from './menu.mjs'
import { installNavigationPolicy } from './navigation-policy.mjs'
import { ensureDesktopProfile, resolveDshCliPath } from './profile.mjs'
import { DshRuntimeController } from './runtime-controller.mjs'
import { DesktopUpdateController, loadElectronAutoUpdater } from './updater.mjs'
import { installWindowChrome, setWindowChromeTheme, windowChromeBrowserOptions } from './window-chrome.mjs'
import { attachWindowStatePersistence, loadWindowState } from './window-state.mjs'

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url))
const PRELOAD_PATH = join(SOURCE_DIR, 'preload.cjs')
const STARTUP_PATH = join(SOURCE_DIR, 'ui', 'startup.html')
const EXTENSIONS_PATH = join(SOURCE_DIR, 'ui', 'extensions.html')

function runtimeHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function runtimeWorkspace(app) {
  if (!app.isPackaged) return join(SOURCE_DIR, '..', '..', '..')
  return homedir()
}

export async function ensurePnpmCommandShim({ directory, executable, pnpmCli }) {
  await mkdir(directory, { recursive: true })
  const path = join(directory, process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm')
  const content = process.platform === 'win32'
    ? `@echo off\r\nset ELECTRON_RUN_AS_NODE=1\r\n"${executable}" "${pnpmCli}" %*\r\n`
    : `#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec "${executable}" "${pnpmCli}" "$@"\n`
  const existing = await readFile(path, 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') return undefined
    throw error
  })
  if (existing !== content) await writeFile(path, content, { encoding: 'utf8', mode: 0o755 })
  return directory
}

export async function startElectronApp(metadata) {
  const electron = await import('electron')
  const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, safeStorage, screen, shell } = electron
  if (process.env.DSH_DESKTOP_USER_DATA) app.setPath('userData', process.env.DSH_DESKTOP_USER_DATA)
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }

  app.setName(metadata.productName)
  app.setAppUserModelId(metadata.appId)
  await app.whenReady()

  const appIconPath = resolveAppIconPath({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    sourceDir: SOURCE_DIR,
  })
  const appIcon = nativeImage.createFromPath(appIconPath)
  if (appIcon.isEmpty()) throw new Error(`desktop app icon is missing or invalid: ${appIconPath}`)

  const userData = app.getPath('userData')
  const logsDirectory = join(userData, 'logs')
  await mkdir(logsDirectory, { recursive: true })
  const logStore = new BoundedLogStore({ directory: logsDirectory })
  const dshHome = runtimeHome()
  let qqBotCredentials
  const ensureProfile = async () => {
    const result = await ensureDesktopProfile({ dshHome })
    await setQqBotProfileEnabled({ profileDir: result.profileDir, enabled: Boolean(qqBotCredentials) })
    return result
  }
  const profile = await ensureDesktopProfile({ dshHome })
  const qqBotCredentialStore = new QqBotCredentialStore({
    path: join(userData, 'qqbot-credentials.json'),
    safeStorage,
  })
  try {
    qqBotCredentials = await qqBotCredentialStore.load()
  } catch (error) {
    await logStore.append(`[qqbot] failed to load credentials: ${error.message}`)
  }
  await setQqBotProfileEnabled({ profileDir: profile.profileDir, enabled: Boolean(qqBotCredentials) })
  const qqBotEnvironment = () => qqBotCredentials
    ? { QQBOT_APPID: qqBotCredentials.appId, QQBOT_SECRET: qqBotCredentials.appSecret }
    : { QQBOT_APPID: '', QQBOT_SECRET: '' }
  const projectRoot = runtimeWorkspace(app)
  const runtimeBin = await ensurePnpmCommandShim({
    directory: join(userData, 'runtime-bin'),
    executable: process.execPath,
    pnpmCli: resolvePnpmCliPath(),
  })

  const controller = new DshRuntimeController({
    cliPath: resolveDshCliPath(),
    cwd: projectRoot,
    dshHome,
    executable: process.execPath,
    logStore,
    autoRestart: true,
    startupTimeoutMs: 60_000,
    pathEntries: [runtimeBin],
    environmentProvider: qqBotEnvironment,
  })
  const qqBotBinding = new QqBotBindingService({
    initialCredentials: qqBotCredentials,
    credentialStore: qqBotCredentialStore,
    startQrConnect,
    setProfileEnabled: (enabled) => setQqBotProfileEnabled({ profileDir: profile.profileDir, enabled }),
    setRuntimeCredentials: (credentials) => { qqBotCredentials = credentials },
    restartRuntime: () => controller.restart(),
  })

  const statePath = join(userData, 'window-state.json')
  const state = await loadWindowState(statePath, screen.getAllDisplays())
  let mainWindow = new BrowserWindow({
    ...state,
    minWidth: 720,
    minHeight: 540,
    show: false,
    title: metadata.productName,
    icon: appIcon,
    backgroundColor: '#02080d',
    ...windowChromeBrowserOptions(),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  })
  applyWindowIcon(mainWindow, appIcon)
  const removeMainWindowChrome = installWindowChrome({
    browserWindow: mainWindow,
    title: 'DeepSeek Harness',
    getContext: (url) => url.startsWith('http:') ? 'Web Surface' : 'Startup',
    onError: (error) => void logStore.append(`[window-chrome] ${error.message}`),
  })
  if (state.maximized) mainWindow.maximize()
  const saveWindowState = attachWindowStatePersistence(mainWindow, statePath)
  let activeOrigin
  let extensionWindow

  installNavigationPolicy({
    webContents: mainWindow.webContents,
    getRuntimeOrigin: () => activeOrigin,
    openExternal: (url) => shell.openExternal(url),
  })
  mainWindow.webContents.session.setPermissionCheckHandler(() => false)
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  mainWindow.webContents.session.on('will-download', async (_event, item) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: join(app.getPath('downloads'), item.getFilename()),
    })
    if (result.canceled || !result.filePath) item.cancel()
    else item.setSavePath(result.filePath)
  })

  const unregisterIpc = registerDesktopIpc({
    ipcMain,
    controller,
    getWindow: () => mainWindow,
    metadata,
    version: app.getVersion(),
    platform: process.platform,
    ensureProfile,
    openLogs: () => shell.openPath(logsDirectory),
    exitApp: () => app.quit(),
    setWindowChromeTheme: (sender, theme) => {
      const target = BrowserWindow.fromWebContents(sender)
      if (!target || target.isDestroyed()) return undefined
      return setWindowChromeTheme(target, theme)
    },
  })

  const createExtensionWindow = async () => {
    if (extensionWindow && !extensionWindow.isDestroyed()) {
      extensionWindow.show()
      extensionWindow.focus()
      return extensionWindow
    }
    extensionWindow = new BrowserWindow({
      width: 1120,
      height: 780,
      minWidth: 760,
      minHeight: 620,
      show: false,
      parent: mainWindow,
      title: 'Extension Dock',
      icon: appIcon,
      backgroundColor: '#071117',
      ...windowChromeBrowserOptions(),
      webPreferences: {
        preload: PRELOAD_PATH,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        webSecurity: true,
        spellcheck: false,
      },
    })
    applyWindowIcon(extensionWindow, appIcon)
    const removeExtensionWindowChrome = installWindowChrome({
      browserWindow: extensionWindow,
      title: 'DeepSeek Harness',
      getContext: () => 'Extension Dock',
      onError: (error) => void logStore.append(`[window-chrome] ${error.message}`),
    })
    installNavigationPolicy({
      webContents: extensionWindow.webContents,
      getRuntimeOrigin: () => undefined,
      openExternal: (url) => shell.openExternal(url),
    })
    extensionWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    extensionWindow.once('ready-to-show', () => extensionWindow?.show())
    extensionWindow.on('closed', () => {
      removeExtensionWindowChrome()
      extensionWindow = undefined
    })
    await extensionWindow.loadFile(EXTENSIONS_PATH)
    return extensionWindow
  }

  const pluginManager = new PluginManager({ profileDir: profile.profileDir })
  const unregisterExtensionIpc = registerExtensionIpc({
    ipcMain,
    dialog,
    shell,
    getWindow: () => extensionWindow ?? mainWindow,
    pluginManager,
    controller,
    ensureProfile,
    projectRoot,
    dshHome,
    agentsHome: process.env.DSH_AGENTS_HOME,
    qqBotBinding,
  })
  const loadStartup = async () => {
    activeOrigin = undefined
    if (mainWindow && !mainWindow.isDestroyed()) await mainWindow.loadFile(STARTUP_PATH)
  }
  controller.on('status', (status) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (status.state === 'ready' && status.url) {
      activeOrigin = new URL(status.url).origin
      void mainWindow.loadURL(status.url).then(() => {
        if (process.env.DSH_DESKTOP_SMOKE_EXIT === '1') {
          console.log(`desktop smoke ready: ${activeOrigin}`)
          app.quit()
        }
      }).catch((error) => {
        void logStore.append(`[renderer] ${error.message}`)
        void loadStartup().catch(() => {})
      })
    } else if (['crashed', 'stopping', 'restarting'].includes(status.state) && !mainWindow.webContents.getURL().startsWith('file:')) {
      void loadStartup().catch(() => {})
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => { mainWindow = undefined })
  await loadStartup()
  if (process.env.DSH_DESKTOP_OPEN_EXTENSIONS === '1') await createExtensionWindow()
  if (process.env.DSH_DESKTOP_HOLD_STARTUP !== '1') void controller.start().catch(() => {})

  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  let quitInProgress = false
  let runtimeStopped = false
  let shutdownPromise
  let updateController
  const shutdownRuntime = () => {
    if (runtimeStopped) return Promise.resolve()
    if (shutdownPromise) return shutdownPromise
    shutdownPromise = Promise.resolve(saveWindowState())
      .catch((error) => void logStore.append(`[shutdown] ${error.message}`))
      .then(() => controller.stop())
      .catch((error) => void logStore.append(`[shutdown] ${error.message}`))
      .finally(() => {
        runtimeStopped = true
        updateController?.dispose()
        removeMainWindowChrome()
        unregisterIpc()
        unregisterExtensionIpc()
        qqBotBinding.dispose()
      })
    return shutdownPromise
  }

  let autoUpdater
  if (app.isPackaged && process.platform === 'win32' && process.env.DSH_DESKTOP_DISABLE_UPDATES !== '1') {
    try {
      autoUpdater = await loadElectronAutoUpdater()
    } catch (error) {
      void logStore.append(`[updater] failed to load: ${error.message}`)
    }
  }
  if (process.env.DSH_DESKTOP_VERIFY_UPDATER === '1' && !autoUpdater) {
    throw new Error('packaged updater verification failed')
  }
  updateController = new DesktopUpdateController({
    updater: autoUpdater,
    dialog,
    getWindow: () => mainWindow,
    currentVersion: app.getVersion(),
    enabled: Boolean(autoUpdater),
    log: (line) => void logStore.append(line),
    beforeInstall: async () => {
      quitInProgress = true
      await shutdownRuntime()
    },
  })
  const openLogs = () => shell.openPath(logsDirectory)
  installApplicationMenu({
    Menu,
    app,
    shell,
    controller,
    openExtensions: () => void createExtensionWindow(),
    openLogs,
    checkForUpdates: (options) => updateController.check(options),
  })
  updateController.start()

  app.on('before-quit', (event) => {
    if (runtimeStopped) return
    event.preventDefault()
    if (quitInProgress) return
    quitInProgress = true
    void shutdownRuntime().then(() => app.quit())
  })
  app.on('window-all-closed', () => app.quit())
}
