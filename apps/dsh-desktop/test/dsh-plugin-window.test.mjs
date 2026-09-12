import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)

test('patched DSH CLI accepts the desktop profile only from the Electron owner', async () => {
  const dshEntry = require.resolve('@deepseek-ai/dsh/lib/bin.js')
  const source = await readFile(dshEntry, 'utf8')

  assert.match(source, /process\.env\.DSH_DESKTOP_MANAGED_PROFILE !== "1"/u)
})

test('patched DSH plugin forwarding hides the Windows package-manager window', async () => {
  const dshEntry = require.resolve('@deepseek-ai/dsh/lib/bin.js')
  const libDirectory = dirname(dshEntry)
  const pluginFiles = (await readdir(libDirectory)).filter((file) => /^plugin-.*\.js$/u.test(file))

  assert.equal(pluginFiles.length, 1)
  const source = await readFile(join(libDirectory, pluginFiles[0]), 'utf8')
  assert.match(source, /process\.env\.DSH_PNPM_CLI_PATH/u)
  assert.match(source, /forwardedArguments = pnpmCliPath === void 0 \? pnpmArguments : \[pnpmCliPath, \.\.\.pnpmArguments\]/u)
  assert.match(source, /shell: false,\s*windowsHide: process\.platform === "win32"/u)
})

test('patched DSH web app browser launcher hides the Windows launcher window', async () => {
  const dshEntry = require.resolve('@deepseek-ai/dsh/lib/bin.js')
  const dshRequire = createRequire(dshEntry)
  const webAppEntry = dshRequire.resolve('@deepseek-ai/dsh-web-app')
  const source = await readFile(webAppEntry, 'utf8')

  assert.match(source, /function spawnBrowserLauncher\(url\)/u)
  assert.match(source, /env: scrubbedParentEnv\(\),\s*windowsHide: process\.platform === "win32",/u)
})
