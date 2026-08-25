import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { cp, copyFile, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, symlink } from 'node:fs/promises'
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
export const DESKTOP_PATCH_FILE = 'dsh-desktop.cordis.patch.yml'
const ROOT_CONFIG = '[]\n'
const PROFILE_WORKSPACE_CONFIG = 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n'

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

export function createDesktopProfileManifest(existing = {}) {
  if (existing === null || typeof existing !== 'object' || Array.isArray(existing)) {
    throw new TypeError('desktop profile manifest must be a JSON object')
  }
  if (existing.dependencies !== undefined && !isPlainObject(existing.dependencies)) {
    throw new TypeError('desktop profile manifest dependencies must be a JSON object')
  }
  if (existing.dsh !== undefined && !isPlainObject(existing.dsh)) {
    throw new TypeError('desktop profile manifest dsh must be a JSON object')
  }
  if (existing.dsh?.profile !== undefined && !isPlainObject(existing.dsh.profile)) {
    throw new TypeError('desktop profile manifest dsh.profile must be a JSON object')
  }
  if (existing.dsh?.profile?.bundles !== undefined && !Array.isArray(existing.dsh.profile.bundles)) {
    throw new TypeError('desktop profile manifest dsh.profile.bundles must be an array')
  }
  const dependencies = existing?.dependencies && typeof existing.dependencies === 'object'
    && !Array.isArray(existing.dependencies)
    ? { ...existing.dependencies }
    : {}
  const installedBundles = Array.isArray(existing?.dsh?.profile?.bundles)
    ? existing.dsh.profile.bundles.filter((name) => typeof name === 'string' && dependencies[name] !== undefined)
    : []
  const dsh = isPlainObject(existing.dsh) ? { ...existing.dsh } : {}
  const profile = isPlainObject(existing.dsh?.profile) ? { ...existing.dsh.profile } : {}
  return {
    ...existing,
    name: 'dsh-profile-desktop', private: true, dependencies,
    dsh: { ...dsh, profile: { ...profile, bundles: [
      ...BUILTIN_BUNDLES,
      ...installedBundles.filter((name) => !BUILTIN_BUNDLES.includes(name)),
    ] } },
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function mergeDesktopPatch() {
  return DESKTOP_PATCH_CONFIG
}

async function writeFileAtomically(path, content, { backup = false } = {}) {
  const temporaryPath = `${path}.tmp-${process.pid}-${randomUUID()}`
  await mkdir(dirname(path), { recursive: true })
  let handle
  try {
    try {
      handle = await open(temporaryPath, 'wx')
      await handle.writeFile(content, 'utf8')
      await handle.sync()
    } finally {
      if (handle) await handle.close().catch(() => {})
    }
    if (backup) {
      try {
        await copyFile(path, `${path}.bak`)
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error
      }
    }
    // Keep the temporary file beside the destination so rename is atomic on
    // the supported filesystems. The old file remains in place if replacement
    // fails, which is safer than moving it aside first on Windows.
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => {})
  }
}

async function writeIfChanged(path, content, options) {
  try {
    if (await readFile(path, 'utf8') === content) return false
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await writeFileAtomically(path, content, options)
  return true
}

async function ensureFile(path, content) {
  try {
    await readFile(path, 'utf8')
    return false
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await writeFileAtomically(path, content)
  return true
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return undefined }
}

async function readExistingManifest(path) {
  let source
  try {
    source = await readFile(path, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
  try {
    const manifest = JSON.parse(source)
    if (!isPlainObject(manifest)) throw new TypeError('desktop profile manifest must be a JSON object')
    createDesktopProfileManifest(manifest)
    return manifest
  } catch (cause) {
    const reason = cause instanceof SyntaxError ? 'not valid JSON' : 'has an invalid schema'
    const error = new Error(`desktop profile manifest ${reason}: ${path}`)
    error.code = DESKTOP_PROFILE_BOOTSTRAP_ERROR
    error.cause = cause
    throw error
  }
}

export function removeManagedDesktopPatch(source) {
  if (typeof source !== 'string') return source
  let cursor = 0
  let output = ''
  while (cursor < source.length) {
    const start = source.indexOf(DESKTOP_PATCH_START, cursor)
    if (start < 0) return output + source.slice(cursor)
    const startsAtLine = start === 0 || source[start - 1] === '\n'
    const markerEnd = start + DESKTOP_PATCH_START.length
    const startsOnOwnLine = markerEnd === source.length || source[markerEnd] === '\n' || source.startsWith('\r\n', markerEnd)
    if (!startsAtLine || !startsOnOwnLine) {
      output += source.slice(cursor, markerEnd)
      cursor = markerEnd
      continue
    }
    const end = source.indexOf(DESKTOP_PATCH_END, markerEnd)
    const endsAtLine = end >= 0 && (end === 0 || source[end - 1] === '\n')
    const endMarkerEnd = end + DESKTOP_PATCH_END.length
    const endOnOwnLine = end >= 0 && (endMarkerEnd === source.length || source[endMarkerEnd] === '\n' || source.startsWith('\r\n', endMarkerEnd))
    if (end < 0 || !endsAtLine || !endOnOwnLine) {
      const error = new Error('desktop profile patch has an incomplete managed block')
      error.code = DESKTOP_PROFILE_BOOTSTRAP_ERROR
      throw error
    }
    output += source.slice(cursor, start)
    cursor = endMarkerEnd
    if (source.startsWith('\r\n', cursor)) cursor += 2
    else if (source[cursor] === '\n') cursor += 1
  }
  return output
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

async function packageLinkMatchesSource(target, sourceDir) {
  try {
    return await realpath(target) === await realpath(sourceDir)
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function removePackageLinkTarget(target) {
  await rm(target, { recursive: true, force: true }).catch((error) => {
    if (error?.code !== 'ENOENT') throw error
  })
}

async function ensurePackageLink(profileDir, packageName, sourceDir) {
  const target = join(profileDir, 'node_modules', ...packagePathSegments(packageName))
  await mkdir(dirname(target), { recursive: true })
  if (await packageLinkMatchesSource(target, sourceDir)) return false
  await removePackageLinkTarget(target)

  let lastError
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await symlink(sourceDir, target, process.platform === 'win32' ? 'junction' : 'dir')
      return true
    } catch (error) {
      lastError = error
      if (error?.code !== 'EEXIST') {
        if (!['EACCES', 'EPERM', 'UNKNOWN'].includes(error?.code)) throw error
        await cp(sourceDir, target, { recursive: true, force: false })
        return true
      }
      if (await packageLinkMatchesSource(target, sourceDir)) return false
      await removePackageLinkTarget(target)
    }
  }
  if (await packageLinkMatchesSource(target, sourceDir)) return false
  throw lastError
}

async function removeStalePackageLinks(profileDir, packageRoots) {
  const nodeModulesRoot = join(profileDir, 'node_modules')
  const allowedPackages = new Set([...packageRoots.keys()])
  let changed = false
  let entries
  try {
    entries = await readdir(nodeModulesRoot, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }

  const removeIfStaleLink = async (packageName, target) => {
    if (allowedPackages.has(packageName)) return
    let metadata
    try {
      metadata = await lstat(target)
    } catch (error) {
      if (error?.code === 'ENOENT') return
      throw error
    }
    if (!metadata.isSymbolicLink()) return
    await rm(target, { force: true })
    changed = true
  }

  for (const entry of entries) {
    const target = join(nodeModulesRoot, entry.name)
    if (!entry.name.startsWith('@') || !entry.isDirectory()) {
      await removeIfStaleLink(entry.name, target)
      continue
    }
    let scopedEntries
    try {
      scopedEntries = await readdir(target, { withFileTypes: true })
    } catch (error) {
      if (error?.code === 'ENOENT') continue
      throw error
    }
    for (const scopedEntry of scopedEntries) {
      await removeIfStaleLink(`${entry.name}/${scopedEntry.name}`, join(target, scopedEntry.name))
    }
  }
  return changed
}

const PROFILE_BOOTSTRAP_LOCKS = new Map()

async function ensureDesktopProfileInternal({ dshHome, packageRoots = resolveRuntimePackages(), profileName = 'desktop' } = {}) {
  if (typeof dshHome !== 'string' || dshHome.length === 0) throw new TypeError('dshHome must be a non-empty path')
  const profileDir = join(dshHome, 'profiles', profileName)
  await mkdir(profileDir, { recursive: true })
  const profilePatchPath = join(profileDir, 'cordis.patch.yml')
  const desktopPatchPath = join(profileDir, DESKTOP_PATCH_FILE)
  let profilePatch
  try {
    profilePatch = await readFile(profilePatchPath, 'utf8')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  const manifestPath = join(profileDir, 'package.json')
  const existingManifest = await readExistingManifest(manifestPath) ?? {}
  const manifest = createDesktopProfileManifest(existingManifest)
  for (const [packageName, sourceDir] of new Map(packageRoots)) {
    manifest.dependencies[packageName] = `link:${sourceDir.replaceAll('\\', '/')}`
  }
  manifest.dependencies = Object.fromEntries(Object.entries(manifest.dependencies).toSorted(([a], [b]) => a.localeCompare(b)))
  let changed = false
  changed = await writeIfChanged(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { backup: true }) || changed
  changed = await ensureFile(join(profileDir, 'cordis.yml'), ROOT_CONFIG) || changed
  if (profilePatch?.includes(DESKTOP_PATCH_START)) {
    const migratedPatch = removeManagedDesktopPatch(profilePatch)
    changed = await writeIfChanged(profilePatchPath, migratedPatch || '[]\n', { backup: true }) || changed
  } else {
    changed = await ensureFile(profilePatchPath, '[]\n') || changed
  }
  const desktopPatch = DESKTOP_PATCH_CONFIG
  changed = await writeIfChanged(desktopPatchPath, desktopPatch) || changed
  changed = await ensureFile(join(profileDir, 'pnpm-workspace.yaml'), PROFILE_WORKSPACE_CONFIG) || changed
  const resolvedPackageRoots = new Map(packageRoots)
  const allowedPackageNames = new Set([
    ...resolvedPackageRoots.keys(),
    ...Object.keys(manifest.dependencies),
  ])
  changed = await removeStalePackageLinks(profileDir, allowedPackageNames) || changed
  for (const [packageName, sourceDir] of resolvedPackageRoots) changed = await ensurePackageLink(profileDir, packageName, sourceDir) || changed
  return { changed, manifest, profileDir, desktopPatchPath }
}

export async function ensureDesktopProfile(options = {}) {
  const { dshHome, profileName = 'desktop' } = options
  if (typeof dshHome !== 'string' || dshHome.length === 0) {
    return ensureDesktopProfileInternal(options)
  }
  const profileDir = join(dshHome, 'profiles', profileName)
  const pending = PROFILE_BOOTSTRAP_LOCKS.get(profileDir)
  if (pending) return pending

  const bootstrap = ensureDesktopProfileInternal(options)
  PROFILE_BOOTSTRAP_LOCKS.set(profileDir, bootstrap)
  try {
    return await bootstrap
  } finally {
    if (PROFILE_BOOTSTRAP_LOCKS.get(profileDir) === bootstrap) PROFILE_BOOTSTRAP_LOCKS.delete(profileDir)
  }
}

export function resolveDshCliPath(initialAnchor = import.meta.url) {
  const root = resolvePackageRoot('@deepseek-ai/dsh', [initialAnchor])
  if (root === undefined) throw new Error('the official @deepseek-ai/dsh runtime is missing')
  return join(root, 'lib', 'bin.js')
}

export function resolveDshRuntimeVersion(initialAnchor = import.meta.url) {
  const root = resolvePackageRoot('@deepseek-ai/dsh', [initialAnchor])
  const version = root === undefined ? undefined : readJson(join(root, 'package.json'))?.version
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
    throw new Error('the official @deepseek-ai/dsh runtime version is unavailable')
  }
  return version
}

export function resolvePnpmCliPath(initialAnchor = import.meta.url) {
  const root = resolvePackageRoot('pnpm', [initialAnchor])
  if (root === undefined) throw new Error('the bundled pnpm runtime is missing')
  return join(root, 'bin', 'pnpm.cjs')
}

export function isPathInside(parent, child) {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith('..') && !path.includes(':'))
}
