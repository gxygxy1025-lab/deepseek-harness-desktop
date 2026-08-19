/** Copy-first, atomic HostTaskStore v3 with v2 rollback/fallback semantics. */

import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import {
  createLedgerDocumentV3,
  ledgerDocumentV3Hash,
  migrateV2DocumentToV3,
  parseLedgerDocumentV3,
  TASK_BOARD_V3_MIGRATION_MARKER,
  type TaskLedgerDocumentV3,
} from '../core/store-v3.ts'
import { parseLedgerDocumentV2 } from '../core/store.ts'
import type { Evidence, Project } from '../core/runs.ts'
import type { TaskRecord } from '../core/tasks.ts'

export const TASK_BOARD_V3_STATE_RELATIVE_PATH = join('state', 'task-board', 'tasks-v3.json')

export function resolveTaskBoardV3StatePath(dshHome: string, profileName: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(profileName)) {
    throw new TypeError('task-board profileName must be a simple profile identifier')
  }
  return join(dshHome, 'profiles', profileName, TASK_BOARD_V3_STATE_RELATIVE_PATH)
}

export interface HostTaskStoreV3Options {
  path: string
  /** Existing v2 path; defaults to the sibling tasks-v2.json location. */
  v2Path?: string
  now?: () => number
  randomId?: () => string
}

export interface TaskStoreV3Snapshot {
  projects: Project[]
  tasks: TaskRecord[]
  evidences: Evidence[]
}

function cloneSnapshot(value: TaskStoreV3Snapshot): TaskStoreV3Snapshot {
  return structuredClone(value)
}

/**
 * Host-owned v3 ledger. The first v3 write copies v2, verifies the copy by
 * parsing and hashing it, writes a marker, and leaves the v2 source untouched.
 */
export class HostTaskStoreV3 {
  private document: TaskLedgerDocumentV3 | undefined
  private queue: Promise<void> = Promise.resolve()
  private readonly now: () => number
  private readonly randomId: () => string

  constructor(private readonly options: HostTaskStoreV3Options) {
    this.now = options.now ?? Date.now
    this.randomId = options.randomId ?? randomUUID
  }

  async load(): Promise<TaskLedgerDocumentV3> {
    await this.queue
    if (this.document !== undefined) return structuredClone(this.document)
    const v3Raw = await readText(this.options.path)
    if (v3Raw !== undefined) {
      const parsed = parseLedgerDocumentV3(v3Raw)
      if (parsed !== undefined) {
        this.document = parsed
        return structuredClone(parsed)
      }
    }
    return this.migrateFromV2(v3Raw !== undefined ? 'invalid-v3' : undefined)
  }

  async save(value: TaskStoreV3Snapshot | TaskLedgerDocumentV3 | readonly TaskRecord[]): Promise<TaskLedgerDocumentV3> {
    let result: TaskLedgerDocumentV3 | undefined
    await this.enqueue(async () => {
      const current = this.document ?? await this.loadWithoutQueue()
      let snapshot: TaskStoreV3Snapshot
      if (isDocument(value)) {
        snapshot = { projects: value.projects, tasks: value.tasks, evidences: value.evidences }
      } else if (Array.isArray(value)) {
        snapshot = { projects: current.projects, tasks: value as TaskRecord[], evidences: current.evidences }
      } else {
        snapshot = value as TaskStoreV3Snapshot
      }
      const next = createLedgerDocumentV3({
        ...cloneSnapshot(snapshot),
        revision: current.revision + 1,
        updatedAt: this.now(),
        migration: current.migration,
      })
      await this.publish(next)
      this.document = next
      result = structuredClone(next)
    })
    return result as TaskLedgerDocumentV3
  }

  async clear(): Promise<TaskLedgerDocumentV3> {
    return this.save({ projects: [], tasks: [], evidences: [] })
  }

  async snapshot(): Promise<TaskStoreV3Snapshot> {
    const document = await this.load()
    return { projects: document.projects, tasks: document.tasks, evidences: document.evidences }
  }

