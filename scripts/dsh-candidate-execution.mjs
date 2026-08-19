#!/usr/bin/env node
/**
 * Deterministic Desktop 2.6 Candidate execution fixture.
 *
 * It deliberately speaks the Runtime Provider boundary only. The same temp
 * repository/worktree path is exercised by Known Good and Candidate; a
 * Candidate failure produces a report and never edits Stable inputs.
 */
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const REQUIRED = ['workspace.register', 'session.create', 'session.observe']
const execFileAsync = promisify(execFile)

async function git(cwd, ...args) {
  const result = await execFileAsync(process.platform === 'win32' ? 'git.exe' : 'git', args, { cwd, windowsHide: true, maxBuffer: 1 << 20 })
  return result.stdout.trim()
}

function exactId(value, label) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(value)) throw new TypeError(`${label} is invalid`)
  return value
}

class DeterministicSession {
  constructor({ sessionId, workspaceId, cwd, autoComplete = true }) {
    this.sessionId = sessionId
    this.workspaceId = workspaceId
    this.cwd = cwd
    this.autoComplete = autoComplete
    this.listeners = new Set()
    this.events = []
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(event) {
    this.events.push({ type: event.type, resultStatus: event.resultStatus })
    for (const listener of [...this.listeners]) listener(event)
  }

  async prompt() {
    if (this.autoComplete) queueMicrotask(() => this.emit({ type: 'completed', resultStatus: 'succeeded' }))
    return { ok: true }
  }

  async cancel() {
    this.emit({ type: 'cancelled', resultStatus: 'cancelled' })
  }
}

export class DeterministicExecutionProvider {
  constructor({ providerId, capabilities = REQUIRED, cwdMode = 'exact', autoComplete = true } = {}) {
    this.providerId = providerId ?? 'fixture-provider'
    this.capabilities = capabilities.map(id => ({ id, status: 'available' }))
    this.cwdMode = cwdMode
    this.autoComplete = autoComplete
    this.workspaces = new Map()
    this.sessions = new Map()
    this.createCount = 0
  }

  probe() {
    return { providerId: this.providerId, supportStatus: 'known-good', capabilities: this.capabilities }
  }

  async registerWorkspace({ workspaceId, worktreeId, cwd }) {
    exactId(workspaceId, 'workspaceId')
    exactId(worktreeId, 'worktreeId')
    this.workspaces.set(worktreeId, { workspaceId, cwd })
    return { workspaceId: `${workspaceId}-registered` }
  }

  async createSession({ workspaceId, runId, worktreeId, cwd }) {
    this.createCount += 1
    const sessionId = `session-${runId}-${this.createCount}`
    const actualCwd = this.cwdMode === 'shared' ? dirname(cwd) : cwd
    const session = new DeterministicSession({ sessionId, workspaceId, cwd: actualCwd, autoComplete: this.autoComplete })
    this.sessions.set(sessionId, session)
    return session
  }

