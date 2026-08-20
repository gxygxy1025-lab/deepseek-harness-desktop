/**
 * Task board domain model: task lifecycle statuses, the task record shape,
 * and the pure transition functions the controller and tests share.
 * Framework-free (no cordis, no runtime imports) so the state machine is
 * unit-testable in isolation.
 */

import type { IsolationMode, RuntimeProviderEvidence, TaskRunReference } from './runs.ts'

/** Task lifecycle status, one per kanban column. */
export type TaskStatus = 'backlog' | 'todo' | 'running' | 'done' | 'failed'

/**
 * One real execution attempt: the run's own id, the dsh session that ran it
 * (filled once the session is created), and the settled outcome once the
 * session's turn ended.
 */
export interface ExecutionRecord {
  /** Execution attempt id (uuid). */
  id: string
  /** Stable run reference; equal to id for v2-created attempts. */
  runId?: string
  /** Workspace chosen for this attempt; absent in legacy v1 rows. */
  workspaceId?: string
  /** The dsh session that ran this attempt; absent until creation resolves. */
  sessionId: string | undefined
  /** When the run started (ms epoch). */
  startedAt: number
  /** When the run settled; absent while still running. */
  endedAt: number | undefined
  /** v2 name for the settled instant; endedAt remains for v1 compatibility. */
  finishedAt?: number
  /** Outcome once settled. */
  result: 'succeeded' | 'failed' | 'cancelled' | undefined
  /** Human failure text when the run failed (prompt rejection or agent error). */
  error: string | undefined
}

/**
 * A lease held by one Host scheduler instance for one durable rule. The lease
 * is persisted alongside the rule so a fresh host can take over only after
 * the prior owner expires.
 */
export interface ScheduleLease {
  ownerId: string
  acquiredAt: number
  renewedAt: number
  expiresAt: number
}

export type ScheduleMisfirePolicy = 'skip' | 'run-once'
export type ScheduleRunningPolicy = 'skip' | 'queue-next'

/** Last bounded Host dispatch error; never stores a transcript or stack. */
export interface ScheduleFailure {
  at: number
  executionKey: string
  message: string
}

/**
 * A scheduled-run rule attached to a task. Legacy browser rules need only the
 * first four fields. Desktop 2.7 adds optional durable-host state while
 * retaining those legacy rows and their local-time semantics.
 */
export interface ScheduleRule {
  /** Whether the schedule is armed. */
  enabled: boolean
  /** 5-field cron expression: `分 时 日 月 周`. */
  cron: string
  /** Next due instant (ms epoch); maintained by the scheduler/controller. */
  nextRunAt: number | undefined
  /** Instant of the latest scheduled trigger (ms epoch). */
  lastTriggeredAt: number | undefined
  /** IANA zone used by the Host; absent keeps a legacy rule in local time. */
  timezone?: string
  /** Sleep/restart policy. The safe default is skip. */
  misfirePolicy?: ScheduleMisfirePolicy
  /** A running task skips by default; queue-next records one pending slot. */
  runningPolicy?: ScheduleRunningPolicy
  /** Deterministic scheduled execution key most recently handed to a runner. */
  lastRunId?: string
  /** Cron slot that produced `lastRunId`; retained for crash-safe takeover. */
  lastScheduledAt?: number
  /** One queued scheduled slot while the task is still running. */
  queuedAt?: number
  /** Single-owner durable Host lease. */
  lease?: ScheduleLease
  /** Runtime-provider capability observation for the scheduler path. */
  providerEvidence?: RuntimeProviderEvidence
  /** Bounded failure state for status surfaces and crash diagnosis. */
  lastFailure?: ScheduleFailure
}

/** One task on the board. */
export interface TaskRecord {
  /** Stable task id (uuid). */
  id: string
  /** Short display title. */
  title: string
  /** Longer human description shown in the detail view. */
  description: string
  /** The prompt sent to dsh when this task is executed. */
  prompt: string
  /** Current column. */
  status: TaskStatus
  /** Creation instant (ms epoch). */
  createdAt: number
  /** Last mutation instant (ms epoch). */
  updatedAt: number
  /** Every execution attempt, most recent last. */
  executions: ExecutionRecord[]
  /** Optional project reference introduced by Desktop 2.6. */
  projectId?: string
  /** Explicit isolation choice; absent means the pre-2.6 shared default. */
  isolationMode?: IsolationMode
  /** Compact 2.6 run references; execution history remains for v2 UI compatibility. */
  runs?: TaskRunReference[]
  /** Optional scheduled-run rule (absent on tasks without a schedule). */
  schedule?: ScheduleRule
}

/** Input for creating a task. */
export interface NewTaskInput {
  title: string
  description: string
  prompt: string
  projectId?: string
  isolationMode?: IsolationMode
}

/** The five kanban columns, in display order. */
export const COLUMNS: readonly { status: TaskStatus; label: string }[] = [
  { status: 'backlog', label: '待规划' },
  { status: 'todo', label: '待办' },
  { status: 'running', label: '进行中' },
  { status: 'done', label: '已完成' },
  { status: 'failed', label: '已失败' },
]

/** Statuses a user may move a card to manually (execution states are owned by the runner). */
export const MANUAL_STATUSES: readonly TaskStatus[] = ['backlog', 'todo']

/** Statuses the runner may move a card to from 'running'. */
export const RUNNER_SETTLE_STATUSES: readonly TaskStatus[] = ['done', 'failed']

/** All valid statuses (closed union guard). */
export const ALL_STATUSES: readonly TaskStatus[] = [
  'backlog', 'todo', 'running', 'done', 'failed',
]

/** Brand an unknown string as a status; undefined when it is not one. */
export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (ALL_STATUSES as readonly string[]).includes(value)
}