  private async enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.queue.then(operation, operation)
    this.queue = next.catch(() => {})
    return next
  }

  private async loadWithoutQueue(): Promise<TaskLedgerDocumentV3> {
    if (this.document !== undefined) return this.document
    const raw = await readText(this.options.path)
    const parsed = raw === undefined ? undefined : parseLedgerDocumentV3(raw)
    if (parsed !== undefined) {
      this.document = parsed
      return parsed
    }
    return this.migrateFromV2(raw === undefined ? undefined : 'invalid-v3')
  }

  private async migrateFromV2(reason: string | undefined): Promise<TaskLedgerDocumentV3> {
    const v2Path = this.options.v2Path ?? this.options.path.replace(/tasks-v3\.json$/u, 'tasks-v2.json')
    const v2Raw = await readText(v2Path)
    const v2 = v2Raw === undefined ? undefined : parseLedgerDocumentV2(v2Raw)
    const at = this.now()
    const backupPath = `${v2Path}.v2-backup-${at}-${this.randomId()}`
    let migrationStatus: 'complete' | 'failed' | 'not-needed' = 'not-needed'
    let migrationReason: string | undefined
    let backup: string | undefined
    let published = false
    if (v2 !== undefined) {
      try {
        await mkdir(dirname(this.options.path), { recursive: true })
        await copyFile(v2Path, backupPath)
        backup = backupPath
        const candidate = migrateV2DocumentToV3(v2, at, {
          status: 'complete',
          at,
          marker: TASK_BOARD_V3_MIGRATION_MARKER,
          v2Backup: backupPath,
        })
        await this.publish(candidate)
        published = true
        const verified = parseLedgerDocumentV3(await readFile(this.options.path, 'utf8'))
        if (verified === undefined || ledgerDocumentV3Hash(verified) !== ledgerDocumentV3Hash(candidate)) {
          throw new Error('v3 migration verification failed')
        }
        migrationStatus = 'complete'
        await writeMarker(this.options.path, { marker: TASK_BOARD_V3_MIGRATION_MARKER, from: 2, at, status: 'complete' })
        this.document = verified
        return structuredClone(verified)
      } catch (error) {
        migrationStatus = 'failed'
        migrationReason = error instanceof Error ? error.message : String(error)
        // A marker failure must not leave a seemingly complete v3 file that
        // wins on the next startup. Remove only the just-published candidate;
        // the v2 source and its copy-first backup remain untouched.
        if (published) await rm(this.options.path, { force: true }).catch(() => {})
        // Keep the v2 backup; an operator can recover it without guessing.
      }
    }
    const fallback = migrateV2DocumentToV3(
      v2 ?? { schemaVersion: 2, revision: 0, updatedAt: at, tasks: [] },
      at,
      {
        status: migrationStatus,
        at,
        marker: TASK_BOARD_V3_MIGRATION_MARKER,
        ...(backup === undefined ? {} : { v2Backup: backup }),
        ...(reason === undefined && migrationReason === undefined ? {} : { reason: (migrationReason ?? reason)?.slice(0, 500) }),
      },
    )
    this.document = fallback
    return structuredClone(fallback)
  }

  private async publish(document: TaskLedgerDocumentV3): Promise<void> {
    const directory = dirname(this.options.path)
    await mkdir(directory, { recursive: true })
    const temporary = join(directory, `.tasks-v3-${process.pid}-${this.randomId()}.tmp`)
    try {
      await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
      const verified = parseLedgerDocumentV3(await readFile(temporary, 'utf8'))
      if (verified === undefined || ledgerDocumentV3Hash(verified) !== ledgerDocumentV3Hash(document)) {
        throw new Error('task-board v3 temporary ledger verification failed')
      }
      await rename(temporary, this.options.path)
    } finally {
      await rm(temporary, { force: true }).catch(() => {})
    }
  }
}

function isDocument(value: unknown): value is TaskLedgerDocumentV3 {
  return typeof value === 'object' && value !== null && (value as { schemaVersion?: unknown }).schemaVersion === 3
}

async function readText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return undefined
    throw error
  }
}

async function writeMarker(path: string, marker: unknown): Promise<void> {
  await writeFile(`${path}.migration.json`, `${JSON.stringify(marker)}\n`, { encoding: 'utf8', mode: 0o600 })
}

/** Backwards-compatible name for callers that treat the v3 store as the HostTaskStore. */
export const HostTaskStore = HostTaskStoreV3
