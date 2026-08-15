import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import {
  AGGREGATED_BUNDLES,
  BUILTIN_BUNDLES,
  DESKTOP_PATCH_CONFIG,
  DESKTOP_SUPPORT_PACKAGES,
  MANAGED_RUNTIME_PACKAGES,
  createDesktopProfileManifest,
  ensureDesktopProfile,
  mergeDesktopPatch,
  materializeFilesystemPath,
  packagePathSegments,
  resolveRuntimePackages,
  resolveDshCliPath,
} from '../src/profile.mjs'

test('packaged paths point at physical asar-unpacked files', () => {
  assert.equal(
    materializeFilesystemPath('C:\\app\\resources\\app.asar\\node_modules\\pkg'),
    'C:\\app\\resources\\app.asar.unpacked\\node_modules\\pkg',
  )
  assert.equal(materializeFilesystemPath('C:\\workspace\\node_modules\\pkg'), 'C:\\workspace\\node_modules\\pkg')
})

test('package path validation accepts NPM names and rejects path input', () => {
  assert.deepEqual(packagePathSegments('@deepseek-ai/dsh-pet'), ['@deepseek-ai', 'dsh-pet'])
  assert.deepEqual(packagePathSegments('plain-package'), ['plain-package'])
  for (const value of ['', '../escape', '@scope', '@scope/pkg/extra', 'file:package']) {
    assert.throws(() => packagePathSegments(value), /package name/)
  }
})

test('profile manifest preserves community bundles after managed bundles', () => {
  const manifest = createDesktopProfileManifest({
    dependencies: { '@community/example': '1.2.3' },
    dsh: { profile: { bundles: ['@community/example', '@deepseek-ai/dsh-base'] } },
  })

  assert.deepEqual(manifest.dsh.profile.bundles, [...BUILTIN_BUNDLES, '@community/example'])
  assert.equal(manifest.dependencies['@community/example'], '1.2.3')
  assert.equal(manifest.name, 'dsh-profile-desktop')
})

test('profile manifest removes bundles already supplied by the web UI aggregate', () => {
  const manifest = createDesktopProfileManifest({
    dependencies: {
      '@community/example': '1.2.3',
      '@linxin666/dsh-client-ui-aionui-panel': '0.1.2',
    },
    dsh: {
      profile: {
        bundles: [
          '@linxin666/dsh-client-ui-aionui-panel',
          '@linxin666/dsh-client-ui-git-graph',
          '@linxin666/dsh-client-ui-task-board',
          '@linxin666/dsh-client-ui-skin-center',
          '@linxin666/dsh-skins',
          '@community/example',
        ],
      },
    },
  })

  assert.deepEqual(manifest.dsh.profile.bundles, [...BUILTIN_BUNDLES, '@community/example'])
  assert.equal(manifest.dependencies['@linxin666/dsh-client-ui-aionui-panel'], '0.1.2')
  assert.equal(AGGREGATED_BUNDLES.includes('@linxin666/dsh-client-ui-aionui-panel'), true)
  assert.equal(AGGREGATED_BUNDLES.includes('@linxin666/dsh-client-ui-git-graph'), true)
  assert.equal(AGGREGATED_BUNDLES.includes('@linxin666/dsh-client-ui-skin-center'), true)
})

test('desktop profile includes both bundled plugin stores', () => {
  assert.equal(BUILTIN_BUNDLES.includes('dshmarket'), true)
  assert.equal(BUILTIN_BUNDLES.includes('dsh-plugin-hub'), true)
  assert.equal(MANAGED_RUNTIME_PACKAGES.includes('dshmarket'), true)
  assert.equal(MANAGED_RUNTIME_PACKAGES.includes('dsh-plugin-hub'), true)
  assert.match(DESKTOP_PATCH_CONFIG, /id: dsh-market[\s\S]*profile: desktop/)
})

test('desktop profile includes the official QQ Bot bundle', () => {
  assert.equal(BUILTIN_BUNDLES.includes('@tencent-connect/dsh-qqbot'), true)
  assert.equal(MANAGED_RUNTIME_PACKAGES.includes('@tencent-connect/dsh-qqbot'), true)
})

