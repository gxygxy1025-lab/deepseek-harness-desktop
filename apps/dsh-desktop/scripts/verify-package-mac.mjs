import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import YAML from 'yaml'

import { CORE_RUNTIME_PACKAGES, packagePathSegments } from '../src/profile.mjs'

const execFileAsync = promisify(execFile)
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = resolve(appDir, '..', '..')
const distDir = join(appDir, 'dist')
const allowMissingArtifacts = process.argv.includes('--allow-missing-artifacts')
const architectureArgument = process.argv.find((argument) => argument.startsWith('--arch='))
const expectedArchitecture = architectureArgument?.slice('--arch='.length) || 'universal'
const appArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'))

const desktopManifest = JSON.parse(await readFile(join(appDir, 'package.json'), 'utf8'))
const rootManifest = JSON.parse(await readFile(join(workspaceRoot, 'package.json'), 'utf8'))
if (desktopManifest.version !== rootManifest.version) {
  throw new Error(`package version mismatch root=${rootManifest.version} desktop=${desktopManifest.version}`)
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function findAppBundle() {
  if (appArgument) return resolve(appArgument)
  for (const entry of await readdir(distDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const directory = join(distDir, entry.name)
    for (const child of await readdir(directory, { withFileTypes: true })) {
      if (child.isDirectory() && child.name.endsWith('.app')) return join(directory, child.name)
    }
  }
  throw new Error(`no packaged .app bundle found under ${distDir}`)
}

async function listFiles(root) {
  const files = []
  const pending = [root]
  while (pending.length > 0) {
    const directory = pending.pop()
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) pending.push(path)
      else if (entry.isFile()) files.push(path)
    }
  }
  return files
}

async function architectures(path) {
  const { stdout } = await execFileAsync('/usr/bin/lipo', ['-archs', path])
  return new Set(stdout.trim().split(/\s+/u).filter(Boolean))
}

function architectureHint(path) {
  const normalized = path.replaceAll('\\', '/').toLowerCase()
  if (/(?:^|[-_/])(?:arm64|aarch64)(?:[-_/]|$)/u.test(normalized)) return 'arm64'
  if (/(?:^|[-_/])(?:x64|x86_64)(?:[-_/]|$)/u.test(normalized)) return 'x86_64'
  return undefined
}

function requiredArchitectures(path) {
  const hint = architectureHint(path)
  if (expectedArchitecture === 'universal') return hint ? [hint] : ['x86_64', 'arm64']
  if (expectedArchitecture === 'x64') return hint === 'arm64' ? [] : ['x86_64']
  if (expectedArchitecture === 'arm64') return hint === 'x86_64' ? [] : ['arm64']
  throw new Error(`unsupported expected architecture: ${expectedArchitecture}`)
}

async function verifyArchitectures(path) {
  const required = requiredArchitectures(path)
  if (required.length === 0) return
  const actual = await architectures(path)
  for (const architecture of required) {
    if (!actual.has(architecture)) {
      throw new Error(`${relative(appBundle, path)} is missing ${architecture}; found ${[...actual].join(', ')}`)
    }
  }
}

async function sha512(path) {
  const hash = createHash('sha512')
  await pipeline(createReadStream(path), hash)
  return hash.digest('base64')
}

const appBundle = await findAppBundle()
const contents = join(appBundle, 'Contents')
const resources = join(contents, 'Resources')
const unpackedModules = join(resources, 'app.asar.unpacked', 'node_modules')
const infoPath = join(contents, 'Info.plist')
const { stdout: infoJson } = await execFileAsync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', infoPath])
const info = JSON.parse(infoJson)

if (info.CFBundleIdentifier !== 'ai.deepseek.harness.desktop') {
  throw new Error(`unexpected bundle identifier: ${info.CFBundleIdentifier}`)
}
if (info.CFBundleShortVersionString !== desktopManifest.version) {
  throw new Error(`Info.plist version ${info.CFBundleShortVersionString} does not match ${desktopManifest.version}`)
}
if (info.LSMinimumSystemVersion !== '13.0') {
  throw new Error(`unexpected minimum macOS version: ${info.LSMinimumSystemVersion}`)
}

const mainExecutable = join(contents, 'MacOS', info.CFBundleExecutable)
await verifyArchitectures(mainExecutable)
await access(join(resources, 'app.asar'))
await access(join(resources, 'app-icon.png'))

