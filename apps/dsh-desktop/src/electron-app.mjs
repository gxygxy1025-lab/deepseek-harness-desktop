import { homedir, release as osRelease } from 'node:os'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { applyWindowIcon, resolveAppIconPath } from './app-icon.mjs'
import { ensureApiRetryPolicies } from './api-retry-policy.mjs'
import { resolveDesktopVersion } from './app-version.mjs'
import {
  CLOSE_BEHAVIORS,
  createCloseBehaviorController,
  DesktopClosePreferencesStore,
  isBackgroundAutomationEnabled,
} from './close-behavior.mjs'
import {
  GITHUB_DOWNLOADS_URL,
  GITHUB_FEEDBACK_URL,
  GITHUB_PROJECT_URL,
  PRIVACY_POLICY_URL,
} from './community-links.mjs'
import { promptForDownloadDestination } from './download-destination.mjs'
import { DeepLinkRouter, normalizeDeepLink } from './deep-links.mjs'
import { BoundedLogStore } from './log-store.mjs'
import { DESKTOP_SURFACES } from './desktop-contract.mjs'
import { DesktopSurfaceRegistry } from './desktop-surfaces.mjs'
import { defaultSkillRoots, discoverSkills } from './skills.mjs'
import { publicUpdateStatus, registerDesktopIpc } from './ipc.mjs'
import { installApplicationMenu, installEditContextMenu } from './menu.mjs'
import { installNavigationPolicy } from './navigation-policy.mjs'
import { DesktopNotificationService } from './notifications.mjs'
import {
  ensureDesktopProfile,
  resolveDshCliPath,
  resolveDshRuntimeVersion,
  resolvePnpmCliPath,
  resolveRuntimePackages,
} from './profile.mjs'
import { persistRuntimePort, selectPreferredRuntimePort } from './runtime-port.mjs'
import { installRendererPermissions } from './renderer-permissions.mjs'
import { installRendererSecurityHeaders } from './renderer-security.mjs'
import { installSettingsWindow } from './settings-window.mjs'
import { exportStartupDiagnostics } from './startup-diagnostics.mjs'
import { SettingsWindowStateStore } from './settings-window-state.mjs'
import { DEFAULT_STARTUP_TIMEOUT_MS, DshRuntimeController } from './runtime-controller.mjs'
import { DshRuntimeProvider, RUNTIME_PROVIDER_ID } from './runtime-provider.mjs'
import { assertRuntimeIntegrity, resolveRuntimeCriticalFiles } from './runtime-integrity.mjs'
import { DesktopUpdateController, loadElectronAutoUpdater } from './updater.mjs'
import { parseUpdateMirrors, probeUpdateSource, UpdateDownloadRouter } from './update-mirrors.mjs'
import { parseUpdateShutdownRequest, writeUpdateShutdownReceipt } from './update-shutdown-receipt.mjs'
import { installUpdateSurface } from './update-surface.mjs'
import { DesktopTrayLifecycle, restoreDesktopWindow } from './tray-lifecycle.mjs'
import { installWindowChrome, setWindowChromeTheme, windowChromeBrowserOptions } from './window-chrome.mjs'
import { installConversationPolish } from './conversation-polish.mjs'
import { installConversationSkills } from './conversation-skills.mjs'
import { attachWindowStatePersistence, loadWindowState } from './window-state.mjs'

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url))
const MAIN_PRELOAD_PATH = join(SOURCE_DIR, 'preload-main.cjs')

function runtimeHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function runtimeWorkspace(app) {
  if (!app.isPackaged) return join(SOURCE_DIR, '..', '..', '..')
  return homedir()
}

export function requestsUpdateShutdown(commandLine = [], additionalData) {
  return parseUpdateShutdownRequest(commandLine, additionalData) !== undefined
}

/** Extract one bounded application deep link from untrusted process arguments. */
export function desktopDeepLinkFrom(commandLine = [], protocol = 'dsh') {
  for (const value of commandLine) {
    if (typeof value !== 'string' || value.length > 4_096) continue
    try {
      return normalizeDeepLink(value, protocol).href
    } catch {
      // Ordinary executable arguments are not URLs.
    }
  }
  return undefined
}

