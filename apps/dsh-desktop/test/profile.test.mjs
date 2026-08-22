import assert from 'node:assert/strict'
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import {
  BUILTIN_BUNDLES,
  CORE_RUNTIME_PACKAGES,
  DESKTOP_PATCH_CONFIG,
  createDesktopProfileManifest,
  ensureDesktopProfile,
  materializeFilesystemPath,
  packagePathSegments,
  resolveDshCliPath,
  resolveRuntimePackages,
} from '../src/profile.mjs'

const CORE_BUNDLES = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
const REMOVED_EXTENSIONS = [
  '@linxin666/dsh-web-ui-all',
  '@tencent-connect/dsh-qqbot',
  'dshmarket',
  'reasoning-slider',
]

test('desktop profile defaults to official bundles and preserves explicit user bundles', () => {
  assert.deepEqual(BUILTIN_BUNDLES, CORE_BUNDLES)
  assert.deepEqual(
    createDesktopProfileManifest({
      dependencies: {
        '@community/example': '1.2.3',
        '@linxin666/dsh-web-ui-all': '0.2.3',
      },
      dsh: { profile: { bundles: ['@linxin666/dsh-web-ui-all', '@community/example'] } },
    }),
    {
      name: 'dsh-profile-desktop',
      private: true,
      dependencies: {
        '@community/example': '1.2.3',
        '@linxin666/dsh-web-ui-all': '0.2.3',
      },
      dsh: { profile: { bundles: [...CORE_BUNDLES, '@linxin666/dsh-web-ui-all', '@community/example'] } },
    },
  )
})

test('profile bootstrap preserves official plugin-managed dependencies and user files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-plugin-profile-'))
  try {
    const profileDir = join(root, 'profiles', 'desktop')
    await mkdir(join(root, 'sources', 'dsh'), { recursive: true })
    await mkdir(profileDir, { recursive: true })
    await writeFile(join(profileDir, 'package.json'), `${JSON.stringify({
      name: 'dsh-profile-desktop',
      private: true,
      dependencies: { 'dsh-cost-meter': '1.5.36' },
      dsh: { profile: { bundles: [...CORE_BUNDLES, 'dsh-cost-meter'] } },
    }, null, 2)}\n`)
    await writeFile(join(profileDir, 'cordis.patch.yml'), '- id: user-setting\n  config: {}\n')
    await writeFile(join(profileDir, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nallowBuilds:\n  dsh-cost-meter: true\n')

    const result = await ensureDesktopProfile({
      dshHome: root,
      packageRoots: new Map([['@deepseek-ai/dsh', join(root, 'sources', 'dsh')]]),
    })
    const manifest = JSON.parse(await readFile(join(result.profileDir, 'package.json'), 'utf8'))
    const patch = await readFile(join(result.profileDir, 'cordis.patch.yml'), 'utf8')
    const desktopPatch = await readFile(result.desktopPatchPath, 'utf8')
    const workspace = await readFile(join(result.profileDir, 'pnpm-workspace.yaml'), 'utf8')

    assert.equal(manifest.dependencies['dsh-cost-meter'], '1.5.36')
    assert.deepEqual(manifest.dsh.profile.bundles, [...CORE_BUNDLES, 'dsh-cost-meter'])
    assert.equal(patch, '- id: user-setting\n  config: {}\n')
    assert.equal(desktopPatch, DESKTOP_PATCH_CONFIG)
    assert.match(workspace, /allowBuilds/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('removed extensions are not part of the managed runtime', () => {
  for (const packageName of REMOVED_EXTENSIONS) {
    assert.equal(CORE_RUNTIME_PACKAGES.includes(packageName), false, packageName)
  }
  assert.doesNotMatch(DESKTOP_PATCH_CONFIG, /dsh-market/u)
})

test('official runtime packages resolve from the installed DSH tree', () => {
  const resolved = resolveRuntimePackages()
  assert.deepEqual([...resolved.keys()], [...resolved.keys()].toSorted())
  for (const packageName of CORE_RUNTIME_PACKAGES) {
    assert.equal(resolved.has(packageName), true, `missing ${packageName}`)
  }
  assert.match(resolveDshCliPath(), /[\\/]lib[\\/]bin\.js$/u)
})

test('profile bootstrap removes stale extension links but preserves real directories', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-core-profile-'))
  try {
    const sourceRoot = join(root, 'sources')
    const coreSource = join(sourceRoot, 'core')
    const staleSource = join(sourceRoot, 'stale')
    await mkdir(coreSource, { recursive: true })
    await mkdir(staleSource, { recursive: true })
    const profileModules = join(root, 'profiles', 'desktop', 'node_modules')
    const stalePackage = join(profileModules, '@linxin666', 'dsh-web-ui-all')
    const staleUnscopedPackage = join(profileModules, 'dshmarket')
    const ordinaryDirectory = join(profileModules, '@tencent-connect', 'local-data')
    await mkdir(dirname(ordinaryDirectory), { recursive: true })
    await mkdir(ordinaryDirectory)
    const linkType = process.platform === 'win32' ? 'junction' : 'dir'
    await mkdir(dirname(stalePackage), { recursive: true })
    await symlink(staleSource, stalePackage, linkType)
    await symlink(staleSource, staleUnscopedPackage, linkType)

    const result = await ensureDesktopProfile({
      dshHome: root,
      packageRoots: new Map([['@deepseek-ai/dsh', coreSource]]),
    })
    const manifest = JSON.parse(await readFile(join(result.profileDir, 'package.json'), 'utf8'))
    const patch = await readFile(join(result.profileDir, 'cordis.patch.yml'), 'utf8')
    assert.deepEqual(manifest.dsh.profile.bundles, CORE_BUNDLES)
    for (const packageName of REMOVED_EXTENSIONS) {
      assert.equal(manifest.dependencies[packageName], undefined, packageName)
    }
    assert.doesNotMatch(patch, /im-qqbot|dsh-market/u)
    await assert.rejects(access(stalePackage), /ENOENT/u)
    await assert.rejects(access(staleUnscopedPackage), /ENOENT/u)
    await assert.doesNotReject(access(ordinaryDirectory))
    await assert.doesNotReject(access(join(result.profileDir, 'node_modules', '@deepseek-ai', 'dsh')))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('path helpers keep packaged runtime paths physical', () => {
  assert.equal(
    materializeFilesystemPath('C:\\app\\resources\\app.asar\\node_modules\\pkg'),
    'C:\\app\\resources\\app.asar.unpacked\\node_modules\\pkg',
  )
  assert.deepEqual(packagePathSegments('@deepseek-ai/dsh'), ['@deepseek-ai', 'dsh'])
  assert.throws(() => packagePathSegments('../escape'), /package name/u)
})
