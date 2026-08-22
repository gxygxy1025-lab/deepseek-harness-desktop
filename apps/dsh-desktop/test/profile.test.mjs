import assert from 'node:assert/strict'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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

test('core profile contains only the official DSH bundles', () => {
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
      dependencies: {},
      dsh: { profile: { bundles: [...CORE_BUNDLES] } },
    },
  )
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

test('profile bootstrap writes a clean core profile and removes extension links', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-core-profile-'))
  try {
    const result = await ensureDesktopProfile({ dshHome: root })
    const manifest = JSON.parse(await readFile(join(result.profileDir, 'package.json'), 'utf8'))
    const patch = await readFile(join(result.profileDir, 'cordis.patch.yml'), 'utf8')
    assert.deepEqual(manifest.dsh.profile.bundles, CORE_BUNDLES)
    for (const packageName of REMOVED_EXTENSIONS) {
      assert.equal(manifest.dependencies[packageName], undefined, packageName)
    }
    assert.doesNotMatch(patch, /im-qqbot|dsh-market/u)
    await assert.rejects(access(join(result.profileDir, 'node_modules', '@linxin666')), /ENOENT/u)
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
