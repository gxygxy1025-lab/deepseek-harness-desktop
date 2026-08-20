import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { createProject, createTaskRunReference, type Project } from '../src/core/runs.ts'
import { createTask, settleExecution, startExecution, withSchedule, withStatus, type TaskRecord } from '../src/core/tasks.ts'
import {
  HostDurableScheduler,
  isHostSchedulerActive,
  scheduledExecutionKey,
  type HostScheduledRunInput,
  type HostScheduledTaskRunner,
} from '../src/host/durable-scheduler.ts'
import { HostTaskStoreV3 } from '../src/host/v3-file-store.ts'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

function at(hour: number, minute: number, second = 0): number {
  return new Date(2026, 0, 1, hour, minute, second).getTime()
}

function scheduledTask(input: {
  id?: string
  cron?: string
  nextRunAt?: number
  status?: TaskRecord['status']
  misfirePolicy?: 'skip' | 'run-once'
  runningPolicy?: 'skip' | 'queue-next'
} = {}): TaskRecord {
  const base = createTask({ title: 'scheduled', description: '', prompt: 'run' }, at(9, 0), input.id ?? 'task-1')
  const status = input.status === undefined ? base : withStatus(base, input.status, at(9, 0))
  return withSchedule(status, {
    enabled: true,
    cron: input.cron ?? '* * * * *',
    nextRunAt: input.nextRunAt ?? at(10, 0),
    lastTriggeredAt: undefined,
    timezone: 'UTC',
    ...(input.misfirePolicy === undefined ? {} : { misfirePolicy: input.misfirePolicy }),
    ...(input.runningPolicy === undefined ? {} : { runningPolicy: input.runningPolicy }),
  }, at(9, 0))
}

/** A running record that was actually admitted by a prior Host cron slot. */
function hostRunningScheduledTask(input: { id?: string; ownerId?: string; runningPolicy?: 'skip' | 'queue-next' } = {}): TaskRecord {
  const task = scheduledTask({ id: input.id, runningPolicy: input.runningPolicy })
  const scheduledAt = at(9, 59)
  const executionKey = scheduledExecutionKey(task.id, scheduledAt)
  const opened = startExecution(task, scheduledAt, executionKey)
  return withSchedule({
    ...opened.task,
    runs: [createTaskRunReference({
      runId: executionKey,
      workspaceId: 'scheduled',
      startedAt: scheduledAt,
      resultStatus: 'running',
    })],
  }, {
    enabled: true,
    cron: '* * * * *',
    nextRunAt: at(10, 0),
    lastTriggeredAt: scheduledAt,
    lastScheduledAt: scheduledAt,
    lastRunId: executionKey,
    lease: {
      ownerId: input.ownerId ?? 'host-skip',
      acquiredAt: scheduledAt,
      renewedAt: scheduledAt,
      expiresAt: at(10, 0),
    },
    providerEvidence: { capabilities: [{ id: 'host-schedule', status: 'available' }] },
    timezone: 'UTC',
    ...(input.runningPolicy === undefined ? {} : { runningPolicy: input.runningPolicy }),
  }, scheduledAt)
}

async function makeStore(tasks: TaskRecord[], now: () => number, projects: Project[] = []): Promise<HostTaskStoreV3> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-task-board-scheduler-'))
  roots.push(root)
  const store = new HostTaskStoreV3({ path: join(root, 'tasks-v3.json'), now, randomId: () => 'scheduler' })
  await store.save({ projects, tasks, evidences: [] })
  return store
}

const TEST_HOST_OWNERSHIP = Object.freeze({
  requiresProject: false,
  requiresPrompt: false,
  supportedIsolationModes: ['shared-workspace', 'git-worktree'] as const,
})

function runner(
  calls: HostScheduledRunInput[],
  canOwnTask: HostScheduledTaskRunner['canOwnTask'] = async () => true,
): HostScheduledTaskRunner {
  return {
    provider: 'task-board-host',
    evidence: { capabilities: [{ id: 'host-schedule', status: 'available' }], note: 'fake host runner' },
    taskOwnership: TEST_HOST_OWNERSHIP,
    canOwnTask,
    run: async input => {
      calls.push(input)
      return { kind: 'settled', outcome: 'succeeded' }
    },
  }
}

