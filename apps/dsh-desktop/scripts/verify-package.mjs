import { access, readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import YAML from 'yaml'

import { CORE_RUNTIME_PACKAGES, packagePathSegments } from '../src/profile.mjs'
import { CRITICAL_RUNTIME_FILES } from '../src/runtime-integrity.mjs'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const allowMissingUpdateMetadata = process.argv.includes('--allow-missing-update-metadata')
const resourcesArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'))
const resources = resolve(resourcesArgument || join(appDir, 'dist', 'win-unpacked', 'resources'))
const unpackedModules = join(resources, 'app.asar.unpacked', 'node_modules')

const requiredPackages = [
  ...CORE_RUNTIME_PACKAGES,
  'electron-updater',
  'pnpm',
]

const packagedManifests = new Map()
for (const packageName of requiredPackages) {
  const manifestPath = join(unpackedModules, ...packagePathSegments(packageName), 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.name !== packageName) throw new Error(`packaged manifest mismatch for ${packageName}`)
  packagedManifests.set(packageName, manifest)
}
if (packagedManifests.get('@deepseek-ai/dsh')?.version !== '0.1.1-rc.2') {
  throw new Error('packaged official DSH runtime version is not 0.1.1-rc.2')
}
if (packagedManifests.get('pnpm')?.version !== '11.22.0') {
  throw new Error('packaged pnpm version is not 11.22.0')
}

async function containsPackagedFiles(root) {
  const pending = [root]
  while (pending.length > 0) {
    const directory = pending.pop()
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }
    for (const entry of entries) {
      if (entry.isFile() || entry.isSymbolicLink()) return true
      if (entry.isDirectory()) pending.push(join(directory, entry.name))
    }
  }
  return false
}

for (const forbidden of [
  '@linxin666',
  '@tencent-connect',
  'dshmarket',
  'reasoning-slider',
  'dsh-codex-connect',
  'ssh2',
  '@xterm',
  '@img/sharp-darwin-arm64',
  '@img/sharp-darwin-x64',
  '@koromix/koffi-darwin-arm64',
  '@koromix/koffi-darwin-x64',
  '@vscode/ripgrep-darwin-arm64',
  '@vscode/ripgrep-darwin-x64',
  '@vscode/ripgrep-win32-arm64',
  'node-addon-require-builtin-darwin-arm64',
  'node-addon-require-builtin-darwin-x64',
  'node-addon-require-builtin-win32-arm64-msvc',
]) {
  if (await containsPackagedFiles(join(unpackedModules, forbidden))) {
    throw new Error(`forbidden package files are still present: ${forbidden}`)
  }
}

await access(join(unpackedModules, '@deepseek-ai', 'dsh', 'lib', 'bin.js'))
await access(join(unpackedModules, 'pnpm', 'bin', 'pnpm.cjs'))
const dshLib = join(unpackedModules, '@deepseek-ai', 'dsh', 'lib')
const pluginFiles = (await readdir(dshLib)).filter((name) => /^plugin-.*\.js$/u.test(name))
if (pluginFiles.length !== 1) throw new Error(`packaged DSH plugin entry count is ${pluginFiles.length}`)
const pluginSource = await readFile(join(dshLib, pluginFiles[0]), 'utf8')
for (const pattern of [
  /process\.env\.DSH_PNPM_CLI_PATH/u,
  /forwardedArguments = pnpmCliPath === void 0 \? pnpmArguments : \[pnpmCliPath, \.\.\.pnpmArguments\]/u,
  /shell: false,\s*windowsHide: process\.platform === "win32"/u,
]) {
  if (!pattern.test(pluginSource)) throw new Error(`packaged DSH plugin forwarding check failed: ${pattern}`)
}
for (const relativePath of CRITICAL_RUNTIME_FILES) {
  await access(join(unpackedModules, ...relativePath.split('/')))
}

const sandboxLib = join(unpackedModules, '@deepseek-ai', 'dsh-sandbox-windows-acl', 'lib')
const sandboxImplementations = (await readdir(sandboxLib))
  .filter((name) => /^types-.*\.js$/u.test(name))
if (sandboxImplementations.length !== 1) {
  throw new Error(`packaged Windows ACL sandbox implementation count is ${sandboxImplementations.length}`)
}
const sandboxSource = await readFile(join(sandboxLib, sandboxImplementations[0]), 'utf8')
const hiddenSandboxLaunches = sandboxSource.match(/dwFlags: 257,\s*wShowWindow: 0/gu) ?? []
if (hiddenSandboxLaunches.length !== 2) {
  throw new Error(`packaged Windows ACL sandbox has ${hiddenSandboxLaunches.length} hidden launch paths`)
}
if (/createProcessAsUserW\([^;]+, 134217728,/u.test(sandboxSource)) {
  throw new Error('packaged Windows ACL sandbox uses incompatible CREATE_NO_WINDOW isolation')
}

await access(join(resources, 'app.asar'))
await access(join(resources, 'app-icon.png'))
for (const [name, expected] of [
  ['update-shutdown-v1', 'dsh-desktop-update-shutdown-protocol=1'],
  ['update-shutdown-v2', 'dsh-desktop-update-shutdown-receipt=2'],
  ['installer-upgrade-v3', 'dsh-desktop-installer-upgrade=3'],
]) {
  const value = (await readFile(join(resources, name), 'utf8')).trim()
  if (value !== expected) throw new Error(`packaged ${name} marker is invalid`)
}
if (!allowMissingUpdateMetadata) await access(join(resources, 'app-update.yml'))

const packagingConfig = YAML.parse(await readFile(join(appDir, 'electron-builder.yml'), 'utf8'))
if (!packagingConfig.protocols?.some((entry) => entry.schemes?.includes('dsh'))) {
  throw new Error('packaging config is missing the dsh protocol registration')
}

const packageEntries = (await readdir(unpackedModules, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
console.log(`verified ${requiredPackages.length} official runtime packages in ${resources}; top-level module roots: ${packageEntries.length}`)
