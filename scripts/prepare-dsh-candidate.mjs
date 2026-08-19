import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPOSITORY_ROOT = resolve(SCRIPT_DIR, '..')

export function validateCandidateVersion(value) {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(value)) {
    throw new TypeError('candidate DSH version must be exact')
  }
  return value
}

function exactResolvedVersion(value, packageName) {
  const values = Array.isArray(value) ? value : [value]
  const exact = values.filter((item) => typeof item === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(item))
  if (exact.length === 0) throw new Error(`registry did not resolve an exact version for ${packageName}`)
  return exact.at(-1)
}

export async function createCandidateInstallPlan({ candidateVersion, viewManifest, resolvePeerVersion }) {
  const version = validateCandidateVersion(candidateVersion)
  if (typeof viewManifest !== 'function' || typeof resolvePeerVersion !== 'function') {
    throw new TypeError('candidate registry readers are required')
  }
  const manifest = await viewManifest(version)
  if (manifest?.name !== '@deepseek-ai/dsh' || manifest.version !== version) {
    throw new Error('candidate registry manifest identity does not match the requested DSH version')
  }
  const peers = []
  for (const [name, range] of Object.entries(manifest.peerDependencies ?? {}).toSorted(([left], [right]) => left.localeCompare(right))) {
    if (typeof range !== 'string' || range.length === 0) throw new Error(`candidate peer range is invalid for ${name}`)
    const resolved = exactResolvedVersion(await resolvePeerVersion(name, range), name)
    peers.push({ name, range, version: resolved, spec: `${name}@${resolved}` })
  }
  return {
    candidate: { name: manifest.name, version, spec: `${manifest.name}@${version}` },
    peers,
  }
}

function run(command, args, { cwd = REPOSITORY_ROOT, capture = false } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', capture ? 'pipe' : 'inherit', capture ? 'pipe' : 'inherit'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (chunk) => { stdout += chunk.toString('utf8') })
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString('utf8') })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolvePromise(capture ? stdout : undefined)
      else reject(new Error(`${command} exited with code ${String(code)}${stderr ? `: ${stderr.slice(-2_000)}` : ''}`))
    })
  })
}

async function viewJson(spec, field) {
  const output = await run('pnpm', ['view', spec, ...(field ? [field] : []), '--json'], { capture: true })
  return JSON.parse(output)
}

async function main() {
  const versionIndex = process.argv.indexOf('--version')
  if (versionIndex < 0) throw new Error('--version is required')
  const version = validateCandidateVersion(process.argv[versionIndex + 1])
  const plan = await createCandidateInstallPlan({
    candidateVersion: version,
    viewManifest: (candidateVersion) => viewJson(`@deepseek-ai/dsh@${candidateVersion}`),
    resolvePeerVersion: (name, range) => viewJson(`${name}@${range}`, 'version'),
  })
  await run('pnpm', ['--filter', '@deepseek-ai/dsh-desktop', 'add', plan.candidate.spec, '--save-exact'])
  if (plan.peers.length > 0) {
    await run('pnpm', [
      '--filter',
      '@deepseek-ai/dsh-desktop',
      'add',
      ...plan.peers.map((peer) => peer.spec),
      '--save-exact',
    ])
  }
  console.log(JSON.stringify(plan, null, 2))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
