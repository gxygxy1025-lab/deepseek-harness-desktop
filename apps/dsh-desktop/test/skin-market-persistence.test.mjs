import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

const require = createRequire(import.meta.url)
const marketRoot = dirname(require.resolve('dshmarket/package.json'))
const { createThemeManager } = await import(pathToFileURL(join(marketRoot, 'lib', 'themes.js')).href)
const { mountMarketRoutes } = await import(pathToFileURL(join(marketRoot, 'lib', 'routes.js')).href)
const { forgetCatalog } = await import(pathToFileURL(join(marketRoot, 'lib', 'registry.js')).href)
const { entryArtifactExists, readInstalled } = await import(pathToFileURL(join(marketRoot, 'lib', 'profile.js')).href)
const { verifyActivation } = await import(pathToFileURL(join(marketRoot, 'lib', 'verify.js')).href)
const desktopCompatRoot = dirname(require.resolve('@linxin666/dsh-desktop-compat/package.json'))
const { DesktopSkinStateStore, SKIN_STATE_END, SKIN_STATE_START } = await import(pathToFileURL(join(desktopCompatRoot, 'lib', 'index.js')).href)

const aggregateRequire = createRequire(require.resolve('@linxin666/dsh-web-ui-all/package.json'))
const skinCenterRoot = dirname(aggregateRequire.resolve('@linxin666/dsh-client-ui-skin-center/package.json'))
const { makeSkinCenterV2Routes, SKIN_CENTER_V2_PREFIX } = await import(pathToFileURL(join(skinCenterRoot, 'lib', 'index.js')).href)

test('desktop market persists a successful bundle theme switch in the desktop profile', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-market-theme-'))
  const profileDir = join(home, 'profiles', 'desktop')
  mkdirSync(profileDir, { recursive: true })
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
    dependencies: { 'dsh-liquid-glass': '1.0.0', 'dsh-dream-skin': '1.0.0' },
  }))
  for (const [name, id] of [['dsh-liquid-glass', 'liquid-glass'], ['dsh-dream-skin', 'dream-skin']]) {
    const packageDir = join(profileDir, 'node_modules', name)
    mkdirSync(packageDir, { recursive: true })
    writeFileSync(join(packageDir, 'cordis.patch.yml'), `- insert:\n    - id: ${id}\n      name: '${name}'\n`)
  }
  const events = []
  const entries = [
    fakeEntry('liquid-glass', 'dsh-liquid-glass', false, events),
    fakeEntry('dream-skin', 'dsh-dream-skin', true, events),
  ]
  const store = new DesktopSkinStateStore(home, 'desktop')
  const persistence = {
    activateBundleTheme(...args) {
      events.push('persist')
      store.activateBundleTheme(...args)
    },
    disabledNames(...args) { return store.disabledNames(...args) },
  }
  const originalFetch = globalThis.fetch
  const proxyEnvironment = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']
    .map((key) => [key, process.env[key]])
  for (const [key] of proxyEnvironment) process.env[key] = ''
  forgetCatalog()
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => ({
      plugins: [
        { name: 'dsh-liquid-glass', category: 'theme', url: 'https://github.com/example/liquid-glass' },
        { name: 'dsh-dream-skin', category: 'theme', url: 'https://github.com/example/dream-skin' },
      ],
    }),
  })
  writeFileSync(join(home, 'skin-center-active.json'), JSON.stringify({ active: 'official-skin-v2' }))
  try {
    const manager = createThemeManager(fakeHost(entries), 'desktop', new Set(), profileDir, persistence)
    assert.equal(await manager.activateTheme('dsh-liquid-glass'), true)
    assert.equal(entries[0].fiber !== undefined, true)
    assert.equal(entries[1].fiber, undefined)
    assert.equal(events[0], 'persist')
    const patch = readFileSync(join(profileDir, 'cordis.patch.yml'), 'utf8')
    assert.match(patch, new RegExp(SKIN_STATE_START.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')))
    assert.match(patch, /- id: liquid-glass\r?\n  disabled: false/u)
    assert.match(patch, /- id: dream-skin\r?\n  disabled: true/u)
    assert.throws(() => readFileSync(join(home, 'skin-center-active.json'), 'utf8'), /ENOENT/u)
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of proxyEnvironment) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    forgetCatalog()
    rmSync(home, { recursive: true, force: true })
  }
})

