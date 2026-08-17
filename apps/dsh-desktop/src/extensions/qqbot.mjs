import { EventEmitter } from 'node:events'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { emitBestEffort } from '../best-effort-events.mjs'
import { renderQrDataUrl } from '../optional-integrations.mjs'

export const QQBOT_PACKAGE = '@tencent-connect/dsh-qqbot'
export const QQBOT_PATCH_START = '# --- dsh-desktop qqbot (auto-generated; do not edit) ---'
export const QQBOT_PATCH_END = '# --- end dsh-desktop qqbot ---'

function assertCredentials(credentials) {
  if (
    credentials === null
    || typeof credentials !== 'object'
    || typeof credentials.appId !== 'string'
    || credentials.appId.trim().length === 0
    || typeof credentials.appSecret !== 'string'
    || credentials.appSecret.length === 0
  ) {
    throw new TypeError('QQ Bot credentials are invalid')
  }
  return { appId: credentials.appId.trim(), appSecret: credentials.appSecret }
}

async function atomicWrite(path, content, options = {}) {
  await mkdir(dirname(path), { recursive: true })
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const temporary = `${path}.tmp-${suffix}`
  const backup = `${path}.bak-${suffix}`
  await writeFile(temporary, content, { encoding: 'utf8', mode: 0o600, flag: 'wx', ...options })
  let movedExisting = false
  try {
    try {
      await rename(path, backup)
      movedExisting = true
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    await rename(temporary, path)
    if (movedExisting) await rm(backup, { force: true })
  } catch (error) {
    await rm(temporary, { force: true })
    if (movedExisting) {
      await rm(path, { force: true })
      await rename(backup, path)
    }
    throw error
  }
}

export function qqBotPatchSection(enabled) {
  return `${QQBOT_PATCH_START}\n- id: im-qqbot\n  disabled: ${enabled ? 'false' : 'true'}\n${QQBOT_PATCH_END}\n`
}

export function mergeQqBotPatch(existing = '', enabled = false) {
  let remainder = String(existing)
  const start = remainder.indexOf(QQBOT_PATCH_START)
  if (start !== -1) {
    const end = remainder.indexOf(QQBOT_PATCH_END, start)
    if (end === -1) throw new Error('QQ Bot managed patch section is unterminated')
    const before = remainder.slice(0, start).trimEnd()
    const after = remainder.slice(end + QQBOT_PATCH_END.length).trimStart()
    remainder = [before, after].filter(Boolean).join('\n\n')
  }
  const prefix = remainder.trim()
  return prefix ? `${prefix}\n\n${qqBotPatchSection(enabled)}` : qqBotPatchSection(enabled)
}

export function readQqBotPatchEnabled(content = '') {
  const start = String(content).indexOf(QQBOT_PATCH_START)
  if (start === -1) return undefined
  const end = String(content).indexOf(QQBOT_PATCH_END, start)
  if (end === -1) throw new Error('QQ Bot managed patch section is unterminated')
  const section = String(content).slice(start, end)
  const match = /^[ \t]*disabled:[ \t]*(true|false)[ \t]*$/mu.exec(section)
  if (!match) throw new Error('QQ Bot managed patch section has no disabled state')
  return match[1] === 'false'
}

export async function setQqBotProfileEnabled({ profileDir, enabled }) {
  if (typeof profileDir !== 'string' || profileDir.length === 0) {
    throw new TypeError('profileDir is required')
  }
  const patchPath = join(profileDir, 'cordis.patch.yml')
  const existing = await readFile(patchPath, 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') return ''
    throw error
  })
  const next = mergeQqBotPatch(existing, Boolean(enabled))
  if (next === existing) return false
  await atomicWrite(patchPath, next)
  return true
}

export function maskAppId(appId) {
  const value = String(appId)
  if (value.length <= 4) return '*'.repeat(value.length)
  return `${value.slice(0, 2)}${'*'.repeat(Math.min(8, value.length - 4))}${value.slice(-2)}`
}

export class QqBotCredentialStore {
  constructor({ path, safeStorage }) {
    if (typeof path !== 'string' || path.length === 0) throw new TypeError('credential path is required')
    if (!safeStorage) throw new TypeError('safeStorage is required')
    this.path = path
    this.safeStorage = safeStorage
  }

