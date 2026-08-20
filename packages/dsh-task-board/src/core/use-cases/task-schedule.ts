/**
 * Schedule use case: arm/disarm a task's cron rule and roll a rule forward.
 * Pure ledger transitions (no persistence or notify — the controller
 * orchestrates those). Validation and next-run computation live here, sharing
 * the core cron parser (schedule.ts) and the withSchedule transition.
 */
import { defaultTimeZone, isValidCron, isValidTimeZone, nextRunAtMsInTimeZone } from '../schedule.ts'
import { withSchedule, type ScheduleMisfirePolicy, type ScheduleRunningPolicy, type TaskRecord } from '../tasks.ts'

/** Fields the schedule use case may change on a rule. */
export interface SetSchedulePatch {
  enabled?: boolean
  cron?: string
  /** IANA zone for a durable Host schedule; absent keeps legacy local time. */
  timezone?: string
  misfirePolicy?: ScheduleMisfirePolicy
  runningPolicy?: ScheduleRunningPolicy
}

/** Result of arming/disarming a rule. */
export interface SetScheduleResult {
  /** The next ledger; unchanged reference when rejected. */
  tasks: readonly TaskRecord[]
  /** Whether the rule was applied (false on unknown task / invalid cron). */
  applied: boolean
}

/**
 * Set a task's schedule rule. A blank or invalid cron is rejected (state
 * untouched); an enabled rule computes the next run instant immediately, a
 * disabled or invalid one carries no next-run instant.
 * @param tasks - current ledger.
 * @param id - the task to schedule.
 * @param patch - rule fields to change (absent fields keep their current value).
 * @param now - clock instant (ms epoch).
 */
export function applySetSchedule(
  tasks: readonly TaskRecord[],
  id: string,
  patch: SetSchedulePatch,
  now: number,
): SetScheduleResult {
  const task = tasks.find(candidate => candidate.id === id)
  if (task === undefined) return { tasks, applied: false }
  const current = task.schedule
  const cron = (patch.cron ?? current?.cron ?? '').trim()
  if (cron === '' || !isValidCron(cron)) return { tasks, applied: false }
  if (patch.timezone !== undefined && !isValidTimeZone(patch.timezone)) return { tasks, applied: false }
  const enabled = patch.enabled ?? current?.enabled ?? false
  // Arming through the current UI persists an explicit zone. Legacy rows that
  // merely roll forward keep their absent field and thus retain local-time
  // compatibility until the user edits the rule.
  const timezone = patch.timezone ?? current?.timezone ?? defaultTimeZone()
  const nextRunAt = enabled ? nextRunAtMsInTimeZone(cron, now, timezone) : undefined
  return {
    tasks: tasks.map(candidate =>
      candidate.id === id ? withSchedule(candidate, {
        enabled,
        cron,
        nextRunAt,
        lastTriggeredAt: undefined,
        ...(timezone === undefined ? {} : { timezone }),
        ...(patch.misfirePolicy === undefined ? {} : { misfirePolicy: patch.misfirePolicy }),
        ...(patch.runningPolicy === undefined ? {} : { runningPolicy: patch.runningPolicy }),
        // An explicit schedule edit supersedes any previous Host admission.
        // In particular, an old queue-next slot must never execute under a
        // newly selected cron, and a retired owner lease must not delay it.
        lastRunId: undefined,
        lastScheduledAt: undefined,
        queuedAt: undefined,
        lease: undefined,
        lastFailure: undefined,
      }, now) : candidate),
    applied: true,
  }
}

/**
 * Roll a task's schedule rule forward (scheduler callback): persist the next
 * due instant and the trigger instant. No-op for tasks without a rule (deleted
 * mid-tick, for example).
 * @param tasks - current ledger.
 * @param id - the task to roll forward.
 * @param nextRunAt - next due instant (may be undefined to clear).
 * @param lastTriggeredAt - the trigger instant of this run.
 * @param now - clock instant (ms epoch).
 */
export function applyScheduleNextRun(
  tasks: readonly TaskRecord[],
  id: string,
  nextRunAt: number | undefined,
  lastTriggeredAt: number | undefined,
  now: number,
): readonly TaskRecord[] {
  return tasks.map(task =>
    task.id === id && task.schedule !== undefined
      ? withSchedule(task, { nextRunAt, lastTriggeredAt }, now)
      : task)
}
