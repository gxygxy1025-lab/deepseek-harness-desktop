import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { join, resolve } from 'node:path'
import test from 'node:test'

import {
  DshRuntimeProvider,
  RUNTIME_CAPABILITY_IDS,
  RUNTIME_PROVIDER_ERROR_CODES,
  RuntimeProviderError,
} from '../src/runtime-provider.mjs'

const DSH_HOME = resolve('test-runtime-home')
const PROFILE_DIR = join(DSH_HOME, 'profiles', 'desktop')

class FakeController extends EventEmitter {
  constructor() {
    super()
    this.calls = []
    this.status = Object.freeze({ state: 'stopped' })
  }

  async start() {
    this.calls.push('start')
    this.status = Object.freeze({ state: 'ready', url: 'http://127.0.0.1:43125/' })
    this.emit('status', this.status)
    return this.status.url
  }

  async stop() {
    this.calls.push('stop')
    this.status = Object.freeze({ state: 'stopped' })
    this.emit('status', this.status)
  }

  async restart() {
    this.calls.push('restart')
    this.status = Object.freeze({ state: 'ready', url: 'http://127.0.0.1:43126/' })
    this.emit('status', this.status)
    return this.status.url
  }
}

function createProvider(overrides = {}) {
  const controller = overrides.controller ?? new FakeController()
  const profileCalls = []
  const provider = new DshRuntimeProvider({
    controller,
    ensureProfile: overrides.ensureProfile ?? (async () => {
      profileCalls.push('ensure')
      return { changed: false, profileDir: PROFILE_DIR }
    }),
    dshHome: DSH_HOME,
    profileName: 'desktop',
    upstreamVersion: '0.1.0-rc.7',
    desktopVersion: '2.5.0',
    runtimeIdentity: {
      packageName: '@deepseek-ai/dsh',
      cliRelativePath: 'lib/bin.js',
    },
    supportEvidence: {
      manifestSchemaVersion: 1,
      lockfileSha256: 'a'.repeat(64),
    },
    ...overrides,
    controller,
  })
  return { controller, profileCalls, provider }
}

test('current provider reports a stable capability snapshot without exposing host objects', () => {
  const { provider } = createProvider()
  assert.deepEqual(provider.probe(), {
    providerId: 'dsh-cli-provider-v1',
    upstreamVersion: '0.1.0-rc.7',
    supportStatus: 'known-good',
    capabilities: [
      { id: 'runtime.lifecycle', status: 'available' },
      { id: 'profile.paths', status: 'available' },
      { id: 'workspace.register', status: 'unsupported' },
      { id: 'session.create', status: 'unsupported' },
      { id: 'session.observe', status: 'unsupported' },
      { id: 'host-service.register', status: 'unsupported' },
    ],
  })
  assert.deepEqual(RUNTIME_CAPABILITY_IDS, [
    'runtime.lifecycle',
    'profile.paths',
    'workspace.register',
    'session.create',
    'session.observe',
    'host-service.register',
  ])
  assert.equal('controller' in provider.probe(), false)
})

test('provider preserves current lifecycle results, status, and status subscriptions', async () => {
  const { controller, provider } = createProvider()
  const statuses = []
  const onStatus = (status) => statuses.push(status.state)
  provider.on('status', onStatus)

  assert.equal(await provider.start(), 'http://127.0.0.1:43125/')
  assert.equal(provider.status.state, 'ready')
  await provider.stop()
  assert.equal(await provider.recover(), 'http://127.0.0.1:43126/')
  provider.off('status', onStatus)

  assert.deepEqual(controller.calls, ['start', 'stop', 'restart'])
  assert.deepEqual(statuses, ['ready', 'stopped', 'ready'])
})

test('profile methods expose only normalized Desktop-owned paths', async () => {
  const { profileCalls, provider } = createProvider()
  assert.deepEqual(provider.resolveProfilePaths(), {
    homeDir: DSH_HOME,
    profileName: 'desktop',
    profileDir: PROFILE_DIR,
    manifestPath: join(PROFILE_DIR, 'package.json'),
    lockfilePath: join(PROFILE_DIR, 'pnpm-lock.yaml'),
    stateDir: join(PROFILE_DIR, 'state'),
    skillsDir: join(DSH_HOME, 'skills'),
  })
  assert.equal((await provider.ensureProfile()).profileDir, PROFILE_DIR)
  assert.deepEqual(profileCalls, ['ensure'])
})

test('optional provider methods have stable unavailable errors', async () => {
  const { provider } = createProvider()
  for (const [method, capability] of [
    ['registerWorkspace', 'workspace.register'],
    ['createSession', 'session.create'],
    ['subscribeSession', 'session.observe'],
    ['registerHostService', 'host-service.register'],
  ]) {
    await assert.rejects(
      provider[method]({}),
      (error) => error instanceof RuntimeProviderError
        && error.code === 'runtime-capability-unsupported'
        && error.capability === capability,
    )
  }
})

test('provided optional faces are capability-detected and invoked', async () => {
  const calls = []
  const { provider } = createProvider({
    registerWorkspace: async (value) => { calls.push(['workspace', value]); return 'workspace-id' },
    createSession: async (value) => { calls.push(['create', value]); return 'session-id' },
    subscribeSession: async (value) => { calls.push(['observe', value]); return () => {} },
    registerHostService: async (value) => { calls.push(['host', value]); return true },
  })
  assert.equal(await provider.registerWorkspace({ path: 'safe' }), 'workspace-id')
  assert.equal(await provider.createSession({ workspaceId: 'workspace-id' }), 'session-id')
  assert.equal(typeof await provider.subscribeSession({ sessionId: 'session-id' }), 'function')
  assert.equal(await provider.registerHostService({ id: 'task-board' }), true)
  assert.equal(provider.probe().capabilities.every((item) => item.status === 'available'), true)
  assert.equal(calls.length, 4)
})

test('upstream failures are translated at the provider boundary', async () => {
  const controller = new FakeController()
  controller.start = async () => { throw new Error('unknown upstream slot failure') }
  const { provider } = createProvider({ controller })
  await assert.rejects(
    provider.start(),
    (error) => error instanceof RuntimeProviderError
      && error.code === 'runtime-provider-operation-failed'
      && error.operation === 'start'
      && error.capability === 'runtime.lifecycle'
      && error.cause?.message === 'unknown upstream slot failure'
      && !error.message.includes('unknown upstream slot failure'),
  )
  assert.deepEqual(RUNTIME_PROVIDER_ERROR_CODES, {
    CAPABILITY_UNSUPPORTED: 'runtime-capability-unsupported',
    OPERATION_FAILED: 'runtime-provider-operation-failed',
    INVALID_CONFIGURATION: 'runtime-provider-invalid-configuration',
  })
})

test('support evidence is clone-safe and detached from caller mutation', () => {
  const evidence = { manifestSchemaVersion: 1, lockfileSha256: 'b'.repeat(64) }
  const { provider } = createProvider({ supportEvidence: evidence })
  evidence.lockfileSha256 = 'changed'
  const first = provider.getSupportEvidence()
  first.runtimeIdentity.packageName = 'changed'
  const second = provider.getSupportEvidence()
  assert.equal(second.lockfileSha256, 'b'.repeat(64))
  assert.equal(second.runtimeIdentity.packageName, '@deepseek-ai/dsh')
  assert.equal(second.provider.providerId, 'dsh-cli-provider-v1')
})
