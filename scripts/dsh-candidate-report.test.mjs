import assert from 'node:assert/strict'
import test from 'node:test'

import { createCandidateReport, renderCandidateReportMarkdown } from './dsh-candidate-report.mjs'
import { createCandidateInstallPlan, validateCandidateVersion } from './prepare-dsh-candidate.mjs'

const stableEvidence = {
  runtime: { version: '0.1.0-rc.6', exports: null, peerDependencies: {} },
  provider: { capabilities: [{ id: 'runtime.lifecycle', status: 'available' }] },
  compatPatches: { ids: ['queued-turn-continuation'] },
}
const candidateEvidence = structuredClone(stableEvidence)
candidateEvidence.runtime.version = '0.1.0-rc.7'
const stableHashes = { package: 'a', lockfile: 'b', updater: 'c' }

function reportWith(checks, overrides = {}) {
  return createCandidateReport({
    candidateVersion: '0.1.0-rc.7',
    stableEvidence,
    candidateEvidence,
    checks,
    stableHashesBefore: stableHashes,
    stableHashesAfter: stableHashes,
    ...overrides,
  })
}

test('Candidate Lite accepts only exact versions and resolves exact peer installs', async () => {
  assert.equal(validateCandidateVersion('0.1.0-rc.7'), '0.1.0-rc.7')
  for (const value of ['latest', '^0.1.0', '~0.1.0', 'github:user/repo', 'file:../dsh']) {
    assert.throws(() => validateCandidateVersion(value), /exact/u)
  }
  const plan = await createCandidateInstallPlan({
    candidateVersion: '0.1.0-rc.7',
    viewManifest: async () => ({
      name: '@deepseek-ai/dsh',
      version: '0.1.0-rc.7',
      peerDependencies: { '@deepseek-ai/cordis': '^4.0.0' },
    }),
    resolvePeerVersion: async () => ['4.0.0', '4.0.2'],
  })
  assert.deepEqual(plan.peers, [{
    name: '@deepseek-ai/cordis',
    range: '^4.0.0',
    version: '4.0.2',
    spec: '@deepseek-ai/cordis@4.0.2',
  }])
})

test('Candidate Lite successful report is diagnostic and leaves stable inputs unchanged', () => {
  const report = reportWith([
    { id: 'build', status: 'passed' },
    { id: 'runtime-start-stop-recover', status: 'passed' },
    { id: 'report', status: 'passed' },
  ])
  assert.equal(report.status, 'compatible')
  assert.equal(report.stableCheckoutUnchanged, true)
  assert.match(renderCandidateReportMarkdown(report), /does not update stable dependencies/u)
})

test('Candidate Lite reports build and Runtime failures without hiding later evidence', () => {
  const buildFailure = reportWith([
    { id: 'build', status: 'failed', detail: 'typecheck failed' },
    { id: 'runtime-start-stop-recover', status: 'skipped' },
    { id: 'report', status: 'passed' },
  ])
  assert.equal(buildFailure.status, 'failed')
  assert.equal(buildFailure.checks.at(-1).status, 'passed')
  const runtimeFailure = reportWith([
    { id: 'build', status: 'passed' },
    { id: 'runtime-start-stop-recover', status: 'failed', detail: 'recover failed' },
    { id: 'report', status: 'passed' },
  ])
  assert.equal(runtimeFailure.status, 'failed')
})

test('Candidate Lite fails if the stable package, lockfile, release, or updater inputs changed', () => {
  const report = reportWith([{ id: 'report', status: 'passed' }], {
    stableHashesAfter: { ...stableHashes, lockfile: 'changed' },
  })
  assert.equal(report.status, 'failed')
  assert.equal(report.stableCheckoutUnchanged, false)
})
