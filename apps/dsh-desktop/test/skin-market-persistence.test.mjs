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
const desktopCompatRoot = dirname(require.resolve('@linxin666/dsh-desktop-compat/package.json'))
const { DesktopSkinStateStore } = await import(pathToFileURL(join(desktopCompatRoot, 'lib', 'index.js')).href)

const aggregateRequire = createRequire(require.resolve('@linxin666/dsh-web-ui-all/package.json'))
const skinCenterRoot = dirname(aggregateRequire.resolve('@linxin666/dsh-client-ui-skin-center/package.json'))
const { makeSkinCenterRoutes } = await import(pathToFileURL(join(skinCenterRoot, 'lib', 'index.js')).href)

test('desktop market persists a successful bundle theme switch through the shared skin state', async () => {
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
  globalThis.fetch = async () => { throw new Error('offline test') }
  try {
    const manager = createThemeManager(fakeHost(entries), 'desktop', new Set(), profileDir, persistence)
    assert.equal(await manager.activateTheme('dsh-liquid-glass'), true)
    assert.equal(entries[0].fiber !== undefined, true)
    assert.equal(entries[1].fiber, undefined)
    assert.equal(events[0], 'persist')
    assert.match(readFileSync(join(home, 'cordis.patch.yml'), 'utf8'), /- id: liquid-glass\r?\n  disabled: false/u)
  } finally {
    globalThis.fetch = originalFetch
    rmSync(home, { recursive: true, force: true })
  }
})

test('desktop market migrates state.json and does not install the legacy self-heal guard', () => {
  const profileDir = mkdtempSync(join(tmpdir(), 'dsh-market-migrate-'))
  const stateDir = join(profileDir, '.dsh-market')
  mkdirSync(stateDir, { recursive: true })
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({ dependencies: {} }))
  writeFileSync(join(stateDir, 'state.json'), JSON.stringify({ disabledSkins: ['dsh-liquid-glass'] }))
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
    assert.equal(guardRegistrations, 0)
    assert.throws(() => readFileSync(join(stateDir, 'state.json')), /ENOENT/)
  } finally {
    dispose()
    rmSync(profileDir, { recursive: true, force: true })
  }
})

test('desktop market keeps unresolved legacy disables live until lazy migration succeeds', () => {
  const profileDir = mkdtempSync(join(tmpdir(), 'dsh-market-legacy-fallback-'))
  const stateDir = join(profileDir, '.dsh-market')
  mkdirSync(stateDir, { recursive: true })
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({ dependencies: {} }))
  writeFileSync(join(stateDir, 'state.json'), JSON.stringify({ disabledSkins: ['dsh-legacy-theme'] }))
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
      disabledSkins: ['dsh-legacy-theme'],
    })
    canMigrate = true
    guard({ entry: { options: { name: 'dsh-legacy-theme' } } })
    assert.throws(() => readFileSync(join(stateDir, 'state.json')), /ENOENT/u)
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

test('desktop market sends plugin mutations to the Extension Dock authority', async () => {
  const profileDir = mkdtempSync(join(tmpdir(), 'dsh-market-desktop-guard-'))
  const routes = new Map()
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
    skinState: {
      migrateLegacy() { return new Set() },
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
    for (const path of ['/dsh-market/install', '/dsh-market/update', '/dsh-market/uninstall']) {
      const request = Readable.from([])
      request.method = 'POST'
      request.headers = {}
      const response = fakeResponse()
      await routes.get(path)(request, response)
      assert.equal(response.status, 409)
      assert.match(response.body, /desktop-plugin-manager-required/u)
      assert.match(response.body, /Extension Dock/u)
    }
  } finally {
    dispose()
    rmSync(profileDir, { recursive: true, force: true })
  }
})

test('packaged skin center preserves market theme ids when restoring the official skin', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dsh-skin-center-shared-'))
  const profileDir = join(home, 'profiles', 'desktop')
  mkdirSync(profileDir, { recursive: true })
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({ dsh: { profile: { bundles: [] } } }))
  const patchPath = join(home, 'cordis.patch.yml')
  writeFileSync(patchPath, '# --- dsh-skin managed (auto-generated; do not edit) ---\n- id: liquid-glass\n  disabled: false\n# --- end dsh-skin managed ---\n')
  const previousHome = process.env.DSH_HOME
  const previousProfile = process.env.DSH_PROFILE
  process.env.DSH_HOME = home
  process.env.DSH_PROFILE = 'desktop'
  try {
    const route = makeSkinCenterRoutes().find(({ path }) => path === '/api/skin-center/apply')
    assert.ok(route)
    const request = Readable.from([Buffer.from(JSON.stringify({ official: true }))])
    request.method = 'POST'
    request.headers = {}
    const response = fakeResponse()

    await route.handler(request, response)

    assert.equal(response.status, 200)
    const content = readFileSync(patchPath, 'utf8')
    assert.match(content, /- id: liquid-glass\r?\n  disabled: true/)
    assert.equal(content.match(/- id: liquid-glass/g)?.length, 1)

    writeFileSync(patchPath, '[]\n')
    const firstSwitchRequest = Readable.from([Buffer.from(JSON.stringify({ official: true }))])
    firstSwitchRequest.method = 'POST'
    firstSwitchRequest.headers = {}
    const firstSwitchResponse = fakeResponse()
    await route.handler(firstSwitchRequest, firstSwitchResponse)
    assert.equal(firstSwitchResponse.status, 200)
    assert.doesNotMatch(readFileSync(patchPath, 'utf8'), /^\[\]/m)
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    if (previousProfile === undefined) delete process.env.DSH_PROFILE
    else process.env.DSH_PROFILE = previousProfile
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
