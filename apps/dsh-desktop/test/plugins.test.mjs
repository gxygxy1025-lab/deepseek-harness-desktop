import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { BUILTIN_BUNDLES } from '../src/profile.mjs'
import { createHostCompatibility } from '../src/extensions/plugin-compatibility.mjs'
import { PluginManager, createPluginInventory, validatePluginSpec } from '../src/extensions/plugins.mjs'

const hostCompatibility = createHostCompatibility({
  desktopVersion: '0.1.9',
  nodeVersion: '24.11.1',
  runtimeVersion: '0.1.0-rc.6',
  packages: { '@deepseek-ai/cordis': '4.0.1' },
})

test('plugin spec validation accepts registry packages and rejects command or URL input', () => {
  assert.deepEqual(validatePluginSpec('@community/example@1.2.3'), {
    name: '@community/example',
    spec: '@community/example@1.2.3',
  })
  assert.deepEqual(validatePluginSpec('example@latest'), { name: 'example', spec: 'example@latest' })
  for (const value of ['--global', 'https://example.com/plugin.tgz', 'example;calc', '../plugin', '']) {
    assert.throws(() => validatePluginSpec(value), /plugin package spec/)
  }
})

test('plugin inventory distinguishes protected built-ins from community bundles', () => {
  const inventory = createPluginInventory({
    dependencies: {
      '@linxin666/dsh-web-ui-all': 'link:C:/runtime',
      '@community/example': '1.2.3',
    },
    dsh: { profile: { bundles: [...BUILTIN_BUNDLES, '@community/example'] } },
  }, {
    hostCompatibility,
    installedManifests: new Map([
      ['@linxin666/dsh-web-ui-all', { name: '@linxin666/dsh-web-ui-all', version: '0.1.15' }],
      ['@community/example', {
        name: '@community/example',
        version: '1.2.3',
        dsh: { bundle: { patch: './cordis.patch.yml' } },
        peerDependencies: { '@deepseek-ai/cordis': '^4.0.1' },
      }],
    ]),
  })
  const builtIn = inventory.find((item) => item.name === '@linxin666/dsh-web-ui-all')
  const community = inventory.find((item) => item.name === '@community/example')
  assert.equal(builtIn.builtIn, true)
  assert.equal(builtIn.version, '0.1.15')
  assert.equal(builtIn.compatibility.status, 'compatible')
  assert.equal(community.enabled, true)
  assert.equal(community.version, '1.2.3')
  assert.equal(community.compatibility.status, 'compatible')
})

test('plugin manager lazily checks only community updates and assesses candidates', async () => {
  const profileDir = await mkdtemp(join(tmpdir(), 'dsh-desktop-plugin-updates-'))
  const checkedNames = []
  try {
    await writeFile(join(profileDir, 'package.json'), JSON.stringify({
      name: 'dsh-profile-desktop',
      private: true,
      dependencies: {
        '@linxin666/dsh-web-ui-all': 'link:C:/runtime',
        '@community/example': '1.2.3',
      },
      dsh: { profile: { bundles: [...BUILTIN_BUNDLES, '@community/example'] } },
    }))
    for (const [name, packageManifest] of [
      ['@linxin666/dsh-web-ui-all', { name: '@linxin666/dsh-web-ui-all', version: '0.1.15' }],
      ['@community/example', {
        name: '@community/example',
        version: '1.2.3',
        dsh: { bundle: { patch: './cordis.patch.yml' } },
        peerDependencies: { '@deepseek-ai/cordis': '^4.0.1' },
      }],
    ]) {
      const packageRoot = join(profileDir, 'node_modules', ...name.split('/'))
      await mkdir(packageRoot, { recursive: true })
      await writeFile(join(packageRoot, 'package.json'), JSON.stringify(packageManifest))
    }
    const registry = {
      check: async (names) => {
        checkedNames.push(...names)
        return names.map((name) => ({
          name,
          manifest: {
            name,
            version: '1.3.0',
            dsh: { bundle: { patch: './cordis.patch.yml' } },
            peerDependencies: { '@deepseek-ai/cordis': '^4.0.1' },
          },
        }))
      },
    }
    const manager = new PluginManager({ profileDir, registry, hostCompatibility, pnpmCli: 'pnpm.mjs' })
    const inventory = await manager.checkUpdates()
    assert.deepEqual(checkedNames, ['@community/example'])
    const builtIn = inventory.find((item) => item.name === '@linxin666/dsh-web-ui-all')
    const community = inventory.find((item) => item.name === '@community/example')
    assert.equal(builtIn.latestVersion, undefined)
    assert.equal(community.latestVersion, '1.3.0')
    assert.equal(community.updateAvailable, true)
    assert.equal(community.updateCompatibility.status, 'compatible')
  } finally {
    await rm(profileDir, { recursive: true, force: true })
  }
})

