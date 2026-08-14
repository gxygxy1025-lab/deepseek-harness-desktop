const ACTIONS = new Set(['retry', 'repair', 'open-logs', 'exit'])
const WINDOW_CHROME_THEMES = new Set(['light', 'dark'])

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

export function publicRuntimeStatus(status) {
  const state = typeof status?.state === 'string' ? status.state : 'stopped'
  return {
    state,
    error: typeof status?.error === 'string' ? status.error.slice(0, 4_000) : undefined,
    url: state === 'ready' && typeof status?.url === 'string' ? status.url : undefined,
    restartAttempt: Number.isInteger(status?.restartAttempt) ? status.restartAttempt : 0,
  }
}

export function registerDesktopIpc({
  ipcMain,
  controller,
  getWindow,
  metadata,
  version,
  platform,
  ensureProfile,
  openLogs,
  exitApp,
  setWindowChromeTheme,
}) {
  const channels = ['desktop:info', 'desktop:status', 'desktop:action', 'desktop:window-chrome-theme']
  for (const channel of channels) ipcMain.removeHandler(channel)
  ipcMain.handle('desktop:info', () => ({
    appId: metadata.appId,
    productName: metadata.productName,
    version,
    platform,
  }))
  ipcMain.handle('desktop:status', () => publicRuntimeStatus(controller.status))
  ipcMain.handle('desktop:action', async (_event, rawAction) => {
    const action = normalizeDesktopAction(rawAction)
    if (action === 'retry') return controller.restart()
    if (action === 'repair') {
      await controller.stop()
      await ensureProfile()
      return controller.start()
    }
    if (action === 'open-logs') return openLogs()
    exitApp()
    return undefined
  })
  ipcMain.handle('desktop:window-chrome-theme', (event, rawTheme) => {
    const theme = normalizeWindowChromeTheme(rawTheme)
    return setWindowChromeTheme?.(event.sender, theme)
  })
  const publishStatus = (status) => {
    const window = getWindow()
    if (window && !window.isDestroyed()) window.webContents.send('desktop:status', publicRuntimeStatus(status))
  }
  controller.on('status', publishStatus)
  return () => {
    controller.off('status', publishStatus)
    for (const channel of channels) ipcMain.removeHandler(channel)
  }
}
