import { describe, expect, it } from 'vitest'

import {
  readHostSchedulerStatus,
  shouldDisableClientScheduler,
  shouldRunTaskInClientScheduler,
} from '../src/client/host-scheduler.ts'

function fetchStatus(value: unknown, ok = true): typeof fetch {
  return (async () => ({ ok, json: async () => value })) as unknown as typeof fetch
}

function scopedHostStatus(ownedTaskIds: string[] = ['host-task']): Record<string, unknown> {
  return {
    available: true,
    mode: 'host',
    provider: 'runtime-provider-host-job',
    taskOwnership: {
      requiresProject: true,
      requiresPrompt: true,
      supportedIsolationModes: ['shared-workspace'],
    },
    ownedTaskIds,
  }
}

describe('Host scheduler client coordination', () => {
  it('reports a task-scoped Host authority only after a bounded ownership snapshot is published', async () => {
    const host = fetchStatus(scopedHostStatus())
    expect(await shouldDisableClientScheduler(host)).toBe(true)
  })

  it('keeps the browser fallback for old, unavailable, malformed, or failed routes', async () => {
    expect(await shouldDisableClientScheduler(fetchStatus({ available: false, mode: 'client-fallback', provider: 'unavailable' }))).toBe(false)
    expect(await shouldDisableClientScheduler(fetchStatus({ available: true, mode: 'client-fallback', provider: 'task-board-host' }))).toBe(false)
    expect(await shouldDisableClientScheduler(fetchStatus({ available: true, mode: 'host', provider: 'unavailable' }))).toBe(false)
    expect(await shouldDisableClientScheduler(fetchStatus({ available: true, mode: 'host' }))).toBe(false)
    expect((await readHostSchedulerStatus(fetchStatus({}, false))).mode).toBe('client-fallback')
  })

  it('yields only Host-owned tasks while keeping no-project and worktree task ids in the browser scheduler', async () => {
    const host = fetchStatus(scopedHostStatus(['shared-project-task']))
    expect(await shouldRunTaskInClientScheduler({ id: 'shared-project-task' }, host)).toBe(false)
    expect(await shouldRunTaskInClientScheduler({ id: 'no-project-task' }, host)).toBe(true)
    expect(await shouldRunTaskInClientScheduler({ id: 'git-worktree-task' }, host)).toBe(true)
  })

  it('treats an active status without a task-scoped snapshot as browser fallback', async () => {
    const oldHost = fetchStatus({ available: true, mode: 'host', provider: 'runtime-provider-host-job' })
    expect(await shouldRunTaskInClientScheduler({ id: 'any-task' }, oldHost)).toBe(true)
  })
})
