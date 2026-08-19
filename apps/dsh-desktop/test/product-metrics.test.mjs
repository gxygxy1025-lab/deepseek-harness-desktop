import assert from 'node:assert/strict'
import test from 'node:test'

import {
  classifyRuntimeStartFailure,
  ProductMetricsRecorder,
} from '../src/product-metrics.mjs'

function createRecorder({ times = [0] } = {}) {
  const events = []
  let index = 0
  const recorder = new ProductMetricsRecorder({
    client: { record: (name, dimensions) => events.push({ name, ...dimensions }) },
    now: () => times[Math.min(index++, times.length - 1)],
  })
  return { events, recorder }
}

test('runtime failure classification emits only fixed privacy-safe categories', () => {
  assert.equal(classifyRuntimeStartFailure({ error: 'listen EADDRINUSE 127.0.0.1:34115' }), 'port-conflict')
  assert.equal(classifyRuntimeStartFailure({ error: 'runtime entry file is missing' }), 'runtime-missing')
  assert.equal(classifyRuntimeStartFailure({ error: 'runtime integrity checksum mismatch' }), 'integrity-failed')
  assert.equal(classifyRuntimeStartFailure({ restartBlocked: 'repeated-crash' }), 'repeated-crash')
  assert.equal(classifyRuntimeStartFailure({ error: 'child exited before readiness' }), 'startup-failed')
  assert.equal(classifyRuntimeStartFailure({}), 'unknown')
})

test('runtime attempts produce one bounded result without raw errors', () => {
  const { events, recorder } = createRecorder({ times: [0, 1_000, 4_200, 10_000, 11_000] })
  recorder.observeRuntimeStatus({ state: 'starting' })
  recorder.observeRuntimeStatus({ state: 'ready', url: 'http://127.0.0.1:34115/' })
  recorder.observeRuntimeStatus({ state: 'ready', url: 'http://127.0.0.1:34115/' })
  recorder.observeRuntimeStatus({ state: 'starting' })
  recorder.observeRuntimeStatus({ state: 'crashed', error: 'listen EADDRINUSE C:\\private\\file' })

  assert.deepEqual(events, [
    {
      name: 'runtime_start_result',
      outcome: 'ready',
      detail: 'none',
      bucket: '2-5s',
    },
    {
      name: 'runtime_start_result',
      outcome: 'failed',
      detail: 'port-conflict',
      bucket: 'under-2s',
    },
  ])
  assert.equal(JSON.stringify(events).includes('private'), false)
})

test('update status transitions are deduplicated and retain manual origin', () => {
  const { events, recorder } = createRecorder()
  recorder.observeUpdateStatus({ phase: 'checking', visible: true })
  recorder.observeUpdateStatus({ phase: 'downloading', percent: 0 })
  recorder.observeUpdateStatus({ phase: 'downloading', percent: 52 })
  recorder.observeUpdateStatus({ phase: 'ready' })
  recorder.observeUpdateStatus({ phase: 'installing' })

  assert.deepEqual(events, [
    { name: 'update_result', outcome: 'available', detail: 'manual', bucket: 'none' },
    { name: 'update_result', outcome: 'downloaded', detail: 'manual', bucket: 'none' },
    { name: 'update_result', outcome: 'install-requested', detail: 'manual', bucket: 'none' },
  ])
})

test('fixed product actions and extension outcomes never include extension identity', async () => {
  const { events, recorder } = createRecorder({ times: [0, 31 * 60_000] })
  recorder.recordLaunch('normal')
  recorder.recordLaunch('deep-link')
  recorder.recordRecovery('repair')
  recorder.recordSurface('extensions')
  await recorder.trackExtensionOperation('install', async () => ({ name: '@private/plugin' }))
  await assert.rejects(
    recorder.trackExtensionOperation('disable', async () => { throw new Error('secret plugin path') }),
    /secret plugin path/u,
  )
  recorder.recordSessionEnd()
  recorder.recordSessionEnd()

  assert.deepEqual(events, [
    { name: 'app_launch', outcome: 'started', detail: 'normal', bucket: 'none' },
    { name: 'runtime_recovery_action', outcome: 'requested', detail: 'repair', bucket: 'none' },
    { name: 'surface_opened', outcome: 'opened', detail: 'extensions', bucket: 'none' },
    { name: 'extension_operation', outcome: 'success', detail: 'install', bucket: 'none' },
    { name: 'extension_operation', outcome: 'failure', detail: 'disable', bucket: 'none' },
    { name: 'app_session_end', outcome: 'closed', detail: 'normal', bucket: '30-120m' },
  ])
  assert.equal(JSON.stringify(events).includes('@private/plugin'), false)
  assert.equal(JSON.stringify(events).includes('secret plugin path'), false)
})

test('metrics failures are isolated from product operations', async () => {
  const recorder = new ProductMetricsRecorder({
    client: { record: () => { throw new Error('transport validation failed') } },
    now: () => 0,
  })
  assert.doesNotThrow(() => recorder.recordSurface('help'))
  assert.equal(await recorder.trackExtensionOperation('remove', async () => 'removed'), 'removed')
})
