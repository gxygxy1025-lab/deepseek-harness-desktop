/** HostTaskStore v3 loopback route for Project/Run/Evidence snapshots. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { parseLedgerDocumentV3, type TaskLedgerDocumentV3 } from '../core/store-v3.ts'
import { isTrustedTaskBoardRequest } from './routes.ts'
import type { HostTaskStoreV3 } from './v3-file-store.ts'

export const TASK_BOARD_V3_API_PATH = '/api/dsh-task-board/v3'
const BODY_CAP_BYTES = 4 * 1024 * 1024

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(value))
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

export function makeTaskBoardV3Routes(store: HostTaskStoreV3): { routes: WebRoute[] } {
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
      json(response, 200, await store.save(document))
      return
    }
    if (request.method === 'DELETE') {
      json(response, 200, await store.clear())
      return
    }
    json(response, 405, { ok: false, code: 'method-not-allowed' })
  }
  return { routes: [{ kind: 'exact', path: TASK_BOARD_V3_API_PATH, handler }] }
}
