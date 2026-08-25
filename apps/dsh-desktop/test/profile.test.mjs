import assert from 'node:assert/strict'
import { access, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import {
  BUILTIN_BUNDLES,
  CORE_RUNTIME_PACKAGES,
  DESKTOP_PATCH_CONFIG,
  DESKTOP_PATCH_END,
  createDesktopProfileManifest,
  ensureDesktopProfile,
  materializeFilesystemPath,
  packagePathSegments,
  removeManagedDesktopPatch,
  resolveDshCliPath,
  resolveDshRuntimeVersion,
  resolvePnpmCliPath,
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

test('desktop profile preserves unknown manifest fields while updating managed fields', () => {
  assert.deepEqual(
    createDesktopProfileManifest({
      scripts: { postinstall: 'custom-script' },
      dependencies: { '@community/example': '1.2.3' },
      dsh: { custom: { enabled: true }, profile: { extra: true, bundles: ['@community/example'] } },
    }),
    {
      scripts: { postinstall: 'custom-script' },
      name: 'dsh-profile-desktop',
      private: true,
      dependencies: { '@community/example': '1.2.3' },
      dsh: {
        custom: { enabled: true },
        profile: { extra: true, bundles: [...CORE_BUNDLES, '@community/example'] },
      },
    },
  )
})

test('desktop profile rejects valid JSON with an invalid manifest shape', () => {
  assert.throws(() => createDesktopProfileManifest([]), /must be a JSON object/u)
  assert.throws(() => createDesktopProfileManifest({ dependencies: [] }), /dependencies must be a JSON object/u)
  assert.throws(() => createDesktopProfileManifest({ dsh: { profile: { bundles: {} } } }), /bundles must be an array/u)
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
    const manifestBackup = JSON.parse(await readFile(join(result.profileDir, 'package.json.bak'), 'utf8'))
    const patch = await readFile(join(result.profileDir, 'cordis.patch.yml'), 'utf8')
    const desktopPatch = await readFile(result.desktopPatchPath, 'utf8')
    const workspace = await readFile(join(result.profileDir, 'pnpm-workspace.yaml'), 'utf8')

    assert.equal(manifest.dependencies['dsh-cost-meter'], '1.5.36')
    assert.equal(manifestBackup.dependencies['dsh-cost-meter'], '1.5.36')
    assert.deepEqual(manifest.dsh.profile.bundles, [...CORE_BUNDLES, 'dsh-cost-meter'])
    assert.equal(patch, '- id: user-setting\n  config: {}\n')
    assert.equal(desktopPatch, DESKTOP_PATCH_CONFIG)
    assert.match(workspace, /allowBuilds/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('profile bootstrap reuses an existing official package link and coalesces concurrent calls', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-profile-link-race-'))
  try {
    const sourceDir = join(root, 'sources', 'cordis-plugin-group')
    const target = join(root, 'profiles', 'desktop', 'node_modules', '@deepseek-ai', 'cordis-plugin-group')
    await mkdir(sourceDir, { recursive: true })
    await mkdir(dirname(target), { recursive: true })
    await symlink(sourceDir, target, process.platform === 'win32' ? 'junction' : 'dir')

    const options = {
      dshHome: root,
      packageRoots: new Map([['@deepseek-ai/cordis-plugin-group', sourceDir]]),
    }
    const results = await Promise.all([
      ensureDesktopProfile(options),
      ensureDesktopProfile(options),
    ])

    assert.equal(await realpath(target), await realpath(sourceDir))
    assert.equal(results[0].profileDir, results[1].profileDir)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('profile bootstrap refuses to overwrite a malformed manifest', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-invalid-profile-'))
  try {
    const profileDir = join(root, 'profiles', 'desktop')
    const manifestPath = join(profileDir, 'package.json')
    await mkdir(profileDir, { recursive: true })
    const malformed = '{"dependencies":'
    await writeFile(manifestPath, malformed)

    await assert.rejects(
      ensureDesktopProfile({
        dshHome: root,
        packageRoots: new Map(),
      }),
      (error) => error?.code === 'desktop-profile-bootstrap-invalid',
    )
    assert.equal(await readFile(manifestPath, 'utf8'), malformed)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('profile bootstrap identifies a valid JSON manifest with an invalid schema', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-invalid-schema-'))
  try {
    const manifestPath = join(root, 'profiles', 'desktop', 'package.json')
    await mkdir(dirname(manifestPath), { recursive: true })
    await writeFile(manifestPath, '{"dependencies":[]}\n')

    await assert.rejects(
      ensureDesktopProfile({ dshHome: root, packageRoots: new Map() }),
      (error) => error?.code === 'desktop-profile-bootstrap-invalid'
        && /invalid schema/u.test(error.message),
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('legacy desktop patch blocks migrate without deleting user patch content', () => {
  const source = `- id: before\n  config: {}\n${DESKTOP_PATCH_CONFIG}- id: after\n  config: {}\n`
  assert.equal(
    removeManagedDesktopPatch(source),
    '- id: before\n  config: {}\n- id: after\n  config: {}\n',
  )
  assert.throws(
    () => removeManagedDesktopPatch(DESKTOP_PATCH_CONFIG.replace(DESKTOP_PATCH_END, '')),
    (error) => error?.code === 'desktop-profile-bootstrap-invalid',
  )
  const multiple = `${DESKTOP_PATCH_CONFIG}- id: user\n  config: {}\n${DESKTOP_PATCH_CONFIG}`
  assert.equal(removeManagedDesktopPatch(multiple), '- id: user\n  config: {}\n')
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
  assert.match(resolveDshRuntimeVersion(), /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u)
  assert.match(resolvePnpmCliPath(), /[\\/]pnpm[\\/]bin[\\/]pnpm\.cjs$/u)
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
