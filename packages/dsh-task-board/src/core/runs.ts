/**
 * Desktop 2.6 execution domain.
 *
 * These records deliberately contain references and derived summaries only.
 * DSH remains the source of truth for a Session transcript; the Task Board
 * never serializes messages, tool results, credentials, or an unbounded diff.
 */

export type IsolationMode = 'inherit' | 'shared-workspace' | 'git-worktree'

export type TaskRunResultStatus =
  | 'running'
  | 'awaiting-review'
  | 'accepted'
  | 'kept'
  | 'discarded'
  | 'failed'
  | 'cancelled'

export type ReviewAction = 'commit' | 'merge' | 'keep' | 'discard'

export interface Project {
  id: string
  name: string
  /** Runtime-provider workspace id; never a renderer supplied path. */
  workspaceId: string
  /** Optional Host-owned root reference for diagnostics. */
  rootRef?: string
  /** Optional repository identity captured by the Host. */
  repoIdentity?: {
    rootHash?: string
    head?: string
    remoteHash?: string
  }
  defaultIsolation: Exclude<IsolationMode, 'inherit'>
  permissionPolicyRef?: string
}

export interface RuntimeProviderEvidence {
  providerId?: string
  upstreamVersion?: string
  supportStatus?: 'known-good' | 'degraded' | 'unsupported'
  capabilities?: ReadonlyArray<{ id: string; status: 'available' | 'unsupported' | 'degraded' }>
  registerWorkspace?: 'available' | 'unsupported' | 'failed'
  createSession?: 'available' | 'unsupported' | 'failed'
  sessionObserve?: 'available' | 'unsupported' | 'failed'
  /** Host-side equality attestation; the absolute CWD is never persisted. */
  sessionCwdVerified?: boolean
  note?: string
}

export interface TaskRunReference {
  runId: string
  sessionId?: string
  workspaceId: string
  worktreeId?: string
  baseRevision?: string
  finalRevision?: string
  startedAt: number
  finishedAt?: number
  resultStatus: TaskRunResultStatus
  evidenceId?: string
  fallbackReason?: string
  runtimeProviderEvidence: RuntimeProviderEvidence
}

export interface EvidenceFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'binary' | 'unknown'
  additions?: number
  deletions?: number
  binary?: boolean
}

export interface DiffCacheMetadata {
  source: 'git-graph'
  generatedAt: number
  baseRevision?: string
  finalRevision?: string
  bytes: number
  sha256?: string
  truncated: boolean
  expiresAt?: number
}

export interface Evidence {
  evidenceId: string
  runId: string
  sessionId?: string
  projectId?: string
  workspaceId: string
  worktreeId?: string
  baseRevision?: string
  finalRevision?: string
  changedFiles: EvidenceFile[]
  additions: number
  deletions: number
  clean: boolean
  dirty: boolean
  resultStatus: TaskRunResultStatus
  startedAt: number
  finishedAt?: number
  sessionDeepLink?: string
  worktreeDeepLink?: string
  diffSource: 'git-graph' | 'unavailable'
  diffCache?: DiffCacheMetadata
  /** Bounded preview only; full diff is always computed on demand. */
  preview?: string
  runtimeProviderEvidence: RuntimeProviderEvidence
  audit: AuditEntry[]
}

export interface AuditEntry {
  action: ReviewAction | 'fallback' | 'reconcile' | 'evidence'
  at: number
  status: 'ok' | 'blocked' | 'failed'
  summary: string
}

export interface ReviewResult {
  ok: boolean
  status: TaskRunResultStatus
  error?: { code: string; message: string }
  audit: AuditEntry
}

const SAFE_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/u

export function isSafeRunId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID.test(value)
}

export function isIsolationMode(value: unknown): value is IsolationMode {
  return value === 'inherit' || value === 'shared-workspace' || value === 'git-worktree'
}

export function isTaskRunResultStatus(value: unknown): value is TaskRunResultStatus {
  return value === 'running'
    || value === 'awaiting-review'
    || value === 'accepted'
    || value === 'kept'
    || value === 'discarded'
    || value === 'failed'
    || value === 'cancelled'
}

