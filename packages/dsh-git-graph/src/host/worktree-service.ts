/**
 * Desktop 2.6 safe Git Worktree Host service.
 *
 * The service is Host-only. Callers address workspaces and worktrees by IDs;
 * paths are resolved from a Host registry and every Git invocation receives a
 * separate argv array through the existing subprocess runner.
 */

import { createHash } from 'node:crypto'
import { access, mkdir, readFile, realpath, rename, rm, stat, statfs, writeFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

import {
  addAllArgv,
  bareRepositoryArgv,
  commitArgv,
  diffNumstatArgv,
  diffPatchArgv,
  deleteBranchArgv,
  headBranchArgv,
  headShortArgv,
  mergeArgv,
  mergeTreeArgv,
  operationMarkersArgv,
  statusPorcelainArgv,
  topLevelArgv,
  unmergedArgv,
  validateBranchName,
  verifyRefArgv,
  worktreeAddArgv,
  worktreeListArgv,
  worktreeRemoveArgv,
  worktreeCheckoutArgv,
} from '../core/git-command.ts'
import {
  parsePorcelain,
  type WorktreeError,
  type WorktreeFileStat,
  type WorktreeRecord,
  type WorktreeResult,
  type WorktreeStatus,
} from '../core/types.ts'
import type { GitRunResult, GitRunner } from './git-service.ts'

export interface WorkspaceRegistration {
  workspaceId: string
  root: string
  /** Optional Host-provided repository identity. */
  repoIdentity?: { remoteHash?: string }
}

export interface RegisteredWorkspace extends WorkspaceRegistration {
  canonicalRoot: string
}

export interface WorkspaceRegistryOptions {
  realpath?: (path: string) => Promise<string>
}

/** Host registry with a realpath canonicalization fence. */
export class WorktreeWorkspaceRegistry {
  private readonly items = new Map<string, RegisteredWorkspace>()
  private readonly resolveRealpath: (path: string) => Promise<string>

  constructor(options: WorkspaceRegistryOptions = {}) {
    this.resolveRealpath = options.realpath ?? realpath
  }

  async register(input: WorkspaceRegistration): Promise<WorktreeResult<RegisteredWorkspace>> {
    if (!isSafeId(input.workspaceId) || !isAbsolute(input.root)) return fail('invalid-id', 'workspace id or root is invalid')
    try {
      const canonicalRoot = await this.resolveRealpath(input.root)
      const row: RegisteredWorkspace = { ...input, canonicalRoot }
      this.items.set(input.workspaceId, row)
      return ok({ ...row })
    } catch (error) {
      return fail('workspace-unknown', `workspace root cannot be resolved: ${messageOf(error)}`)
    }
  }

  unregister(workspaceId: string): void {
    this.items.delete(workspaceId)
  }

  resolve(workspaceId: string): RegisteredWorkspace | undefined {
    const value = this.items.get(workspaceId)
    return value === undefined ? undefined : { ...value }
  }

  list(): RegisteredWorkspace[] {
    return [...this.items.values()].map(value => ({ ...value }))
  }
}

export interface WorktreeHostServiceOptions {
  runner: GitRunner
  registry: WorktreeWorkspaceRegistry
  dshHome: string
  now?: () => number
  randomId?: () => string
  /** Useful for deterministic tests; production uses fs/promises. */
  fs?: Partial<WorktreeFileSystem>
}

interface WorktreeFileSystem {
  access(path: string, mode?: number): Promise<void>
  mkdir(path: string, options?: { recursive?: boolean }): Promise<unknown>
  readFile(path: string, encoding: 'utf8'): Promise<string>
  rename(oldPath: string, newPath: string): Promise<void>
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>
  stat(path: string): Promise<{ isDirectory(): boolean }>
  statfs(path: string): Promise<{ bavail: number | bigint; bsize: number | bigint }>
  writeFile(path: string, data: string, options?: { encoding?: BufferEncoding; flag?: string; mode?: number }): Promise<void>
  realpath(path: string): Promise<string>
}

const DEFAULT_FS: WorktreeFileSystem = {
  access,
  mkdir,
  readFile: (path, encoding) => readFile(path, encoding),
  rename,
  rm,
  stat,
  statfs,
  writeFile: (path, data, options) => writeFile(path, data, options),
  realpath,
}

export interface CreateWorktreeInput {
  workspaceId: string
  taskId: string
  runId: string
  baseRef?: string
}

export interface RemoveWorktreeInput {
  worktreeId: string
  preserveBranch?: boolean
  /** A force remove is only legal after explicit second confirmation. */
  force?: boolean
  confirmDiscard?: boolean | 'DISCARD'
}

export interface CommitWorktreeResult {
  worktree: WorktreeRecord
  revision: string
  committed: boolean
}

export interface MergeWorktreeResult {
  worktree: WorktreeRecord
  targetBranch: string
  revision: string
}

export interface WorktreeDiff {
  worktreeId: string
  baseRevision?: string
  finalRevision?: string
  files: WorktreeFileStat[]
  additions: number
  deletions: number
  preview: string
  previewTruncated: boolean
}

const MAX_PREVIEW_BYTES = 128 * 1024
const MAX_DIFF_FILES = 500
const MIN_WORKTREE_FREE_BYTES = 64 * 1024 * 1024
const WORKTREE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/u

function ok<T>(value: T): WorktreeResult<T> {
  return { ok: true, value }
}

function fail<T = never>(code: WorktreeError['code'], message: string): WorktreeResult<T> {
  return { ok: false, error: { code, message } as WorktreeError }
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && WORKTREE_ID_PATTERN.test(value)
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function boundedUtf8(value: string, maxBytes: number): { text: string; truncated: boolean } {
  const encoded = Buffer.from(value, 'utf8')
  if (encoded.byteLength <= maxBytes) return { text: value, truncated: false }
  return { text: encoded.subarray(0, maxBytes).toString('utf8').replace(/\uFFFD$/u, ''), truncated: true }
}

function slug(value: string, max = 32): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '')
  return (normalized || 'run').slice(0, max)
}