test('desktop market migrates legacy skin state without dropping generic market state', () => {
  const profileDir = mkdtempSync(join(tmpdir(), 'dsh-market-migrate-'))
  const stateDir = join(profileDir, '.dsh-market')
  mkdirSync(stateDir, { recursive: true })
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({ dependencies: {} }))
  writeFileSync(join(stateDir, 'state.json'), JSON.stringify({
    disabled: ['community-plugin'],
    disabledSkins: ['dsh-liquid-glass'],
    groups: {
      favorites: ['community-plugin'],
      themes: ['dsh-liquid-glass'],
    },
    groupOrder: ['favorites', 'themes'],
    channel: 'beta',
  }))
  const migrated = []
  let guardRegistrations = 0
  const host = {
    ...fakeHost([]),
    webServer: { register: () => () => {} },
    on: () => { guardRegistrations += 1; return () => {} },
  }
  const dispose = mountMarketRoutes(host, {
    profile: 'desktop',
    profileDirectory: profileDir,
    skinState: {
      migrateLegacy(names) { migrated.push(...names); return new Set(names) },
      activateBundleTheme() {},
      disabledNames() { return new Set() },
    },
  }, {
    runPlugin: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    probePnpm: async () => true,
    provisionPnpm: async () => ({ ok: true }),
    cancelActive: () => false,
  })
  try {
    assert.deepEqual(migrated, ['dsh-liquid-glass'])
    assert.equal(guardRegistrations, 1)
    assert.deepEqual(JSON.parse(readFileSync(join(stateDir, 'state.json'), 'utf8')), {
      disabled: ['community-plugin'],
      groups: {
        favorites: ['community-plugin'],
        themes: ['dsh-liquid-glass'],
      },
      groupOrder: ['favorites', 'themes'],
      channel: 'beta',
    })
  } finally {
    dispose()
    rmSync(profileDir, { recursive: true, force: true })
  }
})

test('desktop market retains unresolved legacy disables until lazy migration preserves state', () => {
  const profileDir = mkdtempSync(join(tmpdir(), 'dsh-market-legacy-fallback-'))
  const stateDir = join(profileDir, '.dsh-market')
  mkdirSync(stateDir, { recursive: true })
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({ dependencies: {} }))
  writeFileSync(join(stateDir, 'state.json'), JSON.stringify({
    disabled: ['community-plugin'],
    disabledSkins: ['dsh-legacy-theme'],
    groups: { favorites: ['community-plugin'] },
    groupOrder: ['favorites'],
    channel: 'beta',
  }))
  let canMigrate = false
  let guard
  const entries = []
  const host = {
    ...fakeHost(entries),
    webServer: { register: () => () => {} },
    on: (_event, callback) => { guard = callback; return () => {} },
  }
  const dispose = mountMarketRoutes(host, {
    profile: 'desktop',
    profileDirectory: profileDir,
    skinState: {
      migrateLegacy(names) { return canMigrate ? new Set(names) : new Set() },
      activateBundleTheme() {},
      disabledNames() { return new Set() },
    },
  }, {
    runPlugin: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    probePnpm: async () => true,
    provisionPnpm: async () => ({ ok: true }),
    cancelActive: () => false,
  })
  try {
    assert.equal(typeof guard, 'function')
    assert.deepEqual(JSON.parse(readFileSync(join(stateDir, 'state.json'), 'utf8')), {
      disabled: ['community-plugin'],
      disabledSkins: ['dsh-legacy-theme'],
      groups: { favorites: ['community-plugin'] },
      groupOrder: ['favorites'],
      channel: 'beta',
    })
    canMigrate = true
    guard({ entry: { options: { name: 'dsh-legacy-theme' } } })
    assert.deepEqual(JSON.parse(readFileSync(join(stateDir, 'state.json'), 'utf8')), {
      disabled: ['community-plugin'],
      groups: { favorites: ['community-plugin'] },
      groupOrder: ['favorites'],
      channel: 'beta',
    })
  } finally {
    dispose()
    rmSync(profileDir, { recursive: true, force: true })
  }
})

