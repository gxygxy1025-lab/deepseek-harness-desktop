import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import {
  cp,
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

export const BUILTIN_BUNDLES = Object.freeze([
  '@deepseek-ai/dsh-base',
  '@deepseek-ai/dsh-web-app',
  '@linxin666/dsh-web-ui-all',
])

export const BUILTIN_RUNTIME_PACKAGES = Object.freeze([
  '@linxin666/dsh-client-ui-aionui-panel',
  '@linxin666/dsh-client-ui-git-graph',
  '@linxin666/dsh-client-ui-skin-blue-fantasy',
  '@linxin666/dsh-client-ui-skin-center',
  '@linxin666/dsh-client-ui-skin-dragon-heir',
  '@linxin666/dsh-client-ui-skin-miku',
  '@linxin666/dsh-client-ui-skin-minecraft',
  '@linxin666/dsh-client-ui-skin-qq98',
  '@linxin666/dsh-client-ui-skin-ths',
  '@linxin666/dsh-client-ui-skin-trading',
  '@linxin666/dsh-client-ui-skin-whale-song',
  '@linxin666/dsh-client-ui-skin-xp',
  '@linxin666/dsh-client-ui-task-board',
  '@linxin666/dsh-client-ui-web-ui-settings',
  '@linxin666/dsh-live-stats',
  '@linxin666/dsh-pet',
  '@linxin666/dsh-remote-web-ui',
  '@linxin666/dsh-skins',
  '@linxin666/dsh-ssh',
  '@linxin666/dsh-web-ui-all',
  '@linxin666/dsh-web-ui-compat',
].toSorted())

export const DESKTOP_SUPPORT_PACKAGES = Object.freeze([
  '@deepseek-ai/dsh-client-ui-directory-picker-browse',
  '@deepseek-ai/dsh-host-directory-picker-browse',
].toSorted())

export const MANAGED_RUNTIME_PACKAGES = Object.freeze([
  ...BUILTIN_RUNTIME_PACKAGES,
  ...DESKTOP_SUPPORT_PACKAGES,
].toSorted())

// DSH rc.6 exposes these runtime modules as peers. Keep them explicit so the
// packaged host is hermetic instead of resolving through a developer machine.
export const DSH_BOOT_RUNTIME_PACKAGES = Object.freeze([
  '@deepseek-ai/cordis-plugin-group',
  '@deepseek-ai/dsh',
  '@deepseek-ai/dsh-anonymous-user-id',
  '@deepseek-ai/dsh-atomic-write',
  '@deepseek-ai/dsh-bash-local',
  '@deepseek-ai/dsh-code-runtime',
  '@deepseek-ai/dsh-compaction',
  '@deepseek-ai/dsh-fs',
  '@deepseek-ai/dsh-output-retention',
  '@deepseek-ai/dsh-sandbox',
  '@deepseek-ai/dsh-scope',
  '@deepseek-ai/dsh-session-telemetry',
  '@deepseek-ai/dsh-session-title-llm',
  '@deepseek-ai/dsh-shell',
  '@deepseek-ai/dsh-spill',
  '@deepseek-ai/dsh-subagent-in-process-driver',
  '@deepseek-ai/dsh-subprocess',
  '@deepseek-ai/dsh-timeout',
  '@deepseek-ai/dsh-workflow',
].toSorted())

const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/
const ROOT_CONFIG = '[]\n'
export const DESKTOP_PATCH_CONFIG = `- id: directory-picker
  name: '@deepseek-ai/dsh-host-directory-picker-auto'
  disabled: true
- insert:
    - id: directory-picker-desktop-host
      name: '@deepseek-ai/dsh-host-directory-picker-browse'
    - id: directory-picker-desktop-client
      name: '@deepseek-ai/dsh-client-ui-directory-picker-browse'
`
const WORKSPACE_CONFIG = `packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n`

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
  const existingBundles = existing.dsh?.profile?.bundles
  const communityBundles = Array.isArray(existingBundles)
    ? existingBundles.filter((name) => !BUILTIN_BUNDLES.includes(name))
    : []

  return {
    name: 'dsh-profile-desktop',
    private: true,
    dependencies: { ...(existing.dependencies ?? {}) },
    dsh: {
      profile: {
        bundles: [...BUILTIN_BUNDLES, ...communityBundles],
      },
    },
  }
}

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
}

