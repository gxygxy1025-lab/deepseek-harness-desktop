/** Desktop 2.6 HostTaskStore envelope and copy-first v2 migration. */

import type { Evidence, Project, TaskRunReference } from './runs.ts'
import { isSafeRunId, isTaskRunResultStatus, normalizeProject, normalizeTaskRun } from './runs.ts'
import {
  parseLedger,
  parseLedgerDocumentV2,
  type TaskLedgerDocumentV2,
} from './store.ts'
import type { TaskRecord } from './tasks.ts'

export const TASK_LEDGER_SCHEMA_VERSION_V3 = 3 as const
export const TASK_BOARD_V3_MIGRATION_MARKER = 'dsh.taskBoard.v3.migrated'

export interface TaskLedgerMigrationState {
  from: 2
  status: 'complete' | 'failed' | 'not-needed'
  at: number
  marker: string
  v2Backup?: string
  reason?: string
}

export interface TaskLedgerDocumentV3 {
  schemaVersion: typeof TASK_LEDGER_SCHEMA_VERSION_V3
  revision: number
  updatedAt: number
  projects: Project[]
  tasks: TaskRecord[]
  evidences: Evidence[]
  migration?: TaskLedgerMigrationState
}

function resultStatus(execution: TaskRecord['executions'][number]): TaskRunReference['resultStatus'] {
  if (execution.result === 'failed') return 'failed'
  if (execution.result === 'cancelled') return 'cancelled'
  if (execution.result === 'succeeded') return 'accepted'
  return 'running'
}

/** Copy v2 rows without ever selecting worktree isolation for an old task. */
export function migrateV2DocumentToV3(
  document: TaskLedgerDocumentV2,
  now = Date.now(),
  migration: Partial<TaskLedgerMigrationState> = {},
): TaskLedgerDocumentV3 {
  const tasks = document.tasks.map((task) => {
    const runs = task.executions.map((execution) => ({
      runId: execution.runId ?? execution.id,
      ...(execution.sessionId === undefined ? {} : { sessionId: execution.sessionId }),
      workspaceId: execution.workspaceId ?? 'legacy',
      startedAt: execution.startedAt,
      ...(execution.finishedAt ?? execution.endedAt) === undefined ? {} : { finishedAt: (execution.finishedAt ?? execution.endedAt) as number },
      resultStatus: resultStatus(execution),
      runtimeProviderEvidence: {},
    } satisfies TaskRunReference))
    return {
      ...task,
      // Explicitly set the safe mode. This is a copy, not a silent UI default.
      isolationMode: 'shared-workspace' as const,
      ...(runs.length === 0 ? {} : { runs }),
    }
  })
  return {
    schemaVersion: TASK_LEDGER_SCHEMA_VERSION_V3,
    revision: document.revision,
    updatedAt: Math.max(now, document.updatedAt),
    projects: [],
    tasks,
    evidences: [],
    migration: {
      from: 2,
      status: migration.status ?? 'complete',
      at: migration.at ?? now,
      marker: migration.marker ?? TASK_BOARD_V3_MIGRATION_MARKER,
      ...(migration.v2Backup === undefined ? {} : { v2Backup: migration.v2Backup }),
      ...(migration.reason === undefined ? {} : { reason: migration.reason.slice(0, 500) }),
    },
  }
}

export function createLedgerDocumentV3(input: {
  projects?: readonly Project[]
  tasks: readonly TaskRecord[]
  evidences?: readonly Evidence[]
  revision: number
  updatedAt: number
  migration?: TaskLedgerMigrationState
}): TaskLedgerDocumentV3 {
  return {
    schemaVersion: TASK_LEDGER_SCHEMA_VERSION_V3,
    revision: input.revision,
    updatedAt: input.updatedAt,
    projects: input.projects?.map(project => structuredClone(project)) ?? [],
    tasks: input.tasks.map(task => structuredClone(task)),
    evidences: input.evidences?.map(evidence => structuredClone(evidence)) ?? [],
    ...(input.migration === undefined ? {} : { migration: structuredClone(input.migration) }),
  }
}

