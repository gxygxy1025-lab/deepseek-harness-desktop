/** Browser-side per-task ownership probe for the durable Task Board scheduler. */

import {
  isHostSchedulerActive,
  isHostSchedulerOwnedTaskIds,
  isHostSchedulerTaskOwnership,
  isTaskOwnedByHostScheduler,
  type HostSchedulerStatus,
} from '../core/scheduler-authority.ts'
import type { TaskRecord } from '../core/tasks.ts'

export const TASK_BOARD_SCHEDULER_STATUS_PATH = '/api/dsh-task-board/scheduler'

const FALLBACK: HostSchedulerStatus = {
  available: false,
  mode: 'client-fallback',
  provider: 'unavailable',
  reason: 'Task Board Host scheduler is unavailable; browser scheduler is active.',
}

/**
 * Read the fixed Host status route. Network, old-runtime, and malformed-data
 * failures deliberately select the existing browser scheduler: a page is
 * suppressed only after a positive executable Host assertion.
 */
export async function readHostSchedulerStatus(
  fetchImpl?: typeof fetch,
): Promise<HostSchedulerStatus> {
  try {
    const request = fetchImpl ?? (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined)
    if (request === undefined) return FALLBACK
    const response = await request(TASK_BOARD_SCHEDULER_STATUS_PATH, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return FALLBACK
    const value: unknown = await response.json()
    return parseStatus(value) ?? FALLBACK
  } catch {
    return FALLBACK
  }
}

/**
 * Legacy authority probe. An active result means the Host has published a
 * task-scoped snapshot; it must not be used to stop the whole browser ticker.
 */
export async function shouldDisableClientScheduler(fetchImpl?: typeof fetch): Promise<boolean> {
  return isHostSchedulerActive(await readHostSchedulerStatus(fetchImpl))
}

/**
 * The browser owns every task absent from the Host's current admission set.
 * A missing/malformed/old status route remains a browser fallback, so a
 * transient coordination failure cannot silently starve scheduled work.
 */
export async function shouldRunTaskInClientScheduler(
  task: Pick<TaskRecord, 'id'>,
  fetchImpl?: typeof fetch,
): Promise<boolean> {
  return !isTaskOwnedByHostScheduler(await readHostSchedulerStatus(fetchImpl), task)
}

function parseStatus(value: unknown): HostSchedulerStatus | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const row = value as Record<string, unknown>
  const provider = row.provider === 'runtime-provider-host-job' || row.provider === 'task-board-host' || row.provider === 'unavailable'
    ? row.provider
    : undefined
  const mode = row.mode === 'host' || row.mode === 'client-fallback' ? row.mode : undefined
  if (typeof row.available !== 'boolean' || provider === undefined || mode === undefined) return undefined
  const taskOwnership = isHostSchedulerTaskOwnership(row.taskOwnership) ? row.taskOwnership : undefined
  const ownedTaskIds = isHostSchedulerOwnedTaskIds(row.ownedTaskIds) ? [...row.ownedTaskIds] : undefined
  // A Host cannot safely suppress even one browser task unless it publishes a
  // bounded, task-scoped decision. Treat partial active assertions as an old
  // or malformed route and retain browser ownership.
  if (row.available && mode === 'host' && provider !== 'unavailable'
    && (taskOwnership === undefined || ownedTaskIds === undefined)) return undefined
  return {
    available: row.available,
    mode,
    provider,
    ...(taskOwnership === undefined ? {} : { taskOwnership }),
    ...(ownedTaskIds === undefined ? {} : { ownedTaskIds }),
    ...(typeof row.reason === 'string' ? { reason: row.reason.slice(0, 500) } : {}),
  }
}