async function writeIfChanged(path, content) {
  try {
    if ((await readFile(path, 'utf8')) === content) return false
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await atomicWrite(path, content)
  return true
}

async function atomicWrite(path, content) {
  await mkdir(dirname(path), { recursive: true })
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const temporary = `${path}.tmp-${suffix}`
  const backup = `${path}.bak-${suffix}`
  await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' })
  let movedExisting = false
  try {
    try {
      await rename(path, backup)
      movedExisting = true
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    await rename(temporary, path)
    if (movedExisting) await rm(backup, { force: true })
  } catch (error) {
    await rm(temporary, { force: true })
    if (movedExisting) {
      await rm(path, { force: true })
      await rename(backup, path)
    }
    throw error
  }
}

async function pathExists(path) {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function linkManagedPackage({ packageName, profileDir, sourceDir, previous }) {
  const target = join(profileDir, 'node_modules', ...packagePathSegments(packageName))
  await mkdir(dirname(target), { recursive: true })
  if (await pathExists(target)) {
    try {
      if ((await realpath(target)) === (await realpath(sourceDir))) {
        return { changed: false, record: { mode: 'link', source: sourceDir } }
      }
    } catch {
      // A copied package has a different real path and is checked below.
    }
    const installed = await readJsonIfPresent(join(target, 'package.json'))
    if (previous?.mode === 'copy' && previous.source === sourceDir && installed?.name === packageName) {
      return { changed: false, record: previous }
    }
    throw new Error(`refusing to replace unmanaged package at ${target}`)
  }

  try {
    await symlink(sourceDir, target, process.platform === 'win32' ? 'junction' : 'dir')
    return { changed: true, record: { mode: 'link', source: sourceDir } }
  } catch (error) {
    if (!['EACCES', 'EPERM', 'UNKNOWN'].includes(error?.code)) throw error
    await cp(sourceDir, target, { recursive: true, errorOnExist: true, force: false })
    return { changed: true, record: { mode: 'copy', source: sourceDir } }
  }
}

export async function ensureDesktopProfile({
  dshHome,
  packageRoots = resolveRuntimePackages(),
  profileName = 'desktop',
} = {}) {
  if (typeof dshHome !== 'string' || dshHome.length === 0) {
    throw new TypeError('dshHome must be a non-empty absolute path')
  }
  const profileDir = join(dshHome, 'profiles', profileName)
  await mkdir(profileDir, { recursive: true })
  const manifestPath = join(profileDir, 'package.json')
  const existing = await readJsonIfPresent(manifestPath)
  const manifest = createDesktopProfileManifest(existing)

  for (const [packageName, sourceDir] of packageRoots) {
    manifest.dependencies[packageName] = `link:${sourceDir.replaceAll('\\', '/')}`
  }
  const sortedDependencies = Object.fromEntries(
    Object.entries(manifest.dependencies).toSorted(([left], [right]) => left.localeCompare(right)),
  )
  manifest.dependencies = sortedDependencies

  let changed = false
  changed = (await writeIfChanged(join(profileDir, 'cordis.yml'), ROOT_CONFIG)) || changed
  changed = (await writeIfChanged(join(profileDir, 'cordis.patch.yml'), DESKTOP_PATCH_CONFIG)) || changed
  changed = (await writeIfChanged(join(profileDir, 'pnpm-workspace.yaml'), WORKSPACE_CONFIG)) || changed
  changed = (await writeIfChanged(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)) || changed

  const recordPath = join(profileDir, '.dsh-desktop-links.json')
  const previousRecords = (await readJsonIfPresent(recordPath)) ?? {}
  const nextRecords = {}
  for (const [packageName, sourceDir] of [...packageRoots].toSorted(([left], [right]) => left.localeCompare(right))) {
    const result = await linkManagedPackage({
      packageName,
      profileDir,
      sourceDir,
      previous: previousRecords[packageName],
    })
    nextRecords[packageName] = result.record
    changed = result.changed || changed
  }
  changed = (await writeIfChanged(recordPath, `${JSON.stringify(nextRecords, null, 2)}\n`)) || changed

  return { changed, manifest, profileDir }
}

function resolvePackageRoot(packageName, anchors) {
  for (const anchor of anchors) {
    const require = createRequire(anchor)
    try {
      return materializeFilesystemPath(dirname(require.resolve(`${packageName}/package.json`)))
    } catch {
      // Package exports may hide package.json; resolve the entry and walk upward.
    }
    try {
      let cursor = dirname(require.resolve(packageName))
      for (;;) {
        const manifest = readJsonSync(join(cursor, 'package.json'))
        if (manifest?.name === packageName) return materializeFilesystemPath(cursor)
        const parent = dirname(cursor)
        if (parent === cursor) break
        cursor = parent
      }
    } catch {
      // Try the next anchor.
    }
  }
  return undefined
}

function readJsonSync(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return undefined
  }
}

export function resolveRuntimePackages(
  packageNames = MANAGED_RUNTIME_PACKAGES,
  initialAnchor = import.meta.url,
) {
  const pending = new Set([...packageNames].toSorted())
  const anchors = [initialAnchor]
  const resolved = new Map()

  while (pending.size > 0) {
    let madeProgress = false
    for (const packageName of [...pending]) {
      const root = resolvePackageRoot(packageName, anchors)
      if (root === undefined) continue
      resolved.set(packageName, root)
      anchors.push(join(root, 'package.json'))
      pending.delete(packageName)
      madeProgress = true
    }
    if (!madeProgress) {
      throw new Error(`desktop runtime packages are missing: ${[...pending].join(', ')}`)
    }
  }

  return new Map([...resolved].toSorted(([left], [right]) => left.localeCompare(right)))
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
