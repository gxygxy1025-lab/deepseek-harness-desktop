import { describe, expect, it, vi } from 'vitest'

import { createLedgerDocumentV2, InMemoryTaskStore, type TaskStore } from '../src/core/store.ts'
import { createTask } from '../src/core/tasks.ts'
import { HOST_MIGRATION_MARKER_KEY, RemoteTaskStore, ledgerHash, selectPreferredTaskStore } from '../src/client/host-store.ts'

class MarkerStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

const task = createTask({ title: 'A', description: '', prompt: 'p' }, 1, 'a')

describe('HostStore preference and v1 migration', () => {
  it('copies an empty Host from v1, verifies count+hash, and records completion', async () => {
    const local = new InMemoryTaskStore()
    const host = new InMemoryTaskStore()
    const marker = new MarkerStorage()
    local.save([task])
    expect(await selectPreferredTaskStore({ host, local, markerStorage: marker })).toBe(host)
    expect(host.load()).toEqual([task])
    expect(ledgerHash(host.load())).toBe(ledgerHash(local.load()))
    expect(marker.getItem(HOST_MIGRATION_MARKER_KEY)).toBe('1')
    expect(local.load()).toEqual([task])
  })

  it('does not overwrite a non-empty Host ledger', async () => {
    const local = new InMemoryTaskStore()
    const host = new InMemoryTaskStore()
    const hostTask = { ...task, id: 'host' }
    local.save([task])
    host.save([hostTask])
    expect(await selectPreferredTaskStore({ host, local, markerStorage: new MarkerStorage() })).toBe(host)
    expect(host.load()).toEqual([hostTask])
  })

  it('falls back to v1 when the Host endpoint is unavailable', async () => {
    const local = new InMemoryTaskStore()
    local.save([task])
    const host: TaskStore = {
      load: vi.fn(async () => { throw new Error('offline') }),
      save: vi.fn(),
      clear: vi.fn(),
    }
    expect(await selectPreferredTaskStore({ host, local, markerStorage: new MarkerStorage() })).toBe(local)
    expect(host.save).not.toHaveBeenCalled()
  })

  it('does not repeat a completed copy when the Host is empty later', async () => {
    const local = new InMemoryTaskStore()
    const host = new InMemoryTaskStore()
    const marker = new MarkerStorage()
    marker.setItem(HOST_MIGRATION_MARKER_KEY, '1')
    local.save([task])
    expect(await selectPreferredTaskStore({ host, local, markerStorage: marker })).toBe(host)
    expect(host.load()).toEqual([])
  })

  it('rolls back a hash mismatch, keeps v1, and does not record completion', async () => {
    const local = new InMemoryTaskStore()
    const marker = new MarkerStorage()
    local.save([task])
    let hostTasks: Array<typeof task> = []
    let loads = 0
    const clear = vi.fn(async () => { hostTasks = [] })
    const host: TaskStore = {
      load: vi.fn(async () => {
        loads += 1
        return loads === 1 ? [] : [{ ...task, title: 'corrupted after write' }]
      }),
      save: vi.fn(async tasks => { hostTasks = [...tasks] as Array<typeof task> }),
      clear,
    }

    expect(await selectPreferredTaskStore({ host, local, markerStorage: marker })).toBe(local)
    expect(clear).toHaveBeenCalledOnce()
    expect(hostTasks).toEqual([])
    expect(local.load()).toEqual([task])
    expect(marker.getItem(HOST_MIGRATION_MARKER_KEY)).toBeNull()
  })

  it('rolls back a post-write read failure and keeps v1 authoritative', async () => {
    const local = new InMemoryTaskStore()
    local.save([task])
    let loads = 0
    const clear = vi.fn(async () => {})
    const host: TaskStore = {
      load: vi.fn(async () => {
        loads += 1
        if (loads === 1) return []
        throw new Error('readback failed')
      }),
      save: vi.fn(async () => {}),
      clear,
    }

    expect(await selectPreferredTaskStore({ host, local, markerStorage: new MarkerStorage() })).toBe(local)
    expect(clear).toHaveBeenCalledOnce()
    expect(local.load()).toEqual([task])
  })
})

describe('RemoteTaskStore transport', () => {
  it('serializes PUTs and accepts only valid v2 acknowledgements', async () => {
    const order: string[] = []
    let revision = 0
    const fetchImpl = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { tasks: typeof task[] }
      order.push(body.tasks[0]?.id ?? 'empty')
      await Promise.resolve()
      revision += 1
      return new Response(JSON.stringify(createLedgerDocumentV2(body.tasks, revision, revision)), { status: 200 })
    })
    const store = new RemoteTaskStore(fetchImpl as typeof fetch, undefined)
    await Promise.all([
      store.save([task]),
      store.save([{ ...task, id: 'second' }]),
    ])
    expect(order).toEqual(['a', 'second'])
  })

  it('uses SSE change frames without polling', () => {
    const source = { close: vi.fn(), onmessage: null as ((event: MessageEvent) => void) | null, onerror: null as (() => void) | null }
    const store = new RemoteTaskStore(vi.fn() as unknown as typeof fetch, () => source)
    const listener = vi.fn()
    const unsubscribe = store.subscribeExternal(listener)
    source.onmessage?.({ data: JSON.stringify({ type: 'ready', revision: 1 }) } as MessageEvent)
    source.onmessage?.({ data: JSON.stringify({ type: 'changed', revision: 2 }) } as MessageEvent)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    expect(source.close).toHaveBeenCalledTimes(1)
  })
})
