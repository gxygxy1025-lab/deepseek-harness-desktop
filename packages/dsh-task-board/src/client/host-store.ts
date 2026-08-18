/** Browser-side HostStore client, SSE synchronization, and copy-first v1 migration. */
import {
  parseLedgerDocumentV2,
  type TaskStore,
} from '../core/store.ts'
import type { TaskRecord } from '../core/tasks.ts'

export const TASK_BOARD_API_PATH = '/api/dsh-task-board/tasks'
export const TASK_BOARD_EVENTS_PATH = '/api/dsh-task-board/events'
export const HOST_MIGRATION_MARKER_KEY = 'dsh.taskBoard.v2.host-migrated'

type FetchLike = typeof fetch
type EventSourceLike = Pick<EventSource, 'close' | 'onmessage' | 'onerror'>
type EventSourceFactory = (url: string) => EventSourceLike

/** Host-backed TaskStore. Writes are serialized so browser events cannot reorder PUTs. */
export class RemoteTaskStore implements TaskStore {
  private queue: Promise<void> = Promise.resolve()

  constructor(
    private readonly fetchImpl: FetchLike = globalThis.fetch.bind(globalThis),
    private readonly eventSourceFactory: EventSourceFactory | undefined = typeof globalThis.EventSource === 'function'
      ? url => new globalThis.EventSource(url)
      : undefined,
  ) {}

  async load(): Promise<TaskRecord[]> {
    await this.queue
    const response = await this.fetchImpl(TASK_BOARD_API_PATH, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`task-board HostStore GET failed (${response.status})`)
    const raw = await response.text()
    const document = parseLedgerDocumentV2(raw)
    if (document === undefined) throw new Error('task-board HostStore returned an invalid v2 document')
    return document.tasks
  }

  async save(tasks: readonly TaskRecord[]): Promise<void> {
    const snapshot = tasks.map(task => ({
      ...task,
      executions: task.executions.map(execution => ({ ...execution })),
    }))
    const operation = async (): Promise<void> => {
      const response = await this.fetchImpl(TASK_BOARD_API_PATH, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ tasks: snapshot }),
      })
      if (!response.ok) throw new Error(`task-board HostStore PUT failed (${response.status})`)
      const document = parseLedgerDocumentV2(await response.text())
      if (document === undefined) throw new Error('task-board HostStore write acknowledgement is invalid')
    }
    const next = this.queue.then(operation, operation)
    this.queue = next.catch(() => {})
    return next
  }

  async clear(): Promise<void> {
    const operation = async (): Promise<void> => {
      const response = await this.fetchImpl(TASK_BOARD_API_PATH, { method: 'DELETE' })
      if (!response.ok) throw new Error(`task-board HostStore DELETE failed (${response.status})`)
    }
    const next = this.queue.then(operation, operation)
    this.queue = next.catch(() => {})
    return next
  }

  subscribeExternal(listener: () => void): () => void {
    if (this.eventSourceFactory === undefined) return () => {}
    let source: EventSourceLike
    try {
      source = this.eventSourceFactory(TASK_BOARD_EVENTS_PATH)
    } catch {
      return () => {}
    }
    source.onmessage = (event): void => {
      try {
        const value = JSON.parse(event.data) as { type?: unknown }
        if (value.type === 'changed') listener()
      } catch {
        // Ignore malformed frames; EventSource keeps the last good state.
      }
    }
    source.onerror = (): void => {
      // Native EventSource reconnects with backoff; no polling fallback is used.
    }
    return () => { source.close() }
  }
}

/** Deterministic non-cryptographic content hash used only to verify migration equality. */
export function ledgerHash(tasks: readonly TaskRecord[]): string {
  const stable = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
    if (typeof value === 'object' && value !== null) {
      return `{${Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`)
        .join(',')}}`
    }
    return JSON.stringify(value) ?? 'null'
  }
  let hash = 0x811c9dc5
  for (const character of stable(tasks)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export interface PreferredTaskStoreOptions {
  host?: TaskStore
  local: TaskStore
  markerStorage?: Pick<Storage, 'getItem' | 'setItem'>
}

/** Prefer HostStore; copy v1 once only after count+hash verification; retain v1 forever in 2.4.x. */
export async function selectPreferredTaskStore(options: PreferredTaskStoreOptions): Promise<TaskStore> {
  const host = options.host ?? new RemoteTaskStore()
  let hostTasks: TaskRecord[]
  try {
    hostTasks = await host.load()
  } catch {
    return options.local
  }
  const markerStorage = options.markerStorage ?? globalThis.localStorage
  let migrated = false
  try {
    migrated = markerStorage?.getItem(HOST_MIGRATION_MARKER_KEY) === '1'
  } catch {
    // A blocked localStorage marker only prevents recording completion.
  }
  if (hostTasks.length !== 0 || migrated) return host

  const localTasks = await options.local.load()
  if (localTasks.length === 0) return host
  try {
    await host.save(localTasks)
    const verified = await host.load()
    if (verified.length !== localTasks.length || ledgerHash(verified) !== ledgerHash(localTasks)) {
      await Promise.resolve(host.clear()).catch(() => {})
      return options.local
    }
  } catch {
    // Host was observed empty before this copy. Roll back any partial write;
    // the browser v1 ledger remains the authoritative fallback and is never
    // deleted by the 2.4 migration.
    await Promise.resolve(host.clear()).catch(() => {})
    return options.local
  }
  try {
    markerStorage?.setItem(HOST_MIGRATION_MARKER_KEY, '1')
  } catch {
    // A blocked marker must not hide a successfully verified Host copy.
  }
  return host
}