test('candidate preparation preloads exact compatible versions and guards unknown updates', async () => {
  const profileDir = await mkdtemp(join(tmpdir(), 'dsh-desktop-plugin-prepare-'))
  const calls = []
  let candidate = {
    name: '@community/example',
    version: '2.0.0',
    dsh: { bundle: { patch: './cordis.patch.yml' } },
    peerDependencies: { '@deepseek-ai/cordis': '^4.0.1' },
  }
  try {
    await writeFile(join(profileDir, 'package.json'), JSON.stringify({
      name: 'dsh-profile-desktop',
      private: true,
      dependencies: {},
      dsh: { profile: { bundles: [...BUILTIN_BUNDLES] } },
    }))
    const manager = new PluginManager({
      profileDir,
      hostCompatibility,
      pnpmCli: 'pnpm.mjs',
      registry: { fetchManifest: async () => candidate },
      runner: async (options) => { calls.push(options.args) },
    })
    const prepared = await manager.prepare('@community/example@latest')
    assert.equal(prepared.spec, '@community/example@2.0.0')
    assert.equal(prepared.compatibility.status, 'compatible')
    assert.deepEqual(calls, [['store', 'add', '@community/example@2.0.0']])

    candidate = {
      ...candidate,
      version: '2.1.0',
      peerDependencies: undefined,
    }
    await assert.rejects(manager.prepare('@community/example@latest'), /does not declare desktop compatibility/u)
    await manager.prepare('@community/example@latest', { allowUnknown: true })

    candidate = {
      ...candidate,
      version: '3.0.0',
      engines: { node: '>=25' },
    }
    await assert.rejects(
      manager.prepare('@community/example@latest', { allowUnknown: true }),
      /incompatible/u,
    )
    assert.equal(calls.length, 2)
    await assert.rejects(manager.prepare('@linxin666/dsh-web-ui-all@latest'), /built-in/u)
  } finally {
    await rm(profileDir, { recursive: true, force: true })
  }
})

test('plugin manager serializes installs and protects built-ins', async () => {
  const profileDir = await mkdtemp(join(tmpdir(), 'dsh-desktop-plugins-'))
  let active = 0
  let maxActive = 0
  try {
    await writeFile(join(profileDir, 'package.json'), JSON.stringify({
      name: 'dsh-profile-desktop',
      private: true,
      dependencies: {},
      dsh: { profile: { bundles: [...BUILTIN_BUNDLES] } },
    }))
    const runner = async ({ args }) => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 10))
      const { name } = validatePluginSpec(args[1])
      const packageRoot = join(profileDir, 'node_modules', ...name.split('/'))
      await mkdir(packageRoot, { recursive: true })
      await writeFile(join(packageRoot, 'package.json'), JSON.stringify({
        name,
        version: '1.0.0',
        dsh: { bundle: { patch: './cordis.patch.yml' } },
      }))
      const manifest = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8'))
      manifest.dependencies[name] = '1.0.0'
      await writeFile(join(profileDir, 'package.json'), JSON.stringify(manifest))
      active -= 1
    }
    const manager = new PluginManager({ profileDir, runner, pnpmCli: 'pnpm.mjs' })
    await assert.rejects(manager.remove('@linxin666/dsh-web-ui-all'), /built-in/)
    await Promise.all([
      manager.install('@community/first@1.0.0'),
      manager.install('@community/second@1.0.0'),
    ])
    assert.equal(maxActive, 1)
    const manifest = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8'))
    assert.ok(manifest.dsh.profile.bundles.includes('@community/first'))
    assert.ok(manifest.dsh.profile.bundles.includes('@community/second'))
  } finally {
    await rm(profileDir, { recursive: true, force: true })
  }
})
