import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateCandidateVersion } from './prepare-dsh-candidate.mjs'

const CHECK_STATUSES = new Set(['passed', 'failed', 'skipped'])
const REPORT_STATUSES = new Set(['candidate', 'blocked'])

function normalizedChecks(checks) {
  if (!Array.isArray(checks) || checks.length === 0) throw new TypeError('candidate checks are required')
  const ids = new Set()
  return checks.map((check) => {
    if (
      check === null
      || typeof check !== 'object'
      || typeof check.id !== 'string'
      || check.id.length === 0
      || check.id.length > 160
      || !CHECK_STATUSES.has(check.status)
      || ids.has(check.id)
    ) {
      throw new TypeError('invalid candidate check result')
    }
    ids.add(check.id)
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

function runtimePackage(evidence) {
  const runtime = evidence?.runtime
  return runtime === null || typeof runtime !== 'object'
    ? null
    : {
      name: runtime.packageName ?? null,
      version: runtime.version ?? null,
      integrity: runtime.integrity ?? null,
      exports: runtime.exports ?? null,
    }
}

function runtimeEvidence(evidence) {
  return {
    package: runtimePackage(evidence),
    peers: evidence?.runtime?.peerDependencies ?? null,
    slots: evidence?.clientSlots?.ids ?? null,
    capabilities: evidence?.provider?.capabilities ?? null,
    patches: evidence?.compatPatches ?? null,
    packagedRuntime: evidence?.packagedRuntimeIdentity ?? null,
  }
}

function patchAssessment({ stableEvidence, candidateEvidence }) {
  const stable = new Set(stableEvidence?.compatPatches?.ids ?? [])
  const candidate = new Set(candidateEvidence?.compatPatches?.ids ?? [])
  const stableVersion = stableEvidence?.runtime?.version
  const candidateVersion = candidateEvidence?.runtime?.version
  return [...new Set([...stable, ...candidate])].toSorted().map((id) => {
    if (!candidate.has(id)) return { id, action: 'review-removal', reason: 'candidate evidence no longer lists this patch' }
    if (!stable.has(id)) return { id, action: 'review-new-patch', reason: 'candidate evidence adds this patch' }
    if (stableVersion !== candidateVersion) {
      return { id, action: 'reverify-or-remove', reason: `runtime changed from ${stableVersion ?? 'unknown'} to ${candidateVersion ?? 'unknown'}` }
    }
    return { id, action: 'retain', reason: 'same runtime evidence retains this patch' }
  })
}

function blockingReasons({ checks, checkoutUnchanged, executionEvidence }) {
  const reasons = checks
    .filter((check) => check.status !== 'passed')
    .map((check) => `${check.id}: ${check.detail ?? check.status}`)
  if (!checkoutUnchanged) reasons.push('stable checkout inputs changed during candidate execution')
  if (executionEvidence?.status === 'blocked' || executionEvidence?.candidate?.status === 'blocked') {
    const reported = executionEvidence?.blockingReasons ?? executionEvidence?.candidate?.blockingReasons
    reasons.push(...(Array.isArray(reported) ? reported : [reported ?? 'candidate execution fixture is blocked']))
  }
  if (executionEvidence?.candidate?.eventSemantics === 'changed') {
    reasons.push('candidate changed completion/cancel event semantics')
  }
  return [...new Set(reasons)].map((reason) => String(reason).slice(0, 2_000))
}

export function createCandidateReport({
  candidateVersion,
  candidateSource = undefined,
  stableEvidence,
  candidateEvidence,
  checks,
  stableHashesBefore,
  stableHashesAfter,
  slotEvidence = undefined,
  executionEvidence = undefined,
} = {}) {
  const version = validateCandidateVersion(candidateVersion)
  const normalized = normalizedChecks(checks)
  const checkoutUnchanged = stableUnchanged(stableHashesBefore, stableHashesAfter)
  const allPassed = normalized.every((check) => check.status === 'passed')
  const executionBlocking = executionEvidence?.status === 'blocked'
    || executionEvidence?.candidate?.status === 'blocked'
    || executionEvidence?.candidate?.eventSemantics === 'changed'
  const reportStatus = allPassed && checkoutUnchanged && !executionBlocking ? 'candidate' : 'blocked'
  const stableRuntimeEvidence = runtimeEvidence(stableEvidence)
  const candidateRuntimeEvidence = runtimeEvidence(candidateEvidence)
  const slots = slotEvidence ?? {
    stable: stableRuntimeEvidence.slots ?? [],
    candidate: candidateRuntimeEvidence.slots ?? [],
  }
  const reasons = blockingReasons({ checks: normalized, checkoutUnchanged, executionEvidence })
  const patches = patchAssessment({ stableEvidence, candidateEvidence })
  return {
    schemaVersion: 2,
    status: reportStatus,
    outcome: reportStatus === 'candidate' ? 'compatible' : 'blocked',
    candidateVersion: version,
    ...(typeof candidateSource === 'string' && candidateSource.trim().length > 0 ? { candidateSource: candidateSource.trim().slice(0, 128) } : {}),
    stableVersion: stableEvidence?.runtime?.version,
    stableDesktopVersion: stableEvidence?.desktop?.version ?? null,
    candidateDesktopVersion: candidateEvidence?.desktop?.version ?? null,
    stableCheckoutUnchanged: checkoutUnchanged,
    recommendation: reportStatus === 'candidate' ? 'open-independent-upgrade-pr' : 'hold-candidate',
    checks: normalized,
    blockingReasons: reasons,
    patchAssessment: patches,
    evidence: {
      stable: stableRuntimeEvidence,
      candidate: candidateRuntimeEvidence,
      cwd: {
        stable: executionEvidence?.stable?.sessionCwd ?? null,
        candidate: executionEvidence?.candidate?.sessionCwd ?? null,
        eventSemantics: executionEvidence?.candidate?.eventSemantics ?? 'not-run',
      },
    },
    differences: {
      package: difference(stableRuntimeEvidence.package, candidateRuntimeEvidence.package),
      packageExports: difference(stableEvidence?.runtime?.exports, candidateEvidence?.runtime?.exports),
      apiExports: difference(stableEvidence?.runtime?.exports, candidateEvidence?.runtime?.exports),
      peers: difference(stableRuntimeEvidence.peers, candidateRuntimeEvidence.peers),
      slots: difference(slots.stable, slots.candidate),
      capabilities: difference(stableRuntimeEvidence.capabilities, candidateRuntimeEvidence.capabilities),
      patches: difference(stableRuntimeEvidence.patches, candidateRuntimeEvidence.patches),
      packagedRuntime: difference(stableRuntimeEvidence.packagedRuntime, candidateRuntimeEvidence.packagedRuntime),
    },
    execution: executionEvidence ?? {
      status: 'not-run',
      gate: 'CWD/event semantics required for isolated Worktree execution',
    },
  }
}

function markdown(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function evidenceSummary(value) {
  if (value === null || value === undefined) return 'not-run'
  const serialized = JSON.stringify(value)
  return serialized.length > 1_800 ? `${serialized.slice(0, 1_797)}...` : serialized
}

export function renderCandidateReportMarkdown(report) {
  if (!REPORT_STATUSES.has(report?.status)) throw new TypeError('candidate report status is invalid')
  const lines = [
    `# DSH Candidate Matrix: ${report.candidateVersion}`,
    '',
    `Result: **${report.status}** (${report.outcome}).`,
    '',
    ...(report.candidateSource === undefined ? [] : [`Candidate source: ${markdown(report.candidateSource)}.`, '']),
    `Stable runtime: ${report.stableVersion ?? 'unavailable'}.`,
    '',
    `Desktop version: Stable ${report.stableDesktopVersion ?? 'unavailable'}; candidate build ${report.candidateDesktopVersion ?? 'unavailable'}.`,
    '',
    `Stable checkout unchanged: ${report.stableCheckoutUnchanged ? 'yes' : 'no'}.`,
    '',
    `Recommendation: ${report.recommendation}.`,
    '',
    'This report is diagnostic only. It does not update stable dependencies, the lockfile, releases, updater metadata, or the tracked checkout.',
    '',
    'Candidate evidence compares package, peers, client slots, provider capabilities, CWD/event semantics, compatibility patches, and packaged runtime identity. Session CWD and completion/cancel event semantics remain gates for isolated Worktree execution. A candidate remains a candidate until a separate reviewed upgrade change promotes it.',
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
    '## Runtime and execution evidence',
    '',
    `| Stable package | ${markdown(report.evidence?.stable?.package?.name)}@${markdown(report.evidence?.stable?.package?.version)} |`,
    `| Candidate package | ${markdown(report.evidence?.candidate?.package?.name)}@${markdown(report.evidence?.candidate?.package?.version)} |`,
    `| Stable slots | ${markdown((report.evidence?.stable?.slots ?? []).join(', ') || 'not-run')} |`,
    `| Candidate slots | ${markdown((report.evidence?.candidate?.slots ?? []).join(', ') || 'not-run')} |`,
    `| Stable peers | ${markdown(evidenceSummary(report.evidence?.stable?.peers))} |`,
    `| Candidate peers | ${markdown(evidenceSummary(report.evidence?.candidate?.peers))} |`,
    `| Stable capabilities | ${markdown(evidenceSummary(report.evidence?.stable?.capabilities))} |`,
    `| Candidate capabilities | ${markdown(evidenceSummary(report.evidence?.candidate?.capabilities))} |`,
    `| Stable patches | ${markdown(evidenceSummary(report.evidence?.stable?.patches?.ids))} |`,
    `| Candidate patches | ${markdown(evidenceSummary(report.evidence?.candidate?.patches?.ids))} |`,
    `| Candidate CWD | ${markdown(report.evidence?.cwd?.candidate ?? 'not-run')} |`,
    `| Candidate events | ${markdown(report.evidence?.cwd?.eventSemantics ?? 'not-run')} |`,
    `| Candidate packaged CLI | ${markdown(report.evidence?.candidate?.packagedRuntime?.cli ?? 'not-run')} |`,
    `| Packaged runtime changed | ${report.differences.packagedRuntime.changed ? 'yes' : 'no'} |`,
    '',
    '## Compatibility patch assessment',
    '',
    '| Patch | Candidate action | Reason |',
    '| --- | --- | --- |',
    ...report.patchAssessment.map((patch) => `| ${markdown(patch.id)} | ${markdown(patch.action)} | ${markdown(patch.reason)} |`),
    '',
    ...(report.blockingReasons.length === 0 ? [] : ['## Blocking reasons', '', ...report.blockingReasons.map((reason) => `- ${markdown(reason)}`), '']),
  ]
  return `${lines.join('\n')}\n`
}

async function atomicWrite(path, content) {
  const target = resolve(path)
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`
  const backup = `${target}.bak-${process.pid}-${Date.now()}`
  await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' })
  let movedExisting = false
  try {
    await rename(target, backup)
    movedExisting = true
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  try {
    await rename(temporary, target)
    if (movedExisting) await rm(backup, { force: true })
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {})
    if (movedExisting) {
      await rm(target, { force: true }).catch(() => {})
      await rename(backup, target)
    }
    throw error
  }
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
  const json = `${JSON.stringify(report, null, 2)}\n`
  const markdownOutput = renderCandidateReportMarkdown(report)
  JSON.parse(json)
  await Promise.all([
    atomicWrite(resolve(process.argv[jsonIndex + 1]), json),
    atomicWrite(resolve(process.argv[markdownIndex + 1]), markdownOutput),
  ])
  if (report.status !== 'candidate') process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
