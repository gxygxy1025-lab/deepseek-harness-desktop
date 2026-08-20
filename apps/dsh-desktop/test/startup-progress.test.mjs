import assert from 'node:assert/strict'
import test from 'node:test'

import {
  advanceStartupProgress,
  clampProgress,
  createStartupStatusGate,
  initialProgressForState,
  phaseIndexForProgress,
} from '../src/ui/startup-progress.mjs'

test('startup progress clamps invalid and out-of-range values', () => {
  assert.equal(clampProgress(Number.NaN), 0)
  assert.equal(clampProgress(-4), 0)
  assert.equal(clampProgress(104), 100)
})

test('starting progress begins visibly and advances without reaching completion', () => {
  let progress = initialProgressForState('starting')
  assert.equal(progress, 18)
  for (let index = 0; index < 2_000; index += 1) progress = advanceStartupProgress('starting', progress)
  assert.equal(progress, 88)
})

test('restart progress preserves a later visible position', () => {
  assert.equal(initialProgressForState('restarting', 64), 64)
  assert.ok(advanceStartupProgress('restarting', 64) > 64)
})

test('ready progress completes while failure retains diagnostic context', () => {
  assert.equal(initialProgressForState('ready', 42), 100)
  assert.equal(initialProgressForState('crashed', 79), 79)
  assert.equal(initialProgressForState('crashed', 12), 58)
})

test('progress maps to the three visible launch phases', () => {
  assert.equal(phaseIndexForProgress(8), 0)
  assert.equal(phaseIndexForProgress(34), 1)
  assert.equal(phaseIndexForProgress(72), 2)
})

test('live startup status wins over a stale initial snapshot', () => {
  const rendered = []
  const gate = createStartupStatusGate((status) => rendered.push(status.state))

  gate.live({ state: 'starting' })
  assert.equal(gate.initial({ state: 'stopped' }), false)
  gate.live({ state: 'crashed' })

  assert.deepEqual(rendered, ['starting', 'crashed'])
})

test('initial startup status renders when no live event arrived', () => {
  const rendered = []
  const gate = createStartupStatusGate((status) => rendered.push(status.state))

  assert.equal(gate.initial({ state: 'starting' }), true)
  gate.live({ state: 'ready' })

  assert.deepEqual(rendered, ['starting', 'ready'])
})