export function createProject(input: {
  id: string
  name: string
  workspaceId: string
  rootRef?: string
  repoIdentity?: Project['repoIdentity']
  defaultIsolation?: Project['defaultIsolation']
  permissionPolicyRef?: string
}): Project {
  if (!isSafeRunId(input.id)) throw new TypeError('project id is invalid')
  if (input.workspaceId.trim() === '') throw new TypeError('project workspaceId is required')
  return {
    id: input.id,
    name: input.name.trim().slice(0, 160),
    workspaceId: input.workspaceId,
    ...(input.rootRef === undefined ? {} : { rootRef: input.rootRef }),
    ...(input.repoIdentity === undefined ? {} : { repoIdentity: structuredClone(input.repoIdentity) }),
    defaultIsolation: input.defaultIsolation ?? 'shared-workspace',
    ...(input.permissionPolicyRef === undefined ? {} : { permissionPolicyRef: input.permissionPolicyRef }),
  }
}

export function createTaskRunReference(input: {
  runId: string
  workspaceId: string
  startedAt: number
  sessionId?: string
  worktreeId?: string
  baseRevision?: string
  resultStatus?: TaskRunResultStatus
  runtimeProviderEvidence?: RuntimeProviderEvidence
}): TaskRunReference {
  if (!isSafeRunId(input.runId)) throw new TypeError('run id is invalid')
  if (input.workspaceId.trim() === '') throw new TypeError('run workspaceId is required')
  return {
    runId: input.runId,
    ...(input.sessionId === undefined ? {} : { sessionId: input.sessionId }),
    workspaceId: input.workspaceId,
    ...(input.worktreeId === undefined ? {} : { worktreeId: input.worktreeId }),
    ...(input.baseRevision === undefined ? {} : { baseRevision: input.baseRevision }),
    startedAt: input.startedAt,
    resultStatus: input.resultStatus ?? 'running',
    ...(input.runtimeProviderEvidence === undefined ? { runtimeProviderEvidence: {} } : { runtimeProviderEvidence: structuredClone(input.runtimeProviderEvidence) }),
  }
}

function boundedText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  return value.slice(0, max)
}

/** Truncate text to an actual UTF-8 byte budget without a broken code point. */
export function boundedUtf8(value: string, maxBytes: number): string {
  const encoded = new TextEncoder().encode(value)
  if (encoded.byteLength <= maxBytes) return value
  return new TextDecoder().decode(encoded.slice(0, maxBytes)).replace(/\uFFFD$/u, '')
}

export function normalizeRuntimeProviderEvidence(value: unknown): RuntimeProviderEvidence {
  if (typeof value !== 'object' || value === null) return {}
  const raw = value as Record<string, unknown>
  const status = raw.supportStatus === 'known-good' || raw.supportStatus === 'degraded' || raw.supportStatus === 'unsupported'
    ? raw.supportStatus
    : undefined
  const capabilityStatus = (entry: unknown): entry is 'available' | 'unsupported' | 'degraded' => entry === 'available' || entry === 'unsupported' || entry === 'degraded'
  const capabilities = Array.isArray(raw.capabilities)
    ? raw.capabilities.flatMap((entry) => {
      if (typeof entry !== 'object' || entry === null) return []
      const row = entry as Record<string, unknown>
      return typeof row.id === 'string' && capabilityStatus(row.status)
        ? [{ id: row.id.slice(0, 128), status: row.status }]
        : []
    }).slice(0, 64)
    : undefined
  const methodStatus = (entry: unknown): 'available' | 'unsupported' | 'failed' | undefined => entry === 'available' || entry === 'unsupported' || entry === 'failed' ? entry : undefined
  return {
    ...(typeof raw.providerId === 'string' ? { providerId: raw.providerId.slice(0, 128) } : {}),
    ...(typeof raw.upstreamVersion === 'string' ? { upstreamVersion: raw.upstreamVersion.slice(0, 64) } : {}),
    ...(status === undefined ? {} : { supportStatus: status }),
    ...(capabilities === undefined ? {} : { capabilities }),
    ...(methodStatus(raw.registerWorkspace) === undefined ? {} : { registerWorkspace: methodStatus(raw.registerWorkspace) }),
    ...(methodStatus(raw.createSession) === undefined ? {} : { createSession: methodStatus(raw.createSession) }),
    ...(methodStatus(raw.sessionObserve) === undefined ? {} : { sessionObserve: methodStatus(raw.sessionObserve) }),
    ...(typeof raw.sessionCwdVerified === 'boolean' ? { sessionCwdVerified: raw.sessionCwdVerified } : {}),
    ...(typeof raw.note === 'string' ? { note: boundedText(raw.note, 500) } : {}),
  }
}

