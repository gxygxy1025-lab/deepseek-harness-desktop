import { join } from 'node:path'

function errorMessage(error) {
  return String(error instanceof Error ? error.message : error).slice(0, 1_000)
}

function report(log, line) {
  try {
    const result = log(line)
    if (result && typeof result.then === 'function') void Promise.resolve(result).catch(() => {})
  } catch {
    // Download diagnostics must not become another rejection path.
  }
}

function filenameOf(item) {
  const value = String(item.getFilename() || '')
  const filename = value.split(/[\\/]/u).filter(Boolean).at(-1)
  if (!filename || filename === '.' || filename === '..') return 'download'
  return filename.slice(0, 255)
}

export async function promptForDownloadDestination({
  item,
  parentWindow,
  downloadsDirectory,
  showSaveDialog,
  log = () => {},
} = {}) {
  try {
    if (!item || typeof item.cancel !== 'function' || typeof item.setSavePath !== 'function') {
      throw new TypeError('download item is invalid')
    }
    if (typeof showSaveDialog !== 'function') throw new TypeError('showSaveDialog must be a function')
    if (!downloadsDirectory) throw new TypeError('downloadsDirectory is required')

    const result = await showSaveDialog(parentWindow, {
      defaultPath: join(downloadsDirectory, filenameOf(item)),
    })
    if (result?.canceled || !result?.filePath) {
      item.cancel()
      return 'canceled'
    }
    item.setSavePath(result.filePath)
    return 'selected'
  } catch (error) {
    let cancellationError
    try {
      item?.cancel?.()
    } catch (caught) {
      cancellationError = caught
    }
    const suffix = cancellationError ? `; cancellation failed: ${errorMessage(cancellationError)}` : ''
    report(log, `[download] destination selection failed: ${errorMessage(error)}${suffix}`)
    return 'failed'
  }
}
