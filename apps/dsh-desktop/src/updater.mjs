export const UPDATE_STARTUP_DELAY_MS = 15_000
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

const MAX_RELEASE_NOTES_LENGTH = 7_000

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
}

function normalizeNoteText(value) {
  return decodeHtmlEntities(String(value || ''))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<li(?:\s[^>]*)?>/gi, '- ')
    .replace(/<\/(?:h[1-6]|li|ul|ol|div)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '- ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function normalizeReleaseNotes(releaseNotes) {
  const notes = Array.isArray(releaseNotes)
    ? releaseNotes.map((entry) => {
      const version = entry?.version ? `版本 / Version ${entry.version}` : ''
      return [version, normalizeNoteText(entry?.note)].filter(Boolean).join('\n')
    }).filter(Boolean).join('\n\n')
    : normalizeNoteText(releaseNotes)
  if (!notes) return '未提供此版本的发行说明。\nNo release notes were provided for this version.'
  if (notes.length <= MAX_RELEASE_NOTES_LENGTH) return notes
  return `${notes.slice(0, MAX_RELEASE_NOTES_LENGTH - 48).trimEnd()}\n\n发行说明已截断。 / Release notes truncated.`
}

export function formatUpdateDetails(info, currentVersion) {
  const header = [
    `当前版本 / Current version: ${currentVersion}`,
    `新版本 / New version: ${info?.version || 'unknown'}`,
    info?.releaseName ? `发行 / Release: ${normalizeNoteText(info.releaseName)}` : '',
    info?.releaseDate ? `发布时间 / Published: ${new Date(info.releaseDate).toLocaleString()}` : '',
  ].filter(Boolean)
  return `${header.join('\n')}\n\n更新内容 / What's new\n${normalizeReleaseNotes(info?.releaseNotes)}`
}

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || 'Unknown update error')
}

export class DesktopUpdateController {
  constructor({
    updater,
    dialog,
    getWindow,
    currentVersion,
    enabled,
    log = () => {},
    beforeInstall = async () => {},
    setTimeoutFn = setTimeout,
    setIntervalFn = setInterval,
    clearTimeoutFn = clearTimeout,
    clearIntervalFn = clearInterval,
  }) {
    this.updater = updater
    this.dialog = dialog
    this.getWindow = getWindow
    this.currentVersion = currentVersion
    this.enabled = Boolean(enabled && updater)
    this.log = log
    this.beforeInstall = beforeInstall
    this.setTimeoutFn = setTimeoutFn
    this.setIntervalFn = setIntervalFn
    this.clearTimeoutFn = clearTimeoutFn
    this.clearIntervalFn = clearIntervalFn
    this.checking = false
    this.downloading = false
    this.prompting = false
    this.manualCheck = false
    this.started = false
    this.startupTimer = undefined
    this.intervalTimer = undefined
    this.listeners = []
  }

  start() {
    if (!this.enabled || this.started) return
    this.started = true
    this.updater.autoDownload = false
    this.updater.autoInstallOnAppQuit = false
    this.updater.allowPrerelease = false
    this.updater.fullChangelog = false
    this.#listen('update-available', (info) => void this.#handleAvailable(info))
    this.#listen('update-not-available', () => void this.#handleNotAvailable())
    this.#listen('download-progress', (progress) => this.#handleProgress(progress))
    this.#listen('update-downloaded', (info) => void this.#handleDownloaded(info))
    this.#listen('error', (error) => void this.#handleError(error))
    this.startupTimer = this.setTimeoutFn(() => void this.check(), UPDATE_STARTUP_DELAY_MS)
    this.intervalTimer = this.setIntervalFn(() => void this.check(), UPDATE_CHECK_INTERVAL_MS)
    this.startupTimer?.unref?.()
    this.intervalTimer?.unref?.()
  }

  dispose() {
    if (this.startupTimer) this.clearTimeoutFn(this.startupTimer)
    if (this.intervalTimer) this.clearIntervalFn(this.intervalTimer)
    for (const [event, listener] of this.listeners) this.updater?.removeListener(event, listener)
    this.listeners = []
    this.started = false
    this.#setProgress(-1)
  }

