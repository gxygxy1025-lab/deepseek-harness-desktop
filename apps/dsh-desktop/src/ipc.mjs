const ACTIONS = new Set(['retry', 'repair', 'disable-plugin', 'safe-mode', 'open-logs', 'exit'])
const HELP_ACTIONS = new Set(['community', 'feedback', 'project', 'updates'])
const TOOL_ACTIONS = new Set(['extensions'])
const WINDOW_CHROME_THEMES = new Set(['light', 'dark'])
const UPDATE_PHASES = new Set(['idle', 'checking', 'downloading', 'installing', 'current', 'ready', 'unavailable', 'error'])

export function normalizeWindowChromeTheme(value) {
  if (typeof value !== 'string' || !WINDOW_CHROME_THEMES.has(value)) {
    throw new TypeError(`invalid window chrome theme: ${JSON.stringify(value)}`)
  }
  return value
}

export function normalizeDesktopAction(value) {
  if (typeof value !== 'string' || !ACTIONS.has(value)) {
    throw new TypeError(`invalid desktop action: ${JSON.stringify(value)}`)
  }
  return value
}

export function normalizeHelpAction(value) {
  if (typeof value !== 'string' || !HELP_ACTIONS.has(value)) {
    throw new TypeError(`invalid Help action: ${JSON.stringify(value)}`)
  }
  return value
}

export function normalizeToolAction(value) {
  if (typeof value !== 'string' || !TOOL_ACTIONS.has(value)) {
    throw new TypeError(`invalid Tools action: ${JSON.stringify(value)}`)
  }
  return value
}

export function publicRecoveryStatus(status) {
  if (!status || typeof status !== 'object') return undefined
  const incident = status.currentIncident
  return {
    safeMode: status.safeMode === true,
    busy: status.busy === true,
    recoveryStage: Number.isInteger(status.recoveryStage) ? Math.max(0, Math.min(2, status.recoveryStage)) : 0,
    currentIncident: incident && typeof incident === 'object'
      ? {
          identified: incident.identified === true,
          pluginName: typeof incident.pluginName === 'string' ? incident.pluginName.slice(0, 240) : undefined,
          loaderId: typeof incident.loaderId === 'string' ? incident.loaderId.slice(0, 240) : undefined,
          reasonCode: typeof incident.reasonCode === 'string' ? incident.reasonCode.slice(0, 80) : 'unknown',
          summary: typeof incident.summary === 'string' ? incident.summary.slice(0, 500) : undefined,
          technicalDetails: typeof incident.technicalDetails === 'string' ? incident.technicalDetails.slice(-8_000) : undefined,
          resolution: typeof incident.resolution === 'string' ? incident.resolution.slice(0, 80) : undefined,
        }
      : undefined,
  }
}

export function publicRuntimeStatus(status, recoveryStatus) {
  const state = typeof status?.state === 'string' ? status.state : 'stopped'
  return {
    state,
    error: typeof status?.error === 'string' ? status.error.slice(0, 4_000) : undefined,
    url: state === 'ready' && typeof status?.url === 'string' ? status.url : undefined,
    restartAttempt: Number.isInteger(status?.restartAttempt) ? status.restartAttempt : 0,
    ...(status?.restartBlocked === 'repeated-crash' ? { restartBlocked: status.restartBlocked } : {}),
    ...(recoveryStatus ? { recovery: publicRecoveryStatus(recoveryStatus) } : {}),
  }
}

export function publicUpdateStatus(status) {
  const phase = UPDATE_PHASES.has(status?.phase) ? status.phase : 'idle'
  const boundedText = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : undefined
  const percent = Number(status?.percent)
  return {
    phase,
    currentVersion: boundedText(status?.currentVersion, 64),
    version: boundedText(status?.version, 64),
    releaseName: boundedText(status?.releaseName, 240),
    releaseNotes: boundedText(status?.releaseNotes, 7_000),
    source: boundedText(status?.source, 160),
    percent: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : undefined,
    message: boundedText(status?.message, 1_000),
    visible: status?.visible === true,
  }
}

export function registerDesktopIpc({
  ipcMain,
  controller,
  getWindow,
  metadata,
  version,
  platform,
  pluginRecovery,
  ensureProfile,
  openLogs,
  exitApp,
  handleHelpAction,
  handleToolAction,
  setWindowChromeTheme,
  getUpdateController,
}) {
  const channels = [
    'desktop:info',
    'desktop:status',
    'desktop:action',
    'desktop:help-action',
    'desktop:tool-action',
    'desktop:window-chrome-theme',
    'desktop:update-status',
    'desktop:update-check',
    'desktop:update-install',
  ]
  for (const channel of channels) ipcMain.removeHandler(channel)
  ipcMain.handle('desktop:info', () => ({
    appId: metadata.appId,
    productName: metadata.productName,
    version,
    platform,
  }))
  const getPublicStatus = async (status = controller.status) => publicRuntimeStatus(
    status,
    await pluginRecovery?.getState?.(),
  )
  ipcMain.handle('desktop:status', () => getPublicStatus())
  ipcMain.handle('desktop:action', async (_event, rawAction) => {
    const action = normalizeDesktopAction(rawAction)
    if (action === 'retry') return controller.restart()
    if (action === 'repair') {
      await controller.stop()
      await ensureProfile()
      return controller.start()
    }
    if (action === 'disable-plugin') return pluginRecovery?.disableCurrentAndRestart?.()
    if (action === 'safe-mode') return pluginRecovery?.enterSafeModeAndRestart?.()
    if (action === 'open-logs') return openLogs()
    exitApp()
    return undefined
  })
  ipcMain.handle('desktop:window-chrome-theme', (event, rawTheme) => {
    const theme = normalizeWindowChromeTheme(rawTheme)
    return setWindowChromeTheme?.(event.sender, theme)
  })
  ipcMain.handle('desktop:help-action', async (_event, rawAction) => {
    const action = normalizeHelpAction(rawAction)
    await handleHelpAction(action)
    return true
  })
  ipcMain.handle('desktop:tool-action', async (_event, rawAction) => {
    const action = normalizeToolAction(rawAction)
    await handleToolAction(action)
    return true
  })
  ipcMain.handle('desktop:update-status', () => publicUpdateStatus(getUpdateController?.()?.getStatus?.()))
  ipcMain.handle('desktop:update-check', () => getUpdateController?.()?.check?.({ manual: true }))
  ipcMain.handle('desktop:update-install', () => getUpdateController?.()?.install?.())
  const publishStatus = async (status = controller.status) => {
    const window = getWindow()
    if (window && !window.isDestroyed()) window.webContents.send('desktop:status', await getPublicStatus(status))
  }
  const publishStatusSafely = (status) => { void publishStatus(status).catch(() => {}) }
  controller.on('status', publishStatusSafely)
  pluginRecovery?.on?.('status', publishStatusSafely)
  return () => {
    controller.off('status', publishStatusSafely)
    pluginRecovery?.off?.('status', publishStatusSafely)
    for (const channel of channels) ipcMain.removeHandler(channel)
  }
}
