import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)

test('patched DSH plugin forwarding hides the Windows package-manager window', async () => {
  const dshEntry = require.resolve('@deepseek-ai/dsh/lib/bin.js')
  const libDirectory = dirname(dshEntry)
  const pluginFiles = (await readdir(libDirectory)).filter((file) => /^plugin-.*\.js$/u.test(file))

  assert.equal(pluginFiles.length, 1)
  const source = await readFile(join(libDirectory, pluginFiles[0]), 'utf8')
  assert.match(source, /spawnSync\("pnpm"/u)
  assert.match(source, /shell: process\.platform === "win32",\s*windowsHide: process\.platform === "win32"/u)
})
