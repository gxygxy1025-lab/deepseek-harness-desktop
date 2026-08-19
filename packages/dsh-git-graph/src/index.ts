/**
 * @linxin666/dsh-client-ui-git-graph — host half: the workspace-gated git
 * service and its /git/* HTTP routes (JSON operations + SSE change stream)
 * on the shared webserver. The browser half (exports "./client") is served
 * by client-modules from the same package's dsh.client declaration.
 *
 * The host half owns no model-visible surface: git switch/create are UI-
 * triggered host operations on the workspace disk tree, never tool calls.
 * @module @linxin666/dsh-client-ui-git-graph
 */

import { realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-subprocess'
import type {} from '@deepseek-ai/dsh-workspace'
import { GitService, subprocessRunner, type WorkspaceGate } from './host/git-service.ts'
import { registerGitRoutes } from './host/routes.ts'
import { registerWorktreeRoutes } from './host/worktree-routes.ts'
import { WorktreeHostService, WorktreeWorkspaceRegistry } from './host/worktree-service.ts'
export * from './core/types.ts'
export * from './host/worktree-service.ts'

/** Required services: the route registry, the managed subprocess seam, and the workspace registry. */
export const inject = ['webServer', 'subprocess', 'workspaceRegistry']

/**
 * The workspace-membership gate: canonicalize the requested path and require
 * it to equal a registered workspace path. This is the security boundary of
 * the /git routes — the browser may only run git on workspace roots, never
 * arbitrary host directories.
 */
function createWorkspaceGate(ctx: Context): WorkspaceGate {
  return async (path) => {
    let canonical: string
    try {
      canonical = await realpath(path)
    } catch {
      return { ok: false, error: { code: 'workspace-unknown', message: 'path does not resolve on disk' } }
    }
    if (ctx.workspaceRegistry.list().some(workspace => workspace.path === canonical)) {
      return { ok: true, canonical }
    }
    return { ok: false, error: { code: 'workspace-unknown', message: 'path is not a registered workspace' } }
  }
}

/**
 * Mount the git service and its routes.
 * @param ctx - context carrying webServer, subprocess, and workspaceRegistry.
 */
export function apply(ctx: Context): void {
  const service = new GitService(subprocessRunner(ctx), createWorkspaceGate(ctx))
  ctx.effect(() => registerGitRoutes(ctx, service), 'dsh-git-graph: /git routes')

  // Desktop 2.6 Worktree operations share the same managed subprocess and
  // workspace registry, but expose an ID-only route surface. The upstream
  // registry remains the source of truth; this local registry only stores its
  // realpath-canonical Host references and never accepts renderer paths.
  const worktreeRegistry = new WorktreeWorkspaceRegistry()
  const syncWorktreeRegistry = async (): Promise<void> => {
    const activeIds = new Set<string>()
    for (const workspace of ctx.workspaceRegistry.list()) {
      const workspaceId = typeof (workspace as unknown as { workspaceId?: unknown }).workspaceId === 'string'
        ? (workspace as unknown as { workspaceId: string }).workspaceId
        : typeof (workspace as unknown as { id?: unknown }).id === 'string'
          ? (workspace as unknown as { id: string }).id
          : undefined
      if (workspaceId === undefined || typeof workspace.path !== 'string') continue
      const registered = await worktreeRegistry.register({ workspaceId, root: workspace.path })
      if (registered.ok) activeIds.add(workspaceId)
    }
    for (const registered of worktreeRegistry.list()) {
      if (!activeIds.has(registered.workspaceId)) worktreeRegistry.unregister(registered.workspaceId)
    }
  }
  const worktreeService = new WorktreeHostService({
    runner: subprocessRunner(ctx),
    registry: worktreeRegistry,
    dshHome: process.env.DSH_HOME ?? join(homedir(), '.dsh'),
  })
  ctx.effect(() => {
    void syncWorktreeRegistry().then(() => worktreeService.reconcile())
    return registerWorktreeRoutes(ctx, worktreeService, syncWorktreeRegistry)
  }, 'dsh-git-graph: worktree routes')
}
