import { homedir, release as osRelease } from 'node:os'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { applyWindowIcon, resolveAppIconPath } from './app-icon.mjs'
import { ensureApiRetryPolicies } from './api-retry-policy.mjs'
import { resolveDesktopVersion } from './app-version.mjs'
import { createCommunityQrImage } from './community.mjs'
import {
  GITHUB_DOWNLOADS_URL,
  GITHUB_FEEDBACK_URL,
  GITHUB_PROJECT_URL,
  PRIVACY_POLICY_URL,
} from './community-links.mjs'
import { promptForDownloadDestination } from './download-destination.mjs'
import { DeepLinkRouter, normalizeDeepLink, presetFileFrom } from './deep-links.mjs'
import { BoundedLogStore } from './log-store.mjs'
import { registerExtensionIpc } from './extension-ipc.mjs'
import { DESKTOP_SURFACES } from './desktop-contract.mjs'
import { DesktopSurfaceRegistry } from './desktop-surfaces.mjs'
import {
  createHostCompatibilityProvider,
  resolvePackageVersion,
} from './extensions/plugin-compatibility.mjs'
import { PluginManager, resolvePnpmCliPath } from './extensions/plugins.mjs'
import { defaultSkillRoots, discoverSkills } from './extensions/skills.mjs'
import {
  QqBotBindingService,
  QqBotCredentialStore,
  setQqBotProfileEnabled,
} from './extensions/qqbot.mjs'
import { publicUpdateStatus, registerDesktopIpc } from './ipc.mjs'
import { launchRequestsSafeMode } from './launch-safe-mode.mjs'
import { installApplicationMenu, installEditContextMenu } from './menu.mjs'
import { installNavigationPolicy } from './navigation-policy.mjs'
import { DesktopNotificationService } from './notifications.mjs'
import { startQqBotConnector } from './optional-integrations.mjs'
import { DesktopPluginRecovery, PluginRecoveryStore } from './plugin-recovery.mjs'
import { ProductMetricsRecorder } from './product-metrics.mjs'
import { BUILTIN_BUNDLES, ensureDesktopProfile, resolveDshCliPath, resolveRuntimePackages } from './profile.mjs'
import { WebProfileMigrationService } from './profile-migration.mjs'
import { PresetService } from './presets/preset-service.mjs'
import { persistRuntimePort, selectPreferredRuntimePort } from './runtime-port.mjs'
import { installRendererPermissions } from './renderer-permissions.mjs'
import { installSettingsWindow } from './settings-window.mjs'
import { SettingsWindowStateStore } from './settings-window-state.mjs'
import { installStarPromptSurface, StarPromptStore } from './star-prompt.mjs'
import { ProductTelemetryClient } from './telemetry-client.mjs'
import { resolveTelemetryEndpoint } from './telemetry-config.mjs'
import { normalizeProductContext } from './telemetry-events.mjs'
import { DEFAULT_STARTUP_TIMEOUT_MS, DshRuntimeController } from './runtime-controller.mjs'
import { DshRuntimeProvider } from './runtime-provider.mjs'
import { assertRuntimeIntegrity, resolveRuntimeCriticalFiles } from './runtime-integrity.mjs'
import { DesktopUpdateController, loadElectronAutoUpdater } from './updater.mjs'
import { parseUpdateMirrors, probeUpdateSource, UpdateDownloadRouter } from './update-mirrors.mjs'
import { parseUpdateShutdownRequest, writeUpdateShutdownReceipt } from './update-shutdown-receipt.mjs'
import { installUpdateSurface } from './update-surface.mjs'
import { getWindowChromeTheme, installWindowChrome, setWindowChromeTheme, windowChromeBrowserOptions } from './window-chrome.mjs'
import { installConversationPolish } from './conversation-polish.mjs'
import { installConversationSkills } from './conversation-skills.mjs'
import { attachWindowStatePersistence, loadWindowState } from './window-state.mjs'

