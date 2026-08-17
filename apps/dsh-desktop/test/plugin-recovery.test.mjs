import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { PluginManager } from '../src/extensions/plugins.mjs'
import { DesktopPluginRecovery, PluginRecoveryStore, classifyPluginFailure } from '../src/plugin-recovery.mjs'
import { BUILTIN_BUNDLES } from '../src/profile.mjs'

test('plugin failure classifier identifies a missing dependency through a Unicode Windows path', () => {
  const result = classifyPluginFailure([
    "Cannot find package 'schemastery'",
    'imported from D:\\工作区\\桌面配置\\node_modules\\@nonamelego\\dsh-catppuccin\\lib\\index.js',
  ].join('\n'), {
    activePlugins: ['@nonamelego/dsh-catppuccin'],
    protectedPlugins: BUILTIN_BUNDLES,
  })

  assert.equal(result.identified, true)
  assert.equal(result.pluginName, '@nonamelego/dsh-catppuccin')
  assert.equal(result.reasonCode, 'missing-dependency')
  assert.match(result.summary, /schemastery/u)
})

test('plugin failure classifier reports conflicts and never isolates protected built-ins', () => {
  const conflict = classifyPluginFailure(
    "Failed to load plugin 'dsh-vision-router': vision_crop already registered by x6",
    { activePlugins: ['dsh-vision-router', 'x6'] },
  )
  assert.equal(conflict.pluginName, 'dsh-vision-router')
  assert.equal(conflict.reasonCode, 'capability-conflict')
  assert.match(conflict.summary, /vision_crop/u)

  const protectedFailure = classifyPluginFailure(
    'failed to import loader entry shell (@deepseek-ai/dsh-shell)',
    {
      activePlugins: ['@deepseek-ai/dsh-shell'],
      protectedPlugins: ['@deepseek-ai/dsh-shell'],
    },
  )
  assert.equal(protectedFailure.identified, false)
})

