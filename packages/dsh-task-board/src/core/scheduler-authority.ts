/**
 * Cross-half ownership contract for scheduled Task Board runs. This module is
 * deliberately browser-safe: the Host publishes it through a fixed loopback
 * status route and both halves apply the same task classifier. A Host can own
 * only the subset its runner explicitly declares executable; the browser owns
 * every other scheduled task.
 */

import type { IsolationMode, Project } from './runs.ts'
import type { TaskRecord } from './tasks.ts'

export type HostSchedulerMode = 'host' | 'client-fallback'
export type HostSchedulerIsolationMode = Exclude<IsolationMode, 'inherit'>
export const MAX_HOST_SCHEDULER_OWNED_TASK_IDS = 1024

/**
 * Serializable runner capability used as the durable scheduling ownership
 * boundary. It intentionally describes only ledger-visible constraints so
 * the Host and browser reach the same answer without a remote execution call.
 */
export interface HostSchedulerTaskOwnership {
  /** The runner cannot launch legacy/no-project tasks. */
  requiresProject: boolean
  /** Empty prompts are left to the browser instead of becoming Host failures. */
  requiresPrompt: boolean
  /** Effective isolation modes the Host runner can execute safely. */
  supportedIsolationModes: readonly HostSchedulerIsolationMode[]
}

/** Public, non-sensitive coordination status. */
export interface HostSchedulerStatus {
  available: boolean
  mode: HostSchedulerMode
  provider: 'runtime-provider-host-job' | 'task-board-host' | 'unavailable'
  /** Present only for an active Host runner with task-scoped ownership. */
  taskOwnership?: HostSchedulerTaskOwnership
  /** Bounded, non-sensitive ids currently admitted to the Host half. */
  ownedTaskIds?: readonly string[]
  reason?: string
}

/** Whether a browser page can defer individual task admission to the Host. */
export function isHostSchedulerActive(status: HostSchedulerStatus | undefined): boolean {
  return status?.available === true
    && status.mode === 'host'
    && status.provider !== 'unavailable'
    && isHostSchedulerTaskOwnership(status.taskOwnership)
    && isHostSchedulerOwnedTaskIds(status.ownedTaskIds)
}

/** Runtime validator shared by the Host status route parser and browser. */
export function isHostSchedulerTaskOwnership(value: unknown): value is HostSchedulerTaskOwnership {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  if (typeof row.requiresProject !== 'boolean' || typeof row.requiresPrompt !== 'boolean') return false
  if (!Array.isArray(row.supportedIsolationModes) || row.supportedIsolationModes.length === 0) return false
  return row.supportedIsolationModes.every(mode => mode === 'shared-workspace' || mode === 'git-worktree')
}

/** Runtime validator for the bounded per-task ownership snapshot. */
export function isHostSchedulerOwnedTaskIds(value: unknown): value is readonly string[] {
  return Array.isArray(value)
    && value.length <= MAX_HOST_SCHEDULER_OWNED_TASK_IDS
    && value.every(id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(id))
}

/** Resolve the isolation the runner will actually receive for one task. */
export function effectiveScheduledTaskIsolation(
  task: Pick<TaskRecord, 'isolationMode'>,
  project: Pick<Project, 'defaultIsolation'> | undefined,
): HostSchedulerIsolationMode {
  if (task.isolationMode === 'shared-workspace' || task.isolationMode === 'git-worktree') return task.isolationMode
  // Legacy/inherit tasks retain the pre-v3 shared-workspace default when no
  // Project is attached. A runner that requires projects rejects that case
  // before this fallback is considered.
  return project?.defaultIsolation ?? 'shared-workspace'
}

/**
 * The single per-task ownership predicate used before Host admission and
 * before browser dispatch. It has no time, I/O, or mutable-state dependency.
 */
export function canHostSchedulerOwnTask(
  ownership: HostSchedulerTaskOwnership,
  task: Pick<TaskRecord, 'projectId' | 'isolationMode' | 'prompt'>,
  project: Project | undefined,
): boolean {
  if (ownership.requiresProject && project === undefined) return false
  if (ownership.requiresPrompt && task.prompt.trim() === '') return false
  return ownership.supportedIsolationModes.includes(effectiveScheduledTaskIsolation(task, project))
}

/** Resolve a task's Project from the same ledger snapshot used for admission. */
export function scheduledTaskProject(
  task: Pick<TaskRecord, 'projectId'>,
  projects: readonly Project[],
): Project | undefined {
  return task.projectId === undefined ? undefined : projects.find(project => project.id === task.projectId)
}

/** Whether this exact task belongs to a currently active Host scheduler. */
export function isTaskOwnedByHostScheduler(
  status: HostSchedulerStatus | undefined,
  task: Pick<TaskRecord, 'id'>,
): boolean {
  if (!isHostSchedulerActive(status)) return false
  // The Host produces this exact id set from `canHostSchedulerOwnTask` plus
  // its live runner preflight. Browser state may lag an SSE frame, so the
  // published admission set (rather than a local Project lookup) is the safe
  // tie-breaker that keeps both halves from dispatching one task.
  return status?.ownedTaskIds?.includes(task.id) === true
}
