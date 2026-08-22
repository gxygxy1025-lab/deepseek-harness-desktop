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
  'qrcode',
]

for (const packageName of requiredPackages) {
  const manifestPath = join(unpackedModules, ...packagePathSegments(packageName), 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.name !== packageName) throw new Error(`packaged manifest mismatch for ${packageName}`)
}

for (const forbidden of [
  '@linxin666',
  '@tencent-connect',
  'dshmarket',
  'reasoning-slider',
  'dsh-codex-connect',
  'ssh2',
  '@xterm',
  'pnpm',
]) {
  try {
    await access(join(unpackedModules, forbidden))
    throw new Error(`removed extension package is still present: ${forbidden}`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

await access(join(unpackedModules, '@deepseek-ai', 'dsh', 'lib', 'bin.js'))
for (const relativePath of CRITICAL_RUNTIME_FILES) {
  await access(join(unpackedModules, ...relativePath.split('/')))
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
