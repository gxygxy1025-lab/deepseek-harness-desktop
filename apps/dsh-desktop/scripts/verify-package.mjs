import { access, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import YAML from 'yaml'

import {
  BUILTIN_SKIN_PACKAGES,
  DSH_BOOT_RUNTIME_PACKAGES,
  MANAGED_RUNTIME_PACKAGES,
  WEB_UI_SETTINGS_NAMESPACES,
  packagePathSegments,
} from '../src/profile.mjs'
import { CRITICAL_RUNTIME_FILES } from '../src/runtime-integrity.mjs'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const argumentsList = process.argv.slice(2)
const allowMissingUpdateMetadata = argumentsList.includes('--allow-missing-update-metadata')
const resourcesArgument = argumentsList.find((argument) => !argument.startsWith('--'))
const resources = resolve(resourcesArgument || join(appDir, 'dist', 'win-unpacked', 'resources'))
const unpackedModules = join(resources, 'app.asar.unpacked', 'node_modules')
const requiredPackages = [
  ...DSH_BOOT_RUNTIME_PACKAGES,
  'electron-updater',
  'fflate',
  'pnpm',
  'semver',
  '@tencent-connect/qqbot-connector',
  '@tencent-connect/qqbot-nodejs',
  '@xterm/addon-fit',
  '@xterm/xterm',
  'qrcode',
  'ssh2',
  'ws',
  ...MANAGED_RUNTIME_PACKAGES,
]

for (const packageName of requiredPackages) {
  const manifestPath = join(unpackedModules, ...packagePathSegments(packageName), 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.name !== packageName) throw new Error(`packaged manifest mismatch for ${packageName}`)
}

await access(join(unpackedModules, '@deepseek-ai', 'dsh', 'lib', 'bin.js'))
await access(join(unpackedModules, 'pnpm', 'bin', 'pnpm.mjs'))
for (const relativePath of CRITICAL_RUNTIME_FILES) {
  await access(join(unpackedModules, ...relativePath.split('/')))
}
for (const packageName of BUILTIN_SKIN_PACKAGES) {
  const skinId = packageName.slice(packageName.lastIndexOf('-skin-') + '-skin-'.length)
  const packageRoot = join(unpackedModules, '@linxin666', 'dsh-skins', 'skins', skinId)
  await access(join(packageRoot, 'lib', 'client.js'))
  await access(join(packageRoot, 'skin.json'))
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'))
  if (manifest.name !== packageName) throw new Error(`bundled skin manifest mismatch for ${packageName}`)
}
const petRoot = join(unpackedModules, ...packagePathSegments('@linxin666/dsh-pet'))
await access(join(petRoot, 'lib', 'client.js'))
await access(join(petRoot, 'assets', 'whale', 'pet.json'))
await access(join(petRoot, 'assets', 'whale', 'spritesheet.webp'))
const sshRoot = join(unpackedModules, ...packagePathSegments('@linxin666/dsh-ssh'))
const sshClientPath = join(sshRoot, 'lib', 'client.js')
const sshClient = await readFile(sshClientPath, 'utf8')
const sshClientBytes = (await stat(sshClientPath)).size
if (sshClientBytes > 250_000 || sshClient.includes('CoreBrowserTerminal')) {
  throw new Error(`packaged SSH client eagerly bundles xterm (${sshClientBytes} bytes)`)
}
await access(join(unpackedModules, '@xterm', 'xterm', 'lib', 'xterm.js'))
await access(join(unpackedModules, '@xterm', 'addon-fit', 'lib', 'addon-fit.js'))
const aggregatePatch = await readFile(
  join(unpackedModules, '@linxin666', 'dsh-web-ui-all', 'cordis.patch.yml'),
  'utf8',
)
if (!/- id: ui-mode-switcher\s+name: '@linxin666\/dsh-client-ui-mode-switcher'/u.test(aggregatePatch)) {
  throw new Error('packaged web UI aggregate is missing the Desktop mode switcher')
}
const apiProxyBundle = await readFile(
  join(unpackedModules, '@deepseek-ai', 'dsh-host-apiproxy', 'lib', 'index.js'),
  'utf8',
)
for (const namespace of WEB_UI_SETTINGS_NAMESPACES) {
  if (!apiProxyBundle.includes(`"${namespace}"`)) {
    throw new Error(`packaged Host API proxy is missing settings namespace ${namespace}`)
  }
}

const packagedTaskBoard = await import(pathToFileURL(join(unpackedModules, '@linxin666', 'dsh-client-ui-task-board', 'lib', 'index.js')).href)
const packagedGitGraph = await import(pathToFileURL(join(unpackedModules, '@linxin666', 'dsh-client-ui-git-graph', 'lib', 'index.js')).href)
for (const [name, value] of [
  ['Task Board WorktreeExecutionCoordinator', packagedTaskBoard.WorktreeExecutionCoordinator],
  ['Task Board EvidenceReviewService', packagedTaskBoard.EvidenceReviewService],
  ['Git Graph WorktreeHostService', packagedGitGraph.WorktreeHostService],
  ['Git Graph WorktreeWorkspaceRegistry', packagedGitGraph.WorktreeWorkspaceRegistry],
]) {
  if (typeof value !== 'function') throw new Error(`packaged runtime is missing ${name}`)
}
const particlePackageRoot = join(unpackedModules, '@linxin666', 'dsh-particle-theme')
await access(join(particlePackageRoot, 'lib', 'index.js'))
await access(join(particlePackageRoot, 'lib', 'client.js'))
const particlePatch = await readFile(join(particlePackageRoot, 'cordis.patch.yml'), 'utf8')
if (!/- id: particle-theme\s+name: '@linxin666\/dsh-particle-theme'/u.test(particlePatch)) {
  throw new Error('packaged particle theme patch is missing')
}
const settingsBridge = await readFile(
  join(unpackedModules, '@linxin666', 'dsh-client-ui-web-ui-settings', 'lib', 'index.js'),
  'utf8',
)
if (!settingsBridge.includes('"particle-theme"')) {
  throw new Error('packaged settings bridge is missing the particle-theme namespace')
}
await access(join(resources, 'app.asar'))
await access(join(resources, 'app-icon.png'))
const telemetryConfiguration = JSON.parse(await readFile(join(resources, 'telemetry-config.json'), 'utf8'))
if (
  telemetryConfiguration === null
  || typeof telemetryConfiguration !== 'object'
  || Array.isArray(telemetryConfiguration)
  || Object.keys(telemetryConfiguration).length !== 1
  || typeof telemetryConfiguration.endpoint !== 'string'
) {
  throw new Error('packaged anonymous metrics configuration is invalid')
}
if (telemetryConfiguration.endpoint.length > 0) {
  const telemetryEndpoint = new URL(telemetryConfiguration.endpoint)
  if (
    telemetryEndpoint.protocol !== 'https:'
    || telemetryEndpoint.pathname !== '/v1/events'
    || telemetryEndpoint.username
    || telemetryEndpoint.password
    || telemetryEndpoint.search
    || telemetryEndpoint.hash
  ) {
    throw new Error('packaged anonymous metrics endpoint is invalid')
  }
}
const updateShutdownProtocol = await readFile(join(resources, 'update-shutdown-v1'), 'utf8')
if (updateShutdownProtocol.trim() !== 'dsh-desktop-update-shutdown-protocol=1') {
  throw new Error('packaged update shutdown protocol marker is invalid')
}
const updateShutdownReceipt = await readFile(join(resources, 'update-shutdown-v2'), 'utf8')
if (updateShutdownReceipt.trim() !== 'dsh-desktop-update-shutdown-receipt=2') {
  throw new Error('packaged update shutdown receipt marker is invalid')
}
const installerUpgradeProtocol = await readFile(join(resources, 'installer-upgrade-v3'), 'utf8')
if (installerUpgradeProtocol.trim() !== 'dsh-desktop-installer-upgrade=3') {
  throw new Error('packaged installer upgrade marker is invalid')
}
if (!allowMissingUpdateMetadata) await access(join(resources, 'app-update.yml'))

// electron-builder only refreshes builder-effective-config.yaml when stdout is a
// TTY, so that file is commonly stale in CI. Validate the same config file the
// successful package command consumed instead of trusting a leftover artifact.
const packagingConfig = YAML.parse(await readFile(join(appDir, 'electron-builder.yml'), 'utf8'))
if (!packagingConfig.protocols?.some((entry) => entry.schemes?.includes('dsh'))) {
  throw new Error('packaging config is missing the dsh protocol registration')
}
if (!packagingConfig.fileAssociations?.some((entry) => entry.ext === 'dshpreset' && entry.role === 'Editor')) {
  throw new Error('packaging config is missing the review-only .dshpreset association')
}
if (!packagingConfig.extraResources?.some((entry) => entry.to === 'telemetry-config.json')) {
  throw new Error('packaging config is missing the anonymous metrics resource')
}

console.log(`verified ${requiredPackages.length} packaged runtime packages in ${resources}`)
