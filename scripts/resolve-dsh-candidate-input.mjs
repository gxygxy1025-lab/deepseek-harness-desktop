import { appendFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateCandidateVersion } from './prepare-dsh-candidate.mjs'

export function resolveCandidateWorkflowInput({ dispatchVersion = undefined, queuedVersion = null } = {}) {
  if (dispatchVersion !== undefined && dispatchVersion !== null && String(dispatchVersion).trim() !== '') {
    return Object.freeze({ shouldRun: true, source: 'workflow_dispatch', version: validateCandidateVersion(String(dispatchVersion).trim()) })
  }
  if (queuedVersion === null || queuedVersion === undefined || queuedVersion === '') {
    return Object.freeze({ shouldRun: false, source: 'scheduled-queue-empty', version: null })
  }
  return Object.freeze({ shouldRun: true, source: 'scheduled-queue', version: validateCandidateVersion(queuedVersion) })
}

export function parseCandidateQueue(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1) {
    throw new TypeError('candidate queue schemaVersion must be 1')
  }
  const keys = Object.keys(value)
  if (keys.length !== 2 || !keys.includes('schemaVersion') || !keys.includes('candidateVersion')) {
    throw new TypeError('candidate queue contains unsupported fields')
  }
  if (value.candidateVersion !== null) validateCandidateVersion(value.candidateVersion)
  return value.candidateVersion
}

function argumentValue(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const queuePath = argumentValue('--queue')
  const githubOutput = argumentValue('--github-output')
  if (!queuePath || !githubOutput) throw new Error('--queue and --github-output are required')
  const queuedVersion = parseCandidateQueue(JSON.parse(await readFile(resolve(queuePath), 'utf8')))
  const result = resolveCandidateWorkflowInput({ dispatchVersion: argumentValue('--input'), queuedVersion })
  await appendFile(resolve(githubOutput), [
    `should_run=${result.shouldRun ? 'true' : 'false'}`,
    `candidate_version=${result.version ?? ''}`,
    `candidate_source=${result.source}`,
    '',
  ].join('\n'), 'utf8')
  console.log(JSON.stringify(result))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
