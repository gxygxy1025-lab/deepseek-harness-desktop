import assert from 'node:assert/strict'
import test from 'node:test'

import { parseCandidateQueue, resolveCandidateWorkflowInput } from './resolve-dsh-candidate-input.mjs'

test('manual Candidate Matrix dispatch requires an exact DSH version', () => {
  assert.deepEqual(resolveCandidateWorkflowInput({ dispatchVersion: '0.1.0-rc.8' }), {
    shouldRun: true,
    source: 'workflow_dispatch',
    version: '0.1.0-rc.8',
  })
  assert.throws(() => resolveCandidateWorkflowInput({ dispatchVersion: 'latest' }), /exact/u)
})

test('scheduled Candidate Matrix only runs an explicitly queued exact version', () => {
  assert.deepEqual(resolveCandidateWorkflowInput({ queuedVersion: null }), {
    shouldRun: false,
    source: 'scheduled-queue-empty',
    version: null,
  })
  assert.deepEqual(resolveCandidateWorkflowInput({ queuedVersion: '0.1.0-rc.8' }), {
    shouldRun: true,
    source: 'scheduled-queue',
    version: '0.1.0-rc.8',
  })
  assert.equal(parseCandidateQueue({ schemaVersion: 1, candidateVersion: null }), null)
  assert.throws(() => parseCandidateQueue({ schemaVersion: 1, candidateVersion: 'latest' }), /exact/u)
})
