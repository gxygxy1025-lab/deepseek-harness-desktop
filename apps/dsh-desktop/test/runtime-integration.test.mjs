import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { chromium } from 'playwright'

import { BoundedLogStore } from '../src/log-store.mjs'
import {
  SECONDARY_WINDOW_PARTITION,
  beginDesktopStartup,
  createDesktopShutdownLifecycle,
  prepareDesktopRuntimeInputs,
  requestsUpdateShutdown,
  secondaryWindowWebPreferences,
  desktopDeepLinkFrom,
} from '../src/electron-app.mjs'
import {
  BUILTIN_SKIN_PACKAGES,
  WEB_UI_SETTINGS_NAMESPACES,
  ensureDesktopProfile,
  resolveDshCliPath,
} from '../src/profile.mjs'
import { DshRuntimeController } from '../src/runtime-controller.mjs'
import { parseUpdateShutdownRequest } from '../src/update-shutdown-receipt.mjs'

async function availableLoopbackPort(excludedPort) {
  for (;;) {
    const server = createServer()
    const port = await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        resolve(typeof address === 'object' && address !== null ? address.port : 0)
      })
    })
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    if (port !== 0 && port !== excludedPort) return port
  }
}

test('installer shutdown requests work through command line and single-instance data', () => {
  assert.equal(requestsUpdateShutdown(['desktop.exe']), false)
  assert.equal(requestsUpdateShutdown(['desktop.exe', '--shutdown-for-update']), true)
  assert.equal(requestsUpdateShutdown(['desktop.exe'], { shutdownForUpdate: true }), true)
  const token = 'a'.repeat(64)
  assert.deepEqual(
    parseUpdateShutdownRequest(['desktop.exe'], { shutdownForUpdate: true, shutdownToken: token }),
    { requested: true, token },
  )
})

test('desktop deep links accept only the configured bounded scheme', () => {
  assert.equal(desktopDeepLinkFrom(['desktop.exe', 'dsh://workspace/open?id=1']), 'dsh://workspace/open?id=1')
  assert.equal(desktopDeepLinkFrom(['desktop.exe', 'https://example.com']), undefined)
  assert.equal(desktopDeepLinkFrom(['desktop.exe', `dsh://${'a'.repeat(4_100)}`]), undefined)
})

test('independent desktop startup inputs begin concurrently', async () => {
  const started = []
  const resolvers = new Map()
  const operation = (name, value) => () => new Promise((resolve) => {
    started.push(name)
    resolvers.set(name, () => resolve(value))
  })

  const preparing = prepareDesktopRuntimeInputs({
    prepareProfile: operation('profile', { profileDir: 'profile' }),
    migrateSettings: operation('settings', { changed: false }),
    loadCredentials: operation('credentials', { appId: 'id', appSecret: 'secret' }),
    onCredentialError: async () => { throw new Error('unexpected credential error') },
  })
  await Promise.resolve()
  assert.deepEqual(started.toSorted(), ['credentials', 'profile', 'settings'])
  for (const resolve of resolvers.values()) resolve()
  assert.deepEqual(await preparing, {
    profile: { profileDir: 'profile' },
    credentials: { appId: 'id', appSecret: 'secret' },
  })
})

test('credential load failure does not block profile preparation', async () => {
  const failures = []
  const result = await prepareDesktopRuntimeInputs({
    prepareProfile: async () => ({ profileDir: 'profile' }),
    migrateSettings: async () => ({ changed: false }),
    loadCredentials: async () => { throw new Error('decrypt failed') },
    onCredentialError: async (error) => failures.push(error.message),
  })
  assert.deepEqual(result, { profile: { profileDir: 'profile' }, credentials: undefined })
  assert.deepEqual(failures, ['decrypt failed'])
})

test('runtime boot begins while the startup shell is still loading', async () => {
  const started = []
  let finishShell
  let finishRuntime
  const { shellPromise, runtimePromise } = beginDesktopStartup({
    loadShell: () => new Promise((resolve) => {
      started.push('shell')
      finishShell = resolve
    }),
    startRuntime: () => new Promise((resolve) => {
      started.push('runtime')
      finishRuntime = resolve
    }),
  })

  await Promise.resolve()
  assert.deepEqual(started, ['shell', 'runtime'])
  finishShell()
  await shellPromise
  finishRuntime('http://127.0.0.1:43125/')
  assert.equal(await runtimePromise, 'http://127.0.0.1:43125/')

  const held = beginDesktopStartup({
    loadShell: async () => started.push('held-shell'),
    startRuntime: async () => started.push('unexpected-runtime'),
    holdRuntime: true,
  })
  await held.shellPromise
  assert.equal(held.runtimePromise, undefined)
  assert.equal(started.includes('unexpected-runtime'), false)
})