/** Whether a manual move target is allowed from the given status. */
export function canMoveManually(_from: TaskStatus, to: TaskStatus): boolean {
  return (MANUAL_STATUSES as readonly TaskStatus[]).includes(to)
}

/** Create a task from user input. */
export function createTask(input: NewTaskInput, now: number, id: string): TaskRecord {
  return {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    prompt: input.prompt.trim(),
    status: 'todo',
    createdAt: now,
    updatedAt: now,
    executions: [],
    ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
    ...(input.isolationMode === undefined ? {} : { isolationMode: input.isolationMode }),
  }
}

/** Clone a task with an updated status and a fresh updatedAt. */
export function withStatus(task: TaskRecord, status: TaskStatus, now: number): TaskRecord {
  return { ...task, status, updatedAt: now }
}

/**
 * Merge a schedule patch into a task's schedule rule (creating it when
 * absent), with a fresh updatedAt. Keys present in the patch overwrite the
 * current value — including explicit `undefined`, which clears a field (used
 * to disarm `nextRunAt`); absent keys keep their current value.
 */
export function withSchedule(
  task: TaskRecord,
  patch: Partial<ScheduleRule>,
  now: number,
): TaskRecord {
  const current = task.schedule
  const schedule: ScheduleRule = {
    enabled: current?.enabled ?? false,
    cron: current?.cron ?? '',
    nextRunAt: current?.nextRunAt,
    lastTriggeredAt: current?.lastTriggeredAt,
    ...(current?.timezone === undefined ? {} : { timezone: current.timezone }),
    ...(current?.misfirePolicy === undefined ? {} : { misfirePolicy: current.misfirePolicy }),
    ...(current?.runningPolicy === undefined ? {} : { runningPolicy: current.runningPolicy }),
    ...(current?.lastRunId === undefined ? {} : { lastRunId: current.lastRunId }),
    ...(current?.lastScheduledAt === undefined ? {} : { lastScheduledAt: current.lastScheduledAt }),
    ...(current?.queuedAt === undefined ? {} : { queuedAt: current.queuedAt }),
    ...(current?.lease === undefined ? {} : { lease: { ...current.lease } }),
    ...(current?.providerEvidence === undefined ? {} : { providerEvidence: structuredClone(current.providerEvidence) }),
    ...(current?.lastFailure === undefined ? {} : { lastFailure: { ...current.lastFailure } }),
  }
  if ('enabled' in patch) schedule.enabled = patch.enabled ?? false
  if ('cron' in patch) schedule.cron = patch.cron ?? ''
  if ('nextRunAt' in patch) schedule.nextRunAt = patch.nextRunAt
  if ('lastTriggeredAt' in patch) schedule.lastTriggeredAt = patch.lastTriggeredAt
  if ('timezone' in patch) schedule.timezone = patch.timezone
  if ('misfirePolicy' in patch) schedule.misfirePolicy = patch.misfirePolicy
  if ('runningPolicy' in patch) schedule.runningPolicy = patch.runningPolicy
  if ('lastRunId' in patch) schedule.lastRunId = patch.lastRunId
  if ('lastScheduledAt' in patch) schedule.lastScheduledAt = patch.lastScheduledAt
  if ('queuedAt' in patch) schedule.queuedAt = patch.queuedAt
  if ('lease' in patch) schedule.lease = patch.lease === undefined ? undefined : { ...patch.lease }
  if ('providerEvidence' in patch) schedule.providerEvidence = patch.providerEvidence === undefined ? undefined : structuredClone(patch.providerEvidence)
  if ('lastFailure' in patch) schedule.lastFailure = patch.lastFailure === undefined ? undefined : { ...patch.lastFailure }
  return { ...task, updatedAt: now, schedule }
}

/**
 * Open a fresh execution on a task: move it to 'running' and append a
 * running execution record. Returns the new task and the new execution.
 */
export function startExecution(
  task: TaskRecord,
  now: number,
  executionId: string,
): { task: TaskRecord; execution: ExecutionRecord } {
  const execution: ExecutionRecord = {
    id: executionId,
    runId: executionId,
    workspaceId: undefined,
    sessionId: undefined,
    startedAt: now,
    endedAt: undefined,
    result: undefined,
    error: undefined,
  }
  return {
    task: { ...task, status: 'running', updatedAt: now, executions: [...task.executions, execution] },
    execution,
  }
}

/**
 * Settle a running execution: record the outcome and move the task into the
 * matching column. No-op (returns the input task) when the execution is not
 * the task's latest or is already settled.
 */
export function settleExecution(
  task: TaskRecord,
  executionId: string,
  outcome: 'succeeded' | 'failed' | 'cancelled',
  now: number,
  error: string | undefined,
): TaskRecord {
  const index = task.executions.findIndex(execution => execution.id === executionId)
  if (index === -1) return task
  const execution = task.executions[index]
  if (execution.finishedAt !== undefined || execution.endedAt !== undefined) return task
  const settled: ExecutionRecord = { ...execution, endedAt: now, finishedAt: now, result: outcome, error }
  const executions = [...task.executions]
  executions[index] = settled
  const status: TaskStatus = outcome === 'succeeded' ? 'done'
    : outcome === 'failed' ? 'failed'
      : task.status === 'running' ? 'todo' : task.status
  return { ...task, status, updatedAt: now, executions }
}

/** A settled-execution summary string for the detail view. */
export function executionLabel(execution: ExecutionRecord): string {
  if (execution.result === 'succeeded') return 'succeeded'
  if (execution.result === 'failed') return 'failed'
  if (execution.result === 'cancelled') return 'cancelled'
  return 'running'
}