  async check({ manual = false } = {}) {
    if (!this.enabled) {
      if (manual) await this.#showMessage({
        type: 'info',
        title: '更新 / Updates',
        message: '更新检查仅在已安装的 Windows 应用中可用。\nUpdate checks are available in the installed Windows app.',
        buttons: ['确定 / OK'],
      })
      return false
    }
    if (this.checking || this.downloading || this.prompting) {
      if (manual) await this.#showMessage({
        type: 'info',
        title: '更新 / Updates',
        message: this.downloading
          ? '更新正在下载。\nAn update is already downloading.'
          : this.prompting
            ? '更新确认窗口已经打开。\nAn update decision is already open.'
            : '更新检查正在进行。\nAn update check is already running.',
        buttons: ['确定 / OK'],
      })
      return false
    }
    this.checking = true
    this.manualCheck = manual
    this.log(`[updater] checking from ${this.currentVersion}`)
    try {
      await this.updater.checkForUpdates()
      return true
    } catch (error) {
      if (this.checking) await this.#handleError(error)
      return false
    }
  }

  #listen(event, listener) {
    this.updater.on(event, listener)
    this.listeners.push([event, listener])
  }

  async #handleAvailable(info) {
    if (this.prompting || this.downloading) return
    this.checking = false
    this.manualCheck = false
    this.log(`[updater] version ${info?.version || 'unknown'} is available`)
    this.prompting = true
    let result
    try {
      result = await this.#showMessage({
        type: 'info',
        title: `发现新版本 / Update available: ${info?.version || 'new version'}`,
        message: `DeepSeek Harness Desktop ${info?.version || ''} 已发布。\nA new version is available.`,
        detail: formatUpdateDetails(info, this.currentVersion),
        buttons: ['下载更新 / Download update', '稍后 / Later'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      })
    } finally {
      this.prompting = false
    }
    if (result.response !== 0) {
      this.log('[updater] download deferred by user')
      return
    }
    this.downloading = true
    this.#setProgress(0)
    try {
      await this.updater.downloadUpdate()
    } catch (error) {
      if (this.downloading) await this.#handleError(error, true)
    }
  }

  async #handleNotAvailable() {
    const manual = this.manualCheck
    this.checking = false
    this.manualCheck = false
    this.log(`[updater] ${this.currentVersion} is up to date`)
    if (manual) await this.#showMessage({
      type: 'info',
      title: '暂无更新 / No updates available',
      message: `DeepSeek Harness Desktop ${this.currentVersion} 已是最新版本。\nThe app is up to date.`,
      buttons: ['确定 / OK'],
    })
  }

  #handleProgress(progress) {
    const percent = Number(progress?.percent)
    if (!Number.isFinite(percent)) return
    this.#setProgress(Math.max(0, Math.min(1, percent / 100)))
  }

  async #handleDownloaded(info) {
    this.downloading = false
    this.#setProgress(-1)
    this.log(`[updater] version ${info?.version || 'unknown'} downloaded`)
    const result = await this.#showMessage({
      type: 'info',
      title: '更新可以安装 / Update ready to install',
      message: `DeepSeek Harness Desktop ${info?.version || ''} 已下载完成。\nThe update has been downloaded.`,
      detail: '重启应用即可安装更新。内置 DSH 运行时会先安全停止。\nRestart the app to install the update. The embedded DSH runtime will be stopped cleanly first.',
      buttons: ['重启并安装 / Restart and install', '稍后 / Later'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    })
    if (result.response !== 0) {
      this.log('[updater] installation deferred by user')
      return
    }
    try {
      await this.beforeInstall()
      this.updater.quitAndInstall(false, true)
    } catch (error) {
      await this.#handleError(error, true)
    }
  }

  async #handleError(error, forceVisible = false) {
    const shouldShow = forceVisible || this.manualCheck || this.downloading
    this.checking = false
    this.manualCheck = false
    this.downloading = false
    this.#setProgress(-1)
    const message = asErrorMessage(error)
    this.log(`[updater] ${message}`)
    if (shouldShow) await this.#showMessage({
      type: 'error',
      title: '更新失败 / Update failed',
      message: 'DeepSeek Harness Desktop 未能完成更新。\nThe app could not complete the update.',
      detail: message,
      buttons: ['确定 / OK'],
    })
  }

  #setProgress(value) {
    const window = this.getWindow?.()
    if (window && !window.isDestroyed?.()) window.setProgressBar?.(value)
  }

  #showMessage(options) {
    const window = this.getWindow?.()
    return window && !window.isDestroyed?.()
      ? this.dialog.showMessageBox(window, options)
      : this.dialog.showMessageBox(options)
  }
}

export async function loadElectronAutoUpdater() {
  const electronUpdater = await import('electron-updater')
  return electronUpdater.autoUpdater || electronUpdater.default?.autoUpdater
}