test('secondary windows use an isolated non-persistent Electron session', () => {
  const preferences = secondaryWindowWebPreferences({ preload: 'desktop-preload.cjs' })
  assert.equal(SECONDARY_WINDOW_PARTITION.startsWith('persist:'), false)
  assert.deepEqual(preferences, {
    preload: 'desktop-preload.cjs',
    partition: SECONDARY_WINDOW_PARTITION,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true,
    spellcheck: false,
  })
  assert.equal('preload' in secondaryWindowWebPreferences(), false)
})

test('update preparation stops the runtime without disposing the desktop surface', async () => {
  const calls = []
  const lifecycle = createDesktopShutdownLifecycle({
    saveState: async () => calls.push('save'),
    stopRuntime: async () => calls.push('stop'),
    startRuntime: async () => calls.push('start'),
    disposeResources: async () => calls.push('dispose'),
  })

  await Promise.all([lifecycle.stop(), lifecycle.stop()])
  assert.deepEqual(calls, ['save', 'stop'])
  assert.equal(lifecycle.runtimeStopped, true)
  assert.equal(lifecycle.operationsQuiesced, true)
  assert.equal(lifecycle.resourcesDisposed, false)

  assert.equal(await lifecycle.recover(), true)
  assert.deepEqual(calls, ['save', 'stop', 'start'])
  assert.equal(lifecycle.runtimeStopped, false)
  assert.equal(lifecycle.operationsQuiesced, false)

  await lifecycle.shutdown()
  assert.deepEqual(calls, ['save', 'stop', 'start', 'save', 'stop', 'dispose'])
  assert.equal(lifecycle.operationsQuiesced, true)
  assert.equal(lifecycle.resourcesDisposed, true)
})

test('desktop shutdown quiesces mutations before stopping and resumes them for recovery', async () => {
  const calls = []
  const lifecycle = createDesktopShutdownLifecycle({
    prepareStop: async () => calls.push('quiesce'),
    saveState: async () => calls.push('save'),
    stopRuntime: async () => calls.push('stop'),
    resumeOperations: async () => calls.push('resume'),
    startRuntime: async () => calls.push('start'),
    disposeResources: async () => calls.push('dispose'),
  })

  await lifecycle.stop()
  assert.deepEqual(calls, ['quiesce', 'save', 'stop'])
  assert.equal(lifecycle.operationsQuiesced, true)
  assert.equal(await lifecycle.recover(), true)
  assert.deepEqual(calls, ['quiesce', 'save', 'stop', 'resume', 'start'])
  assert.equal(lifecycle.operationsQuiesced, false)
})

test('a disposed desktop lifecycle cannot restart after an update error', async () => {
  let starts = 0
  const lifecycle = createDesktopShutdownLifecycle({
    saveState: async () => {},
    stopRuntime: async () => {},
    startRuntime: async () => { starts += 1 },
    disposeResources: async () => {},
  })
  await lifecycle.shutdown()
  assert.equal(await lifecycle.recover(), false)
  assert.equal(starts, 0)
})

test('a failed runtime stop leaves shutdown retryable and never claims success', async () => {
  let attempts = 0
  const logs = []
  const lifecycle = createDesktopShutdownLifecycle({
    saveState: async () => {},
    stopRuntime: async () => {
      attempts += 1
      if (attempts === 1) throw new Error('runtime process is still locked')
    },
    startRuntime: async () => {},
    disposeResources: async () => {},
    log: async (message) => logs.push(message),
  })

  await assert.rejects(lifecycle.shutdown(), /still locked/u)
  assert.equal(lifecycle.runtimeStopped, false)
  assert.equal(lifecycle.resourcesDisposed, false)
  assert.deepEqual(logs, ['runtime process is still locked'])

  await lifecycle.shutdown()
  assert.equal(attempts, 2)
  assert.equal(lifecycle.runtimeStopped, true)
  assert.equal(lifecycle.resourcesDisposed, true)
})

test('recovery does not start a replacement runtime when the old runtime cannot stop', async () => {
  let starts = 0
  const lifecycle = createDesktopShutdownLifecycle({
    saveState: async () => {},
    stopRuntime: async () => { throw new Error('stop failed') },
    startRuntime: async () => { starts += 1 },
    disposeResources: async () => {},
  })

  assert.equal(await lifecycle.recover(), false)
  assert.equal(lifecycle.runtimeStopped, false)
  assert.equal(starts, 0)
})