describe('HostDurableScheduler', () => {
  it('atomically advances the cron cursor and persists its deterministic TaskRun before invoking the runner', async () => {
    let now = at(10, 0, 30)
    const store = await makeStore([scheduledTask()], () => now)
    const calls: HostScheduledRunInput[] = []
    let persistedBeforeRunner: TaskRecord | undefined
    const scheduler = new HostDurableScheduler({
      store,
      ownerId: 'host-a',
      now: () => now,
      runner: {
        ...runner(calls),
        run: async input => {
          persistedBeforeRunner = (await store.load()).tasks[0]
          calls.push(input)
          return { kind: 'settled', outcome: 'succeeded' }
        },
      },
    })

    await scheduler.tick()
    await scheduler.drain()

    const key = scheduledExecutionKey('task-1', at(10, 0))
    expect(calls.map(call => call.executionKey)).toEqual([key])
    expect(persistedBeforeRunner?.schedule?.nextRunAt).toBe(at(10, 1))
    expect(persistedBeforeRunner?.schedule?.lastScheduledAt).toBe(at(10, 0))
    expect(persistedBeforeRunner?.runs?.map(run => run.runId)).toContain(key)
    expect((await store.load()).tasks[0]?.runs?.find(run => run.runId === key)?.resultStatus).toBe('awaiting-review')

    await scheduler.tick()
    await scheduler.drain()
    expect(calls).toHaveLength(1)
  })

  it('claims only runner-eligible tasks and leaves no-project, worktree, blank, and live-preflight failures for the browser', async () => {
    const now = at(10, 0, 10)
    const shared = createProject({ id: 'project-shared', name: 'shared', workspaceId: 'workspace-shared' })
    const worktree = createProject({ id: 'project-worktree', name: 'worktree', workspaceId: 'workspace-worktree', defaultIsolation: 'git-worktree' })
    const unavailable = createProject({ id: 'project-unavailable', name: 'unavailable', workspaceId: 'workspace-unavailable' })
    const tasks: TaskRecord[] = [
      scheduledTask({ id: 'no-project' }),
      { ...scheduledTask({ id: 'explicit-worktree' }), projectId: worktree.id, isolationMode: 'git-worktree' },
      { ...scheduledTask({ id: 'inherited-worktree' }), projectId: worktree.id, isolationMode: 'inherit' },
      { ...scheduledTask({ id: 'blank-prompt' }), projectId: shared.id, prompt: '   ' },
      { ...scheduledTask({ id: 'unavailable-workspace' }), projectId: unavailable.id, isolationMode: 'shared-workspace' },
      { ...scheduledTask({ id: 'shared-host-task' }), projectId: shared.id, isolationMode: 'shared-workspace' },
    ]
    const store = await makeStore(tasks, () => now, [shared, worktree, unavailable])
    const calls: HostScheduledRunInput[] = []
    const scheduler = new HostDurableScheduler({
      store,
      ownerId: 'desktop-host',
      now: () => now,
      runner: {
        ...runner(calls),
        taskOwnership: {
          requiresProject: true,
          requiresPrompt: true,
          supportedIsolationModes: ['shared-workspace'],
        },
        canOwnTask: async ({ project }) => project?.workspaceId !== 'workspace-unavailable',
      },
    })

    await scheduler.tick()
    await scheduler.drain()

    expect(scheduler.status()).toMatchObject({
      available: true,
      mode: 'host',
      ownedTaskIds: ['shared-host-task'],
    })
    expect(calls.map(call => call.task.id)).toEqual(['shared-host-task'])
    const persisted = await store.load()
    for (const id of ['no-project', 'explicit-worktree', 'inherited-worktree', 'blank-prompt', 'unavailable-workspace']) {
      const task = persisted.tasks.find(candidate => candidate.id === id)!
      expect(task.executions).toEqual([])
      expect(task.runs).toBeUndefined()
      expect(task.schedule?.lease).toBeUndefined()
      expect(task.schedule?.lastFailure).toBeUndefined()
      expect(task.schedule?.nextRunAt).toBe(at(10, 0))
    }
  })

  it('does not write a Host lease or cursor over a browser execution that won the admission race', async () => {
    const now = at(10, 0, 10)
    const scheduled = scheduledTask({ id: 'browser-won' })
    const opened = startExecution(scheduled, now, 'browser-run')
    const browserRunning: TaskRecord = {
      ...opened.task,
      runs: [createTaskRunReference({
        runId: 'browser-run',
        workspaceId: 'shared',
        startedAt: now,
        resultStatus: 'running',
      })],
    }
    const store = await makeStore([browserRunning], () => now)
    const calls: HostScheduledRunInput[] = []
    const scheduler = new HostDurableScheduler({ store, ownerId: 'host-after-browser', now: () => now, runner: runner(calls) })
    const before = await store.load()

    await scheduler.tick()
    await scheduler.drain()

    const after = await store.load()
    expect(calls).toHaveLength(0)
    expect(after.revision).toBe(before.revision)
    expect(after.tasks).toEqual(before.tasks)
    expect(scheduler.status().ownedTaskIds).toEqual([])

    // The browser's settlement still uses the same revision, so its normal
    // optimistic write succeeds instead of being stranded behind Host churn.
    const settled = {
      ...after,
      tasks: after.tasks.map(task => task.id === browserRunning.id
        ? settleExecution(task, 'browser-run', 'succeeded', now + 1, undefined)
        : task),
    }
    const saved = await store.save(settled)
    expect(saved.tasks[0]).toMatchObject({ status: 'done', executions: [{ id: 'browser-run', result: 'succeeded' }] })
  })

  it('retains the deterministic execution key when a provider reports an internal run id', async () => {
    let now = at(10, 0, 10)
    const store = await makeStore([scheduledTask()], () => now)
    const scheduler = new HostDurableScheduler({
      store,
      ownerId: 'host-key',
      now: () => now,
      runner: {
        ...runner([]),
        run: async () => ({
          kind: 'settled',
          outcome: 'succeeded',
          sessionId: 'session-provider',
          run: createTaskRunReference({
            runId: 'provider-internal-id',
            workspaceId: 'provider-workspace',
            startedAt: now,
            resultStatus: 'awaiting-review',
            runtimeProviderEvidence: { note: 'provider completed the run' },
          }),
        }),
      },
    })

    await scheduler.tick()
    await scheduler.drain()

    const key = scheduledExecutionKey('task-1', at(10, 0))
    const task = (await store.load()).tasks[0]!
    expect(task.runs?.map(run => run.runId)).toEqual([key])
    expect(task.runs?.[0]).toMatchObject({ runId: key, sessionId: 'session-provider', workspaceId: 'provider-workspace' })
    expect(task.executions[0]).toMatchObject({ runId: key, sessionId: 'session-provider', result: 'succeeded' })
  })

  it('renews its own lease, rejects a live competing owner, and permits takeover after expiry', async () => {
    let now = at(9, 0)
    const store = await makeStore([scheduledTask({ nextRunAt: at(11, 0) })], () => now)
    const firstCalls: HostScheduledRunInput[] = []
    const secondCalls: HostScheduledRunInput[] = []
    const first = new HostDurableScheduler({ store, ownerId: 'host-a', now: () => now, tickMs: 1, leaseMs: 1_000, runner: runner(firstCalls) })
    const second = new HostDurableScheduler({ store, ownerId: 'host-b', now: () => now, tickMs: 1, leaseMs: 1_000, runner: runner(secondCalls) })

    await first.tick()
    expect((await store.load()).tasks[0]?.schedule?.lease).toMatchObject({ ownerId: 'host-a', acquiredAt: now, expiresAt: now + 1_000 })
    now += 500
    await first.tick()
    expect((await store.load()).tasks[0]?.schedule?.lease?.expiresAt).toBe(now + 1_000)
    now += 501
    await second.tick()
    expect((await store.load()).tasks[0]?.schedule?.lease?.ownerId).toBe('host-a')
    now += 500
    await second.tick()
    expect((await store.load()).tasks[0]?.schedule?.lease?.ownerId).toBe('host-b')
    expect(firstCalls).toHaveLength(0)
    expect(secondCalls).toHaveLength(0)
  })

  it('skips a sleep gap by default but explicitly coalesces one run for run-once', async () => {
    const now = at(10, 5, 10)
    const skipStore = await makeStore([scheduledTask()], () => now)
    const skipCalls: HostScheduledRunInput[] = []
    const skip = new HostDurableScheduler({ store: skipStore, ownerId: 'host-skip', now: () => now, runner: runner(skipCalls) })
    await skip.tick()
    await skip.drain()
    expect(skipCalls).toHaveLength(0)
    expect((await skipStore.load()).tasks[0]?.schedule?.nextRunAt).toBe(at(10, 6))

    const onceStore = await makeStore([scheduledTask({ misfirePolicy: 'run-once' })], () => now)
    const onceCalls: HostScheduledRunInput[] = []
    const once = new HostDurableScheduler({ store: onceStore, ownerId: 'host-once', now: () => now, runner: runner(onceCalls) })
    await once.tick()
    await once.drain()
    expect(onceCalls.map(call => call.executionKey)).toEqual([scheduledExecutionKey('task-1', at(10, 0))])
    expect((await onceStore.load()).tasks[0]?.schedule?.nextRunAt).toBe(at(10, 6))
  })

  it('skips a running task or records exactly one queue-next slot for later dispatch', async () => {
    let now = at(10, 0, 10)
    const skipStore = await makeStore([hostRunningScheduledTask()], () => now)
    const skipCalls: HostScheduledRunInput[] = []
    const skip = new HostDurableScheduler({ store: skipStore, ownerId: 'host-skip', now: () => now, runner: runner(skipCalls) })
    await skip.tick()
    expect(skipCalls).toHaveLength(0)
    expect((await skipStore.load()).tasks[0]?.schedule).toMatchObject({ nextRunAt: at(10, 1) })
    expect((await skipStore.load()).tasks[0]?.schedule?.queuedAt).toBeUndefined()

    const queueStore = await makeStore([hostRunningScheduledTask({ ownerId: 'host-queue', runningPolicy: 'queue-next' })], () => now)
    const queueCalls: HostScheduledRunInput[] = []
    const queue = new HostDurableScheduler({ store: queueStore, ownerId: 'host-queue', now: () => now, runner: runner(queueCalls) })
    await queue.tick()
    expect((await queueStore.load()).tasks[0]?.schedule).toMatchObject({ nextRunAt: at(10, 1), queuedAt: at(10, 0) })
    now = at(10, 3, 10)
    await queue.tick()
    expect((await queueStore.load()).tasks[0]?.schedule).toMatchObject({ nextRunAt: at(10, 4), queuedAt: at(10, 0) })
    await queueStore.mutate(document => {
      document.tasks = document.tasks.map(task => {
        if (task.id !== 'task-1') return task
        const previousKey = scheduledExecutionKey(task.id, at(9, 59))
        const settled = settleExecution(task, previousKey, 'succeeded', now, undefined)
        return {
          ...settled,
          runs: settled.runs?.map(run => run.runId === previousKey
            ? { ...run, resultStatus: 'awaiting-review', finishedAt: now }
            : run),
        }
      })
      return { result: undefined }
    })
    await queue.tick()
    await queue.drain()
    expect(queueCalls.map(call => call.scheduledAt)).toEqual([at(10, 0)])
  })

  it('records a bounded failure without retrying the same persisted slot', async () => {
    const now = at(10, 0, 10)
    const store = await makeStore([scheduledTask()], () => now)
    let calls = 0
    const scheduler = new HostDurableScheduler({
      store,
      ownerId: 'host-fail',
      now: () => now,
      runner: { ...runner([]), run: async () => { calls += 1; throw new Error('provider unavailable') } },
    })
    await scheduler.tick()
    await scheduler.drain()
    await scheduler.tick()
    await scheduler.drain()
    expect(calls).toBe(1)
    expect((await store.load()).tasks[0]?.schedule?.lastFailure).toMatchObject({
      executionKey: scheduledExecutionKey('task-1', at(10, 0)),
      message: 'provider unavailable',
    })
  })

  it('bounds a provider failure before it reaches durable execution and schedule state', async () => {
    const now = at(10, 0, 10)
    const store = await makeStore([scheduledTask()], () => now)
    const scheduler = new HostDurableScheduler({
      store,
      ownerId: 'host-bounded-error',
      now: () => now,
      runner: { ...runner([]), run: async () => ({ kind: 'settled', outcome: 'failed', error: `line-one\n${'x'.repeat(700)}` }) },
    })
    await scheduler.tick()
    await scheduler.drain()

    const task = (await store.load()).tasks[0]!
    expect(task.executions[0]?.error).toHaveLength(500)
    expect(task.executions[0]?.error).not.toContain('\n')
    expect(task.schedule?.lastFailure?.message).toHaveLength(500)
  })

  it('takes over an admitted but unstarted slot with the same deterministic key after lease expiry', async () => {
    let now = at(10, 0, 10)
    const root = await mkdtemp(join(tmpdir(), 'dsh-task-board-scheduler-restart-'))
    roots.push(root)
    const path = join(root, 'tasks-v3.json')
    const store = new HostTaskStoreV3({ path, now: () => now, randomId: () => 'scheduler-restart' })
    await store.save({ projects: [], tasks: [scheduledTask()], evidences: [] })
    const firstCalls: HostScheduledRunInput[] = []
    const first = new HostDurableScheduler({
      store,
      ownerId: 'host-before-crash',
      now: () => now,
      tickMs: 1,
      leaseMs: 1_000,
      runner: {
        ...runner(firstCalls),
        // Simulates a process that reached a provider but died before it could
        // persist the provider's Session id or a terminal result.
        run: async input => {
          firstCalls.push(input)
          return { kind: 'accepted' }
        },
      },
    })
    await first.tick()
    await first.drain()

    const key = scheduledExecutionKey('task-1', at(10, 0))
    // A fresh Host process has no in-memory queue or lease state. Re-open the
    // atomic v3 file before trying the expired-owner takeover.
    const restartedStore = new HostTaskStoreV3({ path, now: () => now, randomId: () => 'scheduler-restarted' })
    const admitted = (await restartedStore.load()).tasks[0]!
    expect(admitted.schedule).toMatchObject({ lastRunId: key, lastScheduledAt: at(10, 0) })
    expect(admitted.executions).toHaveLength(1)
    expect(admitted.runs).toHaveLength(1)
    expect(admitted.executions[0]?.sessionId).toBeUndefined()
    expect(admitted.runs?.[0]?.sessionId).toBeUndefined()

    now += 1_001
    const recoveredCalls: HostScheduledRunInput[] = []
    const recovered = new HostDurableScheduler({
      store: restartedStore,
      ownerId: 'host-after-crash',
      now: () => now,
      tickMs: 1,
      leaseMs: 1_000,
      runner: runner(recoveredCalls),
    })
    await recovered.tick()
    await recovered.drain()

    expect(firstCalls.map(call => call.executionKey)).toEqual([key])
    expect(recoveredCalls.map(call => call.executionKey)).toEqual([key])
    const settled = (await restartedStore.load()).tasks[0]!
    expect(settled.schedule?.lease?.ownerId).toBe('host-after-crash')
    expect(settled.executions).toHaveLength(1)
    expect(settled.runs).toHaveLength(1)
    expect(settled.runs?.[0]).toMatchObject({ runId: key, resultStatus: 'awaiting-review' })
  })

  it('uses fake timers and exposes explicit Host/client ownership status', async () => {
    let armed: (() => void) | undefined
    const timers = {
      setInterval: (callback: () => void) => { armed = callback; return 'timer' },
      clearInterval: (handle: unknown) => { expect(handle).toBe('timer'); armed = undefined },
    }
    const store = await makeStore([], () => at(9, 0))
    const active = new HostDurableScheduler({ store, ownerId: 'host-a', timers, runner: runner([]) })
    const fallback = new HostDurableScheduler({ store, ownerId: 'host-b' })
    await active.tick()
    expect(isHostSchedulerActive(active.status())).toBe(true)
    expect(isHostSchedulerActive(fallback.status())).toBe(false)
    active.start()
    expect(armed).toBeDefined()
    active.dispose()
    expect(armed).toBeUndefined()
  })
})