const SOURCE_DIR = dirname(fileURLToPath(import.meta.url))
const MAIN_PRELOAD_PATH = join(SOURCE_DIR, 'preload-main.cjs')
const EXTENSION_PRELOAD_PATH = join(SOURCE_DIR, 'preload-extension.cjs')
const STARTUP_PATH = join(SOURCE_DIR, 'ui', 'startup.html')
const EXTENSIONS_PATH = join(SOURCE_DIR, 'ui', 'extensions.html')
const COMMUNITY_PATH = join(SOURCE_DIR, 'ui', 'community.html')

export const SECONDARY_WINDOW_PARTITION = 'dsh-desktop-secondary'

function runtimeHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function runtimeWorkspace(app) {
  if (!app.isPackaged) return join(SOURCE_DIR, '..', '..', '..')
  return homedir()
}

export function secondaryWindowWebPreferences({ preload } = {}) {
  return {
    ...(preload ? { preload } : {}),
    partition: SECONDARY_WINDOW_PARTITION,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true,
    spellcheck: false,
  }
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

/** Run independent filesystem and credential startup work in parallel. */
export async function prepareDesktopRuntimeInputs({
  prepareProfile,
  migrateSettings,
  loadCredentials,
  onCredentialError = async () => {},
}) {
  const profilePromise = Promise.resolve().then(prepareProfile)
  const settingsPromise = Promise.resolve().then(migrateSettings)
  const credentialsPromise = Promise.resolve()
    .then(loadCredentials)
    .catch(async (error) => {
      await onCredentialError(error)
      return undefined
    })
  const [profile, , credentials] = await Promise.all([
    profilePromise,
    settingsPromise,
    credentialsPromise,
  ])
  return { profile, credentials }
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
  const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, net, Notification, safeStorage, screen, shell } = electron
  if (process.env.DSH_DESKTOP_USER_DATA) app.setPath('userData', process.env.DSH_DESKTOP_USER_DATA)
  const initialUpdateShutdownRequest = parseUpdateShutdownRequest(process.argv)
  let updateShutdownRequest = initialUpdateShutdownRequest
  let updateShutdownRequested = initialUpdateShutdownRequest !== undefined
  let requestUpdateShutdown
  let mainWindow
  let dispatchDeepLink
  let dispatchPresetFile
  const pendingPresetFiles = new Set()
  const deepLinkRouter = new DeepLinkRouter({
    protocol: metadata.protocol,
    dispatch: (link) => dispatchDeepLink(link),
  })
  const launchDetail = desktopDeepLinkFrom(process.argv, metadata.protocol) ? 'deep-link' : 'normal'
  const enqueueCommandLineIngress = (commandLine) => {
    const deepLink = desktopDeepLinkFrom(commandLine, metadata.protocol)
    if (deepLink) deepLinkRouter.enqueue(deepLink)
    const presetPath = presetFileFrom(commandLine)
    if (!presetPath) return
    if (dispatchPresetFile) void dispatchPresetFile(presetPath)
    else if (pendingPresetFiles.size < 8) pendingPresetFiles.add(presetPath)
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
  app.on('open-file', (event, path) => {
    event.preventDefault()
    const presetPath = presetFileFrom([path])
    if (!presetPath) return
    if (dispatchPresetFile) void dispatchPresetFile(presetPath)
    else if (pendingPresetFiles.size < 8) pendingPresetFiles.add(presetPath)
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
  const telemetryEndpoint = await resolveTelemetryEndpoint({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    testEndpoint: process.env.NODE_ENV === 'test'
      ? process.env.DSH_DESKTOP_TELEMETRY_TEST_ENDPOINT
      : undefined,
  })
  const productTelemetry = new ProductTelemetryClient({
    endpoint: telemetryEndpoint,
    context: normalizeProductContext({
      version: desktopVersion,
      platform: process.platform,
      osRelease: osRelease(),
      locale: app.getLocale(),
    }),
  })
  const productMetrics = new ProductMetricsRecorder({ client: productTelemetry })
  productMetrics.recordLaunch(launchDetail)

  const userData = app.getPath('userData')
  const logsDirectory = join(userData, 'logs')
  const logStore = new BoundedLogStore({ directory: logsDirectory })
  const starPromptStore = new StarPromptStore({ path: join(userData, 'star-prompt-state.json') })
  await logStore.append(`[startup] application-ready=${Math.round(applicationReadyAt - applicationStartedAt)}ms`)
  const launchSafeModeRequested = await launchRequestsSafeMode()
  if (launchSafeModeRequested) await logStore.append('[plugin-recovery] safe mode requested at launch')
  const dshHome = runtimeHome()
  const packageResolutionStartedAt = performance.now()
  const runtimePackages = resolveRuntimePackages()
  const runtimeCriticalFiles = resolveRuntimeCriticalFiles()
  await logStore.append(
    `[startup] package-resolution=${Math.round(performance.now() - packageResolutionStartedAt)}ms packages=${runtimePackages.size}`,
  )
  const profileStartedAt = performance.now()
  let qqBotCredentials
  const qqBotCredentialStore = new QqBotCredentialStore({
    path: join(userData, 'qqbot-credentials.json'),
    safeStorage,
  })
  const ensureRetryPolicies = async () => {
    try {
      const result = await ensureApiRetryPolicies({ dshHome })
      if (result.changed) await logStore.append('[api-retry] added bounded retry defaults to configured providers')
    } catch (error) {
      await logStore.append(`[api-retry] settings migration skipped: ${error.message}`)
    }
  }
  const ensureProfile = async () => {
    const [result] = await Promise.all([
      ensureDesktopProfile({ dshHome, packageRoots: runtimePackages }),
      ensureRetryPolicies(),
    ])
    await setQqBotProfileEnabled({ profileDir: result.profileDir, enabled: Boolean(qqBotCredentials) })
    return result
  }
  const prepared = await prepareDesktopRuntimeInputs({
    prepareProfile: () => ensureDesktopProfile({ dshHome, packageRoots: runtimePackages }),
    migrateSettings: ensureRetryPolicies,
    loadCredentials: () => qqBotCredentialStore.load(),
    onCredentialError: (error) => logStore.append(
      `[qqbot] failed to load credentials: ${error instanceof Error ? error.message : String(error)}`,
    ),
  })
  const profile = prepared.profile
  qqBotCredentials = prepared.credentials
  await setQqBotProfileEnabled({ profileDir: profile.profileDir, enabled: Boolean(qqBotCredentials) })
  await logStore.append(
    `[startup] profile-ready=${Math.round(performance.now() - profileStartedAt)}ms packages=${runtimePackages.size}`,
  )
  const qqBotEnvironment = () => qqBotCredentials
    ? { QQBOT_APPID: qqBotCredentials.appId, QQBOT_SECRET: qqBotCredentials.appSecret }
    : { QQBOT_APPID: '', QQBOT_SECRET: '' }
  const projectRoot = runtimeWorkspace(app)
  const runtimeBin = await ensurePnpmCommandShim({
    directory: join(userData, 'runtime-bin'),
    executable: process.execPath,
    pnpmCli: resolvePnpmCliPath(),
  })
  const runtimeVersion = resolvePackageVersion('@deepseek-ai/dsh', {
    profileDir: profile.profileDir,
    anchors: [import.meta.url],
  })
  if (runtimeVersion === undefined) throw new Error('the installed DSH runtime version is unavailable')
  const hostCompatibility = createHostCompatibilityProvider({
    desktopVersion,
    nodeVersion: process.versions.node,
    runtimeVersion,
    resolvePackageVersion: (name) => resolvePackageVersion(name, {
      profileDir: profile.profileDir,
      anchors: [import.meta.url],
    }),
  })
  const pluginRecoveryStore = new PluginRecoveryStore({
    profileDir: profile.profileDir,
    stateDir: join(userData, 'plugin-recovery'),
    builtInBundles: BUILTIN_BUNDLES,
  })
  const pluginManager = new PluginManager({
    profileDir: profile.profileDir,
    hostCompatibility,
    beforeMutation: (event) => pluginRecoveryStore.captureSnapshot({
      kind: 'before-mutation',
      label: event?.name ? `${event.type}: ${event.name}` : event?.type ?? '插件变更前',
    }),
  })
  const compatibilityStartedAt = performance.now()
  const compatibilityReconciliation = await pluginManager.reconcileCompatibility()
  await logStore.append(
    `[startup] compatibility-ready=${Math.round(performance.now() - compatibilityStartedAt)}ms disabled=${compatibilityReconciliation.disabled.length}`,
  )
  for (const plugin of compatibilityReconciliation.disabled) {
    await logStore.append(`[plugins] disabled incompatible community bundle: ${plugin.name}`)
  }

  const runtimePortStatePath = join(profile.profileDir, '.dsh-desktop-runtime.json')
  const preferredRuntimePort = await selectPreferredRuntimePort(runtimePortStatePath).catch(async (error) => {
    await logStore.append(`[port] failed to read preferred port: ${error instanceof Error ? error.message : String(error)}`)
    return 0
  })

  const dshCliPath = resolveDshCliPath()
  const rawRuntimeController = new DshRuntimeController({
    cliPath: dshCliPath,
    cwd: projectRoot,
    dshHome,
    executable: process.execPath,
    logStore,
    autoRestart: false,
    startupTimeoutMs: DEFAULT_STARTUP_TIMEOUT_MS,
    pathEntries: [runtimeBin],
    preferredPort: preferredRuntimePort,
    onReadyPort: (port) => persistRuntimePort(runtimePortStatePath, port),
    environmentProvider: qqBotEnvironment,
    preflight: () => assertRuntimeIntegrity({ resolvedFiles: runtimeCriticalFiles }),
  })
  const runtimeProvider = new DshRuntimeProvider({
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
  const presetService = new PresetService({
    dshHome,
    desktopVersion,
    runtimeVersion,
    pluginManager,
    runtimeProvider,
  })
  const migrationService = new WebProfileMigrationService({ dshHome, pluginManager })
  const pluginRecovery = new DesktopPluginRecovery({
    controller: runtimeProvider,
    pluginManager,
    store: pluginRecoveryStore,
    ensureProfile,
    builtInBundles: BUILTIN_BUNDLES,
    log: (line) => logStore.append(line),
  })
  await pluginRecovery.initialize()
  const qqBotBinding = new QqBotBindingService({
    initialCredentials: qqBotCredentials,
    credentialStore: qqBotCredentialStore,
    startQrConnect: startQqBotConnector,
    setProfileEnabled: (enabled) => setQqBotProfileEnabled({ profileDir: profile.profileDir, enabled }),
    setRuntimeCredentials: (credentials) => { qqBotCredentials = credentials },
    restartRuntime: () => runtimeProvider.recover(),
    onEventError: (error) => logStore.append(`[qqbot] event delivery failed: ${error instanceof Error ? error.message : String(error)}`),
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
      sandbox: true,
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
    showToolsMenu: true,
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
  const removeStarPromptSurface = installStarPromptSurface({
    browserWindow: mainWindow,
    forceVisible: process.env.DSH_DESKTOP_STAR_PROMPT_PREVIEW === '1',
    onError: (error) => void logStore.append(`[star-prompt] ${error.message}`),
  })
  if (state.maximized) mainWindow.maximize()
  const saveWindowState = attachWindowStatePersistence(mainWindow, statePath)
  let activeOrigin
  let extensionWindow
  let communityWindow
  let communityWindowPromise
  let updateController
  let safeModeNoticeShown = false

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
    isForeground: () => Boolean(mainWindow?.isFocused?.() || extensionWindow?.isFocused?.()),
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
    pluginRecovery,
    ensureProfile,
    openLogs: () => shell.openPath(logsDirectory),
    exitApp: () => app.quit(),
    handleHelpAction: (action) => {
      if (action === 'community') return createCommunityWindow()
      if (action === 'updates') {
        productMetrics.recordSurface('updates')
        return updateController?.check({ manual: true })
      }
      productMetrics.recordSurface('help')
      if (action === 'downloads') return shell.openExternal(GITHUB_DOWNLOADS_URL)
      if (action === 'feedback') return shell.openExternal(GITHUB_FEEDBACK_URL)
      if (action === 'project') return shell.openExternal(GITHUB_PROJECT_URL)
      return shell.openExternal(PRIVACY_POLICY_URL)
    },
    handleToolAction: () => createExtensionWindow(),
    setWindowChromeTheme: (sender, theme) => {
      const target = BrowserWindow.fromWebContents(sender)
      if (!target || target.isDestroyed()) return undefined
      const applied = setWindowChromeTheme(target, theme)
      if (target === mainWindow) {
        syncCommunityWindowTheme(applied)
        syncExtensionWindowTheme(applied)
      }
      return applied
    },
    claimStarPrompt: async () => {
      try {
        return await starPromptStore.claim(desktopVersion)
      } catch (error) {
        await logStore.append(`[star-prompt] failed to persist display state: ${error instanceof Error ? error.message : String(error)}`)
        return false
      }
    },
    getUpdateController: () => updateController,
    getSettingsWindowBounds: () => settingsWindowStateStore.load(),
    setSettingsWindowBounds: (bounds) => settingsWindowStateStore.save(bounds),
    onRecoveryAction: (action) => productMetrics.recordRecovery(action),
    onSettingsOpened: () => productMetrics.recordSurface('settings'),
    onUpdateCheck: () => productMetrics.recordSurface('updates'),
    notificationService,
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

  const createExtensionWindow = async () => {
    productMetrics.recordSurface('extensions')
    if (extensionWindow && !extensionWindow.isDestroyed()) {
      extensionWindow.show()
      extensionWindow.focus()
      return extensionWindow
    }
    const chromeTheme = mainWindow && !mainWindow.isDestroyed() ? getWindowChromeTheme(mainWindow) : 'dark'
    extensionWindow = new BrowserWindow({
      width: 1120,
      height: 780,
      minWidth: 760,
      minHeight: 620,
      show: false,
      parent: mainWindow,
      title: 'Extension Dock',
      icon: appIcon,
      backgroundColor: chromeTheme === 'dark' ? '#0a141b' : '#ffffff',
      ...windowChromeBrowserOptions(chromeTheme),
      webPreferences: secondaryWindowWebPreferences({ preload: EXTENSION_PRELOAD_PATH }),
    })
    const unregisterExtensionSurface = surfaceRegistry.register(
      extensionWindow.webContents,
      DESKTOP_SURFACES.EXTENSIONS,
    )
    applyWindowIcon(extensionWindow, appIcon)
    const removeExtensionWindowChrome = installWindowChrome({
      browserWindow: extensionWindow,
      iconDataUrl: windowChromeIconDataUrl,
      onError: (error) => void logStore.append(`[window-chrome] ${error.message}`),
    })
    installNavigationPolicy({
      webContents: extensionWindow.webContents,
      getRuntimeOrigin: () => undefined,
      openExternal: (url) => shell.openExternal(url),
      onError: (error) => logStore.append(`[navigation] ${error instanceof Error ? error.message : String(error)}`),
    })
    extensionWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    extensionWindow.once('ready-to-show', () => extensionWindow?.show())
    extensionWindow.on('closed', () => {
      unregisterExtensionSurface()
      removeExtensionWindowChrome()
      extensionWindow = undefined
    })
    await extensionWindow.loadFile(EXTENSIONS_PATH, { query: { theme: chromeTheme } })
    return extensionWindow
  }

  const syncSecondaryWindowTheme = (window, theme) => {
    if (!window || window.isDestroyed()) return
    setWindowChromeTheme(window, theme)
    const script = `document.documentElement.dataset.dshDesktopTheme = ${JSON.stringify(theme)}; document.documentElement.dataset.dshDesktopChromeTheme = ${JSON.stringify(theme)}`
    void window.webContents.executeJavaScript(script).catch(() => {})
  }
  const syncCommunityWindowTheme = (theme) => syncSecondaryWindowTheme(communityWindow, theme)
  const syncExtensionWindowTheme = (theme) => syncSecondaryWindowTheme(extensionWindow, theme)

  const createCommunityWindow = () => {
    productMetrics.recordSurface('community')
    if (communityWindowPromise) return communityWindowPromise
    if (communityWindow && !communityWindow.isDestroyed()) {
      communityWindow.show()
      communityWindow.focus()
      return Promise.resolve(communityWindow)
    }
    let createdWindow
    let operation
    operation = (async () => {
      const qrImage = await createCommunityQrImage()
      if (!mainWindow || mainWindow.isDestroyed()) {
        throw new Error('main window closed before the community window could open')
      }
      const chromeTheme = getWindowChromeTheme(mainWindow)
      createdWindow = new BrowserWindow({
        width: 580,
        height: 740,
        minWidth: 500,
        minHeight: 680,
        show: false,
        parent: mainWindow,
        title: '加入社群',
        icon: appIcon,
        backgroundColor: chromeTheme === 'dark' ? '#0a141b' : '#f7f8fa',
        ...windowChromeBrowserOptions(chromeTheme),
        webPreferences: secondaryWindowWebPreferences(),
      })
      communityWindow = createdWindow
      const unregisterCommunitySurface = surfaceRegistry.register(
        createdWindow.webContents,
        DESKTOP_SURFACES.COMMUNITY,
      )
      applyWindowIcon(createdWindow, appIcon)
      const removeCommunityWindowChrome = installWindowChrome({
        browserWindow: createdWindow,
        iconDataUrl: windowChromeIconDataUrl,
        onError: (error) => void logStore.append(`[window-chrome] ${error.message}`),
      })
      installNavigationPolicy({
        webContents: createdWindow.webContents,
        getRuntimeOrigin: () => undefined,
        openExternal: (url) => shell.openExternal(url),
        onError: (error) => logStore.append(`[navigation] ${error instanceof Error ? error.message : String(error)}`),
      })
      createdWindow.webContents.session.setPermissionCheckHandler(() => false)
      createdWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
      createdWindow.once('ready-to-show', () => {
        if (!createdWindow.isDestroyed()) createdWindow.show()
      })
      createdWindow.on('closed', () => {
        unregisterCommunitySurface()
        removeCommunityWindowChrome()
        if (communityWindow === createdWindow) communityWindow = undefined
      })
      await createdWindow.loadFile(COMMUNITY_PATH, { query: { qr: qrImage, theme: chromeTheme } })
      return createdWindow
    })().catch((error) => {
      if (createdWindow && !createdWindow.isDestroyed()) createdWindow.destroy()
      if (communityWindow === createdWindow) communityWindow = undefined
      throw error
    }).finally(() => {
      if (communityWindowPromise === operation) communityWindowPromise = undefined
    })
    communityWindowPromise = operation
    return operation
  }

  const unregisterExtensionIpc = registerExtensionIpc({
    ipcMain,
    surfaceRegistry,
    dialog,
    shell,
    getWindow: () => extensionWindow ?? mainWindow,
    pluginManager,
    controller: runtimeProvider,
    ensureProfile,
    projectRoot,
    dshHome,
    agentsHome: process.env.DSH_AGENTS_HOME,
    qqBotBinding,
    pluginRecovery,
    presetService,
    migrationService,
    notificationService,
    trackProductOperation: (detail, operation) => productMetrics.trackExtensionOperation(detail, operation),
  })
  dispatchDeepLink = async (link) => {
    if (link.kind === 'extensions' || link.kind === 'preset-preview') {
      const window = await createExtensionWindow()
      window.webContents.send('extensions:navigate', {
        tab: link.kind === 'preset-preview' ? 'presets' : 'plugins',
      })
      return
    }
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send('desktop:deep-link', link)
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
  dispatchPresetFile = async (path) => {
    try {
      const plan = await presetService.previewFile(path)
      const window = await createExtensionWindow()
      window.webContents.send('extensions:navigate', { tab: 'presets' })
      window.webContents.send('extensions:preset-preview', plan)
    } catch (error) {
      await logStore.append(`[preset] file preview rejected: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  for (const path of pendingPresetFiles) void dispatchPresetFile(path)
  pendingPresetFiles.clear()
  const loadStartup = async () => {
    activeOrigin = undefined
    if (mainWindow && !mainWindow.isDestroyed()) {
      const preview = process.env.DSH_DESKTOP_STARTUP_PREVIEW_STATE
      await mainWindow.loadFile(STARTUP_PATH, preview ? { query: { preview } } : undefined)
    }
  }
  let releaseStartupSurface
  const startupSurfaceReady = new Promise((resolve) => { releaseStartupSurface = resolve })
  let runtimeStartedAt
  const showRuntime = async (status, runtimeReadyAt) => {
    await startupSurfaceReady
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (runtimeProvider.status.state !== 'ready' || runtimeProvider.status.url !== status.url) return
    activeOrigin = new URL(status.url).origin
    try {
      await mainWindow.loadURL(status.url)
      deepLinkRouter.setReady(true)
      const rendererLoadedAt = performance.now()
      void logStore.append(`[startup] renderer-loaded=${Math.round(rendererLoadedAt - runtimeReadyAt)}ms`)
      void logStore.append(`[startup] total-to-renderer=${Math.round(rendererLoadedAt - applicationStartedAt)}ms`)
      try {
        const recoveryState = await pluginRecovery.getState()
        if (recoveryState.safeMode && !safeModeNoticeShown && process.env.DSH_DESKTOP_SMOKE_EXIT !== '1') {
          safeModeNoticeShown = true
          void notificationService.show({
            category: 'plugin-recovery',
            id: 'plugin-recovery:safe-mode:current',
            title: 'DeepSeek Harness is in plugin safe mode',
            body: `${recoveryState.disabledPlugins.length} plugin(s) are disabled. Review recovery details in Extension Dock.`,
            deepLink: 'dsh://extensions',
          }).catch(() => {})
          const notice = await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: '插件安全模式',
            message: '当前仅加载内置插件',
            detail: `有 ${recoveryState.disabledPlugins.length} 个插件处于停用状态。你可以打开“插件恢复”查看原因并一键恢复；聊天记录和个人设置不会受影响。`,
            buttons: ['打开插件恢复', '稍后'],
            defaultId: 0,
            cancelId: 1,
            noLink: true,
          })
          if (notice.response === 0) await createExtensionWindow()
        }
      } catch (error) {
        void logStore.append(`[plugin-recovery] failed to show safe-mode notice: ${error instanceof Error ? error.message : String(error)}`)
      }
      if (process.env.DSH_DESKTOP_SMOKE_EXIT === '1') {
        console.log(`desktop smoke ready: ${activeOrigin}`)
        app.quit()
      }
    } catch (error) {
      void logStore.append(`[renderer] ${error.message}`)
      void loadStartup().catch(() => {})
    }
  }
  runtimeProvider.on('status', (status) => {
    productMetrics.observeRuntimeStatus(status)
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
      if (!mainWindow.webContents.getURL().startsWith('file:')) void loadStartup().catch(() => {})
    }
  })

  mainWindow.once('ready-to-show', () => {
    if (!updateShutdownRequested) mainWindow.show()
  })
  mainWindow.on('closed', () => { mainWindow = undefined })
  if (launchSafeModeRequested) await pluginRecovery.prepareSafeMode()
  const holdRuntime = process.env.DSH_DESKTOP_HOLD_STARTUP === '1'
  const startup = beginDesktopStartup({
    loadShell: loadStartup,
    startRuntime: () => runtimeProvider.start(),
    holdRuntime,
  })
  void startup.runtimePromise?.catch(() => {})
  await startup.shellPromise
  if (process.env.DSH_DESKTOP_OPEN_EXTENSIONS === '1') await createExtensionWindow()
  if (process.env.DSH_DESKTOP_OPEN_COMMUNITY === '1') await createCommunityWindow()
  if (!holdRuntime) {
    await logStore.append(`[startup] shell-ready=${Math.round(performance.now() - applicationStartedAt)}ms`)
  }
  releaseStartupSurface()

  let quitInProgress = false
  const shutdownLifecycle = createDesktopShutdownLifecycle({
    prepareStop: () => unregisterExtensionIpc.quiesce(),
    saveState: saveWindowState,
    stopRuntime: () => runtimeProvider.stop(),
    resumeOperations: () => unregisterExtensionIpc.resume(),
    startRuntime: () => runtimeProvider.start(),
    log: (message) => logStore.append(`[shutdown] ${message}`),
    disposeResources: async () => {
      productMetrics.recordSessionEnd()
      await productTelemetry.shutdown()
      const disposers = [
        () => updateController?.dispose(),
        () => updateController?.off('status', publishUpdateStatus),
        removeUpdateSurface,
        removeSettingsWindow,
        removeStarPromptSurface,
        removeConversationSkills,
        removeConversationPolish,
        removeEditContextMenu,
        removeMainWindowChrome,
        unregisterMainSurface,
        unregisterIpc,
        unregisterExtensionIpc,
        () => pluginRecovery.dispose(),
        () => qqBotBinding.dispose(),
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

  requestUpdateShutdown = (request = updateShutdownRequest) => {
    if (quitInProgress) return
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
      quitInProgress = true
      await shutdownLifecycle.stop()
      productMetrics.recordSessionEnd()
      await productTelemetry.shutdown()
    },
    onInstallFailure: async () => {
      quitInProgress = false
      const recovered = await shutdownLifecycle.recover()
      await logStore.append(recovered
        ? '[updater] runtime recovered after installer launch failure'
        : '[updater] runtime recovery failed after installer launch failure')
    },
  })
  const publishUpdateStatus = (status) => {
    productMetrics.observeUpdateStatus(status)
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
  installApplicationMenu({
    Menu,
    app,
    shell,
    controller: runtimeProvider,
    openExtensions: () => createExtensionWindow(),
    openCommunity: () => createCommunityWindow(),
    openFeedback: () => {
      productMetrics.recordSurface('help')
      return shell.openExternal(GITHUB_FEEDBACK_URL)
    },
    openProject: () => {
      productMetrics.recordSurface('help')
      return shell.openExternal(GITHUB_PROJECT_URL)
    },
    openPrivacy: () => {
      productMetrics.recordSurface('help')
      return shell.openExternal(PRIVACY_POLICY_URL)
    },
    openLogs,
    checkForUpdates: (options) => {
      productMetrics.recordSurface('updates')
      return updateController.check(options)
    },
    onActionError: (error) => logStore.append(`[menu] ${error instanceof Error ? error.message : String(error)}`),
  })
  updateController.start()

  app.on('before-quit', (event) => {
    if (shutdownLifecycle.runtimeStopped) return
    event.preventDefault()
    if (quitInProgress) return
    quitInProgress = true
    void shutdownLifecycle.shutdown()
      .then(() => app.quit())
      .catch((error) => {
        quitInProgress = false
        const message = error instanceof Error ? error.message : String(error)
        void logStore.append(`[shutdown] quit deferred because runtime stop failed: ${message}`).catch(() => {})
      })
  })
  app.on('window-all-closed', () => app.quit())
}