export function strictWorktreeBranch(taskId: string, runId: string): string {
  const branch = `dsh/task/${slug(taskId, 36)}-${slug(runId, 36)}`
  return branch.slice(0, 96).replace(/-+$/u, '')
}

export function worktreeRepoHash(repoRoot: string): string {
  return createHash('sha256').update(repoRoot).digest('hex').slice(0, 20)
}

export function worktreePath(dshHome: string, repoRoot: string, runId: string): string {
  if (!isAbsolute(dshHome) || !isSafeId(runId)) throw new TypeError('worktree path inputs are invalid')
  const home = resolve(dshHome)
  const path = resolve(home, 'worktrees', worktreeRepoHash(repoRoot), runId)
  const rel = relative(home, path)
  if (rel.startsWith('..') || isAbsolute(rel)) throw new TypeError('worktree path escapes DSH_HOME')
  return path
}

/** Parse `git worktree list --porcelain` without exposing arbitrary paths. */
export function parseWorktreeList(stdout: string): Array<{ path: string; head: string; branch?: string }> {
  const rows: Array<{ path: string; head: string; branch?: string }> = []
  let current: { path?: string; head?: string; branch?: string } = {}
  const flush = (): void => {
    if (typeof current.path === 'string' && typeof current.head === 'string') rows.push({ path: current.path, head: current.head, ...(current.branch === undefined ? {} : { branch: current.branch }) })
    current = {}
  }
  for (const line of stdout.split(/\r?\n/u)) {
    if (line === '') { flush(); continue }
    if (line.startsWith('worktree ')) current.path = line.slice('worktree '.length)
    else if (line.startsWith('HEAD ')) current.head = line.slice('HEAD '.length)
    else if (line.startsWith('branch refs/heads/')) current.branch = line.slice('branch refs/heads/'.length)
  }
  flush()
  return rows
}

