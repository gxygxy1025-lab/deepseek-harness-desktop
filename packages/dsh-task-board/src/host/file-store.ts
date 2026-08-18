/** Profile-isolated, atomic Host-file persistence for Task Board schema v2. */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import {
  createLedgerDocumentV2,
  parseLedgerDocumentV2,
  type TaskLedgerDocumentV2,
} from '../core/store.ts'
import type { TaskRecord } from '../core/tasks.ts'

/** Stable filename beneath one DSH profile. */
export const TASK_BOARD_STATE_RELATIVE_PATH = join('state', 'task-board', 'tasks-v2.json')

/** Resolve the v2 document without allowing profile traversal. */
export function resolveTaskBoardStatePath(dshHome: string, profileName: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(profileName)) {
    throw new TypeError('task-board profileName must be a simple profile identifier')
  }
  return join(dshHome, 'profiles', profileName, TASK_BOARD_STATE_RELATIVE_PATH)
}

export interface HostTaskFileStoreOptions {
  path: string
  now?: () => number
  randomId?: () => string
}

/** A serialized file store: complete temp write + verification + atomic rename. */
export class HostTaskFileStore {
  private document: TaskLedgerDocumentV2 | undefined
  private queue: Promise<void> = Promise.resolve()
  private readonly listeners = new Set<(document: TaskLedgerDocumentV2) => void>()
  private readonly now: () => number
  private readonly randomId: () => string

  constructor(private readonly options: HostTaskFileStoreOptions) {
    this.now = options.now ?? Date.now
    this.randomId = options.randomId ?? randomUUID
  }

  /** Load once; a corrupt document is preserved beside the original path. */
  async load(): Promise<TaskLedgerDocumentV2> {
    await this.queue
    if (this.document !== undefined) return structuredClone(this.document)
    let raw: string
    try {
      raw = await readFile(this.options.path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
      this.document = createLedgerDocumentV2([], 0, this.now())
      return structuredClone(this.document)
    }
    const parsed = parseLedgerDocumentV2(raw)
    if (parsed !== undefined) {
      this.document = parsed
      return structuredClone(parsed)
    }
    const corruptPath = `${this.options.path}.corrupt-${this.now()}-${this.randomId()}`
    await rename(this.options.path, corruptPath)
    this.document = createLedgerDocumentV2([], 0, this.now())
    return structuredClone(this.document)
  }

  /** Serialize mutations so two HTTP requests cannot publish partial state. */
  async save(tasks: readonly TaskRecord[]): Promise<TaskLedgerDocumentV2> {
    let result: TaskLedgerDocumentV2 | undefined
    await this.enqueue(async () => {
      const current = this.document ?? await this.loadWithoutQueue()
      const next = createLedgerDocumentV2(tasks, current.revision + 1, this.now())
      await this.publish(next)
      this.document = next
      result = structuredClone(next)
      for (const listener of [...this.listeners]) listener(structuredClone(next))
    })
    return result as TaskLedgerDocumentV2
  }

  /** Clearing affects the Host v2 document only; browser v1 data is untouched. */
  async clear(): Promise<TaskLedgerDocumentV2> {
    return this.save([])
  }

  subscribe(listener: (document: TaskLedgerDocumentV2) => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private async enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.queue.then(operation, operation)
    this.queue = next.catch(() => {})
    return next
  }

  private async loadWithoutQueue(): Promise<TaskLedgerDocumentV2> {
    if (this.document !== undefined) return this.document
    let raw: string | undefined
    try {
      raw = await readFile(this.options.path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
    }
    const parsed = raw === undefined ? undefined : parseLedgerDocumentV2(raw)
    if (parsed !== undefined) {
      this.document = parsed
      return parsed
    }
    if (raw !== undefined) {
      await rename(this.options.path, `${this.options.path}.corrupt-${this.now()}-${this.randomId()}`)
    }
    this.document = createLedgerDocumentV2([], 0, this.now())
    return this.document
  }

  private async publish(document: TaskLedgerDocumentV2): Promise<void> {
    const directory = dirname(this.options.path)
    await mkdir(directory, { recursive: true })
    const temporary = join(directory, `.tasks-v2-${process.pid}-${this.randomId()}.tmp`)
    try {
      const payload = `${JSON.stringify(document, null, 2)}\n`
      await writeFile(temporary, payload, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
      const verified = parseLedgerDocumentV2(await readFile(temporary, 'utf8'))
      if (verified === undefined || JSON.stringify(verified) !== JSON.stringify(document)) {
        throw new Error('task-board temporary ledger verification failed')
      }
      await rename(temporary, this.options.path)
    } finally {
      await rm(temporary, { force: true }).catch(() => {})
    }
  }
}
