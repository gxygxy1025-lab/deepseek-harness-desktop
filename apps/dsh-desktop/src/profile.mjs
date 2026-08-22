import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { cp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

export const BUILTIN_BUNDLES = Object.freeze([
  '@deepseek-ai/dsh-base',
  '@deepseek-ai/dsh-web-app',
])

export const DESKTOP_PROFILE_BOOTSTRAP_ERROR = 'desktop-profile-bootstrap-invalid'
export const DESKTOP_PATCH_START = '# --- dsh-desktop managed (auto-generated; do not edit) ---'
export const DESKTOP_PATCH_END = '# --- end dsh-desktop managed ---'
const ROOT_CONFIG = '[]\n'

const DESKTOP_PATCH_BODY = `- id: directory-picker
  name: '@deepseek-ai/dsh-host-directory-picker-auto'
  disabled: true
- insert:
    - id: directory-picker-desktop-host
      name: '@deepseek-ai/dsh-host-directory-picker-browse'
    - id: directory-picker-desktop-client
      name: '@deepseek-ai/dsh-client-ui-directory-picker-browse'
- id: llm-deepseek
  config:
    retryPolicy:
      mode: normal
      maxRetries: 4
      retryableCodes:
        - EMPTY_RESPONSE
        - RATE_LIMIT
        - SERVER
        - TIMEOUT
        - TRANSPORT
        - STREAM_CLOSED
      backoff:
        initialDelayMs: 750
        maxDelayMs: 15000
        jitterRatio: 0.15`

export const DESKTOP_PATCH_CONFIG = `${DESKTOP_PATCH_START}\n${DESKTOP_PATCH_BODY}\n${DESKTOP_PATCH_END}\n`

const RUNTIME_PACKAGE_NAMES = Object.freeze([
  '@deepseek-ai/cordis-plugin-group', '@deepseek-ai/dsh', '@deepseek-ai/dsh-agent',
  '@deepseek-ai/dsh-agent-default-model', '@deepseek-ai/dsh-anonymous-user-id',
  '@deepseek-ai/dsh-attachment', '@deepseek-ai/dsh-atomic-write', '@deepseek-ai/dsh-bash-local',
  '@deepseek-ai/dsh-brand', '@deepseek-ai/dsh-client-ui-directory-picker-browse',
  '@deepseek-ai/dsh-code-runtime', '@deepseek-ai/dsh-compaction', '@deepseek-ai/dsh-fs',
  '@deepseek-ai/dsh-host-directory-picker', '@deepseek-ai/dsh-host-directory-picker-browse',
  '@deepseek-ai/dsh-host-webserver', '@deepseek-ai/dsh-llm', '@deepseek-ai/dsh-output-retention',
  '@deepseek-ai/dsh-sandbox', '@deepseek-ai/dsh-sandbox-policy', '@deepseek-ai/dsh-scope',
  '@deepseek-ai/dsh-session', '@deepseek-ai/dsh-session-persistence',
  '@deepseek-ai/dsh-session-telemetry', '@deepseek-ai/dsh-session-telemetry-otel',
  '@deepseek-ai/dsh-session-title-llm', '@deepseek-ai/dsh-shell', '@deepseek-ai/dsh-spill',
  '@deepseek-ai/dsh-settings', '@deepseek-ai/dsh-subagent-in-process-driver',
  '@deepseek-ai/dsh-subprocess', '@deepseek-ai/dsh-timeout', '@deepseek-ai/dsh-typert-protocol',
  '@deepseek-ai/dsh-web', '@deepseek-ai/dsh-workflow', '@deepseek-ai/dsh-workspace',
].toSorted())

export const CORE_RUNTIME_PACKAGES = RUNTIME_PACKAGE_NAMES

const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/u

export function isSemanticallyEmptyPatch(source) {
  if (typeof source !== 'string') return false
  try {
    const value = parse(source)
    return value === null || value === undefined || (Array.isArray(value) && value.length === 0)
  } catch {
    return false
  }
}

export function packagePathSegments(packageName) {
  if (typeof packageName !== 'string' || !PACKAGE_NAME_PATTERN.test(packageName)) {
    throw new TypeError(`invalid package name: ${JSON.stringify(packageName)}`)
  }
  return packageName.split('/')
}

export function materializeFilesystemPath(path) {
  return path.replace(/([\\/])app\.asar([\\/])/u, '$1app.asar.unpacked$2')
}

export function createDesktopProfileManifest() {
  return {
    name: 'dsh-profile-desktop', private: true, dependencies: {},
    dsh: { profile: { bundles: [...BUILTIN_BUNDLES] } },
  }
}

export function mergeDesktopPatch() {
  return DESKTOP_PATCH_CONFIG
}

async function writeIfChanged(path, content) {
  try {
    if (await readFile(path, 'utf8') === content) return false
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf8')
  return true
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return undefined }
}

function resolvePackageRoot(packageName, anchors) {
  for (const anchor of anchors) {
    const require = createRequire(anchor)
    try {
      return materializeFilesystemPath(dirname(require.resolve(`${packageName}/package.json`)))
    } catch {}
    try {
      let cursor = dirname(require.resolve(packageName))
      while (true) {
        if (readJson(join(cursor, 'package.json'))?.name === packageName) return materializeFilesystemPath(cursor)
        const parent = dirname(cursor)
        if (parent === cursor) break
        cursor = parent
      }
    } catch {}
    let cursor
    try { cursor = dirname(String(anchor).startsWith('file:') ? fileURLToPath(anchor) : String(anchor)) } catch {}
    while (cursor) {
      const candidate = join(cursor, 'node_modules', ...packagePathSegments(packageName))
      if (readJson(join(candidate, 'package.json'))?.name === packageName) return materializeFilesystemPath(candidate)
      const parent = dirname(cursor)
      if (parent === cursor) break
      cursor = parent
    }
  }
  return undefined
}

export function resolveRuntimePackages(packageNames = RUNTIME_PACKAGE_NAMES, initialAnchor = import.meta.url) {
  const resolved = new Map()
  for (const packageName of [...packageNames].toSorted()) {
    const root = resolvePackageRoot(packageName, [initialAnchor])
    if (root === undefined) throw new Error(`desktop runtime package is missing: ${packageName}`)
    resolved.set(packageName, root)
  }
  return resolved
}

async function ensurePackageLink(profileDir, packageName, sourceDir) {
  const target = join(profileDir, 'node_modules', ...packagePathSegments(packageName))
  await mkdir(dirname(target), { recursive: true })
  try {
    if (await realpath(target) === await realpath(sourceDir)) return false
    await rm(target, { recursive: true, force: true })
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  try {
    await symlink(sourceDir, target, process.platform === 'win32' ? 'junction' : 'dir')
  } catch (error) {
    if (!['EACCES', 'EPERM', 'UNKNOWN'].includes(error?.code)) throw error
    await cp(sourceDir, target, { recursive: true, force: false })
  }
  return true
}

export async function ensureDesktopProfile({ dshHome, packageRoots = resolveRuntimePackages(), profileName = 'desktop' } = {}) {
  if (typeof dshHome !== 'string' || dshHome.length === 0) throw new TypeError('dshHome must be a non-empty path')
  const profileDir = join(dshHome, 'profiles', profileName)
  await mkdir(profileDir, { recursive: true })
  const manifest = createDesktopProfileManifest()
  for (const [packageName, sourceDir] of new Map(packageRoots)) {
    manifest.dependencies[packageName] = `link:${sourceDir.replaceAll('\\', '/')}`
  }
  manifest.dependencies = Object.fromEntries(Object.entries(manifest.dependencies).toSorted(([a], [b]) => a.localeCompare(b)))
  let changed = false
  changed = await writeIfChanged(join(profileDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`) || changed
  changed = await writeIfChanged(join(profileDir, 'cordis.yml'), ROOT_CONFIG) || changed
  changed = await writeIfChanged(join(profileDir, 'cordis.patch.yml'), DESKTOP_PATCH_CONFIG) || changed
  changed = await writeIfChanged(join(profileDir, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n') || changed
  for (const [packageName, sourceDir] of new Map(packageRoots)) changed = await ensurePackageLink(profileDir, packageName, sourceDir) || changed
  return { changed, manifest, profileDir }
}

export function resolveDshCliPath(initialAnchor = import.meta.url) {
  const root = resolvePackageRoot('@deepseek-ai/dsh', [initialAnchor])
  if (root === undefined) throw new Error('the official @deepseek-ai/dsh runtime is missing')
  return join(root, 'lib', 'bin.js')
}

export function isPathInside(parent, child) {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith('..') && !path.includes(':'))
}