function parseDiffNumstat(stdout: string): WorktreeFileStat[] {
  const files: WorktreeFileStat[] = []
  for (const line of stdout.split(/\r?\n/u)) {
    if (line === '') continue
    const parts = line.split('\t')
    if (parts.length < 3) continue
    const [additions, deletions, ...pathParts] = parts
    const path = pathParts.join('\t')
    const binary = additions === '-' || deletions === '-'
    files.push({
      path,
      additions: binary ? 0 : Number(additions) || 0,
      deletions: binary ? 0 : Number(deletions) || 0,
      ...(binary ? { binary: true, status: 'unknown' as const } : { status: 'modified' as const }),
    })
    if (files.length >= MAX_DIFF_FILES) break
  }
  return files
}

function mergeFiles(statusOutput: string, numstat: WorktreeFileStat[]): WorktreeFileStat[] {
  const byPath = new Map(numstat.map(file => [file.path, file]))
  for (const line of statusOutput.split(/\r?\n/u)) {
    if (line.length < 4) continue
    const code = line.slice(0, 2)
    const path = line.slice(3).trim()
    if (!path) continue
    const status: WorktreeFileStat['status'] = code.includes('A') || code === '??'
      ? 'added'
      : code.includes('D') ? 'deleted' : code.includes('R') ? 'renamed' : 'modified'
    const existing = byPath.get(path)
    byPath.set(path, existing === undefined ? { path, additions: 0, deletions: 0, status } : { ...existing, status })
  }
  return [...byPath.values()].slice(0, MAX_DIFF_FILES)
}

/** Safe worktree lifecycle and review operations. */
export class WorktreeHostService {
  private readonly now: () => number
  private readonly randomId: () => string
  private readonly fs: WorktreeFileSystem
  private readonly records = new Map<string, WorktreeRecord>()
  private loaded = false
  private queue: Promise<void> = Promise.resolve()

