import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DeterministicExecutionProvider,
  renderCandidateExecutionMarkdown,
  runCandidateExecutionFixture,
} from './dsh-candidate-execution.mjs'

test('Candidate execution fixture compares Known Good and Candidate on one repository', async () => {
  const report = await runCandidateExecutionFixture()
  assert.equal(report.status, 'compatible')
  assert.equal(report.stable.status, 'passed')
  assert.equal(report.candidate.status, 'passed')
  assert.equal(report.stable.actualWorktree, true)
  assert.equal(report.candidate.actualWorktree, true)
  assert.equal(report.stableCheckoutUnchanged, true)
  assert.match(renderCandidateExecutionMarkdown(report), /real Git Worktree CWD and event semantics/u)
})

test('Candidate capability loss is blocked for 2.6 but reports safe shared fallback', async () => {
  const report = await runCandidateExecutionFixture({
    candidate: new DeterministicExecutionProvider({ providerId: 'candidate-missing', capabilities: ['workspace.register'] }),
  })
  assert.equal(report.status, 'blocked')
  assert.equal(report.candidate.safeDegradation, 'shared-workspace')
  assert.equal(report.candidate.createCount, 0)
  assert.equal(report.candidate.actualWorktree, false)
  assert.equal(report.stableCheckoutUnchanged, true)
})

test('Candidate CWD drift blocks isolated execution without changing Stable', async () => {
  const report = await runCandidateExecutionFixture({
    candidate: new DeterministicExecutionProvider({ providerId: 'candidate-cwd-drift', cwdMode: 'shared' }),
  })
  assert.equal(report.status, 'blocked')
  assert.equal(report.candidate.safeDegradation, 'shared-workspace')
  assert.equal(report.candidate.checks.find(check => check.id === 'session-cwd')?.status, 'failed')
  assert.equal(report.stable.status, 'passed')
  assert.equal(report.stableCheckoutUnchanged, true)
})
