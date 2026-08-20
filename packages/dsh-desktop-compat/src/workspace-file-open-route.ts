/** Desktop-owned, loopback-only authority for native workspace-file opening. */

import { timingSafeEqual } from 'node:crypto'
import { realpath, stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isAbsolute, join, relative } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-workspace'
import {
  DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_ENV,
  DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_HEADER,
  isDesktopWorkspaceFileOpenToken,
  isSafeDesktopWorkspaceFileOpenPath,
} from './workspace-file-open-policy.ts'

export const DESKTOP_WORKSPACE_FILE_OPEN_TARGET_PATH = '/desktop/workspace-file-open-target'

const MAX_ROOT_LENGTH = 32_767
const MAX_RELATIVE_PATH_LENGTH = 4_096
const MAX_BODY_BYTES = 1 << 20

type WorkspaceAuthority = {
  resolveByPath(path: string): Promise<{ path: string } | undefined>
}

type OpenTargetFailure = {
  ok: false
  error: { code: string; message: string }
}
type OpenTargetSuccess = {
  ok: true
  value: { path: string }
}

function failure(code: string, message: string): OpenTargetFailure {
  return { ok: false, error: { code, message } }
}

function normalizeForPrefix(value: string): string {
  const normalized = value.replaceAll('\\', '/').replace(/\/+$/u, '')
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

function isPathInside(root: string, child: string): boolean {
  if (root === '' || child === '') return false
  const normalizedRoot = normalizeForPrefix(root)
  const normalizedChild = normalizeForPrefix(child)
  return normalizedChild === normalizedRoot || normalizedChild.startsWith(`${normalizedRoot}/`)
}

function isSameCanonicalPath(left: string, right: string): boolean {
  return normalizeForPrefix(left) === normalizeForPrefix(right)
}

function isGitPath(path: string): boolean {
  return path.replaceAll('\\', '/').split('/').some(part => part.toLowerCase() === '.git')
}

function isLoopbackRequest(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl: URL
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(hostUrl.hostname)) return false
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

function writeJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  response.end(JSON.stringify(value))
}

/**
 * Compare an opaque launch capability without leaking a matching prefix. A
 * missing, malformed, or wrong-length header is padded before comparison too,
 * so every request with a configured secret reaches `timingSafeEqual`.
 */
function capabilityTokenMatches(expected: string | undefined, supplied: string | string[] | undefined): boolean {
  if (!isDesktopWorkspaceFileOpenToken(expected)) return false
  const expectedBytes = Buffer.from(expected, 'utf8')
  const suppliedBytes = typeof supplied === 'string' ? Buffer.from(supplied, 'utf8') : Buffer.alloc(0)
  const paddedSupplied = Buffer.alloc(expectedBytes.length)
  suppliedBytes.copy(paddedSupplied, 0, 0, expectedBytes.length)
  const equal = timingSafeEqual(expectedBytes, paddedSupplied)
  return suppliedBytes.length === expectedBytes.length && equal
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
    size += buffer.length
    if (size > MAX_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    return undefined
  }
}

function normalizeRequest(value: unknown): { root: string; path: string } | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const root = typeof record.root === 'string' ? record.root.trim() : ''
  const path = typeof record.path === 'string' ? record.path.trim().replaceAll('\\', '/') : ''
  if (root.length === 0 || root.length > MAX_ROOT_LENGTH || !isAbsolute(root)) return undefined
  if (
    path.length === 0
    || path.length > MAX_RELATIVE_PATH_LENGTH
    || path.startsWith('/')
    || /^[a-z]:/iu.test(path)
    || path.split('/').some(segment => segment.length === 0 || segment === '..' || segment.includes(':'))
    || !isSafeDesktopWorkspaceFileOpenPath(path)
  ) return undefined
  return { root, path }
}

/**
 * Resolve only an exact registered workspace root. The launch capability
 * authenticates Electron main to this Host route; it intentionally is not a
 * browser-session identifier. The public DSH route protocol has no
 * renderer-session credential to verify here, so a supplied session field
 * would merely be forgeable browser input.
 */
