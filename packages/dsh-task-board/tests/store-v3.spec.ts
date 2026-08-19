import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { createLedgerDocumentV2 } from '../src/core/store.ts'
import { parseLedgerDocumentV3, TASK_LEDGER_SCHEMA_VERSION_V3 } from '../src/core/store-v3.ts'
import { createTask } from '../src/core/tasks.ts'
import { HostTaskStoreV3 } from '../src/host/v3-file-store.ts'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe('HostTaskStoreV3 copy-first migration', () => {
  it('copies v2, preserves a backup and records a migration marker', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-task-board-v3-'))
    roots.push(root)
    const v2Path = join(root, 'tasks-v2.json')
    const v3Path = join(root, 'tasks-v3.json')
    const task = createTask({ title: 'legacy', description: '', prompt: 'p' }, 10, 'legacy')
    await writeFile(v2Path, `${JSON.stringify(createLedgerDocumentV2([task], 4, 10))}\n`)

    const store = new HostTaskStoreV3({ path: v3Path, v2Path, now: () => 20, randomId: () => 'copy' })
    const migrated = await store.load()
    expect(migrated.schemaVersion).toBe(TASK_LEDGER_SCHEMA_VERSION_V3)
    expect(migrated.tasks[0]?.isolationMode).toBe('shared-workspace')
    expect(migrated.tasks[0]?.projectId).toBeUndefined()
    expect(parseLedgerDocumentV3(await readFile(v3Path, 'utf8'))?.tasks).toHaveLength(1)
    const names = await readdir(root)
    expect(names.some(name => name.includes('v2-backup-20-copy'))).toBe(true)
    expect(names).toContain('tasks-v3.json.migration.json')
    expect(await readFile(v2Path, 'utf8')).toContain('schemaVersion')
  })

  it('falls back to a safe shared empty document when v2 is malformed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-task-board-v3-'))
    roots.push(root)
    const v2Path = join(root, 'tasks-v2.json')
    const v3Path = join(root, 'tasks-v3.json')
    await writeFile(v2Path, '{bad')
    const store = new HostTaskStoreV3({ path: v3Path, v2Path, now: () => 30, randomId: () => 'bad' })
    const result = await store.load()
    expect(result.tasks).toEqual([])
    expect(result.migration?.status).toBe('not-needed')
    expect((await store.save({ projects: [], tasks: result.tasks, evidences: [] })).revision).toBe(1)
  })

  it('rolls back a failed publish marker and continues from the untouched v2 ledger', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-task-board-v3-rollback-'))
    roots.push(root)
    const v2Path = join(root, 'tasks-v2.json')
    const v3Path = join(root, 'tasks-v3.json')
    const task = createTask({ title: 'recoverable legacy task', description: '', prompt: 'p' }, 10, 'legacy-rollback')
    const v2Raw = `${JSON.stringify(createLedgerDocumentV2([task], 7, 10))}\n`
    await writeFile(v2Path, v2Raw)
    // A directory at the marker path deterministically fails the final marker
    // write after the v3 candidate has been written and verified.
    await mkdir(`${v3Path}.migration.json`)

    const store = new HostTaskStoreV3({ path: v3Path, v2Path, now: () => 40, randomId: () => 'rollback' })
    const fallback = await store.load()
    expect(fallback.migration?.status).toBe('failed')
    expect(fallback.tasks.map(row => row.title)).toEqual(['recoverable legacy task'])
    expect(fallback.tasks[0]?.isolationMode).toBe('shared-workspace')
    expect(await readFile(v2Path, 'utf8')).toBe(v2Raw)
    await expect(readFile(v3Path, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await readdir(root)).some(name => name.includes('v2-backup-40-rollback'))).toBe(true)
  })
})