  async load() {
    const content = await readFile(this.path, 'utf8').catch((error) => {
      if (error?.code === 'ENOENT') return undefined
      throw error
    })
    if (content === undefined) return undefined
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error('operating-system credential encryption is unavailable')
    }
    let envelope
    try {
      envelope = JSON.parse(content)
      if (envelope.version !== 1 || typeof envelope.payload !== 'string') throw new Error('unsupported envelope')
      const plaintext = this.safeStorage.decryptString(Buffer.from(envelope.payload, 'base64'))
      return assertCredentials(JSON.parse(plaintext))
    } catch (error) {
      throw new Error(`QQ Bot credential store is invalid: ${error.message}`)
    }
  }

  async save(credentials) {
    const normalized = assertCredentials(credentials)
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new Error('operating-system credential encryption is unavailable')
    }
    const encrypted = this.safeStorage.encryptString(JSON.stringify(normalized))
    const envelope = `${JSON.stringify({ version: 1, payload: encrypted.toString('base64') }, null, 2)}\n`
    await atomicWrite(this.path, envelope)
  }

  async clear() {
    await rm(this.path, { force: true })
  }
}

export function createQrDataUrl(url) {
  return renderQrDataUrl(url, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 360,
    color: { dark: '#061017ff', light: '#ffffffff' },
  })
}

function errorMessage(error) {
  return String(error instanceof Error ? error.message : error).slice(0, 1_000)
}

async function rollbackStateChange({ label, error, steps, restartRuntime, restartRequired }) {
  const rollbackErrors = []
  for (const step of [...steps].reverse()) {
    try {
      await step()
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError)
    }
  }
  if (restartRequired) {
    try {
      await restartRuntime()
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError)
    }
  }
  if (rollbackErrors.length === 0) return error
  return new Error(
    `${label} failed and rollback failed: ${errorMessage(error)}; ${rollbackErrors.map(errorMessage).join('; ')}`,
    { cause: new AggregateError([error, ...rollbackErrors]) },
  )
}

export class QqBotBindingService extends EventEmitter {
  constructor({
    initialCredentials,
    credentialStore,
    startQrConnect,
    renderQr = createQrDataUrl,
    setProfileEnabled,
    setRuntimeCredentials,
    restartRuntime,
    onEventError = () => {},
  }) {
    super()
    if (!credentialStore || typeof startQrConnect !== 'function') {
      throw new TypeError('credentialStore and startQrConnect are required')
    }
    if (typeof onEventError !== 'function') throw new TypeError('onEventError must be a function')
    this.credentials = initialCredentials ? assertCredentials(initialCredentials) : undefined
    this.credentialStore = credentialStore
    this.startQrConnect = startQrConnect
    this.renderQr = renderQr
    this.setProfileEnabled = setProfileEnabled
    this.setRuntimeCredentials = setRuntimeCredentials
    this.restartRuntime = restartRuntime
    this.onEventError = onEventError
    this.binding = false
    this.settling = false
    this.qrImage = undefined
    this.stopQr = undefined
    this.operationPromise = undefined
    this.generation = 0
  }

  status() {
    return Object.freeze({
      bound: Boolean(this.credentials),
      binding: this.binding,
      pending: this.settling,
      appId: this.credentials ? maskAppId(this.credentials.appId) : undefined,
      qrImage: this.qrImage,
    })
  }

