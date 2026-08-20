/** HostTaskStore v3 loopback route for Project/Run/Evidence snapshots. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { parseLedgerDocumentV3, type TaskLedgerDocumentV3 } from '../core/store-v3.ts'
import type { HostSchedulerStatus } from '../core/scheduler-authority.ts'
import { isTrustedTaskBoardRequest } from './routes.ts'
import { TaskLedgerRevisionConflictError, type HostTaskStoreV3 } from './v3-file-store.ts'

export const TASK_BOARD_V3_API_PATH = '/api/dsh-task-board/v3'
export const TASK_BOARD_V3_EVENTS_PATH = '/api/dsh-task-board/v3/events'
/** Fixed status endpoint only; no task path or runner command crosses it. */
export const TASK_BOARD_SCHEDULER_STATUS_PATH = '/api/dsh-task-board/scheduler'
const BODY_CAP_BYTES = 4 * 1024 * 1024
const KEEPALIVE_MS = 15_000

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(value))
}

function expectedRevision(request: IncomingMessage): number | undefined | null {
  const raw = request.headers['if-match']
  if (raw === undefined) return undefined
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return null
  const match = /^(?:W\/)?"?(\d+)"?$/u.exec(value.trim())
  if (match === null) return null
  const revision = Number(match[1])
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : null
}

async function readDocument(request: IncomingMessage): Promise<TaskLedgerDocumentV3 | undefined> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
    bytes += part.length
    if (bytes > BODY_CAP_BYTES) return undefined
    chunks.push(part)
  }
  return parseLedgerDocumentV3(Buffer.concat(chunks).toString('utf8'))
}

export interface TaskBoardHostSchedulerStatusSource {
  status(): HostSchedulerStatus
}

/** Route registrations plus the event-stream cleanup paired with them. */
export interface TaskBoardV3RouteFamily {
  routes: WebRoute[]
  dispose(): void
}

interface OpenStream {
  response: ServerResponse
  timer: ReturnType<typeof setInterval>
}

/** V3 mutation stream keeps browser tabs coherent with Host scheduler writes. */
class TaskBoardV3Events {
  private readonly streams = new Set<OpenStream>()
  private readonly unsubscribe: () => void

  constructor(store: HostTaskStoreV3) {
    this.unsubscribe = store.subscribe(document => { this.push(document) })
  }

  open(request: IncomingMessage, response: ServerResponse, document: TaskLedgerDocumentV3): void {
    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    })
    const stream: OpenStream = {
      response,
      timer: setInterval(() => { response.write(': keepalive\n\n') }, KEEPALIVE_MS),
    }
    stream.timer.unref?.()
    this.streams.add(stream)
    response.write(`data: ${JSON.stringify({ type: 'ready', revision: document.revision })}\n\n`)
    const close = (): void => {
      if (!this.streams.delete(stream)) return
      clearInterval(stream.timer)
    }
    request.once('close', close)
    response.once('close', close)
  }

  dispose(): void {
    this.unsubscribe()
    for (const stream of this.streams) {
      clearInterval(stream.timer)
      stream.response.end()
    }
    this.streams.clear()
  }

  private push(document: TaskLedgerDocumentV3): void {
    const frame = `data: ${JSON.stringify({ type: 'changed', revision: document.revision })}\n\n`
    for (const stream of [...this.streams]) {
      try {
        stream.response.write(frame)
      } catch {
        clearInterval(stream.timer)
        this.streams.delete(stream)
      }
    }
  }
}

export function makeTaskBoardV3Routes(
  store: HostTaskStoreV3,
  options: { scheduler?: TaskBoardHostSchedulerStatusSource } = {},
): TaskBoardV3RouteFamily {
  const events = new TaskBoardV3Events(store)
  const handler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (!isTrustedTaskBoardRequest(request)) {
      json(response, 403, { ok: false, code: 'forbidden' })
      return
    }
    if (request.method === 'GET') {
      json(response, 200, await store.load())
      return
    }
    if (request.method === 'PUT') {
      const document = await readDocument(request)
      if (document === undefined) {
        json(response, 400, { ok: false, code: 'invalid-ledger-v3' })
        return
      }
      try {
        json(response, 200, await store.save(document))
      } catch (error) {
        if (error instanceof TaskLedgerRevisionConflictError) {
          json(response, 409, { ok: false, code: error.code, document: error.current })
          return
        }
        throw error
      }
      return
    }
    if (request.method === 'DELETE') {
      const revision = expectedRevision(request)
      if (revision === null) {
        json(response, 400, { ok: false, code: 'invalid-ledger-revision' })
        return
      }
      try {
        json(response, 200, await store.clear(revision))
      } catch (error) {
        if (error instanceof TaskLedgerRevisionConflictError) {
          json(response, 409, { ok: false, code: error.code, document: error.current })
          return
        }
        throw error
      }
      return
    }
    json(response, 405, { ok: false, code: 'method-not-allowed' })
  }
  const schedulerStatusHandler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (!isTrustedTaskBoardRequest(request)) {
      json(response, 403, { ok: false, code: 'forbidden' })
      return
    }
    if (request.method !== 'GET') {
      json(response, 405, { ok: false, code: 'method-not-allowed' })
      return
    }
    json(response, 200, options.scheduler?.status() ?? {
      available: false,
      mode: 'client-fallback',
      provider: 'unavailable',
      reason: 'Task Board Host scheduler is not executable in this runtime.',
    } satisfies HostSchedulerStatus)
  }
  const eventsHandler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (!isTrustedTaskBoardRequest(request)) {
      json(response, 403, { ok: false, code: 'forbidden' })
      return
    }
    if (request.method !== 'GET') {
      json(response, 405, { ok: false, code: 'method-not-allowed' })
      return
    }
    events.open(request, response, await store.load())
  }
  return {
    routes: [
      { kind: 'exact', path: TASK_BOARD_V3_API_PATH, handler },
      { kind: 'exact', path: TASK_BOARD_V3_EVENTS_PATH, handler: eventsHandler },
      { kind: 'exact', path: TASK_BOARD_SCHEDULER_STATUS_PATH, handler: schedulerStatusHandler },
    ],
    // Cordis owns route registration/disposal; expose stream cleanup through
    // the family so plugin unload never leaves a keepalive interval behind.
    dispose: () => events.dispose(),
  }
}