test('plugin recovery store deduplicates snapshots and retains only the latest three', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-plugin-recovery-'))
  const profileDir = join(root, 'profile')
  const stateDir = join(root, 'recovery')
  const manifestPath = join(profileDir, 'package.json')
  try {
    await mkdir(profileDir, { recursive: true })
    const store = new PluginRecoveryStore({
      profileDir,
      stateDir,
      builtInBundles: BUILTIN_BUNDLES,
      now: (() => {
        let minute = 0
        return () => new Date(`2026-08-17T00:${String(minute++).padStart(2, '0')}:00.000Z`)
      })(),
    })
    const writeProfile = async (version) => writeFile(manifestPath, `${JSON.stringify({
      name: 'dsh-profile-desktop',
      dependencies: { '@community/example': version },
      dsh: { profile: { bundles: [...BUILTIN_BUNDLES, '@community/example'] } },
    }, null, 2)}\n`)

    await writeProfile('1.0.0')
    const first = await store.captureSnapshot({ kind: 'last-known-good' })
    const duplicate = await store.captureSnapshot({ kind: 'before-mutation' })
    assert.equal(duplicate.id, first.id)
    for (const version of ['2.0.0', '3.0.0', '4.0.0']) {
      await writeProfile(version)
      await store.captureSnapshot({ kind: 'before-mutation', label: version })
    }

    const state = await store.getState()
    assert.equal(state.snapshots.length, 3)
    assert.deepEqual(state.snapshots.map((item) => item.label), ['4.0.0', '3.0.0', '2.0.0'])
    await assert.rejects(readFile(join(stateDir, 'snapshots', first.id, 'package.json'), 'utf8'), /ENOENT/u)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('plugin recovery store preserves incidents and snapshot contents across restarts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-plugin-recovery-state-'))
  const profileDir = join(root, 'profile')
  const stateDir = join(root, 'recovery')
  try {
    await mkdir(profileDir, { recursive: true })
    const manifest = {
      name: 'dsh-profile-desktop',
      dependencies: { '@community/example': '1.0.0' },
      dsh: { profile: { bundles: [...BUILTIN_BUNDLES, '@community/example'] } },
    }
    await writeFile(join(profileDir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    await writeFile(join(profileDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    const store = new PluginRecoveryStore({ profileDir, stateDir, builtInBundles: BUILTIN_BUNDLES })
    const snapshot = await store.captureSnapshot({ kind: 'last-known-good', label: '可用配置' })
    const incident = await store.recordIncident({
      identified: true,
      pluginName: '@community/example',
      reasonCode: 'missing-dependency',
      summary: '缺少依赖',
      technicalDetails: 'Cannot find package',
    })
    await store.setSafeMode(true)

    const reopened = new PluginRecoveryStore({ profileDir, stateDir, builtInBundles: BUILTIN_BUNDLES })
    const state = await reopened.getState()
    assert.equal(state.safeMode, true)
    assert.equal(state.currentIncident.id, incident.id)
    assert.equal(state.currentIncident.pluginName, '@community/example')
    assert.deepEqual(await reopened.readSnapshot(snapshot.id), {
      manifest: `${JSON.stringify(manifest, null, 2)}\n`,
      lock: 'lockfileVersion: 9\n',
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('desktop plugin recovery isolates once and enters safe mode after the next failure', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-plugin-recovery-flow-'))
  const profileDir = join(root, 'profile')
  const packageName = '@community/broken'
  try {
    const packageRoot = join(profileDir, 'node_modules', ...packageName.split('/'))
    await mkdir(packageRoot, { recursive: true })
    await writeFile(join(profileDir, 'package.json'), `${JSON.stringify({
      name: 'dsh-profile-desktop',
      dependencies: { [packageName]: '1.0.0' },
      dsh: { profile: { bundles: [...BUILTIN_BUNDLES, packageName] } },
    }, null, 2)}\n`)
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify({
      name: packageName,
      version: '1.0.0',
      dsh: { bundle: { patch: './cordis.patch.yml' } },
    }))
    const store = new PluginRecoveryStore({
      profileDir,
      stateDir: join(root, 'recovery'),
      builtInBundles: BUILTIN_BUNDLES,
    })
    const pluginManager = new PluginManager({
      profileDir,
      pnpmCli: 'pnpm.mjs',
      runner: async () => {},
      beforeMutation: (event) => store.captureSnapshot({ kind: 'before-mutation', label: event.type }),
    })
    const controller = new EventEmitter()
    controller.status = { state: 'starting' }
    controller.stop = async () => {
      controller.status = { state: 'stopped' }
      controller.emit('status', controller.status)
    }
    let starts = 0
    controller.start = async () => {
      starts += 1
      controller.status = { state: 'starting' }
      controller.emit('status', controller.status)
      if (starts === 1) {
        controller.status = { state: 'crashed', error: 'another startup failure' }
        controller.emit('status', controller.status)
        throw new Error('another startup failure')
      }
      controller.status = { state: 'ready', url: 'http://127.0.0.1:1234/' }
      controller.emit('status', controller.status)
      return controller.status.url
    }
    const recovery = new DesktopPluginRecovery({
      controller,
      pluginManager,
      store,
      ensureProfile: async () => {},
      builtInBundles: BUILTIN_BUNDLES,
      schedule: () => ({ unref() {} }),
      cancelSchedule: () => {},
    })
    await recovery.initialize()
    controller.emit('line', {
      stream: 'stderr',
      line: `failed to import loader entry broken (${packageName})`,
    })
    controller.status = { state: 'crashed', error: 'runtime exited before readiness' }
    controller.emit('status', controller.status)

    for (let attempt = 0; attempt < 100; attempt += 1) {
      if ((await recovery.getState()).safeMode) break
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    const state = await recovery.getState()
    const manifest = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8'))
    assert.equal(starts, 2)
    assert.equal(state.safeMode, true)
    assert.equal(state.currentIncident.pluginName, packageName)
    assert.equal(state.currentIncident.resolution, 'auto-disabled')
    assert.deepEqual(manifest.dsh.profile.bundles, BUILTIN_BUNDLES)
    assert.equal(manifest.dependencies[packageName], undefined)
    assert.equal(state.disabledPlugins.includes(packageName), true)
    assert.equal(JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')).name, packageName)
    await recovery.dispose()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
