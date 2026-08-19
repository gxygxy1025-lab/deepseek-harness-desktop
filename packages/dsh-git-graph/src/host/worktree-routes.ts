/** Loopback-only, ID-only HTTP routes for Desktop 2.6 Worktree operations. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { isLoopbackRequest } from './routes.ts'
import type {
  CommitWorktreeResult,
  MergeWorktreeResult,
  WorktreeHostService,
  WorktreeRecord,
  WorktreeResult,
  WorktreeStatus,
} from './worktree-service.ts'

const BODY_CAP_BYTES = 256 * 1024

function json(response: ServerResponse, value: unknown, status = 200): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(value))
}

async function body(request: IncomingMessage): Promise<Record<string, unknown> | undefined> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
    size += value.length
    if (size > BODY_CAP_BYTES) {
      request.destroy()
      return undefined
    }
    chunks.push(value)
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
    return parsed as Record<string, unknown>
  } catch {
    return undefined
  }
}

function id(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,127}$/u.test(value) ? value : undefined
}

function contentTypeOk(request: IncomingMessage): boolean {
  return (request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')
}

export type RendererWorktreeRecord = Omit<WorktreeRecord, 'path' | 'repoRoot'>
export type RendererWorktreeStatus = Omit<WorktreeStatus, 'path'>

/** Strip Host paths before a Worktree record crosses into renderer code. */
export function rendererWorktreeRecord(record: WorktreeRecord): RendererWorktreeRecord {
  const { path: _path, repoRoot: _repoRoot, ...safe } = record
  return structuredClone(safe)
}

/** Status contains repository-relative files but never the absolute Worktree path. */
export function rendererWorktreeStatus(status: WorktreeStatus): RendererWorktreeStatus {
  const { path: _path, ...safe } = status
  return structuredClone(safe)
}

function mapResult<T, U>(result: WorktreeResult<T>, project: (value: T) => U): WorktreeResult<U> {
  return result.ok ? { ok: true, value: project(result.value) } : result
}

/** Register Worktree APIs; no route accepts a filesystem path or Git argv. */
export function registerWorktreeRoutes(
  ctx: Context,
  service: WorktreeHostService,
  beforeRequest?: () => void | Promise<void>,
): () => void {
  const handler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (!isLoopbackRequest(request)) {
      json(response, { ok: false, error: { code: 'forbidden', message: 'loopback-only' } }, 403)
      return
    }
    await beforeRequest?.()
    if (request.method !== 'POST' || !contentTypeOk(request)) {
      json(response, { ok: false, error: { code: 'method-not-allowed', message: 'POST application/json required' } }, 405)
      return
    }
    const payload = await body(request)
    if (payload === undefined) {
      json(response, { ok: false, error: { code: 'invalid-request', message: 'JSON body is invalid' } }, 400)
      return
    }
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
    let result: unknown
    if (pathname === '/git-worktree/list') {
      const workspaceId = id(payload.workspaceId)
      result = workspaceId === undefined
        ? { ok: false, error: { code: 'invalid-id', message: 'workspaceId is required' } }
        : mapResult(await service.listWorktrees(workspaceId), rows => rows.map(rendererWorktreeRecord))
    } else if (pathname === '/git-worktree/create') {
      const workspaceId = id(payload.workspaceId)
      const taskId = id(payload.taskId)
      const runId = id(payload.runId)
      result = workspaceId === undefined || taskId === undefined || runId === undefined
        ? { ok: false, error: { code: 'invalid-id', message: 'workspaceId, taskId, and runId are required' } }
        : mapResult(await service.createWorktree({ workspaceId, taskId, runId }), rendererWorktreeRecord)
    } else if (pathname === '/git-worktree/status') {
      const worktreeId = id(payload.worktreeId)
      result = worktreeId === undefined
        ? { ok: false, error: { code: 'invalid-id', message: 'worktreeId is required' } }
        : mapResult(await service.getWorktreeStatus(worktreeId), rendererWorktreeStatus)
    } else if (pathname === '/git-worktree/diff') {
      const worktreeId = id(payload.worktreeId)
      const maxPreviewBytes = typeof payload.maxPreviewBytes === 'number' ? Math.min(128 * 1024, Math.max(1, Math.floor(payload.maxPreviewBytes))) : undefined
      result = worktreeId === undefined ? { ok: false, error: { code: 'invalid-id', message: 'worktreeId is required' } } : await service.diffWorktree(worktreeId, { ...(maxPreviewBytes === undefined ? {} : { maxPreviewBytes }) })
    } else if (pathname === '/git-worktree/remove') {
      const worktreeId = id(payload.worktreeId)
      const preserveBranch = payload.preserveBranch === undefined ? true : payload.preserveBranch === true
      const force = payload.force === true
      const confirmDiscard = payload.confirmDiscard === true || payload.confirmDiscard === 'DISCARD' ? payload.confirmDiscard as boolean | 'DISCARD' : undefined
      result = worktreeId === undefined ? { ok: false, error: { code: 'invalid-id', message: 'worktreeId is required' } } : await service.removeWorktree({ worktreeId, preserveBranch, force, ...(confirmDiscard === undefined ? {} : { confirmDiscard }) })
    } else if (pathname === '/git-worktree/commit') {
      const worktreeId = id(payload.worktreeId)
      const message = typeof payload.message === 'string' ? payload.message : ''
      result = worktreeId === undefined
        ? { ok: false, error: { code: 'invalid-id', message: 'worktreeId is required' } }
        : mapResult(await service.commitWorktree(worktreeId, message), (value: CommitWorktreeResult) => ({ worktreeId: value.worktree.worktreeId, revision: value.revision, committed: value.committed }))
    } else if (pathname === '/git-worktree/merge') {
      const worktreeId = id(payload.worktreeId)
      const targetBranch = typeof payload.targetBranch === 'string' ? payload.targetBranch : ''
      result = worktreeId === undefined || targetBranch === ''
        ? { ok: false, error: { code: 'invalid-request', message: 'worktreeId and targetBranch are required' } }
        : mapResult(await service.mergeWorktree(worktreeId, targetBranch), (value: MergeWorktreeResult) => ({ worktreeId: value.worktree.worktreeId, targetBranch: value.targetBranch, revision: value.revision }))
    } else {
      json(response, { ok: false, error: { code: 'not-found', message: 'unknown worktree route' } }, 404)
      return
    }
    json(response, result)
  }
  const dispose = ctx.webServer.register({ kind: 'prefix', path: '/git-worktree', handler })
  return dispose
}
