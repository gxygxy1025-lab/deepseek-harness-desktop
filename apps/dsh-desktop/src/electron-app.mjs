import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'

import { BoundedLogStore } from './log-store.mjs'
import { registerDesktopIpc } from './ipc.mjs'
import { installNavigationPolicy } from './navigation-policy.mjs'
import { ensureDesktopProfile, resolveDshCliPath } from './profile.mjs'
import { DshRuntimeController } from './runtime-controller.mjs'
import { attachWindowStatePersistence, loadWindowState } from './window-state.mjs'

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url))
const PRELOAD_PATH = join(SOURCE_DIR, 'preload.mjs')
const STARTUP_PATH = join(SOURCE_DIR, 'ui', 'startup.html')

function runtimeHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function runtimeWorkspace(app) {
  if (!app.isPackaged) return join(SOURCE_DIR, '..', '..', '..')
  return homedir()
}

export async function startElectronApp(metadata) {
  const electron = await import('electron')
  const { app, BrowserWindow, dialog, ipcMain, screen, session, shell } = electron
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }

  app.setAppUserModelId(metadata.appId)
  if (process.env.DSH_DESKTOP_USER_DATA) app.setPath('userData', process.env.DSH_DESKTOP_USER_DATA)
  await app.whenReady()

  const userData = app.getPath('userData')
  const logsDirectory = join(userData, 'logs')
  await mkdir(logsDirectory, { recursive: true })
  const logStore = new BoundedLogStore({ directory: logsDirectory })
  const dshHome = runtimeHome()
  const ensureProfile = () => ensureDesktopProfile({ dshHome })
  await ensureProfile()

  const controller = new DshRuntimeController({
    cliPath: resolveDshCliPath(),
    cwd: runtimeWorkspace(app),
    dshHome,
    executable: process.execPath,
    logStore,
    autoRestart: true,
  })

  const statePath = join(userData, 'window-state.json')
  const state = await loadWindowState(statePath, screen.getAllDisplays())
  let mainWindow = new BrowserWindow({
    ...state,
    minWidth: 720,
    minHeight: 540,
    show: false,
    title: metadata.productName,
    backgroundColor: '#02080d',
    autoHideMenuBar: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  })
  if (state.maximized) mainWindow.maximize()
  const saveWindowState = attachWindowStatePersistence(mainWindow, statePath)
  let activeOrigin

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
    } else if (status.state === 'crashed' && !mainWindow.webContents.getURL().startsWith('file:')) {
      void loadStartup().catch(() => {})
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => { mainWindow = undefined })
  await loadStartup()
  if (process.env.DSH_DESKTOP_HOLD_STARTUP !== '1') void controller.start().catch(() => {})

  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  let quitInProgress = false
  let runtimeStopped = false
  app.on('before-quit', (event) => {
    if (runtimeStopped) return
    event.preventDefault()
    if (quitInProgress) return
    quitInProgress = true
    void Promise.resolve(saveWindowState())
      .catch(() => {})
      .then(() => controller.stop())
      .finally(() => {
        runtimeStopped = true
        unregisterIpc()
        app.quit()
      })
  })
  app.on('window-all-closed', () => app.quit())
}