/** Start the runtime without serializing it behind the local startup surface. */
export function beginDesktopStartup({ loadShell, startRuntime, holdRuntime = false }) {
  if (typeof loadShell !== 'function' || typeof startRuntime !== 'function') {
    throw new TypeError('loadShell and startRuntime must be functions')
  }
  const shellPromise = Promise.resolve().then(loadShell)
  const runtimePromise = holdRuntime ? undefined : Promise.resolve().then(startRuntime)
  return Object.freeze({ shellPromise, runtimePromise })
}

/** Coordinate reversible update preparation separately from final app disposal. */
export function createDesktopShutdownLifecycle({
  prepareStop = async () => {},
  saveState,
  stopRuntime,
  resumeOperations = async () => {},
  startRuntime,
  disposeResources,
  log = async () => {},
}) {
  let runtimeStopped = false
  let operationsQuiesced = false
  let resourcesDisposed = false
  let stopPromise
  let shutdownPromise

  const report = async (error) => {
    const message = error instanceof Error ? error.message : String(error)
    try {
      await log(message)
    } catch {
      // Shutdown diagnostics must never prevent the remaining cleanup steps.
    }
  }

  const stop = () => {
    if (runtimeStopped) return Promise.resolve()
    if (stopPromise) return stopPromise
    const operation = Promise.resolve()
      .then(prepareStop)
      .then(() => { operationsQuiesced = true })
      .then(() => Promise.resolve().then(saveState).catch(report))
      .then(stopRuntime)
      .then(() => { runtimeStopped = true })
      .catch(async (error) => {
        await report(error)
        try {
          await resumeOperations()
          operationsQuiesced = false
        } catch (resumeError) {
          await report(resumeError)
        }
        throw error
      })
      .finally(() => {
        if (!runtimeStopped && stopPromise === operation) stopPromise = undefined
      })
    stopPromise = operation
    return operation
  }

  const dispose = async () => {
    if (resourcesDisposed) return
    resourcesDisposed = true
    try {
      await disposeResources()
    } catch (error) {
      await report(error)
    }
  }

  const shutdown = () => {
    if (shutdownPromise) return shutdownPromise
    const operation = stop()
      .then(dispose)
      .catch((error) => {
        if (shutdownPromise === operation) shutdownPromise = undefined
        throw error
      })
    shutdownPromise = operation
    return operation
  }

  const recover = async () => {
    if (resourcesDisposed) return false
    try {
      await stop()
    } catch {
      return false
    }
    try {
      await resumeOperations()
      operationsQuiesced = false
      await startRuntime()
    } catch (error) {
      await report(error)
      return false
    }
    runtimeStopped = false
    stopPromise = undefined
    return true
  }

  return Object.freeze({
    stop,
    shutdown,
    recover,
    get runtimeStopped() { return runtimeStopped },
    get operationsQuiesced() { return operationsQuiesced },
    get resourcesDisposed() { return resourcesDisposed },
  })
}

