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
      const version = entry?.version ? `Version ${entry.version}` : ''
      return [version, normalizeNoteText(entry?.note)].filter(Boolean).join('\n')
    }).filter(Boolean).join('\n\n')
    : normalizeNoteText(releaseNotes)
  if (!notes) return 'No release notes were provided for this version.'
  if (notes.length <= MAX_RELEASE_NOTES_LENGTH) return notes
  return `${notes.slice(0, MAX_RELEASE_NOTES_LENGTH - 24).trimEnd()}\n\nRelease notes truncated.`
}

export function formatUpdateDetails(info, currentVersion) {
  const header = [
    `Current version: ${currentVersion}`,
    `New version: ${info?.version || 'unknown'}`,
    info?.releaseName ? `Release: ${normalizeNoteText(info.releaseName)}` : '',
    info?.releaseDate ? `Published: ${new Date(info.releaseDate).toLocaleString()}` : '',
  ].filter(Boolean)
  return `${header.join('\n')}\n\nWhat's new\n${normalizeReleaseNotes(info?.releaseNotes)}`
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
        title: 'Updates',
        message: 'Update checks are available in the installed Windows app.',
        buttons: ['OK'],
      })
      return false
    }
    if (this.checking || this.downloading || this.prompting) {
      if (manual) await this.#showMessage({
        type: 'info',
        title: 'Updates',
        message: this.downloading
          ? 'An update is already downloading.'
          : this.prompting
            ? 'An update decision is already open.'
            : 'An update check is already running.',
        buttons: ['OK'],
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
        title: `Update available: ${info?.version || 'new version'}`,
        message: `DeepSeek Harness Desktop ${info?.version || ''} is available.`,
        detail: formatUpdateDetails(info, this.currentVersion),
        buttons: ['Download update', 'Later'],
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
      title: 'No updates available',
      message: `DeepSeek Harness Desktop ${this.currentVersion} is up to date.`,
      buttons: ['OK'],
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
      title: 'Update ready to install',
      message: `DeepSeek Harness Desktop ${info?.version || ''} has been downloaded.`,
      detail: 'Restart the app to install the update. Your embedded DSH runtime will be stopped cleanly first.',
      buttons: ['Restart and install', 'Later'],
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
      title: 'Update failed',
      message: 'DeepSeek Harness Desktop could not complete the update.',
      detail: message,
      buttons: ['OK'],
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