  async getSession(sessionId) {
    return this.sessions.get(sessionId)
  }
}

async function makeTemporaryGitRepo() {
  // Both providers receive real Git Worktrees created from this one stable
  // repository. The provider never receives the main checkout as its CWD.
  const root = await mkdtemp(join(tmpdir(), 'dsh-candidate-execution-'))
  const repoRoot = join(root, 'repo')
  const worktreesRoot = join(root, 'worktrees')
  await mkdir(repoRoot, { recursive: true })
  await mkdir(worktreesRoot, { recursive: true })
  await writeFile(join(repoRoot, 'README.md'), 'candidate fixture\n', 'utf8')
  await git(repoRoot, 'init')
  await git(repoRoot, 'config', 'user.email', 'candidate@example.invalid')
  await git(repoRoot, 'config', 'user.name', 'DSH Candidate Fixture')
  await git(repoRoot, 'add', 'README.md')
  await git(repoRoot, 'commit', '-m', 'fixture base')
  await git(repoRoot, 'branch', '-M', 'main')
  return {
    root,
    repoRoot: await realpath(repoRoot),
    worktreesRoot: await realpath(worktreesRoot),
    initialHead: await git(repoRoot, 'rev-parse', 'HEAD'),
    initialBranch: await git(repoRoot, 'rev-parse', '--abbrev-ref', 'HEAD'),
    initialReadme: await readFile(join(repoRoot, 'README.md'), 'utf8'),
  }
}

function check(id, status, detail) {
  return { id, status, ...(detail === undefined ? {} : { detail: String(detail).slice(0, 2_000) }) }
}

function normalizedPath(value) {
  return resolve(value).replaceAll('\\', '/').toLowerCase()
}

async function runProviderFixture(provider, repository, label) {
  const capabilities = provider.probe()
  const statuses = new Map(capabilities.capabilities.map(item => [item.id, item.status]))
  const missing = REQUIRED.filter(id => statuses.get(id) !== 'available')
  if (missing.length > 0) {
    return {
      label,
      status: 'blocked',
      safeDegradation: 'shared-workspace',
      blockingReasons: [`missing Runtime Provider capability: ${missing.join(', ')}`],
      checks: [check('provider-capabilities', 'failed', missing.join(', ')), check('shared-workspace-fallback', 'passed', '2.6 worktree path is not attempted')],
      sessionCwd: undefined,
      eventSemantics: 'not-run',
      createCount: provider.createCount,
      actualWorktree: false,
    }
  }
  const worktreeId = `worktree-${label}`
  const branch = `dsh/candidate/${label}`
  const requestedPath = join(repository.worktreesRoot, label)
  await git(repository.repoRoot, 'worktree', 'add', '-b', branch, requestedPath, 'main')
  const worktreePath = await realpath(requestedPath)
  try {
    const listedWorktrees = (await git(repository.repoRoot, 'worktree', 'list', '--porcelain'))
      .split(/\r?\n/u)
      .filter(line => line.startsWith('worktree '))
      .map(line => normalizedPath(line.slice('worktree '.length)))
    const actualWorktree = normalizedPath(await git(worktreePath, 'rev-parse', '--show-toplevel')) === normalizedPath(worktreePath)
      && listedWorktrees.includes(normalizedPath(worktreePath))
    const registered = await provider.registerWorkspace({ workspaceId: 'workspace-1', worktreeId, cwd: worktreePath })
    const session = await provider.createSession({ workspaceId: registered.workspaceId, runId: `${label}-run`, worktreeId, cwd: worktreePath })
    const events = []
    const unsubscribe = session.subscribe(event => { if (event.type === 'completed' || event.type === 'failed' || event.type === 'cancelled') events.push(event.type) })
    await session.prompt('deterministic candidate prompt')
    await new Promise(resolvePromise => setImmediate(resolvePromise))
    unsubscribe()
    const cwdOk = resolve(session.cwd) === resolve(worktreePath)
    const eventOk = events.includes('completed')
    const cancelSession = await provider.createSession({ workspaceId: registered.workspaceId, runId: `${label}-cancel`, worktreeId, cwd: worktreePath })
    const cancelEvents = []
    cancelSession.subscribe(event => cancelEvents.push(event.type))
    await cancelSession.cancel()
    const createCountBeforeReconcile = provider.createCount
    const restartSession = await provider.getSession(session.sessionId)
    const restartOk = restartSession?.sessionId === session.sessionId && provider.createCount === createCountBeforeReconcile
    const mainUnchanged = await stableCheckoutUnchanged(repository)
    const checks = [
      check('provider-capabilities', 'passed'),
      check('real-git-worktree', actualWorktree ? 'passed' : 'failed', worktreePath),
      check('register-workspace', 'passed'),
      check('session-create', 'passed'),
      check('session-cwd', cwdOk ? 'passed' : 'failed', `expected ${worktreePath}, got ${session.cwd}`),
      check('event-completion', eventOk ? 'passed' : 'failed', events.join(',')),
      check('cancel', cancelEvents.includes('cancelled') ? 'passed' : 'failed'),
      check('restart-reconcile', restartOk ? 'passed' : 'failed'),
      check('stable-checkout-unchanged', mainUnchanged ? 'passed' : 'failed'),
    ]
    const failures = checks.filter(item => item.status === 'failed')
    return {
      label,
      status: failures.length === 0 ? 'passed' : 'blocked',
      safeDegradation: failures.length === 0 ? undefined : 'shared-workspace',
      blockingReasons: failures.map(item => `${item.id}: ${item.detail ?? 'failed'}`),
      checks,
      sessionCwd: session.cwd,
      eventSemantics: eventOk ? 'completion-event' : 'changed',
      createCount: provider.createCount,
      actualWorktree,
    }
  } finally {
    await git(repository.repoRoot, 'worktree', 'remove', '--force', worktreePath).catch(() => {})
    await git(repository.repoRoot, 'branch', '-D', branch).catch(() => {})
  }
}

async function stableCheckoutUnchanged(repository) {
  return await git(repository.repoRoot, 'rev-parse', 'HEAD') === repository.initialHead
    && await git(repository.repoRoot, 'rev-parse', '--abbrev-ref', 'HEAD') === repository.initialBranch
    && await git(repository.repoRoot, 'status', '--porcelain') === ''
    && await readFile(join(repository.repoRoot, 'README.md'), 'utf8') === repository.initialReadme
}

export async function runCandidateExecutionFixture({ knownGood, candidate, keepTemporary = false } = {}) {
  const repository = await makeTemporaryGitRepo()
  try {
    const stableProvider = knownGood ?? new DeterministicExecutionProvider({ providerId: 'known-good' })
    const candidateProvider = candidate ?? new DeterministicExecutionProvider({ providerId: 'candidate' })
    const stable = await runProviderFixture(stableProvider, repository, 'known-good')
    const candidateReport = await runProviderFixture(candidateProvider, repository, 'candidate')
    const checkoutUnchanged = await stableCheckoutUnchanged(repository)
    const status = stable.status === 'passed' && candidateReport.status === 'passed' ? 'compatible' : candidateReport.status === 'blocked' ? 'blocked' : 'failed'
    return {
      schemaVersion: 1,
      status,
      repoRoot: repository.repoRoot,
      stableCheckoutUnchanged: checkoutUnchanged,
      requiredSemantics: ['provider capabilities', 'real Git Worktree', 'registerWorkspace', 'createSession', 'Session CWD', 'completion/cancel events', 'restart reconcile'],
      stable,
      candidate: candidateReport,
      safeDegradation: candidateReport.safeDegradation,
      blockingReasons: candidateReport.blockingReasons,
    }
  } finally {
    if (!keepTemporary) await rm(repository.root, { recursive: true, force: true })
  }
}

export function renderCandidateExecutionMarkdown(report) {
  const lines = [
    `# DSH Candidate execution fixture: ${report.status}`,
    '',
    `Stable checkout unchanged: ${report.stableCheckoutUnchanged ? 'yes' : 'no'}.`,
    '',
    'A real Git Worktree CWD and event semantics are compatibility gates for Desktop 2.6 Worktree execution.',
    '',
    '| Provider | Status | CWD | Events |',
    '| --- | --- | --- | --- |',
    `| Known Good | ${report.stable.status} | ${report.stable.sessionCwd ?? 'not-run'} | ${report.stable.eventSemantics} |`,
    `| Candidate | ${report.candidate.status} | ${report.candidate.sessionCwd ?? 'not-run'} | ${report.candidate.eventSemantics} |`,
    '',
    `Safe degradation: ${report.safeDegradation ?? 'none'}.`,
    '',
    ...(report.blockingReasons.length === 0 ? [] : ['Blocking reasons:', ...report.blockingReasons.map(reason => `- ${reason}`), '']),
  ]
  return `${lines.join('\n')}\n`
}

async function main() {
  const jsonIndex = process.argv.indexOf('--json')
  const markdownIndex = process.argv.indexOf('--markdown')
  const report = await runCandidateExecutionFixture()
  if (jsonIndex >= 0) await writeFile(resolve(process.argv[jsonIndex + 1]), `${JSON.stringify(report, null, 2)}\n`)
  if (markdownIndex >= 0) await writeFile(resolve(process.argv[markdownIndex + 1]), renderCandidateExecutionMarkdown(report))
  if (jsonIndex < 0 && markdownIndex < 0) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status !== 'compatible') process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
