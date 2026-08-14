import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { ensurePnpmCommandShim } from '../src/electron-app.mjs'

test('bundled pnpm is exposed to in-process plugin stores without a system install', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-tools-'))
  try {
    const directory = await ensurePnpmCommandShim({
      directory: join(root, 'bin'),
      executable: 'C:\\Program Files\\DeepSeek Harness Desktop\\app.exe',
      pnpmCli: 'C:\\Program Files\\DeepSeek Harness Desktop\\resources\\pnpm.mjs',
    })
    const name = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
    const command = await readFile(join(directory, name), 'utf8')
    assert.match(command, /ELECTRON_RUN_AS_NODE=1/u)
    assert.match(command, /pnpm\.mjs/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