export function normalizeTaskRun(value: unknown): TaskRunReference | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Record<string, unknown>
  if (!isSafeRunId(raw.runId) || typeof raw.workspaceId !== 'string' || raw.workspaceId.trim() === '' || typeof raw.startedAt !== 'number' || !Number.isFinite(raw.startedAt)) return undefined
  if (!isTaskRunResultStatus(raw.resultStatus)) return undefined
  return {
    runId: raw.runId,
    ...(typeof raw.sessionId === 'string' ? { sessionId: raw.sessionId } : {}),
    workspaceId: raw.workspaceId,
    ...(typeof raw.worktreeId === 'string' ? { worktreeId: raw.worktreeId } : {}),
    ...(typeof raw.baseRevision === 'string' ? { baseRevision: raw.baseRevision } : {}),
    ...(typeof raw.finalRevision === 'string' ? { finalRevision: raw.finalRevision } : {}),
    startedAt: raw.startedAt,
    ...(typeof raw.finishedAt === 'number' && Number.isFinite(raw.finishedAt) ? { finishedAt: raw.finishedAt } : {}),
    resultStatus: raw.resultStatus,
    ...(typeof raw.evidenceId === 'string' ? { evidenceId: raw.evidenceId } : {}),
    ...(typeof raw.fallbackReason === 'string' ? { fallbackReason: raw.fallbackReason.slice(0, 500) } : {}),
    runtimeProviderEvidence: normalizeRuntimeProviderEvidence(raw.runtimeProviderEvidence),
  }
}

export function normalizeProject(value: unknown): Project | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const raw = value as Record<string, unknown>
  if (!isSafeRunId(raw.id) || typeof raw.name !== 'string' || typeof raw.workspaceId !== 'string' || raw.workspaceId.trim() === '') return undefined
  const defaultIsolation = raw.defaultIsolation === 'git-worktree' ? 'git-worktree' : 'shared-workspace'
  return {
    id: raw.id,
    name: raw.name.slice(0, 160),
    workspaceId: raw.workspaceId,
    ...(typeof raw.rootRef === 'string' ? { rootRef: raw.rootRef } : {}),
    ...(typeof raw.repoIdentity === 'object' && raw.repoIdentity !== null ? { repoIdentity: structuredClone(raw.repoIdentity) as Project['repoIdentity'] } : {}),
    defaultIsolation,
    ...(typeof raw.permissionPolicyRef === 'string' ? { permissionPolicyRef: raw.permissionPolicyRef } : {}),
  }
}

export function createEvidence(input: Omit<Evidence, 'audit'> & { audit?: AuditEntry[] }): Evidence {
  const files = input.changedFiles.slice(0, 500).map(file => ({
    path: file.path.slice(0, 1024),
    status: file.status,
    ...(file.additions === undefined ? {} : { additions: Math.max(0, Math.floor(file.additions)) }),
    ...(file.deletions === undefined ? {} : { deletions: Math.max(0, Math.floor(file.deletions)) }),
    ...(file.binary === undefined ? {} : { binary: file.binary }),
  }))
  return {
    ...input,
    changedFiles: files,
    additions: Math.max(0, Math.floor(input.additions)),
    deletions: Math.max(0, Math.floor(input.deletions)),
    ...(input.preview === undefined ? {} : { preview: boundedUtf8(input.preview, 64 * 1024) }),
    ...(input.diffCache === undefined ? {} : { diffCache: structuredClone(input.diffCache) }),
    runtimeProviderEvidence: normalizeRuntimeProviderEvidence(input.runtimeProviderEvidence),
    audit: (input.audit ?? []).slice(-100).map(entry => ({ ...entry, summary: entry.summary.slice(0, 500) })),
  }
}

export function appendAudit(evidence: Evidence, entry: AuditEntry): Evidence {
  return createEvidence({ ...evidence, audit: [...evidence.audit, entry] })
}

export function reviewTransition(current: TaskRunResultStatus, action: ReviewAction): { status?: TaskRunResultStatus; blocked?: string } {
  if (current === 'running') return { blocked: 'run is still running' }
  if (action === 'commit') {
    if (current !== 'awaiting-review' && current !== 'kept') return { blocked: 'run is not awaiting review' }
    return { status: 'accepted' }
  }
  if (action === 'merge') {
    if (current !== 'accepted' && current !== 'kept') return { blocked: 'commit is required before merge' }
    return { status: 'accepted' }
  }
  if (action === 'keep') {
    if (current !== 'awaiting-review' && current !== 'accepted') return { blocked: 'run cannot be kept in its current state' }
    return { status: 'kept' }
  }
  if (current === 'discarded') return { status: 'discarded' }
  if (current !== 'awaiting-review' && current !== 'failed' && current !== 'cancelled' && current !== 'kept') return { blocked: 'run cannot be discarded in its current state' }
  return { status: 'discarded' }
}