export async function resolveDesktopWorkspaceFileOpenTarget(
  workspaceRegistry: WorkspaceAuthority,
  request: { root: string; path: string },
): Promise<OpenTargetSuccess | OpenTargetFailure> {
  const normalizedRequest = normalizeRequest(request)
  if (normalizedRequest === undefined) {
    return failure('invalid-request', 'workspace file request is invalid')
  }

  let workspace: { path: string } | undefined
  try {
    workspace = await workspaceRegistry.resolveByPath(normalizedRequest.root)
  } catch {
    return failure('workspace-unknown', 'workspace root is not registered')
  }
  if (workspace === undefined) return failure('workspace-unknown', 'workspace root is not registered')

  let requestedRoot: string
  let root: string
  try {
    requestedRoot = await realpath(normalizedRequest.root)
    root = await realpath(workspace.path)
  } catch {
    return failure('workspace-unknown', 'workspace root is unavailable')
  }
  // Do not trust a containing-path registry implementation: the canonical
  // request root must itself equal the resolved registry owner.
  if (!isSameCanonicalPath(requestedRoot, root)) {
    return failure('workspace-unknown', 'workspace root is not registered')
  }

  const candidate = join(root, normalizedRequest.path)
  if (!isPathInside(root, candidate) || isGitPath(normalizedRequest.path)) {
    return failure('path-outside-root', 'workspace file path is not allowed')
  }

  let target: string
  try {
    target = await realpath(candidate)
  } catch {
    return failure('not-found', 'workspace file was not found')
  }
  if (!isPathInside(root, target) || isGitPath(relative(root, target))) {
    return failure('path-outside-root', 'workspace file path is not allowed')
  }

  let info: Awaited<ReturnType<typeof stat>>
  try {
    info = await stat(target)
  } catch {
    return failure('not-found', 'workspace file was not found')
  }
  if (info.isDirectory()) return failure('is-directory', 'workspace target is a directory')
  if (!info.isFile()) return failure('external-open-denied', 'only regular files may be opened')
  if (!isSafeDesktopWorkspaceFileOpenPath(target)) {
    return failure('external-open-denied', 'workspace file type is not allowed for native opening')
  }
  return { ok: true, value: { path: target } }
}

/** Create the exact route so unit tests can exercise its transport fence. */
export function createDesktopWorkspaceFileOpenRoute(
  workspaceRegistry: WorkspaceAuthority,
  { capabilityToken = process.env[DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_ENV] }: { capabilityToken?: string } = {},
): WebRoute {
  // Capture the process-private launch token when the route is mounted. A
  // restart creates a new Host process and therefore a new authority.
  const expectedCapabilityToken = capabilityToken
  return {
    kind: 'exact',
    path: DESKTOP_WORKSPACE_FILE_OPEN_TARGET_PATH,
    handler: async (request, response) => {
      if (!isLoopbackRequest(request)) {
        writeJson(response, 403, failure('forbidden', 'loopback-only'))
        return
      }
      if (!capabilityTokenMatches(expectedCapabilityToken, request.headers[DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_HEADER])) {
        // Do this before consuming a body or consulting workspace state. A
        // same-origin renderer lacks this main-process-only token and cannot
        // use the route as an absolute-path oracle.
        writeJson(response, 403, failure('forbidden', 'desktop capability required'))
        return
      }
      if (request.method !== 'POST') {
        writeJson(response, 405, failure('method-not-allowed', 'POST is required'))
        return
      }
      const contentType = request.headers['content-type'] ?? ''
      if (!contentType.toLowerCase().startsWith('application/json')) {
        writeJson(response, 415, failure('invalid-content-type', 'application/json is required'))
        return
      }
      const requestValue = normalizeRequest(await readJsonBody(request))
      if (requestValue === undefined) {
        writeJson(response, 400, failure('bad-request', 'malformed workspace file request'))
        return
      }
      writeJson(response, 200, await resolveDesktopWorkspaceFileOpenTarget(workspaceRegistry, requestValue))
    },
  }
}

/** Register the authority with the always-mounted Desktop compat bundle. */
export function registerDesktopWorkspaceFileOpenRoute(ctx: Context): () => void {
  return ctx.webServer.register(createDesktopWorkspaceFileOpenRoute(ctx.workspaceRegistry, {
    capabilityToken: process.env[DESKTOP_WORKSPACE_FILE_OPEN_TOKEN_ENV],
  }))
}
