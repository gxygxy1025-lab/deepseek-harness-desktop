/**
 * Durable Host scheduler for Task Board v3.
 *
 * The Host owns claiming and advancing a cron slot. A provider-owned runner
 * receives the already-persisted TaskRun and may use the existing session or
 * Worktree execution path; this module never opens a second execution model.
 * If no runner capability is supplied, it reports a client fallback instead
 * of claiming slots and starving the legacy browser scheduler.
 */

import { createTaskRunReference, type Evidence, type Project, type RuntimeProviderEvidence, type TaskRunReference } from '../core/runs.ts'
import { defaultTimeZone, isValidTimeZone, nextRunAtMsInTimeZone } from '../core/schedule.ts'
import {
  canHostSchedulerOwnTask,
  isHostSchedulerActive,
  isHostSchedulerTaskOwnership,
  MAX_HOST_SCHEDULER_OWNED_TASK_IDS,
  scheduledTaskProject,
  type HostSchedulerStatus,
  type HostSchedulerTaskOwnership,
} from '../core/scheduler-authority.ts'
import { settleExecution, startExecution, withSchedule, type ExecutionRecord, type ScheduleFailure, type ScheduleLease, type TaskRecord } from '../core/tasks.ts'
import type { TaskLedgerDocumentV3 } from '../core/store-v3.ts'
import type { HostTaskStoreV3 } from './v3-file-store.ts'

export {
  canHostSchedulerOwnTask,
  isHostSchedulerActive,
  type HostSchedulerMode,
  type HostSchedulerStatus,
  type HostSchedulerTaskOwnership,
} from '../core/scheduler-authority.ts'

/** A fakeable timer face; tests never need wall-clock waits. */
export interface HostSchedulerTimers {
  setInterval(callback: () => void, ms: number): unknown
  clearInterval(handle: unknown): void
}

/** Existing TaskRun / Evidence objects are deliberately passed through. */
export interface HostScheduledRunInput {
  task: TaskRecord
  project?: Project
  execution: ExecutionRecord
  run: TaskRunReference
  scheduledAt: number
  executionKey: string
}

/** Host-only preflight input. It deliberately contains no renderer path. */
export interface HostScheduledTaskEligibilityInput {
  task: TaskRecord
  project?: Project
}

export type HostScheduledRunResult =
  | {
    /** The provider accepted a real session/job and will settle it later. */
    kind: 'accepted'
    sessionId?: string
    workspaceId?: string
    run?: TaskRunReference
    evidence?: Evidence
  }
  | {
    /** The provider completed synchronously (useful for a host-job adapter). */
    kind: 'settled'
    outcome: 'succeeded' | 'failed' | 'cancelled'
    error?: string
    sessionId?: string
    workspaceId?: string
    run?: TaskRunReference
    evidence?: Evidence
  }

/**
 * Runtime Provider integration seam. Implementations must drive the existing
 * Session/Worktree/Evidence flow and return its TaskRun/Evidence references;
 * the scheduler only owns durable admission, de-duplication and settlement
 * bookkeeping. `executionKey` is the provider idempotency key: a lease
 * takeover can re-submit the same admitted TaskRun after a Host crash.
 */
export interface HostScheduledTaskRunner {
  readonly provider?: 'runtime-provider-host-job' | 'task-board-host'
  readonly evidence?: RuntimeProviderEvidence
  /** Serializable boundary used by the browser to avoid duplicate dispatch. */
  readonly taskOwnership: HostSchedulerTaskOwnership
  /**
   * Runtime preflight for capability facts not stored in the ledger (for
   * example a registered workspace or configured model). Returning false
   * leaves the task entirely to the browser scheduler.
   */
  canOwnTask(input: HostScheduledTaskEligibilityInput): boolean | Promise<boolean>
  run(input: HostScheduledRunInput): Promise<HostScheduledRunResult>
}

export interface HostDurableSchedulerOptions {
  store: HostTaskStoreV3
  /** Omit when the runtime has no host-job capability: browser fallback wins. */
  runner?: HostScheduledTaskRunner
  ownerId: string
  now?: () => number
  timers?: HostSchedulerTimers
  tickMs?: number
  leaseMs?: number
  /** Used only for legacy rules that do not yet persist an IANA zone. */
  defaultTimeZone?: string
}

type Claim =
  | { kind: 'none' }
  | { kind: 'dispatch'; input: HostScheduledRunInput }

