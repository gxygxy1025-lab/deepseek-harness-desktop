import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateCandidateVersion } from './prepare-dsh-candidate.mjs'

const CHECK_STATUSES = new Set(['passed', 'failed', 'skipped'])

function normalizedChecks(checks) {
  if (!Array.isArray(checks) || checks.length === 0) throw new TypeError('candidate checks are required')
  return checks.map((check) => {
    if (
      check === null
      || typeof check !== 'object'
      || typeof check.id !== 'string'
      || check.id.length === 0
      || !CHECK_STATUSES.has(check.status)
    ) {
      throw new TypeError('invalid candidate check result')
    }
    return {
      id: check.id,
      status: check.status,
      ...(typeof check.detail === 'string' && check.detail.length > 0 ? { detail: check.detail.slice(0, 2_000) } : {}),
    }
  })
}

function stableUnchanged(before, after) {
  if (before === null || typeof before !== 'object' || after === null || typeof after !== 'object') return false
  const beforeEntries = Object.entries(before).toSorted(([left], [right]) => left.localeCompare(right))
  const afterEntries = Object.entries(after).toSorted(([left], [right]) => left.localeCompare(right))
  return JSON.stringify(beforeEntries) === JSON.stringify(afterEntries)
}

function difference(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
    ? { changed: false }
    : { changed: true, stable: left ?? null, candidate: right ?? null }
}

export function createCandidateReport({
  candidateVersion,
  stableEvidence,
  candidateEvidence,
  checks,
  stableHashesBefore,
  stableHashesAfter,
  slotEvidence = { stable: [], candidate: [] },
} = {}) {
  const version = validateCandidateVersion(candidateVersion)
  const normalized = normalizedChecks(checks)
  const checkoutUnchanged = stableUnchanged(stableHashesBefore, stableHashesAfter)
  const allPassed = normalized.every((check) => check.status === 'passed')
  const status = allPassed && checkoutUnchanged ? 'compatible' : 'failed'
  return {
    schemaVersion: 1,
    candidateVersion: version,
    stableVersion: stableEvidence?.runtime?.version,
    status,
    stableCheckoutUnchanged: checkoutUnchanged,
    checks: normalized,
    differences: {
      packageExports: difference(stableEvidence?.runtime?.exports, candidateEvidence?.runtime?.exports),
      peers: difference(stableEvidence?.runtime?.peerDependencies, candidateEvidence?.runtime?.peerDependencies),
      providerCapabilities: difference(stableEvidence?.provider?.capabilities, candidateEvidence?.provider?.capabilities),
      compatPatches: difference(stableEvidence?.compatPatches, candidateEvidence?.compatPatches),
      slots: difference(slotEvidence.stable, slotEvidence.candidate),
    },
  }
}

function markdown(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
}

export function renderCandidateReportMarkdown(report) {
  const lines = [
    `# DSH Candidate Lite: ${report.candidateVersion}`,
    '',
    `Result: **${report.status}**.`,
    '',
    `Stable runtime: ${report.stableVersion ?? 'unavailable'}.`,
    '',
    `Stable checkout unchanged: ${report.stableCheckoutUnchanged ? 'yes' : 'no'}.`,
    '',
    'This report is diagnostic only. It does not update stable dependencies, the lockfile, releases, or updater metadata.',
    '',
    '## Checks',
    '',
    '| Check | Status | Detail |',
    '| --- | --- | --- |',
    ...report.checks.map((check) => `| ${markdown(check.id)} | ${check.status} | ${markdown(check.detail)} |`),
    '',
    '## Compatibility differences',
    '',
    '| Surface | Changed |',
    '| --- | --- |',
    ...Object.entries(report.differences).map(([name, value]) => `| ${name} | ${value.changed ? 'yes' : 'no'} |`),
    '',
  ]
  return `${lines.join('\n')}\n`
}

async function main() {
  const inputIndex = process.argv.indexOf('--input')
  const jsonIndex = process.argv.indexOf('--json')
  const markdownIndex = process.argv.indexOf('--markdown')
  if (inputIndex < 0 || jsonIndex < 0 || markdownIndex < 0) {
    throw new Error('--input, --json, and --markdown are required')
  }
  const input = JSON.parse(await readFile(resolve(process.argv[inputIndex + 1]), 'utf8'))
  const report = createCandidateReport(input)
  await Promise.all([
    writeFile(resolve(process.argv[jsonIndex + 1]), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(resolve(process.argv[markdownIndex + 1]), renderCandidateReportMarkdown(report)),
  ])
  if (report.status !== 'compatible') process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
