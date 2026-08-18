import { link, mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'

export const UPDATE_SHUTDOWN_RECEIPT_SCHEMA_VERSION = 2
export const UPDATE_SHUTDOWN_RECEIPT_MARKER = 'update-shutdown-v2'
export const UPDATE_SHUTDOWN_TOKEN_PATTERN = /^[a-f0-9]{64}$/u

/** Parse the fixed update-shutdown switch and its optional v2 token. */
export function parseUpdateShutdownRequest(commandLine = [], additionalData) {
  const requested = additionalData?.shutdownForUpdate === true
    || commandLine.includes('--shutdown-for-update')
  if (!requested) return undefined

  const commandLineTokens = commandLine
    .filter((argument) => typeof argument === 'string' && argument.startsWith('--shutdown-token='))
    .map((argument) => argument.slice('--shutdown-token='.length))
  const additionalToken = typeof additionalData?.shutdownToken === 'string'
    ? additionalData.shutdownToken
    : undefined
  const candidates = additionalToken === undefined
    ? commandLineTokens
    : [...commandLineTokens, additionalToken]
  const distinct = [...new Set(candidates)]
  const token = distinct.length === 1 && UPDATE_SHUTDOWN_TOKEN_PATTERN.test(distinct[0])
    ? distinct[0]
    : undefined
  return Object.freeze({ requested: true, token })
}

/** The receipt path is derived exclusively from a high-entropy token. */
export function updateShutdownReceiptPath(token, temporaryDirectory = tmpdir()) {
  if (!UPDATE_SHUTDOWN_TOKEN_PATTERN.test(token)) {
    throw new TypeError('invalid update shutdown token')
  }
  return join(temporaryDirectory, `dsh-desktop-shutdown-${token}.json`)
}

/** Build the bounded receipt document written after complete shutdown. */
export function createUpdateShutdownReceipt({
  token,
  pid = process.pid,
  runtimeStopped,
  extensionsQuiesced,
  writtenAt = new Date().toISOString(),
}) {
  if (!UPDATE_SHUTDOWN_TOKEN_PATTERN.test(token)) throw new TypeError('invalid update shutdown token')
  if (!Number.isInteger(pid) || pid <= 0) throw new TypeError('invalid update shutdown pid')
  if (runtimeStopped !== true) throw new TypeError('runtime must be stopped before writing the update receipt')
  if (extensionsQuiesced !== true) throw new TypeError('extensions must be quiesced before writing the update receipt')
  if (typeof writtenAt !== 'string' || !Number.isFinite(Date.parse(writtenAt))) {
    throw new TypeError('invalid update shutdown timestamp')
  }
  return Object.freeze({
    schemaVersion: UPDATE_SHUTDOWN_RECEIPT_SCHEMA_VERSION,
    token,
    pid,
    runtimeStopped: true,
    extensionsQuiesced: true,
    writtenAt,
  })
}

/** Validate an untrusted receipt read by tests or protocol peers. */
export function validateUpdateShutdownReceipt(value, { token, pid } = {}) {
  if (typeof value !== 'object' || value === null) return false
  if (value.schemaVersion !== UPDATE_SHUTDOWN_RECEIPT_SCHEMA_VERSION) return false
  if (!UPDATE_SHUTDOWN_TOKEN_PATTERN.test(value.token)) return false
  if (token !== undefined && value.token !== token) return false
  if (!Number.isInteger(value.pid) || value.pid <= 0) return false
  if (pid !== undefined && value.pid !== pid) return false
  if (value.runtimeStopped !== true || value.extensionsQuiesced !== true) return false
  if (typeof value.writtenAt !== 'string' || !Number.isFinite(Date.parse(value.writtenAt))) return false
  return true
}

/**
 * Atomically publish one receipt without replacing an existing target.
 * A fully written temporary file is hard-linked into the fixed target name;
 * link creation is atomic and fails closed when the target already exists.
 */
export async function writeUpdateShutdownReceipt(options, { temporaryDirectory = tmpdir() } = {}) {
  const receipt = createUpdateShutdownReceipt(options)
  const target = updateShutdownReceiptPath(receipt.token, temporaryDirectory)
  await mkdir(temporaryDirectory, { recursive: true })
  const temporary = join(
    temporaryDirectory,
    `.${basename(target)}.${receipt.pid}.${randomBytes(8).toString('hex')}.tmp`,
  )
  try {
    await writeFile(temporary, `${JSON.stringify(receipt)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    const verified = JSON.parse(await readFile(temporary, 'utf8'))
    if (!validateUpdateShutdownReceipt(verified, { token: receipt.token, pid: receipt.pid })) {
      throw new Error('update shutdown receipt temporary verification failed')
    }
    await link(temporary, target)
    return target
  } finally {
    await unlink(temporary).catch((error) => {
      if (error?.code !== 'ENOENT') throw error
    })
  }
}

/** Read and validate a receipt at its token-derived path. */
export async function readUpdateShutdownReceipt(token, { temporaryDirectory = tmpdir(), pid } = {}) {
  const path = updateShutdownReceiptPath(token, temporaryDirectory)
  const parsed = JSON.parse(await readFile(path, 'utf8'))
  if (!validateUpdateShutdownReceipt(parsed, { token, pid })) {
    throw new Error('invalid update shutdown receipt')
  }
  return parsed
}
