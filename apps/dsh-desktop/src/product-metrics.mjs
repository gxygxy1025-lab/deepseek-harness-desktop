import { sessionDurationBucket, startupDurationBucket } from './telemetry-events.mjs'

const UPDATE_OUTCOMES = Object.freeze({
  current: 'current',
  downloading: 'available',
  ready: 'downloaded',
  installing: 'install-requested',
  error: 'error',
})

export function classifyRuntimeStartFailure(status) {
  if (status?.restartBlocked === 'repeated-crash') return 'repeated-crash'
  if (typeof status?.error !== 'string' || status.error.length === 0) return 'unknown'
  const message = status.error.toLowerCase()
  if (/integrity|checksum|hash mismatch/u.test(message)) return 'integrity-failed'
  if (/\bmissing\b|\bnot found\b|enoent/u.test(message)) return 'runtime-missing'
  if (/eaddrinuse|address already in use|port conflict/u.test(message)) return 'port-conflict'
  return 'startup-failed'
}

/**
 * Converts product activity into the fixed anonymous event vocabulary.
 * Raw errors and operation results are used only for local control flow and
 * can never become event dimensions.
 */
export class ProductMetricsRecorder {
  constructor({ client, now = () => performance.now() }) {
    this.client = client
    this.now = now
    this.sessionStartedAt = now()
    this.runtimeStartedAt = undefined
    this.updateDetail = 'none'
    this.lastUpdatePhase = undefined
    this.launchRecorded = false
    this.sessionEndRecorded = false
  }

  #record(name, dimensions) {
    try {
      return this.client?.record?.(name, dimensions) === true
    } catch {
      return false
    }
  }

  recordLaunch(detail = 'unknown') {
    if (this.launchRecorded) return false
    this.launchRecorded = true
    return this.#record('app_launch', { outcome: 'started', detail, bucket: 'none' })
  }

  recordRecovery(detail) {
    return this.#record('runtime_recovery_action', {
      outcome: 'requested',
      detail,
      bucket: 'none',
    })
  }

  recordSurface(detail) {
    return this.#record('surface_opened', { outcome: 'opened', detail, bucket: 'none' })
  }

  observeRuntimeStatus(status) {
    if (status?.state === 'starting') {
      if (this.runtimeStartedAt === undefined) this.runtimeStartedAt = this.now()
      return
    }
    if (this.runtimeStartedAt === undefined || !['ready', 'crashed'].includes(status?.state)) return
    const duration = this.now() - this.runtimeStartedAt
    this.runtimeStartedAt = undefined
    this.#record('runtime_start_result', {
      outcome: status.state === 'ready' ? 'ready' : 'failed',
      detail: status.state === 'ready' ? 'none' : classifyRuntimeStartFailure(status),
      bucket: startupDurationBucket(duration),
    })
  }

  observeUpdateStatus(status) {
    const phase = status?.phase
    if (phase === 'checking') {
      this.updateDetail = status.visible === true ? 'manual' : 'automatic'
      this.lastUpdatePhase = phase
      return
    }
    if (phase === this.lastUpdatePhase) return
    this.lastUpdatePhase = phase
    const outcome = UPDATE_OUTCOMES[phase]
    if (outcome === undefined) return
    this.#record('update_result', {
      outcome,
      detail: this.updateDetail,
      bucket: 'none',
    })
  }

  async trackExtensionOperation(detail, operation) {
    try {
      const result = await operation()
      this.#record('extension_operation', { outcome: 'success', detail, bucket: 'none' })
      return result
    } catch (error) {
      this.#record('extension_operation', { outcome: 'failure', detail, bucket: 'none' })
      throw error
    }
  }

  recordSessionEnd() {
    if (this.sessionEndRecorded) return false
    this.sessionEndRecorded = true
    return this.#record('app_session_end', {
      outcome: 'closed',
      detail: 'normal',
      bucket: sessionDurationBucket(this.now() - this.sessionStartedAt),
    })
  }
}