const DEFAULT_TICK_MS = 60_000
const DEFAULT_LEASE_MS = 90_000

/**
 * Stable, safe TaskRun id for a cron slot. The slot is minute-granular and
 * hashes the task id, so replaying the same persisted `scheduledAt` cannot
 * create a second run even after a process crash or lease takeover.
 */
export function scheduledExecutionKey(taskId: string, scheduledAt: number): string {
  const slot = Math.floor(scheduledAt / 60_000)
  return `schedule-${stableHash(taskId)}-${slot.toString(36)}`
}

/**
 * Host-owned durable cron scheduler. Calls to `tick` serialize admission work
 * and launch accepted runners after the ledger transition commits. A long
 * provider run never holds the tick lock: subsequent ticks renew leases while
 * the task's persisted running record prevents a duplicate dispatch.
 */
export class HostDurableScheduler {
  private readonly now: () => number
  private readonly timers: HostSchedulerTimers
  private readonly tickMs: number
  private readonly leaseMs: number
  private readonly defaultTimeZone: string
  private timer: unknown
  private disposed = false
  private ticking = false
  private ownershipReady = false
  private ownedTaskIds = new Set<string>()
  private readonly dispatches = new Set<Promise<void>>()

  constructor(private readonly options: HostDurableSchedulerOptions) {
    if (options.ownerId.trim() === '' || options.ownerId.length > 128) throw new TypeError('scheduler ownerId is required')
    this.now = options.now ?? Date.now
    this.timers = options.timers ?? {
      setInterval: (callback, ms) => setInterval(callback, ms),
      clearInterval: handle => clearInterval(handle as ReturnType<typeof setInterval>),
    }
    this.tickMs = Math.max(1, options.tickMs ?? DEFAULT_TICK_MS)
    this.leaseMs = Math.max(this.tickMs, options.leaseMs ?? DEFAULT_LEASE_MS)
    this.defaultTimeZone = options.defaultTimeZone !== undefined && isValidTimeZone(options.defaultTimeZone)
      ? options.defaultTimeZone
      : defaultTimeZone()
  }

  status(): HostSchedulerStatus {
    const runner = this.eligibleRunner()
    if (runner === undefined) {
      return {
        available: false,
        mode: 'client-fallback',
        provider: 'unavailable',
        reason: 'Runtime Provider task-scoped host-job capability is unavailable; browser scheduler remains active.',
      }
    }
    if (!this.ownershipReady) {
      return {
        available: false,
        mode: 'client-fallback',
        provider: 'unavailable',
        reason: 'Runtime Provider is checking task eligibility; browser scheduler remains active until Host ownership is published.',
      }
    }
    return {
      available: true,
      mode: 'host',
      provider: runner.provider ?? 'task-board-host',
      taskOwnership: runner.taskOwnership,
      ownedTaskIds: [...this.ownedTaskIds].sort(),
    }
  }

  start(): void {
    if (this.disposed || this.timer !== undefined || this.eligibleRunner() === undefined) return
    void this.tick()
    this.timer = this.timers.setInterval(() => { void this.tick() }, this.tickMs)
  }