function isEvidence(value: unknown): value is Evidence {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  const fileStatus = new Set(['added', 'modified', 'deleted', 'renamed', 'binary', 'unknown'])
  const filesValid = Array.isArray(row.changedFiles) && row.changedFiles.length <= 500 && row.changedFiles.every(file => {
    if (typeof file !== 'object' || file === null) return false
    const item = file as Record<string, unknown>
    return typeof item.path === 'string' && item.path.length <= 1024
      && (item.status === undefined || fileStatus.has(item.status as string))
      && (item.additions === undefined || (typeof item.additions === 'number' && Number.isFinite(item.additions)))
      && (item.deletions === undefined || (typeof item.deletions === 'number' && Number.isFinite(item.deletions)))
      && (item.binary === undefined || typeof item.binary === 'boolean')
  })
  const auditValid = Array.isArray(row.audit) && row.audit.length <= 100 && row.audit.every(entry => {
    if (typeof entry !== 'object' || entry === null) return false
    const item = entry as Record<string, unknown>
    return (item.action === 'commit' || item.action === 'merge' || item.action === 'keep' || item.action === 'discard' || item.action === 'fallback' || item.action === 'reconcile' || item.action === 'evidence')
      && (item.status === 'ok' || item.status === 'blocked' || item.status === 'failed')
      && typeof item.at === 'number' && Number.isFinite(item.at)
      && typeof item.summary === 'string' && item.summary.length <= 500
  })
  return isSafeRunId(row.evidenceId)
    && isSafeRunId(row.runId)
    && typeof row.workspaceId === 'string'
    && row.workspaceId.length <= 256
    && filesValid
    && typeof row.additions === 'number' && Number.isFinite(row.additions)
    && typeof row.deletions === 'number' && Number.isFinite(row.deletions)
    && typeof row.clean === 'boolean'
    && typeof row.dirty === 'boolean'
    && isTaskRunResultStatus(row.resultStatus)
    && typeof row.startedAt === 'number' && Number.isFinite(row.startedAt)
    && (row.finishedAt === undefined || (typeof row.finishedAt === 'number' && Number.isFinite(row.finishedAt)))
    && (row.preview === undefined || (typeof row.preview === 'string' && row.preview.length <= 64 * 1024))
    && typeof row.runtimeProviderEvidence === 'object'
    && row.runtimeProviderEvidence !== null
    && auditValid
}

/** Strict v3 envelope parser: a malformed v3 file never overwrites v2. */
export function parseLedgerDocumentV3(raw: string): TaskLedgerDocumentV3 | undefined {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return undefined
  }
  if (typeof value !== 'object' || value === null) return undefined
  const row = value as Record<string, unknown>
  if (row.schemaVersion !== TASK_LEDGER_SCHEMA_VERSION_V3
    || !Number.isSafeInteger(row.revision) || (row.revision as number) < 0
    || typeof row.updatedAt !== 'number' || !Number.isFinite(row.updatedAt)
    || !Array.isArray(row.projects) || !Array.isArray(row.tasks) || !Array.isArray(row.evidences)) return undefined
  const projects = row.projects.flatMap(project => {
    const normalized = normalizeProject(project)
    return normalized === undefined ? [] : [normalized]
  })
  if (projects.length !== row.projects.length) return undefined
  const tasks = parseLedger(JSON.stringify(row.tasks))
  if (tasks.length !== row.tasks.length) return undefined
  const evidences = row.evidences.filter(isEvidence) as Evidence[]
  if (evidences.length !== row.evidences.length) return undefined
  return {
    schemaVersion: TASK_LEDGER_SCHEMA_VERSION_V3,
    revision: row.revision as number,
    updatedAt: row.updatedAt as number,
    projects,
    tasks,
    evidences,
    ...(typeof row.migration === 'object' && row.migration !== null ? { migration: row.migration as TaskLedgerMigrationState } : {}),
  }
}

/** Parse v2 JSON and return a safe v3 copy or undefined. */
export function migrateV2JsonToV3(raw: string, now = Date.now()): TaskLedgerDocumentV3 | undefined {
  const v2 = parseLedgerDocumentV2(raw)
  return v2 === undefined ? undefined : migrateV2DocumentToV3(v2, now)
}

/** Stable digest for write-after-read migration verification. */
export function ledgerDocumentV3Hash(document: TaskLedgerDocumentV3): string {
  // The digest only detects a torn/incorrect copy; it is not a security hash.
  // Keep this core helper browser-safe so RemoteTaskStoreV3 can reuse it.
  let hash = 0x811c9dc5
  for (const character of JSON.stringify(document)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function isTaskLedgerDocumentV3(value: unknown): value is TaskLedgerDocumentV3 {
  return parseLedgerDocumentV3(JSON.stringify(value)) !== undefined
}

/** Convenience normalizer for callers that receive a loose run list. */
export function normalizeRunList(value: unknown): TaskRunReference[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(run => {
    const normalized = normalizeTaskRun(run)
    return normalized === undefined ? [] : [normalized]
  })
}
