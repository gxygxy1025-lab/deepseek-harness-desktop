import { describe, expect, it, vi } from 'vitest'

import { RemoteTaskStoreV3, TaskLedgerV3ConflictError } from '../src/client/v3-host-store.ts'
import { createLedgerDocumentV3, type TaskLedgerDocumentV3 } from '../src/core/store-v3.ts'
import { createTask } from '../src/core/tasks.ts'

const task = createTask({ title: 'v3 task', description: '', prompt: 'run' }, 1, 'v3-task')

function document(revision: number): TaskLedgerDocumentV3 {
  return createLedgerDocumentV3({ projects: [], tasks: [task], evidences: [], revision, updatedAt: revision })
}

describe('RemoteTaskStoreV3 Host coordination', () => {
  it('uses the fixed v3 SSE path without polling', () => {
    const source = { close: vi.fn(), onmessage: null as ((event: MessageEvent) => void) | null, onerror: null as (() => void) | null }
    const store = new RemoteTaskStoreV3(vi.fn() as unknown as typeof fetch, () => source)
    const listener = vi.fn()
    const unsubscribe = store.subscribeExternal(listener)

    source.onmessage?.({ data: JSON.stringify({ type: 'ready', revision: 1 }) } as MessageEvent)
    source.onmessage?.({ data: JSON.stringify({ type: 'changed', revision: 2 }) } as MessageEvent)

    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
    expect(source.close).toHaveBeenCalledOnce()
  })

  it('rejects a stale browser PUT, exposes the Host document, and blocks a second stale write until reload', async () => {
    const current = document(2)
    let puts = 0
    const fetchImpl = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        puts += 1
        return new Response(JSON.stringify({ ok: false, code: 'task-board-revision-conflict', document: current }), { status: 409 })
      }
      return new Response(JSON.stringify(document(1)), { status: 200 })
    })
    const store = new RemoteTaskStoreV3(fetchImpl as typeof fetch)
    const listener = vi.fn()
    const unsubscribe = store.subscribeExternal(listener)
    await store.load()

    await expect(store.save([{ ...task, title: 'stale edit' }])).rejects.toMatchObject({
      name: 'TaskLedgerV3ConflictError',
      current,
    } satisfies Partial<TaskLedgerV3ConflictError>)
    await expect(store.save([{ ...task, title: 'still stale' }])).rejects.toBeInstanceOf(TaskLedgerV3ConflictError)

    expect(puts).toBe(1)
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
  })
})