test('desktop market mounts with desktopPnpm alone and probes skin state optionally', () => {
  const source = readFileSync(join(marketRoot, 'lib', 'index.js'), 'utf8')
  assert.match(source, /inject\(\['desktopPnpm'\]/u)
  assert.doesNotMatch(source, /inject\(\['desktopPnpm',\s*'desktopSkinState'\]/u)
  assert.match(source, /desktopSkinState unavailable/u)
})

test('desktop market sends every profile mutation to the Extension Dock authority without optional skin state', async () => {
  const profileDir = mkdtempSync(join(tmpdir(), 'dsh-market-desktop-guard-'))
  const routes = new Map()
  let pluginRuns = 0
  let pnpmProbes = 0
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({ dependencies: {} }))
  const host = {
    ...fakeHost([]),
    webServer: {
      register(route) {
        routes.set(route.path, route.handler)
        return () => routes.delete(route.path)
      },
    },
  }
  const dispose = mountMarketRoutes(host, {
    profile: 'desktop',
    profileDirectory: profileDir,
  }, {
    runPlugin: async () => {
      pluginRuns += 1
      return { exitCode: 0, stdout: '', stderr: '' }
    },
    probePnpm: async () => {
      pnpmProbes += 1
      return true
    },
    provisionPnpm: async () => ({ ok: true }),
    cancelActive: () => false,
  })
  try {
    for (const path of [
      '/dsh-market/install',
      '/dsh-market/update',
      '/dsh-market/uninstall',
      '/dsh-market/self-uninstall',
      '/dsh-market/restore',
    ]) {
      const request = Readable.from([])
      request.method = 'POST'
      request.headers = {}
      const response = fakeResponse()
      await routes.get(path)(request, response)
      assert.equal(response.status, 409)
      assert.match(response.body, /desktop-plugin-manager-required/u)
      assert.match(response.body, /Extension Dock/u)
    }
    assert.equal(pluginRuns, 0)
    assert.equal(pnpmProbes, 0)
  } finally {
    dispose()
    rmSync(profileDir, { recursive: true, force: true })
  }
})

test('desktop market hides Desktop-managed dependencies from the installed plugin list', () => {
  const profileDir = mkdtempSync(join(tmpdir(), 'dsh-market-managed-inventory-'))
  try {
    writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
      dependencies: {
        '@deepseek-ai/dsh-base': '1.0.0',
        '@linxin666/dsh-particle-theme': 'link:C:/Desktop/resources/app.asar.unpacked/node_modules/@linxin666/dsh-particle-theme',
        'community-plugin': '2.0.0',
        schemastery: 'link:C:/Desktop/resources/app.asar.unpacked/node_modules/schemastery',
      },
    }))
    writeFileSync(join(profileDir, '.dsh-desktop-links.json'), JSON.stringify({
      '@linxin666/dsh-particle-theme': { mode: 'link', source: 'C:/Desktop/particle-theme' },
      schemastery: { mode: 'link', source: 'C:/Desktop/schemastery' },
    }))

    assert.deepEqual(readInstalled('desktop', profileDir), { 'community-plugin': '2.0.0' })
  } finally {
    rmSync(profileDir, { recursive: true, force: true })
  }
})

