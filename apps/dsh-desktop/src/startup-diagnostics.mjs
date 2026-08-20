import { randomUUID } from 'node:crypto'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { sanitizeLogLine } from './log-store.mjs'

export const STARTUP_DIAGNOSTICS_SCHEMA_VERSION = 1

const MAX_DIAGNOSTIC_STRING_LENGTH = 16_000
const MAX_LOG_LENGTH = 160_000
const MAX_ARRAY_ITEMS = 240
const MAX_OBJECT_ENTRIES = 240
const DEFAULT_COLLECTION_TIMEOUT_MS = 3_000
const DEFAULT_FILE_SYSTEM = { mkdir, rename, rm, writeFile }

const BEARER_CREDENTIAL = /\b(Authorization\s*:\s*(?:Bearer|Basic)\s+)([^\s]+)/giu
const SENSITIVE_ASSIGNMENT = /(\b[a-z0-9_-]*(?:token|secret|password|passwd|passphrase|credential|api[_-]?key|access[_-]?key|private[_-]?key|cookie)\b\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;}\]]+)/giu
const SENSITIVE_JSON_PROPERTY = /((?:"|')(?:npm[_-]?token|(?:deepseek|openai|anthropic)[_-]?api[_-]?key|qqbot[_-]?secret|app[_-]?secret|appsecret|api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|password|passwd|passphrase|credential|cookie|authorization)(?:"|')\s*:\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;}\]]+)/giu
const URL_CREDENTIALS = /([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+)(?::[^\s/@]+)?@/giu
const SENSITIVE_QUERY = /([?&](?:token|access_token|auth_token|api_key|apikey|key|secret|password)=)[^&#\s]+/giu
const WINDOWS_USER_PATH = /[a-z]:[\\/]+users[\\/]+[^\\/\s"'`]+/giu
const POSIX_USER_PATH = /(?:\/users|\/home)\/[^/\s"'`]+/giu

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? 'unknown error')
}

async function appendExportDiagnostic(logStore, line) {
  try {
    await logStore?.append?.(line)
  } catch {
    // Diagnostics recording must never convert a completed export into an error.
  }
}

function boundedText(value, limit = MAX_DIAGNOSTIC_STRING_LENGTH) {
  const text = String(value ?? '').replaceAll('\u0000', '')
  return text.length > limit ? `${text.slice(0, limit)}\n[truncated]` : text
}

function escapePathForExpression(value) {
  return [...String(value)].map((character) => {
    if (character === '\\' || character === '/') return '[\\\\/]'
    return character.replace(/[|\\{}()[\]^$+*?.]/gu, '\\$&')
  }).join('')
}

function normalizeRedactionRoots(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return { path: item, replacement: '<private-path>' }
      if (!item || typeof item !== 'object') return undefined
      if (typeof item.path !== 'string' || item.path.length === 0) return undefined
      return {
        path: item.path,
        replacement: typeof item.replacement === 'string' && item.replacement.length > 0
          ? item.replacement
          : '<private-path>',
      }
    })
    .filter(Boolean)
    .toSorted((left, right) => right.path.length - left.path.length)
}

function sensitiveFieldName(key) {
  const normalized = String(key).toLowerCase().replace(/[-_.]/gu, '')
  return [
    'token',
    'secret',
    'password',
    'passwd',
    'passphrase',
    'credential',
    'authorization',
    'apikey',
    'accesskey',
    'privatekey',
    'cookie',
  ].some((part) => normalized.includes(part))
}

/** Remove credentials and local-account identifiers before a diagnostic leaves the device. */
export function redactDiagnosticText(value, { redactionRoots = [], limit = MAX_DIAGNOSTIC_STRING_LENGTH } = {}) {
  let text = String(value ?? '').replaceAll('\u0000', '')
    .replace(BEARER_CREDENTIAL, '$1[redacted]')
    .replace(SENSITIVE_ASSIGNMENT, '$1[redacted]')
    .replace(SENSITIVE_JSON_PROPERTY, '$1[redacted]')
    .replace(URL_CREDENTIALS, '$1[redacted]@')
    .replace(SENSITIVE_QUERY, '$1[redacted]')
  text = sanitizeLogLine(text)

  for (const root of normalizeRedactionRoots(redactionRoots)) {
    text = text.replace(new RegExp(escapePathForExpression(root.path), 'giu'), root.replacement)
  }
  return boundedText(
    text
      .replace(WINDOWS_USER_PATH, '%USERPROFILE%')
      .replace(POSIX_USER_PATH, '~'),
    limit,
  )
}

/** Produce a bounded JSON-safe diagnostic value without credentials or recursive data. */
export function redactDiagnosticValue(value, options = {}, state = { seen: new WeakSet(), depth: 0 }) {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return redactDiagnosticText(value, options)
  if (typeof value === 'bigint') return `${String(value)}n`
  if (typeof value === 'undefined') return undefined
  if (typeof value === 'function' || typeof value === 'symbol') return `[${typeof value}]`
  if (value instanceof Error) {
    return Object.freeze({
      name: redactDiagnosticText(value.name || 'Error', options),
      message: redactDiagnosticText(value.message, options),
    })
  }
  if (state.depth >= 10) return '[truncated: nested diagnostic value]'
  if (typeof value !== 'object') return redactDiagnosticText(value, options)
  if (state.seen.has(value)) return '[circular diagnostic value]'
  state.seen.add(value)

  if (Array.isArray(value)) {
    const output = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => redactDiagnosticValue(item, options, { ...state, depth: state.depth + 1 }))
    if (value.length > MAX_ARRAY_ITEMS) output.push(`[truncated: ${value.length - MAX_ARRAY_ITEMS} items]`)
    return output
  }

  const output = {}
  let entries
  try {
    entries = Object.entries(value)
  } catch {
    return '[unavailable diagnostic value]'
  }
  for (const [index, [key, item]] of entries.entries()) {
    if (index >= MAX_OBJECT_ENTRIES) {
      output.__truncated = `${entries.length - MAX_OBJECT_ENTRIES} entries omitted`
      break
    }
    output[redactDiagnosticText(key, { ...options, limit: 256 })] = sensitiveFieldName(key)
      ? '[redacted]'
      : redactDiagnosticValue(item, options, { ...state, depth: state.depth + 1 })
  }
  return output
}

function currentRuntimeSummary(controller) {
  const status = controller?.status
  return {
    state: typeof status?.state === 'string' ? status.state : 'unknown',
    error: typeof status?.error === 'string' ? status.error : undefined,
    restartAttempt: Number.isInteger(status?.restartAttempt) ? Math.max(0, status.restartAttempt) : 0,
    ...(status?.restartBlocked === 'repeated-crash' ? { restartBlocked: status.restartBlocked } : {}),
  }
}

function boundedTimeout(operation, source, {
  timeoutMs,
  schedule,
  cancelSchedule,
  issues,
  redactionOptions,
}) {
  if (typeof operation !== 'function') return Promise.resolve(undefined)
  const work = Promise.resolve().then(operation)
  // A collector may remain queued behind recovery work. It must not make the
  // only recovery path (exporting a support file) hang with it.
  work.catch(() => {})
  let timer
  const timeout = new Promise((resolve) => {
    timer = schedule(() => resolve({ timedOut: true }), timeoutMs)
  })
  return Promise.race([
    work.then((value) => ({ value }), (error) => ({ error })),
    timeout,
  ]).then((result) => {
    cancelSchedule(timer)
    if (result.timedOut) {
      issues.push({ source, message: `collection timed out after ${timeoutMs}ms` })
      return undefined
    }
    if (result.error !== undefined) {
      issues.push({ source, message: redactDiagnosticText(asErrorMessage(result.error), redactionOptions) })
      return undefined
    }
    return result.value
  })
}

/** Gather the startup state independently so one broken subsystem cannot block export. */
export async function collectStartupDiagnostics({
  application = {},
  controller,
  pluginRecovery,
  pluginManager,
  logStore,
  now = () => new Date(),
  redactionRoots = [],
  collectionTimeoutMs = DEFAULT_COLLECTION_TIMEOUT_MS,
  schedule = setTimeout,
  cancelSchedule = clearTimeout,
} = {}) {
  const timeoutMs = Number.isInteger(collectionTimeoutMs) && collectionTimeoutMs > 0
    ? collectionTimeoutMs
    : DEFAULT_COLLECTION_TIMEOUT_MS
  const redactionOptions = { redactionRoots }
  const collectionIssues = []
  const [recovery, inventory, recentRuntimeLog] = await Promise.all([
    boundedTimeout(
      typeof pluginRecovery?.getDiagnostics === 'function'
        ? () => pluginRecovery.getDiagnostics({ runtime: currentRuntimeSummary(controller) })
        : undefined,
      'plugin-recovery',
      { timeoutMs, schedule, cancelSchedule, issues: collectionIssues, redactionOptions },
    ),
    boundedTimeout(
      typeof pluginManager?.inventory === 'function' ? () => pluginManager.inventory() : undefined,
      'plugin-inventory',
      { timeoutMs, schedule, cancelSchedule, issues: collectionIssues, redactionOptions },
    ),
    boundedTimeout(
      typeof logStore?.tail === 'function' ? () => logStore.tail(600) : undefined,
      'runtime-log',
      { timeoutMs, schedule, cancelSchedule, issues: collectionIssues, redactionOptions },
    ),
  ])
  const generatedAt = now()
  const document = {
    schemaVersion: STARTUP_DIAGNOSTICS_SCHEMA_VERSION,
    generatedAt: generatedAt instanceof Date && Number.isFinite(generatedAt.valueOf())
      ? generatedAt.toISOString()
      : new Date().toISOString(),
    application: {
      productName: application.productName,
      version: application.version,
      platform: application.platform,
      arch: application.arch,
      osRelease: application.osRelease,
      runtimeVersion: application.runtimeVersion,
    },
    runtime: currentRuntimeSummary(controller),
    startup: {
      recentRuntimeLog: typeof recentRuntimeLog === 'string'
        ? redactDiagnosticText(recentRuntimeLog, { ...redactionOptions, limit: MAX_LOG_LENGTH })
        : undefined,
    },
    recovery,
    plugins: inventory,
    collectionIssues,
  }
  const redacted = redactDiagnosticValue(document, redactionOptions)
  if (typeof recentRuntimeLog === 'string' && redacted?.startup && typeof redacted.startup === 'object') {
    redacted.startup.recentRuntimeLog = redactDiagnosticText(recentRuntimeLog, {
      ...redactionOptions,
      limit: MAX_LOG_LENGTH,
    })
  }
  return redacted
}

export function startupDiagnosticsFilename(now = new Date()) {
  const date = now instanceof Date && Number.isFinite(now.valueOf()) ? now : new Date()
  const stamp = date.toISOString().slice(0, 19).replace('T', '_').replaceAll(':', '-')
  return `dsh-startup-diagnostics-${stamp}.json`
}

/** Atomically replace an explicitly selected export path, preserving it on failure. */
export async function writeStartupDiagnostics(path, content, {
  fileSystem = DEFAULT_FILE_SYSTEM,
  randomId = randomUUID,
} = {}) {
  if (typeof path !== 'string' || path.length === 0) throw new TypeError('diagnostic export path is required')
  const directory = dirname(path)
  const temporary = join(directory, `.${randomId()}.dsh-startup-diagnostics.tmp`)
  const backup = join(directory, `.${randomId()}.dsh-startup-diagnostics.bak`)
  await fileSystem.mkdir(directory, { recursive: true })
  try {
    await fileSystem.writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' })
  } catch (error) {
    await fileSystem.rm(temporary, { force: true }).catch(() => {})
    throw error
  }
  let movedExisting = false
  try {
    try {
      await fileSystem.rename(path, backup)
      movedExisting = true
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    await fileSystem.rename(temporary, path)
    if (movedExisting) await fileSystem.rm(backup, { force: true })
  } catch (error) {
    await fileSystem.rm(temporary, { force: true }).catch(() => {})
    if (movedExisting) {
      await fileSystem.rm(path, { force: true }).catch(() => {})
      await fileSystem.rename(backup, path).catch(() => {})
    }
    throw error
  }
}

/** Ask the user for a destination, then export a privacy-redacted startup diagnostic package. */
export async function exportStartupDiagnostics({
  dialog,
  getWindow = () => undefined,
  downloadsDirectory,
  logStore,
  now = () => new Date(),
  writeDiagnostics = writeStartupDiagnostics,
  ...collectOptions
} = {}) {
  if (typeof dialog?.showSaveDialog !== 'function') {
    throw new Error('diagnostic export is unavailable')
  }
  const defaultName = startupDiagnosticsFilename(now())
  let result
  try {
    result = await dialog.showSaveDialog(getWindow(), {
      title: '导出启动诊断日志',
      buttonLabel: '导出',
      defaultPath: typeof downloadsDirectory === 'string' && downloadsDirectory.length > 0
        ? join(downloadsDirectory, defaultName)
        : defaultName,
      filters: [{ name: 'DSH startup diagnostics', extensions: ['json'] }],
      showOverwriteConfirmation: true,
    })
  } catch (error) {
    const message = redactDiagnosticText(asErrorMessage(error), { redactionRoots: collectOptions.redactionRoots })
    await appendExportDiagnostic(logStore, `[diagnostics] startup diagnostic save dialog failed: ${message}`)
    throw new Error('无法打开诊断日志保存窗口。请稍后重试。')
  }
  if (result?.canceled || typeof result?.filePath !== 'string' || result.filePath.length === 0) {
    return Object.freeze({ canceled: true })
  }
  try {
    const diagnostics = await collectStartupDiagnostics({ ...collectOptions, logStore, now })
    await writeDiagnostics(result.filePath, `${JSON.stringify(diagnostics, null, 2)}\n`)
    await appendExportDiagnostic(logStore, '[diagnostics] startup diagnostic package exported')
    return Object.freeze({ canceled: false, exported: true })
  } catch (error) {
    const message = redactDiagnosticText(asErrorMessage(error), { redactionRoots: collectOptions.redactionRoots })
    await appendExportDiagnostic(logStore, `[diagnostics] startup diagnostic export failed: ${message}`)
    throw new Error('无法导出诊断日志。请重新选择一个可写入的位置。')
  }
}