for (const marker of ['update-shutdown-v1', 'update-shutdown-v2', 'installer-upgrade-v3']) {
  if (await exists(join(resources, marker))) throw new Error(`Windows-only marker is present in macOS package: ${marker}`)
}

for (const packageName of [...CORE_RUNTIME_PACKAGES, 'electron-updater', 'pnpm']) {
  const manifestPath = join(unpackedModules, ...packagePathSegments(packageName), 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.name !== packageName) throw new Error(`packaged manifest mismatch for ${packageName}`)
}

const packagedDsh = JSON.parse(await readFile(
  join(unpackedModules, '@deepseek-ai', 'dsh', 'package.json'),
  'utf8',
))
const packagedPnpm = JSON.parse(await readFile(join(unpackedModules, 'pnpm', 'package.json'), 'utf8'))
if (packagedDsh.version !== desktopManifest.dependencies['@deepseek-ai/dsh']) {
  throw new Error(`packaged DSH version is ${packagedDsh.version}`)
}
if (packagedPnpm.version !== desktopManifest.dependencies.pnpm) {
  throw new Error(`packaged pnpm version is ${packagedPnpm.version}`)
}

for (const forbidden of [
  '@linxin666',
  '@tencent-connect',
  'dshmarket',
  'reasoning-slider',
  'dsh-codex-connect',
  'ssh2',
  '@xterm',
]) {
  if (await exists(join(unpackedModules, forbidden))) {
    throw new Error(`removed extension package is still present: ${forbidden}`)
  }
}

const packagedFiles = await listFiles(contents)
const windowsCleanupScripts = packagedFiles.filter(
  (path) => basename(path).toLowerCase() === 'cleanup-stale-processes.ps1',
)
if (windowsCleanupScripts.length > 0) {
  throw new Error(`macOS package contains Desktop Windows cleanup scripts: ${windowsCleanupScripts.map((path) => relative(appBundle, path)).join(', ')}`)
}

const foreignNativeFiles = packagedFiles.filter((path) => {
  const normalized = path.replaceAll('\\', '/').toLowerCase()
  if (/\.(?:dll|exe)$/u.test(normalized)) return true
  if (!/(?:win32|linux|freebsd|openbsd|android)-/u.test(normalized)) return false
  return normalized.endsWith('.node') || normalized.endsWith('/bin/rg')
})
if (foreignNativeFiles.length > 0) {
  throw new Error(`macOS package contains foreign native files: ${foreignNativeFiles.map((path) => relative(appBundle, path)).join(', ')}`)
}

const macNativeFiles = packagedFiles.filter((path) => {
  const normalized = path.replaceAll('\\', '/').toLowerCase()
  if (normalized.endsWith('.node')) return !/(?:win32|linux)/u.test(normalized)
  return normalized.endsWith('/@vscode/ripgrep/bin/rg')
})
if (macNativeFiles.length === 0) throw new Error('no packaged macOS native runtime files were found')
for (const path of macNativeFiles) await verifyArchitectures(path)

if (!allowMissingArtifacts) {
  const architectureName = expectedArchitecture === 'x64' ? 'x64' : expectedArchitecture
  const zipName = `DeepSeek-Harness-Desktop-${desktopManifest.version}-${architectureName}.zip`
  const dmgName = `DeepSeek-Harness-Desktop-${desktopManifest.version}-${architectureName}.dmg`
  const zipPath = join(distDir, zipName)
  await access(zipPath)
  await access(join(distDir, dmgName))
  const latest = YAML.parse(await readFile(join(distDir, 'latest-mac.yml'), 'utf8'))
  if (latest.version !== desktopManifest.version) {
    throw new Error(`latest-mac.yml version is ${latest.version}`)
  }
  const zipEntry = latest.files?.find((entry) => entry.url === zipName)
  if (!zipEntry) throw new Error(`latest-mac.yml does not reference ${zipName}`)
  const actualSha512 = await sha512(zipPath)
  if (zipEntry.sha512 !== actualSha512) throw new Error(`${zipName} SHA512 does not match latest-mac.yml`)
}

console.log(
  `verified macOS ${expectedArchitecture} package ${appBundle}; native runtime files: ${macNativeFiles.length}`,
)