test('official DSH host serves the complete desktop profile', { timeout: 150_000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-runtime-'))
  const logs = new BoundedLogStore({ directory: join(root, 'logs') })
  let controller
  let browser
  try {
    await ensureDesktopProfile({ dshHome: root })
    controller = new DshRuntimeController({
      cliPath: resolveDshCliPath(),
      cwd: process.cwd(),
      dshHome: root,
      logStore: logs,
      startupTimeoutMs: 45_000,
    })
    let url = await controller.start()
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) })
    assert.equal(response.ok, true)
    assert.match(await response.text(), /__DSH_BOOT__/)

    const settingsResponse = await fetch(new URL('/api/settings.describe', url), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: 'desktop-runtime-settings',
        method: 'settings.describe',
        payload: {},
      }),
      signal: AbortSignal.timeout(5_000),
    })
    const settings = await settingsResponse.json()
    assert.equal(settings.result.ok, true)
    const namespaces = new Set(settings.result.value.namespaces.map((entry) => entry.ns))
    for (const namespace of WEB_UI_SETTINGS_NAMESPACES) {
      assert.equal(namespaces.has(namespace), true, `settings namespace ${namespace} is hidden`)
    }

    const taskBoardUrl = new URL('/api/dsh-task-board/tasks', url)
    const taskBoardInitial = await fetch(taskBoardUrl, { signal: AbortSignal.timeout(5_000) })
    const initialLedgerText = await taskBoardInitial.text()
    assert.equal(taskBoardInitial.ok, true, `Task Board HostStore was not served: ${taskBoardInitial.status} ${initialLedgerText}`)
    const initialLedger = JSON.parse(initialLedgerText)
    assert.equal(initialLedger.schemaVersion, 2)
    assert.equal(initialLedger.revision, 0)
    assert.equal(typeof initialLedger.updatedAt, 'number')
    assert.deepEqual(initialLedger.tasks, [])
    const savedTask = {
      id: 'desktop-runtime-task',
      title: 'Runtime HostStore verification',
      description: '',
      prompt: 'verify',
      status: 'todo',
      createdAt: 1,
      updatedAt: 1,
      executions: [],
    }
    const taskBoardWrite = await fetch(taskBoardUrl, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tasks: [savedTask] }),
      signal: AbortSignal.timeout(5_000),
    })
    assert.equal(taskBoardWrite.ok, true, 'Task Board HostStore write failed')
    const writtenLedger = await taskBoardWrite.json()
    assert.equal(writtenLedger.revision, 1)
    assert.deepEqual(writtenLedger.tasks, [savedTask])
    const persistedTaskBoard = JSON.parse(await readFile(
      join(root, 'profiles', 'desktop', 'state', 'task-board', 'tasks-v2.json'),
      'utf8',
    ))
    assert.equal(persistedTaskBoard.schemaVersion, 2)
    assert.deepEqual(persistedTaskBoard.tasks, [savedTask])

    const originalPort = Number(new URL(url).port)
    const replacementPort = await availableLoopbackPort(originalPort)
    await controller.stop()
    controller = new DshRuntimeController({
      cliPath: resolveDshCliPath(),
      cwd: process.cwd(),
      dshHome: root,
      logStore: logs,
      preferredPort: replacementPort,
      startupTimeoutMs: 45_000,
    })
    url = await controller.start()
    assert.equal(Number(new URL(url).port), replacementPort)
    assert.notEqual(replacementPort, originalPort)
    const restartedTaskBoard = await fetch(new URL('/api/dsh-task-board/tasks', url), {
      signal: AbortSignal.timeout(5_000),
    })
    assert.equal(restartedTaskBoard.ok, true, 'Task Board HostStore was not restored after a port-changing restart')
    assert.deepEqual((await restartedTaskBoard.json()).tasks, [savedTask])

    const unicodeWorkspacePath = join(root, '模拟 D 盘', '中文名字d')
    await mkdir(unicodeWorkspacePath, { recursive: true })
    const callRuntime = async (method, payload) => {
      const apiResponse = await fetch(new URL(`/api/${method}`, url), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'client-request',
          rpcId: `desktop-runtime-${method}`,
          method,
          payload,
        }),
        signal: AbortSignal.timeout(10_000),
      })
      assert.equal(apiResponse.ok, true, `${method} returned HTTP ${apiResponse.status}`)
      return apiResponse.json()
    }
    const workspaceCreated = await callRuntime('workspace.create', { path: unicodeWorkspacePath })
    assert.equal(workspaceCreated.result.ok, true, JSON.stringify(workspaceCreated.result))
    const workspaceId = workspaceCreated.result.value.workspace.workspaceId
    assert.equal(typeof workspaceId, 'string')
    const sessionCreated = await callRuntime('session.create', { workspaceId })
    assert.equal(sessionCreated.result.ok, true, JSON.stringify(sessionCreated.result))
    assert.equal(controller.status.state, 'ready', 'Unicode workspace creation crashed the runtime')

    for (const path of ['/api/pet/state', '/pet/whale/pet.json', '/pet/whale/spritesheet.webp']) {
      const asset = await fetch(new URL(path, url), { signal: AbortSignal.timeout(5_000) })
      assert.equal(asset.ok, true, `${path} was not served`)
    }
    const petsResponse = await fetch(new URL('/api/pet/pets', url), { signal: AbortSignal.timeout(5_000) })
    assert.equal(petsResponse.ok, true, 'pet registry was not served')
    const pets = await petsResponse.json()
    const whaleGirl = pets.find((pet) => pet.id === 'whale-girl')
    assert.equal(whaleGirl?.displayName, '鲸鱼娘')
    for (const path of [whaleGirl.manifestUrl, whaleGirl.atlasUrl]) {
      const asset = await fetch(new URL(path, url), { signal: AbortSignal.timeout(5_000) })
      assert.equal(asset.ok, true, `${path} was not served`)
    }
    for (const packageName of BUILTIN_SKIN_PACKAGES) {
      const skinId = packageName.slice(packageName.lastIndexOf('-skin-') + '-skin-'.length)
      const bundle = await fetch(new URL(`/api/skin-center/bundle/${skinId}`, url), {
        signal: AbortSignal.timeout(5_000),
      })
      assert.equal(bundle.ok, true, `${skinId} skin bundle was not served`)
    }
    const marketInstalled = await fetch(new URL('/dsh-market/installed', url), {
      signal: AbortSignal.timeout(5_000),
    })
    assert.equal(marketInstalled.ok, true, 'dshmarket installed route was not served')
    assert.equal((await marketInstalled.json()).profile, 'desktop')
    const marketStatus = await fetch(new URL('/dsh-market/status', url), {
      signal: AbortSignal.timeout(5_000),
    })
    assert.equal(marketStatus.ok, true, 'dshmarket status route was not served')
    assert.equal((await marketStatus.json()).restart, false, 'desktop supervisor must own runtime restarts')
    const marketRegistry = await fetch(new URL('/dsh-market/registry', url), {
      signal: AbortSignal.timeout(10_000),
    })
    assert.equal(marketRegistry.ok, true, 'dshmarket registry route was not served')
    const registryBody = await marketRegistry.json()
    assert.ok(registryBody.registry.plugins.length > 0, 'dshmarket catalog is empty')

    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ locale: 'en-US' })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    const continueButton = page.getByRole('button', { name: /^(?:继续|Continue)$/u })
    try {
      await continueButton.waitFor({ state: 'visible', timeout: 5_000 })
      await continueButton.click()
    } catch {
      // Existing profiles may already have completed onboarding.
    }
    await page.locator('[data-pet-dock]').waitFor({ state: 'attached', timeout: 10_000 })
    await page.locator('style[data-plugin-css="reasoning-slider"]').waitFor({ state: 'attached', timeout: 10_000 })
    await page.getByRole('button', { name: /^(?:鲸鱼娘|whale girl)$/u }).waitFor({ state: 'visible', timeout: 10_000 })
    await page.locator('button').filter({ hasText: /^(?:设置|Settings)$/u }).first().evaluate((button) => button.click())
    await page.getByRole('button', { name: /^(?:插件市场|Plugin Market)$/u }).click()
    await page.getByRole('heading', { name: /^(?:插件市场|Plugin Market)$/u }).waitFor({ state: 'visible', timeout: 10_000 })
    await page.getByPlaceholder(/^(?:搜索插件，比如：通知、终端、记忆…|Search plugins: notify, terminal, memory…)$/u).waitFor({ state: 'visible', timeout: 10_000 })

    const applySkin = await fetch(new URL('/api/skin-center/apply', url), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ skin: 'qq98' }),
      signal: AbortSignal.timeout(5_000),
    })
    assert.equal(applySkin.ok, true)
    assert.equal((await applySkin.json()).active, 'qq98')
    const profilePatch = await readFile(join(root, 'profiles', 'desktop', 'cordis.patch.yml'), 'utf8')
    assert.match(profilePatch, /- id: ui-skin-qq98/u)
    await assert.rejects(
      readFile(join(root, 'cordis.patch.yml'), 'utf8'),
      (error) => error?.code === 'ENOENT',
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${message}\nRecent runtime log:\n${await logs.tail(80)}`, { cause: error })
  } finally {
    await browser?.close()
    await controller?.stop()
    await rm(root, { recursive: true, force: true })
  }
})
