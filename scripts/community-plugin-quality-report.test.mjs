import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCommunityPluginQualityReport,
  renderCommunityPluginQualityReport,
  validateCommunityPluginQualityReport,
} from './generate-community-plugin-quality-report.mjs'

const source = {
  schemaVersion: 1,
  verifiedAt: '2026-08-20',
  ci: { workflow: '.github/workflows/desktop-ci.yml', status: 'passed' },
  smoke: { date: '2026-08-20', status: 'passed' },
}
const supportEvidence = {
  desktop: { version: '2.7.0' },
  runtime: { version: '0.1.0-rc.7' },
}

function reportFor(manifest) {
  return createCommunityPluginQualityReport({
    manifests: [{ path: 'packages/example/package.json', manifest }],
    supportEvidence,
    source,
  })
}

test('community quality report is local-only and records only reproducible manifest and evidence fields', () => {
  const report = reportFor({
    name: '@community/example',
    version: '1.2.3',
    license: 'Apache-2.0',
    scripts: {
      prepare: 'pnpm build',
      build: 'tsdown',
      typecheck: 'tsc --noEmit',
      test: 'vitest run',
      unrelated: 'echo ignored',
    },
    dsh: {
      compatibility: {
        desktop: '^2.7.0',
        runtime: '^0.1.0-rc.7',
        capabilities: ['notifications.show'],
      },
    },
  })
  const entry = report.entries[0]
  assert.equal(report.source.normalStartupNetwork, false)
  assert.equal(entry.desktopVerified, true)
  assert.deepEqual(entry.build, { declared: true, status: 'passed' })
  assert.deepEqual(entry.installScripts, [{ name: 'prepare', command: 'pnpm build' }])
  assert.deepEqual(entry.testCombination.commands, [
    'pnpm --filter @community/example build',
    'pnpm --filter @community/example test',
    'pnpm --filter @community/example typecheck',
  ])
  assert.equal(entry.testCombination.desktopVersion, '2.7.0')
  assert.equal(entry.testCombination.upstreamVersion, '0.1.0-rc.7')
  assert.match(renderCommunityPluginQualityReport(report), /security audit/u)
})

test('community quality report never labels missing license, compatibility, CI, or smoke evidence as Desktop Verified', () => {
  const missing = reportFor({
    name: '@community/missing-evidence',
    version: '1.2.3',
    scripts: { build: 'tsdown', test: 'vitest run' },
    dsh: { bundle: { patch: './cordis.patch.yml' } },
  })
  assert.equal(missing.entries[0].desktopVerified, false)
  assert.equal(missing.entries[0].requirementsSatisfied.license, false)
  assert.equal(missing.entries[0].requirementsSatisfied.compatibilityDeclared, false)

  const invalid = structuredClone(missing)
  invalid.source.normalStartupNetwork = true
  assert.throws(() => validateCommunityPluginQualityReport(invalid), /no startup network/u)

  assert.throws(() => createCommunityPluginQualityReport({
    manifests: [],
    supportEvidence,
    source: { ...source, smoke: { ...source.smoke, date: '2026-02-30' } },
  }), /ISO calendar date/u)
})
