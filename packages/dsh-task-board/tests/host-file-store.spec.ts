import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { parseLedgerDocumentV2 } from '../src/core/store.ts'
import { createTask } from '../src/core/tasks.ts'
import { HostTaskFileStore, resolveTaskBoardStatePath } from '../src/host/file-store.ts'

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-task-board-'))
  directories.push(directory)
  const path = join(directory, 'profiles', 'desktop', 'state', 'task-board', 'tasks-v2.json')
  return { directory, path }
}

describe('HostTaskFileStore', () => {
  it('resolves state beneath one validated profile', () => {
    expect(resolveTaskBoardStatePath('C:\\dsh', 'desktop')).toContain(join('profiles', 'desktop', 'state', 'task-board', 'tasks-v2.json'))
    expect(() => resolveTaskBoardStatePath('C:\\dsh', '../web')).toThrow(/profileName/u)
  })

  it('publishes schema v2 atomically and advances revisions serially', async () => {
    const { path } = await fixture()
    let now = 10
    let id = 0
    const store = new HostTaskFileStore({ path, now: () => now++, randomId: () => `id-${++id}` })
    const first = createTask({ title: 'A', description: '', prompt: '' }, 1, 'a')
    const second = createTask({ title: 'B', description: '', prompt: '' }, 2, 'b')
    const [one, two] = await Promise.all([store.save([first]), store.save([first, second])])
    expect(one.revision).toBe(1)
    expect(two.revision).toBe(2)
    const document = parseLedgerDocumentV2(await readFile(path, 'utf8'))
    expect(document?.schemaVersion).toBe(2)
    expect(document?.revision).toBe(2)
    expect(document?.tasks.map(task => task.id)).toEqual(['a', 'b'])
    expect((await readdir(join(path, '..'))).some(name => name.endsWith('.tmp'))).toBe(false)

    // A new Host process has no in-memory state: the complete v2 document
    // must survive a real store reconstruction (and therefore a port change).
    const restarted = new HostTaskFileStore({ path, now: () => 99, randomId: () => 'restart' })
    const reloaded = await restarted.load()
    expect(reloaded.revision).toBe(2)
    expect(reloaded.tasks).toEqual([first, second])
  })

  it('preserves a corrupt document beside the path and starts empty', async () => {
    const { directory, path } = await fixture()
    await writeFile(path, '{not-json', { encoding: 'utf8', flag: 'w' }).catch(async () => {
      const { mkdir } = await import('node:fs/promises')
      await mkdir(join(directory, 'profiles', 'desktop', 'state', 'task-board'), { recursive: true })
      await writeFile(path, '{not-json', 'utf8')
    })
    const store = new HostTaskFileStore({ path, now: () => 42, randomId: () => 'corrupt' })
    expect((await store.load()).tasks).toEqual([])
    const names = await readdir(join(directory, 'profiles', 'desktop', 'state', 'task-board'))
    expect(names).toContain('tasks-v2.json.corrupt-42-corrupt')
  })
})
