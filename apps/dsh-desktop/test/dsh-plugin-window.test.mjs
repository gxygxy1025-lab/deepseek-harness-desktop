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

test('patched DSH web app browser launcher hides the Windows launcher window', async () => {
  const dshEntry = require.resolve('@deepseek-ai/dsh/lib/bin.js')
  const dshRequire = createRequire(dshEntry)
  const webAppEntry = dshRequire.resolve('@deepseek-ai/dsh-web-app')
  const source = await readFile(webAppEntry, 'utf8')

  assert.match(source, /function spawnBrowserLauncher\(url\)/u)
  assert.match(source, /env: scrubbedParentEnv\(\),\s*windowsHide: process\.platform === "win32",/u)
})

test('patched DSH subprocess runtime hides every Windows command window', async () => {
  const dshEntry = require.resolve('@deepseek-ai/dsh/lib/bin.js')
  const dshRequire = createRequire(dshEntry)
  const baseEntry = dshRequire.resolve('@deepseek-ai/dsh-base')
  const baseRequire = createRequire(baseEntry)
  const subprocessEntry = baseRequire.resolve('@deepseek-ai/dsh-subprocess-local')
  const source = await readFile(subprocessEntry, 'utf8')

  assert.match(source, /detached: platform !== "win32",\s*windowsHide: platform === "win32"/u)
})
