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

test('patched DSH subprocess runtime hides every Windows command window', async () => {
  const dshEntry = require.resolve('@deepseek-ai/dsh/lib/bin.js')
  const dshRequire = createRequire(dshEntry)
  const baseEntry = dshRequire.resolve('@deepseek-ai/dsh-base')
  const baseRequire = createRequire(baseEntry)
  const subprocessEntry = baseRequire.resolve('@deepseek-ai/dsh-subprocess-local')
  const source = await readFile(subprocessEntry, 'utf8')

  assert.match(source, /detached: platform !== "win32",\s*windowsHide: platform === "win32"/u)
})

test('patched Windows ACL sandbox hides both restricted process launch paths', async () => {
  const dshEntry = require.resolve('@deepseek-ai/dsh/lib/bin.js')
  const dshRequire = createRequire(dshEntry)
  const baseEntry = dshRequire.resolve('@deepseek-ai/dsh-base')
  const baseRequire = createRequire(baseEntry)
  const sandboxEntry = baseRequire.resolve('@deepseek-ai/dsh-sandbox-windows-acl')
  const sandboxDirectory = dirname(sandboxEntry)
  const implementationFiles = (await readdir(sandboxDirectory))
    .filter((file) => /^types-.*\.js$/u.test(file))

  assert.equal(implementationFiles.length, 1)
  const source = await readFile(join(sandboxDirectory, implementationFiles[0]), 'utf8')

  const hiddenStartupInfo = source.match(/dwFlags: 257,\s*wShowWindow: 0/gu) ?? []
  assert.equal(hiddenStartupInfo.length, 2)
  assert.doesNotMatch(source, /createProcessAsUserW\([^;]+, 134217728,/u)
})