  constructor(private readonly options: WorktreeHostServiceOptions) {
    this.now = options.now ?? Date.now
    this.randomId = options.randomId ?? (() => createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex').slice(0, 16))
    this.fs = { ...DEFAULT_FS, ...(options.fs ?? {}) }
    if (!isAbsolute(options.dshHome)) throw new TypeError('dshHome must be absolute')
  }

  async registerWorkspace(input: WorkspaceRegistration): Promise<WorktreeResult<RegisteredWorkspace>> {
    return this.options.registry.register(input)
  }

  async reconcile(): Promise<WorktreeRecord[]> {
    await this.ensureLoaded()
    for (const workspace of this.options.registry.list()) {
      const list = await this.options.runner.run(worktreeListArgv(), workspace.canonicalRoot)
      if (list.exitCode !== 0) continue
      const actualPaths = new Set(parseWorktreeList(list.stdout).map(item => resolve(item.path)))
      for (const record of this.records.values()) {
        if (record.repoRoot !== workspace.canonicalRoot) continue
        if (record.state === 'removed') continue
        if (!actualPaths.has(resolve(record.path))) record.state = 'orphaned'
      }
    }
    await this.persist()
    return [...this.records.values()].map(record => structuredClone(record))
  }

  async listWorktrees(workspaceId: string): Promise<WorktreeResult<WorktreeRecord[]>> {
    const workspace = this.options.registry.resolve(workspaceId)
    if (workspace === undefined) return fail('workspace-unknown', 'workspace is not registered')
    await this.reconcile()
    return ok([...this.records.values()]
      .filter(record => record.workspaceId === workspaceId && record.state !== 'removed')
      .map(record => structuredClone(record)))
  }

  async createWorktree(input: CreateWorktreeInput): Promise<WorktreeResult<WorktreeRecord>> {
    if (!isSafeId(input.workspaceId) || !isSafeId(input.taskId) || !isSafeId(input.runId)) return fail('invalid-id', 'workspace, task, or run id is invalid')
    const workspace = this.options.registry.resolve(input.workspaceId)
    if (workspace === undefined) return fail('workspace-unknown', 'workspace is not registered')
    const root = await this.repositoryRoot(workspace.canonicalRoot)
    if (!root.ok) return root
    const preflight = await this.preflight(root.value)
    if (!preflight.ok) return preflight
    const capacity = await this.ensureWorktreeCapacity()
    if (!capacity.ok) return capacity
    const baseRef = input.baseRef ?? 'HEAD'
    const base = await this.options.runner.run(['rev-parse', '--verify', baseRef], root.value)
    if (base.exitCode !== 0 || base.stdout.trim() === '') return fail('target-branch-not-found', 'base revision does not exist')
    const branch = strictWorktreeBranch(input.taskId, input.runId)
    if (await this.branchExists(root.value, branch)) return fail('branch-already-exists', `task branch already exists: ${branch}`)
    const listed = await this.options.runner.run(worktreeListArgv(), root.value)
    if (listed.exitCode === 0 && parseWorktreeList(listed.stdout).some(row => row.branch === branch)) return fail('branch-in-other-worktree', `branch is already checked out: ${branch}`)
    const path = worktreePath(this.options.dshHome, root.value, input.runId)
    if (await this.exists(path)) return fail('worktree-already-exists', 'worktree directory already exists')
    try {
      await this.fs.mkdir(dirname(path), { recursive: true })
      const created = await this.options.runner.run(worktreeAddArgv(path, branch, baseRef), root.value)
      if (created.exitCode !== 0) return fail('internal', created.stderr.trim() || 'git worktree creation failed')
      const checkedOut = await this.options.runner.run(worktreeCheckoutArgv(), path)
      if (checkedOut.exitCode !== 0) {
        await this.options.runner.run(worktreeRemoveArgv(path, true), root.value)
        return fail('internal', checkedOut.stderr.trim() || 'git worktree checkout failed')
      }
      const worktreeId = `wt-${this.randomId()}`
      const record: WorktreeRecord = {
        worktreeId,
        workspaceId: input.workspaceId,
        repoRoot: root.value,
        path,
        branch,
        runId: input.runId,
        taskId: input.taskId,
        baseRevision: base.stdout.trim(),
        createdAt: this.now(),
        state: 'ready',
      }
      await this.ensureLoaded()
      this.records.set(worktreeId, record)
      await this.persist()
      return ok(structuredClone(record))
    } catch (error) {
      return fail('disk-space', `worktree directory could not be created: ${messageOf(error)}`)
    }
  }

  async getWorktreeStatus(worktreeId: string): Promise<WorktreeResult<WorktreeStatus>> {
    const record = await this.recordOf(worktreeId)
    if (!record) return fail('worktree-not-found', 'worktree is not registered')
    const [head, branch, porcelain, conflicts, operations] = await Promise.all([
      this.options.runner.run(headShortArgv(), record.path),
      this.options.runner.run(headBranchArgv(), record.path),
      this.options.runner.run(statusPorcelainArgv(), record.path),
      this.options.runner.run(unmergedArgv(), record.path),
      this.operationInProgress(record.path),
    ])
    const files = await this.diffFiles(record, porcelain.stdout)
    const counts = parsePorcelain(porcelain.stdout)
    const status: WorktreeStatus = {
      worktreeId: record.worktreeId,
      workspaceId: record.workspaceId,
      path: record.path,
      branch: branch.stdout.trim() === 'HEAD' ? '' : branch.stdout.trim(),
      head: head.stdout.trim(),
      baseRevision: record.baseRevision,
      dirty: counts.dirtyFiles + counts.untrackedFiles > 0,
      clean: counts.dirtyFiles + counts.untrackedFiles + counts.conflicts === 0,
      conflicts: Math.max(counts.conflicts, conflicts.stdout.split(/\r?\n/u).filter(Boolean).length),
      operationInProgress: operations,
      changedFiles: files,
      additions: files.reduce((sum, file) => sum + file.additions, 0),
      deletions: files.reduce((sum, file) => sum + file.deletions, 0),
    }
    record.state = status.dirty ? 'dirty' : 'ready'
    await this.persist()
    return ok(status)
  }

  async diffWorktree(worktreeId: string, options: { maxPreviewBytes?: number; finalRevision?: string } = {}): Promise<WorktreeResult<WorktreeDiff>> {
    const record = await this.recordOf(worktreeId)
    if (!record) return fail('worktree-not-found', 'worktree is not registered')
    const finalRevision = options.finalRevision
    const [status, numstat, patch] = await Promise.all([
      this.options.runner.run(statusPorcelainArgv(), record.path),
      this.options.runner.run(diffNumstatArgv(record.baseRevision, finalRevision), record.path),
      this.options.runner.run(diffPatchArgv(record.baseRevision, finalRevision), record.path),
    ])
    const files = mergeFiles(status.stdout, parseDiffNumstat(numstat.stdout))
    const max = Math.max(1, Math.floor(options.maxPreviewBytes ?? MAX_PREVIEW_BYTES))
    const preview = boundedUtf8(patch.stdout, max)
    return ok({
      worktreeId,
      baseRevision: record.baseRevision,
      finalRevision: finalRevision ?? 'WORKTREE',
      files,
      additions: files.reduce((sum, file) => sum + file.additions, 0),
      deletions: files.reduce((sum, file) => sum + file.deletions, 0),
      preview: preview.text,
      previewTruncated: preview.truncated,
    })
  }

  async removeWorktree(input: RemoveWorktreeInput): Promise<WorktreeResult<{ removed: true; branchPreserved: boolean }>> {
    const record = await this.recordOf(input.worktreeId)
    if (!record) return fail('worktree-not-found', 'worktree is not registered')
    const preserveBranch = input.preserveBranch ?? true
    const status = await this.getWorktreeStatus(record.worktreeId)
    if (!status.ok) return status
    const force = input.force === true
    if (force && input.confirmDiscard !== true && input.confirmDiscard !== 'DISCARD') return fail('worktree-dirty', 'discard requires a second confirmation')
    if (status.value.dirty && !force) return fail('worktree-dirty', 'dirty worktree must be reviewed before removal')
    const workspace = this.options.registry.resolve(record.workspaceId)
    if (workspace === undefined) return fail('workspace-unknown', 'workspace is not registered')
    const removed = await this.options.runner.run(worktreeRemoveArgv(record.path, force), workspace.canonicalRoot)
    if (removed.exitCode !== 0) return fail('internal', removed.stderr.trim() || 'git worktree removal failed')
    record.state = 'removed'
    this.records.set(record.worktreeId, record)
    // Persist the completed filesystem removal before the optional branch
    // cleanup. If Git refuses to delete an unmerged branch, restart
    // reconciliation must not resurrect a Worktree directory that is gone.
    await this.persist()
    if (!preserveBranch) {
      const deleted = await this.options.runner.run(deleteBranchArgv(record.branch), workspace.canonicalRoot)
      if (deleted.exitCode !== 0) return fail('internal', deleted.stderr.trim() || 'task branch was not safely removable')
    }
    return ok({ removed: true, branchPreserved: preserveBranch })
  }

  async commitWorktree(worktreeId: string, message: string): Promise<WorktreeResult<CommitWorktreeResult>> {
    const record = await this.recordOf(worktreeId)
    if (!record) return fail('worktree-not-found', 'worktree is not registered')
    const trimmed = message.trim()
    if (trimmed.length === 0 || trimmed.length > 200) return fail('internal', 'commit message is invalid')
    const status = await this.getWorktreeStatus(worktreeId)
    if (!status.ok) return status
    if (status.value.conflicts > 0 || status.value.operationInProgress) return fail('conflicts-present', 'worktree has unresolved conflicts or an operation in progress')
    if (!status.value.dirty) return ok({ worktree: record, revision: status.value.head, committed: false })
    const staged = await this.options.runner.run(addAllArgv(), record.path)
    if (staged.exitCode !== 0) return fail('internal', staged.stderr.trim() || 'git add failed')
    const committed = await this.options.runner.run(commitArgv(trimmed), record.path)
    if (committed.exitCode !== 0) return fail('internal', committed.stderr.trim() || 'git commit failed')
    const revision = await this.options.runner.run(headShortArgv(), record.path)
    return ok({ worktree: record, revision: revision.stdout.trim(), committed: true })
  }

  async mergeWorktree(worktreeId: string, targetBranch: string): Promise<WorktreeResult<MergeWorktreeResult>> {
    const record = await this.recordOf(worktreeId)
    if (!record) return fail('worktree-not-found', 'worktree is not registered')
    const branchReason = validateBranchName(targetBranch)
    if (branchReason !== null) return fail('invalid-branch-name', `invalid target branch: ${branchReason}`)
    const workspace = this.options.registry.resolve(record.workspaceId)
    if (workspace === undefined) return fail('workspace-unknown', 'workspace is not registered')
    const worktreeStatus = await this.getWorktreeStatus(worktreeId)
    if (!worktreeStatus.ok) return worktreeStatus
    if (worktreeStatus.value.dirty || worktreeStatus.value.conflicts > 0 || worktreeStatus.value.operationInProgress) {
      return fail('conflicts-present', 'worktree must be clean and free of conflicts before merge')
    }
    const root = record.repoRoot
    const [branch, status, conflicts, operation, target] = await Promise.all([
      this.options.runner.run(headBranchArgv(), root),
      this.options.runner.run(statusPorcelainArgv(), root),
      this.options.runner.run(unmergedArgv(), root),
      this.operationInProgress(root),
      this.options.runner.run(verifyRefArgv(targetBranch), root),
    ])
    if (branch.stdout.trim() !== targetBranch) return fail('target-branch-not-found', 'target branch must be the current main workspace branch')
    const counts = parsePorcelain(status.stdout)
    if (counts.dirtyFiles + counts.untrackedFiles > 0) return fail('target-workspace-dirty', 'main workspace is dirty')
    if (conflicts.stdout.trim() !== '' || operation) return fail('operation-in-progress', 'main workspace has an unresolved operation')
    if (target.exitCode !== 0) return fail('target-branch-not-found', `target branch does not exist: ${targetBranch}`)
    const preflight = await this.options.runner.run(mergeTreeArgv(targetBranch, record.branch), root)
    if (preflight.exitCode !== 0) return fail('merge-conflict', preflight.stdout.trim() || preflight.stderr.trim() || 'merge requires manual conflict resolution')
    const merged = await this.options.runner.run(mergeArgv(record.branch), root)
    if (merged.exitCode !== 0) return fail('merge-conflict', merged.stderr.trim() || 'merge failed; resolve conflicts manually')
    const revision = await this.options.runner.run(headShortArgv(), root)
    return ok({ worktree: record, targetBranch, revision: revision.stdout.trim() })
  }

  private async repositoryRoot(workspaceRoot: string): Promise<WorktreeResult<string>> {
    const workspaceBare = await this.options.runner.run(bareRepositoryArgv(), workspaceRoot)
    if (workspaceBare.exitCode === 0 && workspaceBare.stdout.trim() === 'true') {
      return fail('bare-repository', 'bare repositories cannot host an execution worktree')
    }
    const result = await this.options.runner.run(topLevelArgv(), workspaceRoot)
    if (result.exitCode !== 0 || result.stdout.trim() === '') return fail('not-a-git-repository', 'workspace is not a Git repository')
    const root = result.stdout.trim()
    try {
      const canonical = await this.fs.realpath(root)
      if (!isWithin(workspaceRoot, canonical)) return fail('path-outside-home', 'Git root is outside the registered workspace')
      const bare = await this.options.runner.run(bareRepositoryArgv(), canonical)
      if (bare.stdout.trim() === 'true') return fail('bare-repository', 'bare repositories cannot host an execution worktree')
      return ok(canonical)
    } catch (error) {
      return fail('not-a-git-repository', `Git root cannot be resolved: ${messageOf(error)}`)
    }
  }

  private async preflight(root: string): Promise<WorktreeResult<true>> {
    const [unmerged, operations] = await Promise.all([
      this.options.runner.run(unmergedArgv(), root),
      this.operationInProgress(root),
    ])
    if (unmerged.stdout.trim() !== '') return fail('conflicts-present', 'repository has unresolved conflicts')
    if (operations) return fail('operation-in-progress', 'repository has a Git operation in progress')
    return ok(true)
  }

  private async ensureWorktreeCapacity(): Promise<WorktreeResult<true>> {
    const controlledRoot = join(resolve(this.options.dshHome), 'worktrees')
    try {
      await this.fs.mkdir(controlledRoot, { recursive: true })
      const capacity = await this.fs.statfs(controlledRoot)
      const available = Number(capacity.bavail) * Number(capacity.bsize)
      if (!Number.isFinite(available) || available < MIN_WORKTREE_FREE_BYTES) {
        return fail('disk-space', `at least ${MIN_WORKTREE_FREE_BYTES} bytes must be available for a Worktree`)
      }
      return ok(true)
    } catch (error) {
      return fail('disk-space', `Worktree storage cannot be checked: ${messageOf(error)}`)
    }
  }

  private async branchExists(root: string, branch: string): Promise<boolean> {
    const result = await this.options.runner.run(verifyRefArgv(branch), root)
    return result.exitCode === 0
  }

  private async operationInProgress(root: string): Promise<boolean> {
    const result = await this.options.runner.run(operationMarkersArgv(), root)
    if (result.exitCode !== 0) return false
    const paths = result.stdout.split(/\r?\n/u).map(path => path.trim()).filter(Boolean)
    const present = await Promise.all(paths.map(path => this.exists(resolve(root, path))))
    return present.some(Boolean)
  }

  private async diffFiles(record: WorktreeRecord, statusOutput: string): Promise<WorktreeFileStat[]> {
    const numstat = await this.options.runner.run(diffNumstatArgv(record.baseRevision), record.path)
    return mergeFiles(statusOutput, parseDiffNumstat(numstat.stdout))
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    this.loaded = true
    try {
      const raw = await this.fs.readFile(this.registryPath(), 'utf8')
      const value = JSON.parse(raw) as unknown
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (isRecord(entry)) this.records.set(entry.worktreeId, entry)
        }
      }
    } catch {
      // Missing or malformed registry is reconciled from Git; it never blocks startup.
    }
  }

  private async recordOf(worktreeId: string): Promise<WorktreeRecord | undefined> {
    if (!isSafeId(worktreeId)) return undefined
    await this.ensureLoaded()
    const value = this.records.get(worktreeId)
    return value === undefined ? undefined : value
  }

  private registryPath(): string {
    return join(resolve(this.options.dshHome), 'worktrees', 'registry.json')
  }

  private async persist(): Promise<void> {
    const operation = async (): Promise<void> => {
      const path = this.registryPath()
      await this.fs.mkdir(dirname(path), { recursive: true })
      const temporary = `${path}.tmp-${this.randomId()}`
      await this.fs.writeFile(temporary, `${JSON.stringify([...this.records.values()], null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
      try { await this.fs.rename(temporary, path) } finally { await this.fs.rm(temporary, { force: true }).catch(() => {}) }
    }
    const next = this.queue.then(operation, operation)
    this.queue = next.catch(() => {})
    await next
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await this.fs.access(path, fsConstants.F_OK)
      return true
    } catch {
      return false
    }
  }
}

function isWithin(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

function isRecord(value: unknown): value is WorktreeRecord {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return isSafeId(row.worktreeId)
    && typeof row.workspaceId === 'string'
    && typeof row.repoRoot === 'string'
    && typeof row.path === 'string'
    && typeof row.branch === 'string'
    && typeof row.runId === 'string'
    && typeof row.taskId === 'string'
    && typeof row.baseRevision === 'string'
    && typeof row.createdAt === 'number'
    && (row.state === 'creating' || row.state === 'ready' || row.state === 'dirty' || row.state === 'removed' || row.state === 'orphaned')
}

export type { WorktreeError, WorktreeRecord, WorktreeResult, WorktreeStatus }