  stop(): void {
    this.dispose()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.timer !== undefined) {
      this.timers.clearInterval(this.timer)
      this.timer = undefined
    }
  }

  /** Drive one deterministic admission pass. It intentionally does not wait for agent work. */
  async tick(): Promise<void> {
    if (this.disposed || this.ticking || this.eligibleRunner() === undefined) return
    this.ticking = true
    try {
      const snapshot = await this.options.store.load()
      await this.refreshOwnership(snapshot)
      const now = this.now()
      for (const task of snapshot.tasks) {
        if (!this.ownedTaskIds.has(task.id)) continue
        const claim = await this.options.store.mutate(document => this.claim(document, task.id, now))
        if (claim.kind !== 'dispatch') continue
        this.launch(claim.input)
      }
    } finally {
      this.ticking = false
    }
  }

  /** Await currently launched fake/provider runs in focused tests. */
  async drain(): Promise<void> {
    await Promise.all([...this.dispatches])
  }

  /** A Host runner must expose both a static boundary and its live preflight. */
  private eligibleRunner(): HostScheduledTaskRunner | undefined {
    const runner = this.options.runner
    if (runner === undefined || !isHostSchedulerTaskOwnership(runner.taskOwnership) || typeof runner.canOwnTask !== 'function') return undefined
    return runner
  }

  /** Publish only task ids that passed static and live runner eligibility. */
  private async refreshOwnership(document: TaskLedgerDocumentV3): Promise<void> {
    const runner = this.eligibleRunner()
    if (runner === undefined) {
      this.ownedTaskIds.clear()
      this.ownershipReady = false
      return
    }
    const owned = new Set<string>()
    for (const task of document.tasks) {
      if (owned.size >= MAX_HOST_SCHEDULER_OWNED_TASK_IDS) break
      if (task.schedule?.enabled !== true) continue
      const project = scheduledTaskProject(task, document.projects)
      if (!await this.canOwnTask(task, project)) continue
      owned.add(task.id)
    }
    this.ownedTaskIds = owned
    this.ownershipReady = true
  }

  /** Never turn an eligibility/preflight error into a durable failed TaskRun. */
  private async canOwnTask(task: TaskRecord, project: Project | undefined): Promise<boolean> {
    const runner = this.eligibleRunner()
    if (runner === undefined || !canHostSchedulerOwnTask(runner.taskOwnership, task, project)) return false
    try {
      return await runner.canOwnTask({ task, ...(project === undefined ? {} : { project }) })
    } catch {
      return false
    }
  }

  private launch(input: HostScheduledRunInput): void {
    const dispatched = this.dispatch(input)
    this.dispatches.add(dispatched)
    void dispatched.finally(() => { this.dispatches.delete(dispatched) })
  }

  private async dispatch(input: HostScheduledRunInput): Promise<void> {
    try {
      const result = await this.options.runner!.run(input)
      await this.options.store.mutate(document => this.applyRunnerResult(document, input, result, this.now()))
    } catch (error) {
      const message = boundedError(error)
      const result: HostScheduledRunResult = { kind: 'settled', outcome: 'failed', error: message }
      await this.options.store.mutate(document => this.applyRunnerResult(document, input, result, this.now()))
    }
  }

  private async claim(document: TaskLedgerDocumentV3, taskId: string, now: number): Promise<{ result: Claim; changed: boolean }> {
    const index = document.tasks.findIndex(task => task.id === taskId)
    if (index === -1) {
      this.ownedTaskIds.delete(taskId)
      return { result: { kind: 'none' }, changed: false }
    }
    const task = document.tasks[index]
    const schedule = task.schedule
    if (schedule === undefined || !schedule.enabled) {
      this.ownedTaskIds.delete(taskId)
      return { result: { kind: 'none' }, changed: false }
    }
    const project = scheduledTaskProject(task, document.projects)
    // The published id set is the browser-facing ownership decision. Check it
    // again while the v3 mutation is serialized, then repeat the runner's
    // live preflight against the current ledger before writing a lease or run.
    if (!this.ownedTaskIds.has(taskId) || !await this.canOwnTask(task, project)) {
      this.ownedTaskIds.delete(taskId)
      return { result: { kind: 'none' }, changed: false }
    }
    // A browser may have read an earlier fallback snapshot, then won the v3
    // execution-start write just before this mutation. Its random TaskRun is
    // not a Host cron slot: do not attach a lease, advance its cursor, or
    // create a revision that can make the browser's later settlement stale.
    // Only the exact deterministic Host slot may continue through running,
    // queue-next, and crash-recovery bookkeeping.
    if (taskIsRunning(task) && !hasActiveHostScheduledRun(task, schedule)) {
      this.ownedTaskIds.delete(taskId)
      return { result: { kind: 'none' }, changed: false }
    }
    const priorLease = schedule.lease
    const lease = claimLease(priorLease, this.options.ownerId, now, this.leaseMs)
    if (lease === undefined) return { result: { kind: 'none' }, changed: false }
    const timezone = schedule.timezone ?? this.defaultTimeZone
    const running = taskIsRunning(task)
    const patchBase = {
      lease,
      providerEvidence: this.options.runner?.evidence ?? schedule.providerEvidence ?? {
        capabilities: [{ id: 'host-schedule', status: 'available' as const }],
        note: 'task-board durable Host scheduler',
      },
    }

    // A process can die after the atomic admission write but before its
    // runner persists a session identity. Only an expired foreign lease may
    // resume that exact admitted slot. A known session is intentionally never
    // re-dispatched here: its provider owns settlement/reconciliation.
    if (priorLease !== undefined && priorLease.ownerId !== this.options.ownerId && priorLease.expiresAt <= now) {
      const recovered = this.recoverUnstartedClaim(document, index, schedule, now, patchBase)
      if (recovered !== undefined) return recovered
    }

    // A queue-next slot has already advanced the cron cursor. Run it once the
    // previous TaskRun settled, before considering a later cron occurrence.
    // While it is still running, continue rolling the cursor forward without
    // creating a second queued slot: queue-next means exactly one catch-up.
    if (schedule.queuedAt !== undefined) {
      if (running) {
        const currentNext = schedule.nextRunAt ?? nextRunAtMsInTimeZone(schedule.cron, now, timezone)
        const nextRunAt = currentNext !== undefined && currentNext <= now
          ? nextRunAtMsInTimeZone(schedule.cron, now, timezone)
          : currentNext
        document.tasks[index] = withSchedule(task, { ...patchBase, nextRunAt }, now)
        return { result: { kind: 'none' }, changed: true }
      }
      return this.dispatchClaim(document, index, schedule.queuedAt, now, patchBase, true)
    }

    if (schedule.nextRunAt === undefined) {
      const repaired = nextRunAtMsInTimeZone(schedule.cron, now, timezone)
      document.tasks[index] = withSchedule(task, { ...patchBase, nextRunAt: repaired }, now)
      return { result: { kind: 'none' }, changed: true }
    }
    if (schedule.nextRunAt > now) {
      document.tasks[index] = withSchedule(task, patchBase, now)
      return { result: { kind: 'none' }, changed: true }
    }

    const scheduledAt = schedule.nextRunAt
    const nextAfterDue = nextRunAtMsInTimeZone(schedule.cron, scheduledAt, timezone)
    const missedAnAdditionalSlot = nextAfterDue !== undefined && now >= nextAfterDue
    if (missedAnAdditionalSlot && (schedule.misfirePolicy ?? 'skip') === 'skip') {
      document.tasks[index] = withSchedule(task, {
        ...patchBase,
        nextRunAt: nextRunAtMsInTimeZone(schedule.cron, now, timezone),
      }, now)
      return { result: { kind: 'none' }, changed: true }
    }

    // run-once coalesces any sleep/restart gap into the one persisted due slot.
    const nextRunAt = missedAnAdditionalSlot
      ? nextRunAtMsInTimeZone(schedule.cron, now, timezone)
      : nextAfterDue
    if (running) {
      document.tasks[index] = withSchedule(task, {
        ...patchBase,
        nextRunAt,
        ...(schedule.runningPolicy === 'queue-next' ? { queuedAt: scheduledAt } : {}),
      }, now)
      return { result: { kind: 'none' }, changed: true }
    }
    return this.dispatchClaim(document, index, scheduledAt, now, { ...patchBase, nextRunAt }, false)
  }

  /** Persist nextRunAt and the TaskRun together before the external runner sees it. */
  private dispatchClaim(
    document: TaskLedgerDocumentV3,
    index: number,
    scheduledAt: number,
    now: number,
    patch: Parameters<typeof withSchedule>[1],
    fromQueue: boolean,
  ): { result: Claim; changed: boolean } {
    const task = document.tasks[index]
    const executionKey = scheduledExecutionKey(task.id, scheduledAt)
    if (hasExecutionKey(task, executionKey)) {
      document.tasks[index] = withSchedule(task, {
        ...patch,
        ...(fromQueue ? { queuedAt: undefined } : {}),
      }, now)
      return { result: { kind: 'none' }, changed: true }
    }
    const project = task.projectId === undefined ? undefined : document.projects.find(candidate => candidate.id === task.projectId)
    const workspaceId = project?.workspaceId ?? 'scheduled'
    const opened = startExecution(task, now, executionKey)
    const execution: ExecutionRecord = { ...opened.execution, workspaceId }
    const startedTask: TaskRecord = {
      ...opened.task,
      executions: opened.task.executions.map(candidate => candidate.id === execution.id ? execution : candidate),
    }
    const run = createTaskRunReference({
      runId: executionKey,
      workspaceId,
      startedAt: now,
      resultStatus: 'running',
      runtimeProviderEvidence: this.options.runner?.evidence ?? { note: 'task-board durable Host scheduler' },
    })
    const scheduledTask = withSchedule({
      ...startedTask,
      runs: [...(startedTask.runs ?? []), run],
    }, {
      ...patch,
      lastTriggeredAt: now,
      lastRunId: executionKey,
      lastScheduledAt: scheduledAt,
      queuedAt: undefined,
      lastFailure: undefined,
    }, now)
    document.tasks[index] = scheduledTask
    return {
      result: {
        kind: 'dispatch',
        input: { task: scheduledTask, project, execution, run, scheduledAt, executionKey },
      },
      changed: true,
    }
  }

  /** Re-dispatch an admitted but unstarted slot without appending another run. */
  private recoverUnstartedClaim(
    document: TaskLedgerDocumentV3,
    index: number,
    schedule: NonNullable<TaskRecord['schedule']>,
    now: number,
    patch: Parameters<typeof withSchedule>[1],
  ): { result: Claim; changed: boolean } | undefined {
    const task = document.tasks[index]
    const scheduledAt = schedule.lastScheduledAt
    const executionKey = schedule.lastRunId
    if (scheduledAt === undefined || executionKey === undefined || scheduledExecutionKey(task.id, scheduledAt) !== executionKey) return undefined
    const execution = task.executions.find(candidate => (candidate.runId ?? candidate.id) === executionKey
      && candidate.finishedAt === undefined && candidate.endedAt === undefined)
    const run = task.runs?.find(candidate => candidate.runId === executionKey && candidate.resultStatus === 'running')
    // If either side has a Session id, a real provider has taken ownership and
    // a fresh Host must not issue another agent prompt for that TaskRun.
    if (execution === undefined || run === undefined || execution.sessionId !== undefined || run.sessionId !== undefined) return undefined
    const project = task.projectId === undefined ? undefined : document.projects.find(candidate => candidate.id === task.projectId)
    const workspaceId = execution.workspaceId ?? run.workspaceId ?? project?.workspaceId ?? 'scheduled'
    const recoveredExecution = execution.workspaceId === workspaceId ? execution : { ...execution, workspaceId }
    const recoveredRun = run.workspaceId === workspaceId ? run : { ...run, workspaceId }
    const recoveredTask = withSchedule({
      ...task,
      executions: task.executions.map(candidate => candidate === execution ? recoveredExecution : candidate),
      runs: task.runs?.map(candidate => candidate === run ? recoveredRun : candidate),
    }, { ...patch, lastFailure: undefined }, now)
    document.tasks[index] = recoveredTask
    return {
      result: {
        kind: 'dispatch',
        input: {
          task: recoveredTask,
          project,
          execution: recoveredExecution,
          run: recoveredRun,
          scheduledAt,
          executionKey,
        },
      },
      changed: true,
    }
  }

  private applyRunnerResult(
    document: TaskLedgerDocumentV3,
    input: HostScheduledRunInput,
    result: HostScheduledRunResult,
    now: number,
  ): { result: undefined; changed: boolean } {
    const index = document.tasks.findIndex(task => task.id === input.task.id)
    if (index === -1) return { result: undefined, changed: false }
    const task = document.tasks[index]
    if (!hasExecutionKey(task, input.executionKey)) return { result: undefined, changed: false }
    const workspaceId = result.workspaceId ?? result.run?.workspaceId ?? input.run.workspaceId
    const sessionId = result.sessionId ?? result.run?.sessionId
    const error = result.kind === 'settled' ? boundedError(result.error) : undefined
    let next = attachScheduledStart(task, input.executionKey, workspaceId, sessionId, now, result.run)
    if (result.kind === 'settled') {
      next = settleScheduledRun(next, input.executionKey, result.outcome, error, now, result.run)
      const failure: ScheduleFailure | undefined = result.outcome === 'failed'
        ? { at: now, executionKey: input.executionKey, message: error ?? 'scheduled runner failed' }
        : undefined
      next = withSchedule(next, { lastFailure: failure }, now)
    }
    // Evidence is accepted only for this deterministic TaskRun. A provider
    // cannot accidentally attach another task's derived record while it is
    // completing an asynchronously observed session.
    if (result.evidence?.runId === input.executionKey) {
      document.evidences = [
        ...document.evidences.filter(evidence => evidence.evidenceId !== result.evidence!.evidenceId),
        structuredClone(result.evidence),
      ]
      next = {
        ...next,
        runs: (next.runs ?? []).map(run => run.runId === input.executionKey
          ? { ...run, evidenceId: result.evidence!.evidenceId }
          : run),
      }
    }
    document.tasks[index] = next
    return { result: undefined, changed: true }
  }
}