  #publish(type, details = {}) {
    emitBestEffort(
      this,
      'event',
      [Object.freeze({ type, ...details, status: this.status() })],
      (error) => this.onEventError(error),
    )
  }

  start() {
    if (this.credentials || this.binding || this.settling) return this.status()
    this.binding = true
    this.qrImage = undefined
    const generation = ++this.generation
    const current = () => this.binding && generation === this.generation
    try {
      const connector = this.startQrConnect({
        onQrDisplayed: (url) => {
          void Promise.resolve(this.renderQr(url)).then((image) => {
            if (!current()) return
            this.qrImage = image
            this.#publish('qr')
          }).catch((error) => {
            if (current()) this.#fail(error)
          })
        },
        onQrExpired: () => {
          if (!current()) return
          this.qrImage = undefined
          this.#publish('refreshing')
        },
        onSuccess: (credentials) => {
          if (!current()) return
          this.binding = false
          this.settling = true
          this.qrImage = undefined
          this.stopQr = undefined
          this.#publish('saving')
          this.operationPromise = this.#complete(credentials?.[0], generation)
        },
        onFailure: (error) => {
          if (current()) this.#fail(error)
        },
      }, {
        displayQrCodeToConsole: false,
        source: 'dsh-desktop',
      })
      if (connector && typeof connector.then === 'function') {
        void Promise.resolve(connector).then((stop) => {
          if (typeof stop !== 'function') throw new TypeError('QQ Bot connector did not return a stop function')
          if (!current()) {
            stop()
            return
          }
          this.stopQr = stop
        }).catch((error) => {
          if (current()) this.#fail(error)
        })
      } else {
        if (typeof connector !== 'function') throw new TypeError('QQ Bot connector did not return a stop function')
        if (!current()) {
          connector()
          return this.status()
        }
        this.stopQr = connector
      }
      if (current()) this.#publish('waiting')
    } catch (error) {
      this.#fail(error)
    }
    return this.status()
  }

  async #complete(credentials, generation) {
    const rollbackSteps = []
    let restartRequired = false
    try {
      const normalized = assertCredentials(credentials)
      await this.credentialStore.save(normalized)
      rollbackSteps.push(() => this.credentialStore.clear())
      const profileChanged = await this.setProfileEnabled(true)
      if (profileChanged) {
        restartRequired = true
        rollbackSteps.push(() => this.setProfileEnabled(false))
      }
      this.setRuntimeCredentials(normalized)
      restartRequired = true
      rollbackSteps.push(() => this.setRuntimeCredentials(undefined))
      if (generation !== this.generation) return
      this.#publish('restarting')
      await this.restartRuntime()
      if (generation === this.generation) {
        this.credentials = normalized
        this.settling = false
        this.operationPromise = undefined
        this.#publish('bound')
      }
    } catch (error) {
      const restoredError = await rollbackStateChange({
        label: 'QQ Bot binding',
        error,
        steps: rollbackSteps,
        restartRuntime: this.restartRuntime,
        restartRequired,
      })
      if (generation === this.generation) this.#fail(restoredError)
    }
  }

  #fail(error) {
    const stop = this.stopQr
    this.binding = false
    this.settling = false
    this.qrImage = undefined
    this.stopQr = undefined
    this.operationPromise = undefined
    this.generation += 1
    stop?.()
    this.#publish('error', { error: error instanceof Error ? error.message : String(error) })
  }

  cancel() {
    if (!this.binding) return this.status()
    const stop = this.stopQr
    this.binding = false
    this.qrImage = undefined
    this.stopQr = undefined
    this.generation += 1
    stop?.()
    this.#publish('canceled')
    return this.status()
  }

  async unbind() {
    this.settling = true
    await this.operationPromise?.catch(() => {})
    this.settling = true
    this.cancel()
    const previousCredentials = this.credentials
    const rollbackSteps = []
    let restartRequired = false
    try {
      await this.credentialStore.clear()
      if (previousCredentials) rollbackSteps.push(() => this.credentialStore.save(previousCredentials))
      const profileChanged = await this.setProfileEnabled(false)
      if (profileChanged) {
        restartRequired = true
        rollbackSteps.push(() => this.setProfileEnabled(true))
      }
      this.setRuntimeCredentials(undefined)
      restartRequired = true
      rollbackSteps.push(() => this.setRuntimeCredentials(previousCredentials))
      this.#publish('restarting')
      await this.restartRuntime()
      this.credentials = undefined
      this.settling = false
      this.operationPromise = undefined
      this.#publish('unbound')
      return this.status()
    } catch (error) {
      const restoredError = await rollbackStateChange({
        label: 'QQ Bot unbind',
        error,
        steps: rollbackSteps,
        restartRuntime: this.restartRuntime,
        restartRequired,
      })
      this.settling = false
      this.operationPromise = undefined
      throw restoredError
    }
  }

  dispose() {
    this.cancel()
    this.removeAllListeners()
  }
}
