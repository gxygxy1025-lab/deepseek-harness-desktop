import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { BoundedLogStore, sanitizeLogLine } from '../src/log-store.mjs'

test('log sanitization removes common credential shapes', () => {
  assert.equal(
    sanitizeLogLine('Authorization: Bearer secret-token NPM_TOKEN=abc123 QQBOT_SECRET=qq-secret'),
    'Authorization: Bearer [redacted] NPM_TOKEN=[redacted] QQBOT_SECRET=[redacted]',
  )
})

test('bounded log store rotates files and returns a recent tail', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-desktop-log-'))
  try {
    const store = new BoundedLogStore({ directory, maxBytes: 48, maxFiles: 3 })
    for (let index = 0; index < 12; index += 1) {
      await store.append(`line-${String(index).padStart(2, '0')}-abcdefgh`)
    }
    const files = (await readdir(directory)).toSorted()
    assert.deepEqual(files, ['runtime.log', 'runtime.log.1', 'runtime.log.2'])
    for (const file of files) assert.ok((await stat(join(directory, file))).size <= 48)
    assert.match(await store.tail(3), /line-11/)
    assert.doesNotMatch(await readFile(join(directory, 'runtime.log'), 'utf8'), /secret-token/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('bounded log store isolates a write failure and retries after the path recovers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-log-recovery-'))
  const directory = join(root, 'logs')
  try {
    await writeFile(directory, 'temporarily occupied by a file')
    const store = new BoundedLogStore({ directory })

    assert.equal(await store.append('unavailable'), false)

    await rm(directory, { force: true })
    assert.equal(await store.append('recovered'), true)
    assert.equal(await store.tail(), 'recovered')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('bounded log store reuses directory and size metadata between appends', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-desktop-log-cache-'))
  const calls = { mkdir: 0, stat: 0 }
  const fileSystem = {
    mkdir: async (...args) => {
      calls.mkdir += 1
      return mkdir(...args)
    },
    readFile,
    readdir,
    rename,
    rm,
    stat: async (...args) => {
      calls.stat += 1
      return stat(...args)
    },
    writeFile,
  }
  try {
    const store = new BoundedLogStore({ directory, fileSystem })

    assert.equal(await store.append('first'), true)
    assert.equal(await store.append('second'), true)
    assert.deepEqual(calls, { mkdir: 1, stat: 1 })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