function claimLease(current: ScheduleLease | undefined, ownerId: string, now: number, leaseMs: number): ScheduleLease | undefined {
  if (current !== undefined && current.ownerId !== ownerId && current.expiresAt > now) return undefined
  return {
    ownerId,
    acquiredAt: current?.ownerId === ownerId ? current.acquiredAt : now,
    renewedAt: now,
    expiresAt: now + leaseMs,
  }
}

function taskIsRunning(task: TaskRecord): boolean {
  return task.status === 'running'
    || task.executions.some(execution => execution.finishedAt === undefined && execution.endedAt === undefined)
    || (task.runs ?? []).some(run => run.resultStatus === 'running')
}

function hasExecutionKey(task: TaskRecord, key: string): boolean {
  return task.executions.some(execution => (execution.runId ?? execution.id) === key)
    || (task.runs ?? []).some(run => run.runId === key)
}

/** Whether the current running record was atomically admitted by this Host scheduler. */
function hasActiveHostScheduledRun(task: TaskRecord, schedule: NonNullable<TaskRecord['schedule']>): boolean {
  const scheduledAt = schedule.lastScheduledAt
  const executionKey = schedule.lastRunId
  if (scheduledAt === undefined || executionKey === undefined
    || schedule.lease === undefined || schedule.providerEvidence === undefined
    || scheduledExecutionKey(task.id, scheduledAt) !== executionKey) return false
  return task.executions.some(execution => (execution.runId ?? execution.id) === executionKey
    && execution.finishedAt === undefined && execution.endedAt === undefined)
    || (task.runs ?? []).some(run => run.runId === executionKey && run.resultStatus === 'running')
}