test('market accepts bundle-patch-only packages without claiming they omit dsh.bundle', () => {
  const profileDir = mkdtempSync(join(tmpdir(), 'dsh-market-patch-only-'))
  const packageName = 'dsh-assets-only'
  const packageDir = join(profileDir, 'node_modules', packageName)
  try {
    mkdirSync(packageDir, { recursive: true })
    writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
      dependencies: { [packageName]: '1.0.0' },
      dsh: { profile: { bundles: [] } },
    }))
    writeFileSync(join(packageDir, 'package.json'), JSON.stringify({
      name: packageName,
      version: '1.0.0',
      dsh: { bundle: { patch: './cordis.patch.yml' } },
    }))
    writeFileSync(join(packageDir, 'cordis.patch.yml'), `- insert:\n    - id: asset-only\n      name: '${packageName}'\n`)

    assert.equal(entryArtifactExists(packageDir), true)
    const activation = verifyActivation('desktop', packageName, new Set(), profileDir)
    assert.equal(activation.state, 'inert')
    assert.match(activation.reasons.join(' '), /已声明 dsh\.bundle/u)
    assert.doesNotMatch(activation.reasons.join(' '), /入口产物缺失|未声明 dsh\.bundle/u)
  } finally {
    rmSync(profileDir, { recursive: true, force: true })
  }
})

test('Skin Center v2 keeps Desktop market state separate when restoring the official skin', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-skin-center-shared-'))
  const profileDir = join(home, 'profiles', 'desktop')
  mkdirSync(profileDir, { recursive: true })
  const patchPath = join(profileDir, 'cordis.patch.yml')
  const activeStatePath = join(home, 'skin-center-active.json')
  const desktopMarketPatch = `${SKIN_STATE_START}\n- id: liquid-glass\n  disabled: false\n${SKIN_STATE_END}\n`
  writeFileSync(patchPath, desktopMarketPatch)
  try {
    const route = makeSkinCenterV2Routes({
      activeStatePath,
      loadCatalog: () => ({
        capturedAt: 0,
        diagnostics: [],
        skins: [{ origin: 'builtin', warnings: [], manifest: { id: 'v2-skin' } }],
      }),
    }).find(({ path }) => path === `${SKIN_CENTER_V2_PREFIX}/active`)
    assert.ok(route)
    const applyRequest = Readable.from([Buffer.from(JSON.stringify({ active: 'v2-skin' }))])
    applyRequest.method = 'POST'
    applyRequest.headers = {}
    const applyResponse = fakeResponse()

    await route.handler(applyRequest, applyResponse)

    assert.equal(applyResponse.status, 200)
    assert.deepEqual(JSON.parse(applyResponse.body), { ok: true, active: 'v2-skin' })
    assert.deepEqual(JSON.parse(readFileSync(activeStatePath, 'utf8')), { active: 'v2-skin' })
    assert.equal(readFileSync(patchPath, 'utf8'), desktopMarketPatch)

    const officialRequest = Readable.from([Buffer.from(JSON.stringify({ active: null }))])
    officialRequest.method = 'POST'
    officialRequest.headers = {}
    const officialResponse = fakeResponse()
    await route.handler(officialRequest, officialResponse)

    assert.equal(officialResponse.status, 200)
    assert.deepEqual(JSON.parse(officialResponse.body), { ok: true, active: null })
    assert.deepEqual(JSON.parse(readFileSync(activeStatePath, 'utf8')), { active: null })
    assert.equal(readFileSync(patchPath, 'utf8'), desktopMarketPatch)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

function fakeEntry(id, name, live, events = []) {
  return {
    options: { id, name },
    fiber: live ? {} : undefined,
    async update({ disabled }) {
      events.push(`live:${name}:${disabled ? 'off' : 'on'}`)
      this.fiber = disabled ? undefined : {}
    },
  }
}

function fakeHost(entries) {
  return {
    loader: { entries: () => entries },
    plugin: () => ({ await: async () => {}, dispose: async () => {} }),
  }
}

function fakeResponse() {
  return {
    status: 0,
    body: '',
    writeHead(status) { this.status = status },
    end(value = '') { this.body += String(value) },
  }
}