export async function startElectronApp(metadata) {
  const applicationStartedAt = performance.now()
  const electron = await import('electron')
  const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, net, Notification, screen, shell, Tray } = electron
  if (process.env.DSH_DESKTOP_USER_DATA) app.setPath('userData', process.env.DSH_DESKTOP_USER_DATA)
  const initialUpdateShutdownRequest = parseUpdateShutdownRequest(process.argv)
  let updateShutdownRequest = initialUpdateShutdownRequest
  let updateShutdownRequested = initialUpdateShutdownRequest !== undefined
  let requestUpdateShutdown
  let mainWindow
  let dispatchDeepLink
  const deepLinkRouter = new DeepLinkRouter({
    protocol: metadata.protocol,
    dispatch: (link) => dispatchDeepLink(link),
  })
  const enqueueCommandLineIngress = (commandLine) => {
    const deepLink = desktopDeepLinkFrom(commandLine, metadata.protocol)
    if (deepLink) deepLinkRouter.enqueue(deepLink)
  }
  enqueueCommandLineIngress(process.argv)
  if (!app.requestSingleInstanceLock({
    shutdownForUpdate: updateShutdownRequested,
    ...(initialUpdateShutdownRequest?.token ? { shutdownToken: initialUpdateShutdownRequest.token } : {}),
  })) {
    app.quit()
    return
  }
  app.on('second-instance', (_event, commandLine, _workingDirectory, additionalData) => {
    const request = parseUpdateShutdownRequest(commandLine, additionalData)
    if (request !== undefined) {
      updateShutdownRequest = request
      updateShutdownRequested = true
      requestUpdateShutdown?.(request)
      return
    }
    enqueueCommandLineIngress(commandLine)
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })
  app.on('open-url', (event, url) => {
    event.preventDefault()
    const deepLink = desktopDeepLinkFrom([url], metadata.protocol)
    if (deepLink) deepLinkRouter.enqueue(deepLink)
  })
  app.setName(metadata.productName)
  app.setAppUserModelId(metadata.appId)
  await app.whenReady()
  if (app.isPackaged) app.setAsDefaultProtocolClient(metadata.protocol)
  const applicationReadyAt = performance.now()

  const appIconPath = resolveAppIconPath({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    sourceDir: SOURCE_DIR,
  })
  const appIcon = nativeImage.createFromPath(appIconPath)
  if (appIcon.isEmpty()) throw new Error(`desktop app icon is missing or invalid: ${appIconPath}`)
  const windowChromeIconDataUrl = appIcon.resize({ width: 40, height: 40, quality: 'best' }).toDataURL()
  const desktopVersion = await resolveDesktopVersion({
    isPackaged: app.isPackaged,
    appVersion: app.getVersion(),
    manifestPath: join(SOURCE_DIR, '..', 'package.json'),
  })
  const userData = app.getPath('userData')
  const logsDirectory = join(userData, 'logs')
  const logStore = new BoundedLogStore({ directory: logsDirectory })
  const closePreferencesStore = new DesktopClosePreferencesStore(join(userData, 'desktop-preferences.json'))
  let closeBehavior = (await closePreferencesStore.load()).closeBehavior
  let trayLifecycle
  let closeBehaviorController
  let runtimeProvider
  let refreshApplicationMenu = () => {}
  const getCloseBehavior = () => closeBehavior
  const synchronizeBackgroundMode = () => {
    if (!trayLifecycle) return
    if (closeBehavior === CLOSE_BEHAVIORS.QUIT) trayLifecycle.dispose()
    else trayLifecycle.ensure()
    void trayLifecycle.refresh()
  }
  const setCloseBehavior = async (value) => {
    const hadBackgroundAutomation = isBackgroundAutomationEnabled(closeBehavior)
    closeBehavior = await closePreferencesStore.saveCloseBehavior(value)
    synchronizeBackgroundMode()
    refreshApplicationMenu()
    if (hadBackgroundAutomation !== isBackgroundAutomationEnabled(closeBehavior) && runtimeProvider?.status?.state === 'ready') {
      try {
        await runtimeProvider.recover()
      } catch (error) {
        await logStore.append(`[background] runtime restart after automation setting change failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    return closeBehavior
  }
  await logStore.append(`[startup] application-ready=${Math.round(applicationReadyAt - applicationStartedAt)}ms`)
  const dshHome = runtimeHome()
  const packageResolutionStartedAt = performance.now()
  const runtimePackages = resolveRuntimePackages()
  const runtimeCriticalFiles = resolveRuntimeCriticalFiles()
  await logStore.append(
    `[startup] package-resolution=${Math.round(performance.now() - packageResolutionStartedAt)}ms packages=${runtimePackages.size}`,
  )
  const profileStartedAt = performance.now()
  const ensureRetryPolicies = async () => {
    try {
      const result = await ensureApiRetryPolicies({ dshHome })
      if (result.changed) await logStore.append('[api-retry] added bounded retry defaults to configured providers')
    } catch (error) {
      await logStore.append(`[api-retry] settings migration skipped: ${error.message}`)
    }
  }
  const ensureProfile = async () => {
    const result = await ensureDesktopProfile({ dshHome, packageRoots: runtimePackages })
    await ensureRetryPolicies()
    return result
  }
  const profile = await ensureProfile()
  await logStore.append(
    `[startup] profile-ready=${Math.round(performance.now() - profileStartedAt)}ms packages=${runtimePackages.size}`,
  )
  const desktopRuntimeEnvironment = () => ({
    DSH_DESKTOP_BACKGROUND_AUTOMATION: isBackgroundAutomationEnabled(closeBehavior) ? '1' : '0',
    DSH_PNPM_CLI_PATH: pnpmCliPath,
  })
  const projectRoot = runtimeWorkspace(app)
  const runtimeVersion = resolveDshRuntimeVersion()

  const runtimePortStatePath = join(profile.profileDir, '.dsh-desktop-runtime.json')
  const preferredRuntimePort = await selectPreferredRuntimePort(runtimePortStatePath).catch(async (error) => {
    await logStore.append(`[port] failed to read preferred port: ${error instanceof Error ? error.message : String(error)}`)
    return 0
  })

  const dshCliPath = resolveDshCliPath()
  const pnpmCliPath = resolvePnpmCliPath()
  const rawRuntimeController = new DshRuntimeController({
    cliPath: dshCliPath,
    patchPath: profile.desktopPatchPath,
    cwd: projectRoot,
    dshHome,
    executable: process.execPath,
    logStore,
    autoRestart: false,
    startupTimeoutMs: DEFAULT_STARTUP_TIMEOUT_MS,
    preferredPort: preferredRuntimePort,
    onReadyPort: (port) => persistRuntimePort(runtimePortStatePath, port),
    environmentProvider: desktopRuntimeEnvironment,
    preflight: () => assertRuntimeIntegrity({ resolvedFiles: runtimeCriticalFiles }),
  })
  runtimeProvider = new DshRuntimeProvider({
    controller: rawRuntimeController,
    ensureProfile,
    dshHome,
    profileName: 'desktop',
    upstreamVersion: runtimeVersion,
    desktopVersion,
    runtimeIdentity: {
      packageName: '@deepseek-ai/dsh',
      version: runtimeVersion,
      cliRelativePath: 'lib/bin.js',
    },
    supportEvidence: {
      manifestSchemaVersion: 1,
      source: 'package-and-lockfile',
    },
  })

  const statePath = join(userData, 'window-state.json')
  const settingsWindowStateStore = new SettingsWindowStateStore(join(userData, 'settings-window-state.json'))
  const state = await loadWindowState(statePath, screen.getAllDisplays())
  const surfaceRegistry = new DesktopSurfaceRegistry()
  mainWindow = new BrowserWindow({
    ...state,
    minWidth: 720,
    minHeight: 540,
    show: false,
    title: metadata.productName,
    icon: appIcon,
    backgroundColor: '#040814',
    ...windowChromeBrowserOptions(),
    webPreferences: {
      preload: MAIN_PRELOAD_PATH,
      contextIsolation: true,
      // The official Windows Web Surface currently fails navigation in Electron's renderer sandbox.
      sandbox: process.platform !== 'win32',
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  })
  const unregisterMainSurface = surfaceRegistry.register(mainWindow.webContents, DESKTOP_SURFACES.MAIN)
  applyWindowIcon(mainWindow, appIcon)
  const removeEditContextMenu = installEditContextMenu({ webContents: mainWindow.webContents, Menu })
  const removeMainWindowChrome = installWindowChrome({
    browserWindow: mainWindow,
    iconDataUrl: windowChromeIconDataUrl,
    showHelpMenu: true,
    onError: (error) => void logStore.append(`[window-chrome] ${error.message}`),
  })
  const removeConversationPolish = installConversationPolish({
    browserWindow: mainWindow,
    onError: (error) => void logStore.append(`[conversation-polish] ${error.message}`),
  })
  const removeConversationSkills = installConversationSkills({
    browserWindow: mainWindow,
    onError: (error) => void logStore.append(`[conversation-skills] ${error.message}`),
  })
  const removeUpdateSurface = installUpdateSurface({
    browserWindow: mainWindow,
    onError: (error) => void logStore.append(`[update-surface] ${error.message}`),
  })
  if (state.maximized) mainWindow.maximize()
  const saveWindowState = attachWindowStatePersistence(mainWindow, statePath)
  let activeOrigin
  let updateController
  const removeRendererSecurityHeaders = installRendererSecurityHeaders({
    session: mainWindow.webContents.session,
    getActiveOrigin: () => activeOrigin,
  })

  installNavigationPolicy({
    webContents: mainWindow.webContents,
    getRuntimeOrigin: () => activeOrigin,
    openExternal: (url) => shell.openExternal(url),
    onError: (error) => logStore.append(`[navigation] ${error instanceof Error ? error.message : String(error)}`),
  })
  installRendererPermissions({
    session: mainWindow.webContents.session,
    getActiveOrigin: () => activeOrigin,
  })
  mainWindow.webContents.session.on('will-download', (_event, item) => {
    void promptForDownloadDestination({
      item,
      parentWindow: mainWindow,
      downloadsDirectory: app.getPath('downloads'),
      showSaveDialog: (window, options) => dialog.showSaveDialog(window, options),
      log: (line) => logStore.append(line),
    })
  })
  const removeSettingsWindow = installSettingsWindow({
    browserWindow: mainWindow,
    onError: (error) => void logStore.append(`[settings-window] ${error.message}`),
  })

  const notificationService = new DesktopNotificationService({
    isForeground: () => Boolean(mainWindow?.isFocused?.()),
    routeDeepLink: async (link) => { deepLinkRouter.dispatchValidated(link) },
    showNative: ({ title, body, onClick }) => {
      if (!Notification?.isSupported?.()) return false
      const notification = new Notification({ title, body })
      if (onClick) notification.once('click', onClick)
      notification.show()
      return true
    },
  })

  const unregisterIpc = registerDesktopIpc({
    ipcMain,
    surfaceRegistry,
    controller: runtimeProvider,
    runtimeProvider,
    getWindow: () => mainWindow,
    metadata,
    version: desktopVersion,
    platform: process.platform,
    ensureProfile,
    openLogs: () => shell.openPath(logsDirectory),
    exportDiagnostics: () => exportStartupDiagnostics({
      dialog,
      getWindow: () => mainWindow,
      downloadsDirectory: app.getPath('downloads'),
      application: {
        productName: metadata.productName,
        version: desktopVersion,
        platform: process.platform,
        arch: process.arch,
        osRelease: osRelease(),
        runtimeVersion,
      },
      controller: runtimeProvider,
      logStore,
      redactionRoots: [
        { path: profile.profileDir, replacement: '<desktop-profile>' },
        { path: userData, replacement: '<desktop-user-data>' },
        { path: dshHome, replacement: '<dsh-home>' },
        { path: projectRoot, replacement: '<workspace>' },
      ],
    }),
    exitApp: () => app.quit(),
    handleHelpAction: (action) => {
      if (action === 'updates') {
        return updateController?.check({ manual: true })
      }
      if (action === 'downloads') return shell.openExternal(GITHUB_DOWNLOADS_URL)
      if (action === 'feedback') return shell.openExternal(GITHUB_FEEDBACK_URL)
      if (action === 'project') return shell.openExternal(GITHUB_PROJECT_URL)
      return shell.openExternal(PRIVACY_POLICY_URL)
    },
    setWindowChromeTheme: (sender, theme) => {
      const target = BrowserWindow.fromWebContents(sender)
      if (!target || target.isDestroyed()) return undefined
      const applied = setWindowChromeTheme(target, theme)
      return applied
    },
    getUpdateController: () => updateController,
    getSettingsWindowBounds: () => settingsWindowStateStore.load(),
    setSettingsWindowBounds: (bounds) => settingsWindowStateStore.save(bounds),
    notificationService,
    shell,
    getRuntimeOrigin: () => activeOrigin,
    // This closes over Electron main's controller only. The opaque per-Host
    // capability never enters preload, the browser Contract, or status data.
    getWorkspaceFileOpenToken: () => rawRuntimeController.getWorkspaceFileOpenToken(),
    getBackgroundStatus: () => ({
      enabled: isBackgroundAutomationEnabled(closeBehavior),
      closeBehavior,
      trayAvailable: trayLifecycle?.available === true,
    }),
    listSkills: async () => {
      const catalog = await discoverSkills({
        roots: defaultSkillRoots({
          projectRoot,
          dshHome,
          agentsHome: process.env.DSH_AGENTS_HOME,
        }),
      })
      return {
        skills: catalog.skills.map((skill, index) => ({
          id: `${skill.rank}:${index}:${skill.name}`,
          name: skill.name,
          description: skill.description,
          source: skill.source,
          shadowed: Boolean(skill.shadowedBy),
        })),
        diagnostics: catalog.diagnostics.map((item) => ({ error: item.error })),
      }
    },
  })

  dispatchDeepLink = async (link) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('desktop:deep-link', link)
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
  let runtimeStartedAt
  let runtimeFailurePromptPromise
  let lastRuntimeFailureFingerprint
  const showRuntimeFailure = (status) => {
    if (!mainWindow || mainWindow.isDestroyed() || updateShutdownRequested) return
    const fingerprint = `${status.state}:${status.error ?? 'unknown'}`
    if (runtimeFailurePromptPromise || lastRuntimeFailureFingerprint === fingerprint) return
    lastRuntimeFailureFingerprint = fingerprint
    runtimeFailurePromptPromise = (async () => {
      mainWindow.show()
      mainWindow.focus()
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'DeepSeek Harness Desktop 启动失败',
        message: '本地 Harness 环境没有正常启动。',
        detail: `${status.error ?? '未知 Runtime 错误'}\n\n可以重试、修复 Desktop Profile、打开日志或导出脱敏诊断信息。`,
        buttons: ['重试', '修复并重试', '打开日志', '导出诊断', '退出'],
        defaultId: 0,
        cancelId: 4,
        noLink: true,
      })
      lastRuntimeFailureFingerprint = undefined
      if (result.response === 0) {
        await runtimeProvider.restart()
      } else if (result.response === 1) {
        await runtimeProvider.stop()
        await ensureProfile()
        await runtimeProvider.start()
      } else if (result.response === 2) {
        await shell.openPath(logsDirectory)
      } else if (result.response === 3) {
        await exportStartupDiagnostics({
          dialog,
          getWindow: () => mainWindow,
          downloadsDirectory: app.getPath('downloads'),
          application: {
            productName: metadata.productName,
            version: desktopVersion,
            platform: process.platform,
            arch: process.arch,
            osRelease: osRelease(),
            runtimeVersion,
          },
          controller: runtimeProvider,
          logStore,
          redactionRoots: [
            { path: profile.profileDir, replacement: '<desktop-profile>' },
            { path: userData, replacement: '<desktop-user-data>' },
            { path: dshHome, replacement: '<dsh-home>' },
            { path: projectRoot, replacement: '<workspace>' },
          ],
        })
      } else {
        app.quit()
      }
    })().catch((error) => {
      void logStore.append(`[startup-recovery] ${error instanceof Error ? error.message : String(error)}`)
    }).finally(() => {
      runtimeFailurePromptPromise = undefined
    })
  }
  const showRuntime = async (status, runtimeReadyAt) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (runtimeProvider.status.state !== 'ready' || runtimeProvider.status.url !== status.url) return
    activeOrigin = new URL(status.url).origin
    try {
      await mainWindow.loadURL(status.url)
      deepLinkRouter.setReady(true)
      const rendererLoadedAt = performance.now()
      void logStore.append(`[startup] renderer-loaded=${Math.round(rendererLoadedAt - runtimeReadyAt)}ms`)
      void logStore.append(`[startup] total-to-renderer=${Math.round(rendererLoadedAt - applicationStartedAt)}ms`)
      if (process.env.DSH_DESKTOP_SMOKE_EXIT === '1') {
        console.log(`desktop smoke ready: ${activeOrigin}`)
        app.quit()
      }
    } catch (error) {
      void logStore.append(`[renderer] ${error.message}`)
    }
  }
  runtimeProvider.on('status', (status) => {
    void trayLifecycle?.refresh()
    if (status.state === 'starting') runtimeStartedAt = performance.now()
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (status.state === 'ready' && status.url) {
      const runtimeReadyAt = performance.now()
      if (runtimeStartedAt !== undefined) {
        void logStore.append(`[startup] runtime-ready=${Math.round(runtimeReadyAt - runtimeStartedAt)}ms`)
      }
      void showRuntime(status, runtimeReadyAt)
    } else if (['crashed', 'stopping', 'restarting'].includes(status.state)) {
      deepLinkRouter.setReady(false)
      if (status.state === 'crashed') showRuntimeFailure(status)
    }
  })

  mainWindow.once('ready-to-show', () => {
    if (!updateShutdownRequested) mainWindow.show()
  })
  mainWindow.on('closed', () => { mainWindow = undefined })
  const holdRuntime = process.env.DSH_DESKTOP_HOLD_STARTUP === '1'
  const startup = beginDesktopStartup({
    loadShell: async () => {},
    startRuntime: () => runtimeProvider.start(),
    holdRuntime,
  })
  void startup.runtimePromise?.catch(() => {})
  await startup.shellPromise
  if (!holdRuntime) {
    await logStore.append(`[startup] shell-ready=${Math.round(performance.now() - applicationStartedAt)}ms`)
  }
  let quitInProgress = false
  const shutdownLifecycle = createDesktopShutdownLifecycle({
    prepareStop: async () => {},
    saveState: saveWindowState,
    stopRuntime: () => runtimeProvider.stop(),
    resumeOperations: async () => {},
    startRuntime: () => runtimeProvider.start(),
    log: (message) => logStore.append(`[shutdown] ${message}`),
    disposeResources: async () => {
      const disposers = [
        () => updateController?.dispose(),
        () => updateController?.off('status', publishUpdateStatus),
        removeUpdateSurface,
        removeRendererSecurityHeaders,
        removeSettingsWindow,
        removeConversationSkills,
        removeConversationPolish,
        removeEditContextMenu,
        removeMainWindowChrome,
        unregisterMainSurface,
        unregisterIpc,
        () => trayLifecycle?.dispose(),
      ]
      for (const dispose of disposers) {
        try {
          await dispose()
        } catch (error) {
          await logStore.append(`[shutdown] ${error instanceof Error ? error.message : String(error)}`)
        }
      }
    },
  })

  const closeBypassReason = () => {
    if (quitInProgress || updateShutdownRequested) return 'quit-in-progress'
    if (runtimeProvider.status?.state === 'crashed') return 'runtime-crashed'
    return undefined
  }
  closeBehaviorController = createCloseBehaviorController({
    getCloseBehavior,
    canMinimizeToTray: () => trayLifecycle?.available === true,
    hideWindow: () => {
      if (!mainWindow || mainWindow.isDestroyed()) throw new Error('main window is unavailable')
      mainWindow.hide()
    },
    promptForClose: async () => {
      if (!mainWindow || mainWindow.isDestroyed()) return 'cancel'
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: '关闭 DeepSeek Harness Desktop',
        message: '要如何处理正在运行的本地环境？',
        detail: '最小化到托盘会保持本地环境和后台任务继续运行。退出会安全停止本地环境。',
        buttons: ['最小化到托盘', '退出', '取消'],
        defaultId: 1,
        cancelId: 2,
        noLink: true,
      })
      if (result.response === 0) return CLOSE_BEHAVIORS.MINIMIZE_TO_TRAY
      if (result.response === 1) return CLOSE_BEHAVIORS.QUIT
      return 'cancel'
    },
    requestQuit: () => {
      closeBehaviorController?.beginExplicitQuit()
      app.quit()
    },
    getBypassReason: closeBypassReason,
    log: (error) => logStore.append(`[close-behavior] ${error.message}`),
  })
  mainWindow.on('close', (event) => closeBehaviorController?.handleWindowClose(event))

  requestUpdateShutdown = (request = updateShutdownRequest) => {
    if (quitInProgress) return
    closeBehaviorController?.beginExplicitQuit()
    quitInProgress = true
    void shutdownLifecycle.shutdown()
      .then(async () => {
        if (request?.token) {
          try {
            await writeUpdateShutdownReceipt({
              token: request.token,
              pid: process.pid,
              runtimeStopped: shutdownLifecycle.runtimeStopped,
              extensionsQuiesced: shutdownLifecycle.operationsQuiesced,
            })
            await logStore.append(`[shutdown] update receipt v2 written for pid=${process.pid}`)
          } catch (error) {
            await logStore.append(`[shutdown] update receipt v2 failed: ${error instanceof Error ? error.message : String(error)}`)
          }
        }
        app.quit()
      })
      .catch((error) => {
        quitInProgress = false
        closeBehaviorController?.cancelExplicitQuit()
        const message = error instanceof Error ? error.message : String(error)
        void logStore.append(`[shutdown] installer request deferred because runtime stop failed: ${message}`).catch(() => {})
      })
  }
  if (updateShutdownRequested) requestUpdateShutdown(updateShutdownRequest)

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
  const updateDownloadRouter = autoUpdater ? new UpdateDownloadRouter({
    updater: autoUpdater,
    mirrors: parseUpdateMirrors(process.env.DSH_DESKTOP_UPDATE_MIRRORS),
    probe: (url) => probeUpdateSource(url, {
      fetchFn: (input, options) => net.fetch(input, options),
    }),
    log: (line) => void logStore.append(line),
  }) : undefined
  updateController = new DesktopUpdateController({
    updater: autoUpdater,
    getWindow: () => mainWindow,
    currentVersion: app.getVersion(),
    enabled: Boolean(autoUpdater),
    downloadRouter: updateDownloadRouter,
    log: (line) => void logStore.append(line),
    beforeInstall: async () => {
      closeBehaviorController?.beginExplicitQuit()
      quitInProgress = true
      await shutdownLifecycle.stop()
    },
    onInstallFailure: async () => {
      quitInProgress = false
      closeBehaviorController?.cancelExplicitQuit()
      const recovered = await shutdownLifecycle.recover()
      await logStore.append(recovered
        ? '[updater] runtime recovered after installer launch failure'
        : '[updater] runtime recovery failed after installer launch failure')
    },
  })
  trayLifecycle = new DesktopTrayLifecycle({
    Tray,
    Menu,
    nativeImage,
    icon: appIcon,
    getWindow: () => mainWindow,
    openTaskStatus: () => restoreDesktopWindow(mainWindow),
    checkForUpdates: (options) => updateController.check(options),
    requestQuit: () => {
      closeBehaviorController?.beginExplicitQuit()
      app.quit()
    },
    getTaskStatus: () => {
      const state = runtimeProvider.status?.state
      if (state === 'ready') return { label: '本地环境运行中 / Local runtime ready' }
      if (state === 'starting' || state === 'restarting') return { label: '本地环境启动中 / Local runtime starting' }
      if (state === 'crashed') return { label: '本地环境需要恢复 / Local runtime needs recovery' }
      return undefined
    },
    productName: metadata.productName,
    log: (line) => logStore.append(line),
  })
  synchronizeBackgroundMode()
  const publishUpdateStatus = (status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('desktop:update-status', publicUpdateStatus(status))
    }
    if (status?.phase === 'ready' && typeof status.version === 'string') {
      void notificationService.show({
        category: 'update',
        id: `update:${status.version.toLowerCase().replace(/[^a-z0-9._:-]/gu, '-').slice(0, 80)}:downloaded`,
        title: 'DeepSeek Harness Desktop update ready',
        body: `Version ${status.version} has been downloaded and is ready to install.`,
        deepLink: 'dsh://updates',
      }).catch(() => {})
    }
  }
  updateController.on('status', publishUpdateStatus)
  const openLogs = () => shell.openPath(logsDirectory)
  refreshApplicationMenu = installApplicationMenu({
    Menu,
    app,
    shell,
    controller: runtimeProvider,
    openFeedback: () => {
      return shell.openExternal(GITHUB_FEEDBACK_URL)
    },
    openProject: () => {
      return shell.openExternal(GITHUB_PROJECT_URL)
    },
    openPrivacy: () => {
      return shell.openExternal(PRIVACY_POLICY_URL)
    },
    openLogs,
    checkForUpdates: (options) => {
      return updateController.check(options)
    },
    getCloseBehavior,
    setCloseBehavior,
    onActionError: (error) => logStore.append(`[menu] ${error instanceof Error ? error.message : String(error)}`),
  })
  updateController.start()

  app.on('before-quit', (event) => {
    closeBehaviorController?.beginExplicitQuit()
    if (shutdownLifecycle.runtimeStopped) return
    event.preventDefault()
    if (quitInProgress) return
    quitInProgress = true
    void shutdownLifecycle.shutdown()
      .then(() => app.quit())
      .catch((error) => {
        quitInProgress = false
        closeBehaviorController?.cancelExplicitQuit()
        const message = error instanceof Error ? error.message : String(error)
        void logStore.append(`[shutdown] quit deferred because runtime stop failed: ${message}`).catch(() => {})
      })
  })
  app.on('will-quit', () => closeBehaviorController?.beginExplicitQuit())
  app.on('window-all-closed', () => app.quit())
}