test('desktop patch refresh preserves skin and community-owned sections', () => {
  const skinSection = '# --- dsh-skin managed (auto-generated; do not edit) ---\n- id: ui-skin-qq98\n# --- end dsh-skin managed ---'
  const communityRow = "- id: community\n  name: '@community/plugin'"
  const merged = mergeDesktopPatch(`${DESKTOP_PATCH_CONFIG}\n${skinSection}\n${communityRow}\n`)
  assert.equal(merged.match(/dsh-desktop managed/gu)?.length, 2)
  assert.match(merged, /ui-skin-qq98/u)
  assert.match(merged, /@community\/plugin/u)
  assert.equal(mergeDesktopPatch(merged), merged)
})

test('profile bootstrap is idempotent and links every managed package', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-profile-'))
  const dshHome = join(root, 'home')
  const sourceRoot = join(root, 'packages')
  const packageRoots = new Map()

  for (const packageName of ['@linxin666/dsh-web-ui-all', '@linxin666/dsh-pet']) {
    const packageRoot = join(sourceRoot, ...packagePathSegments(packageName))
    await mkdir(packageRoot, { recursive: true })
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify({ name: packageName, version: '1.0.0' }))
    packageRoots.set(packageName, packageRoot)
  }

  const first = await ensureDesktopProfile({ dshHome, packageRoots })
  const firstPatch = await readFile(join(first.profileDir, 'cordis.patch.yml'), 'utf8')
  await writeFile(join(first.profileDir, 'cordis.patch.yml'), `${firstPatch}\n- id: retained\n`)
  const second = await ensureDesktopProfile({ dshHome, packageRoots })
  const third = await ensureDesktopProfile({ dshHome, packageRoots })
  assert.equal(first.profileDir, second.profileDir)
  assert.equal(second.changed, true)
  assert.equal(third.changed, false)

  const manifest = JSON.parse(await readFile(join(first.profileDir, 'package.json'), 'utf8'))
  assert.deepEqual(manifest.dsh.profile.bundles, BUILTIN_BUNDLES)
  const retainedPatch = await readFile(join(first.profileDir, 'cordis.patch.yml'), 'utf8')
  assert.match(retainedPatch, /id: im-qqbot\n  disabled: true/u)
  assert.match(retainedPatch, /- id: retained/u)
  for (const [packageName, source] of packageRoots) {
    const linked = join(first.profileDir, 'node_modules', ...packagePathSegments(packageName))
    assert.equal(await realpath(linked), await realpath(source))
  }
})

test('runtime resolver finds every bundled and desktop support package', () => {
  const resolved = resolveRuntimePackages()
  assert.deepEqual([...resolved.keys()], [...resolved.keys()].toSorted())
  for (const packageName of MANAGED_RUNTIME_PACKAGES) {
    assert.equal(resolved.has(packageName), true, `missing ${packageName}`)
  }
  assert.deepEqual(DESKTOP_SUPPORT_PACKAGES, [
    '@deepseek-ai/dsh-client-ui-directory-picker-browse',
    '@deepseek-ai/dsh-host-directory-picker-browse',
  ])
})

test('official DSH CLI composes the isolated desktop profile', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-compose-'))
  try {
    await ensureDesktopProfile({ dshHome: root })
    const result = spawnSync(
      process.execPath,
      [resolveDshCliPath(), '--profile', 'desktop', '--dump-config'],
      {
        encoding: 'utf8',
        env: { ...process.env, DSH_HOME: root },
        timeout: 20_000,
      },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /ui-task-board/)
    assert.match(result.stdout, /ui-mode-switcher/)
    assert.match(result.stdout, /ui-skin-center/)
    assert.match(result.stdout, /- id: pet/)
    assert.match(result.stdout, /- id: remote-web-ui/)
    assert.match(result.stdout, /- id: live-stats/)
    assert.match(result.stdout, /directory-picker-desktop-host/)
    assert.match(result.stdout, /dsh-host-directory-picker-browse/)
    assert.match(result.stdout, /directory-picker-desktop-client/)
    assert.match(result.stdout, /dsh-client-ui-directory-picker-browse/)
    assert.match(result.stdout, /- id: dsh-market/)
    assert.match(result.stdout, /profile: desktop/)
    assert.match(result.stdout, /- id: dsh-plugin-hub/)
    assert.match(result.stdout, /- id: im-qqbot[\s\S]*?disabled: true/)
    assert.doesNotMatch(result.stdout, /dsh-host-directory-picker-native/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