function attachScheduledStart(
  task: TaskRecord,
  executionKey: string,
  workspaceId: string,
  sessionId: string | undefined,
  now: number,
  providerRun: TaskRunReference | undefined,
): TaskRecord {
  const active = task.executions.some(execution => (execution.runId ?? execution.id) === executionKey
    && execution.finishedAt === undefined && execution.endedAt === undefined)
  return {
    ...task,
    updatedAt: now,
    executions: task.executions.map(execution => (execution.runId ?? execution.id) === executionKey
      && execution.finishedAt === undefined && execution.endedAt === undefined
      ? {
        ...execution,
        workspaceId,
        ...(sessionId === undefined ? {} : { sessionId }),
      }
      : execution),
    runs: (task.runs ?? []).map(run => run.runId === executionKey
      && (active || run.resultStatus === 'running')
      ? {
        ...mergeProviderRun(run, providerRun),
        // The scheduler's slot id is canonical. Provider implementations may
        // carry an internal job id, but it must not replace this durable key.
        runId: executionKey,
        workspaceId,
        ...(sessionId === undefined ? {} : { sessionId }),
      }
      : run),
  }
}

function settleScheduledRun(
  task: TaskRecord,
  executionKey: string,
  outcome: 'succeeded' | 'failed' | 'cancelled',
  error: string | undefined,
  now: number,
  providerRun: TaskRunReference | undefined,
): TaskRecord {
  const settled = settleExecution(task, executionKey, outcome, now, error)
  const resultStatus: TaskRunReference['resultStatus'] = outcome === 'succeeded' ? 'awaiting-review' : outcome
  return {
    ...settled,
    runs: (settled.runs ?? []).map(run => run.runId === executionKey
      ? {
        ...mergeProviderRun(run, providerRun),
        runId: executionKey,
        // A runner may return the initial `running` reference alongside its
        // terminal outcome. The terminal scheduler outcome must win in that
        // case, otherwise a completed TaskRun could remain permanently live.
        resultStatus: providerRun?.resultStatus === undefined || providerRun.resultStatus === 'running'
          ? resultStatus
          : providerRun.resultStatus,
        finishedAt: providerRun?.finishedAt ?? now,
        ...(error === undefined ? {} : { fallbackReason: error.slice(0, 500) }),
      }
      : run),
  }
}

function mergeProviderRun(run: TaskRunReference, providerRun: TaskRunReference | undefined): Omit<TaskRunReference, 'runId'> & { runId: string } {
  if (providerRun === undefined) return run
  const { runId: _providerRunId, ...providerFields } = providerRun
  return { ...run, ...providerFields, runId: run.runId }
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function boundedError(value: unknown): string | undefined {
  if (value === undefined) return undefined
  const message = value instanceof Error ? value.message : typeof value === 'string' ? value : String(value)
  const normalized = message.replace(/[\r\n\t]+/gu, ' ').trim()
  return normalized === '' ? undefined : normalized.slice(0, 500)
}
