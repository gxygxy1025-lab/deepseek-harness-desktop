/** Browser client for the v3 Project/Task/Evidence Host ledger. */

import type { Evidence, Project } from '../core/runs.ts'
import { parseLedgerDocumentV3, type TaskLedgerDocumentV3 } from '../core/store-v3.ts'
import type { TaskStore } from '../core/store.ts'
import type { TaskRecord } from '../core/tasks.ts'
import type { EvidenceStore } from '../core/evidence.ts'

export const TASK_BOARD_V3_API_PATH = '/api/dsh-task-board/v3'

type FetchLike = typeof fetch

/** Serialized v3 transport; no path or Git command crosses this boundary. */
export class RemoteTaskStoreV3 implements TaskStore, EvidenceStore {
  private queue: Promise<void> = Promise.resolve()
  private document: TaskLedgerDocumentV3 | undefined

  constructor(private readonly fetchImpl: FetchLike = globalThis.fetch.bind(globalThis)) {}

  async load(): Promise<TaskRecord[]> {
    await this.queue
    const document = await this.fetchDocument()
    return document.tasks
  }

  async save(tasks: readonly TaskRecord[]): Promise<void> {
    const operation = async (): Promise<void> => {
      const current = this.document ?? await this.fetchDocument()
      this.document = await this.putDocument({ ...current, tasks: structuredClone(tasks) as TaskRecord[] })
    }
    const next = this.queue.then(operation, operation)
    this.queue = next.catch(() => {})
    return next
  }

  async clear(): Promise<void> {
    const operation = async (): Promise<void> => {
      const response = await this.fetchImpl(TASK_BOARD_V3_API_PATH, { method: 'DELETE', cache: 'no-store' })
      if (!response.ok) throw new Error(`task-board v3 DELETE failed (${response.status})`)
      this.document = parseLedgerDocumentV3(await response.text()) ?? undefined
    }
    const next = this.queue.then(operation, operation)
    this.queue = next.catch(() => {})
    return next
  }

  async get(evidenceId: string): Promise<Evidence | undefined> {
    await this.queue
    const document = this.document ?? await this.fetchDocument()
    return document.evidences.find(evidence => evidence.evidenceId === evidenceId)
  }

  async put(evidence: Evidence): Promise<void> {
    const operation = async (): Promise<void> => {
      const current = this.document ?? await this.fetchDocument()
      const evidences = current.evidences.filter(candidate => candidate.evidenceId !== evidence.evidenceId)
      this.document = await this.putDocument({ ...current, evidences: [...evidences, structuredClone(evidence)] })
    }
    const next = this.queue.then(operation, operation)
    this.queue = next.catch(() => {})
    return next
  }

  async list(runId?: string): Promise<Evidence[]> {
    await this.queue
    const document = this.document ?? await this.fetchDocument()
    return document.evidences.filter(evidence => runId === undefined || evidence.runId === runId)
  }

  projects(): Project[] {
    return structuredClone(this.document?.projects ?? [])
  }

  private async fetchDocument(): Promise<TaskLedgerDocumentV3> {
    const response = await this.fetchImpl(TASK_BOARD_V3_API_PATH, { headers: { accept: 'application/json' }, cache: 'no-store' })
    if (!response.ok) throw new Error(`task-board v3 GET failed (${response.status})`)
    const parsed = parseLedgerDocumentV3(await response.text())
    if (parsed === undefined) throw new Error('task-board v3 returned an invalid document')
    this.document = parsed
    return parsed
  }

  private async putDocument(document: TaskLedgerDocumentV3): Promise<TaskLedgerDocumentV3> {
    const response = await this.fetchImpl(TASK_BOARD_V3_API_PATH, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(document),
    })
    if (!response.ok) throw new Error(`task-board v3 PUT failed (${response.status})`)
    const parsed = parseLedgerDocumentV3(await response.text())
    if (parsed === undefined) throw new Error('task-board v3 acknowledgement is invalid')
    return parsed
  }
}
