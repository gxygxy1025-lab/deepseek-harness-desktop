import { EventEmitter } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  TASK_BOARD_SCHEDULER_STATUS_PATH,
  TASK_BOARD_V3_API_PATH,
  TASK_BOARD_V3_EVENTS_PATH,
  makeTaskBoardV3Routes,
} from '../src/host/v3-routes.ts'
import { HostTaskStoreV3 } from '../src/host/v3-file-store.ts'
import { createTask } from '../src/core/tasks.ts'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

function trustedSseRequest(): IncomingMessage {
  return Object.assign(new EventEmitter(), {
    method: 'GET',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { host: '127.0.0.1:43125', origin: 'http://127.0.0.1:43125' },
  }) as unknown as IncomingMessage
}

function sseResponse(): { response: ServerResponse; writes: string[]; end: ReturnType<typeof vi.fn> } {
  const writes: string[] = []
  const end = vi.fn()
  const response = Object.assign(new EventEmitter(), {
    writeHead: vi.fn(),
    write: (value: unknown) => { writes.push(String(value)); return true },
    end,
  }) as unknown as ServerResponse
  return { response, writes, end }
}

describe('Task Board v3 Host routes', () => {
  it('registers only fixed v3 ledger, event, and scheduler-status routes', () => {
    const store = new HostTaskStoreV3({ path: 'unused.json' })
    const family = makeTaskBoardV3Routes(store, {
      scheduler: {
        status: () => ({ available: true, mode: 'host', provider: 'task-board-host' }),
      },
    })
    expect(family.routes.map(route => [route.kind, route.path])).toEqual([
      ['exact', TASK_BOARD_V3_API_PATH],
      ['exact', TASK_BOARD_V3_EVENTS_PATH],
      ['exact', TASK_BOARD_SCHEDULER_STATUS_PATH],
    ])
    family.dispose()
  })

  it('pushes a fixed SSE change frame after an atomic Host mutation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-task-board-v3-events-'))
    roots.push(root)
    const store = new HostTaskStoreV3({ path: join(root, 'tasks-v3.json'), now: () => 10, randomId: () => 'events' })
    const family = makeTaskBoardV3Routes(store)
    const route = family.routes.find(candidate => candidate.path === TASK_BOARD_V3_EVENTS_PATH)
    const request = trustedSseRequest()
    const { response, writes, end } = sseResponse()

    await route!.handler(request, response)
    await store.mutate(document => {
      document.tasks = [createTask({ title: 'changed', description: '', prompt: 'p' }, 10, 'changed')]
      return { result: undefined }
    })

    expect(writes.join('')).toContain('"type":"ready"')
    expect(writes.join('')).toContain('"type":"changed"')
    family.dispose()
    expect(end).toHaveBeenCalledOnce()
  })
})
