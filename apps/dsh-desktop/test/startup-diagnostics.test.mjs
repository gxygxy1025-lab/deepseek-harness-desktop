import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  collectStartupDiagnostics,
  exportStartupDiagnostics,
  redactDiagnosticText,
  redactDiagnosticValue,
  startupDiagnosticsFilename,
  writeStartupDiagnostics,
} from '../src/startup-diagnostics.mjs'

const aliceDshHome = 'C:\\Users\\Alice\\.dsh'
const redactionRoots = [{ path: aliceDshHome, replacement: '<dsh-home>' }]

test('startup diagnostic redaction removes credentials and account paths from text and structured values', () => {
  const text = redactDiagnosticText(
    'Authorization: Bearer bearer-secret NPM_TOKEN=npm-secret DSH_DESKTOP_WORKSPACE_FILE_OPEN_TOKEN=host-secret token=generic-secret https://alice:pass@example.test/a?api_key=query-secret C:\\Users\\Alice\\.dsh\\profile',
    { redactionRoots },
  )
  assert.match(text, /Authorization: Bearer \[redacted\]/u)
  assert.match(text, /NPM_TOKEN=\[redacted\]/u)
  assert.match(text, /DSH_DESKTOP_WORKSPACE_FILE_OPEN_TOKEN=\[redacted\]/u)
  assert.match(text, /token=\[redacted\]/u)
  assert.match(text, /https:\/\/\[redacted\]@example\.test/u)
  assert.match(text, /api_key=\[redacted\]/u)
  assert.match(text, /<dsh-home>\\profile/u)
  assert.doesNotMatch(text, /bearer-secret|npm-secret|host-secret|generic-secret|query-secret|Alice|pass/u)

  const value = redactDiagnosticValue({
    apiKey: 'key-secret',
    nested: { qqbotSecret: 'qq-secret', path: `${aliceDshHome}\\profiles\\desktop` },
  }, { redactionRoots })
  assert.deepEqual(value.apiKey, '[redacted]')
  assert.deepEqual(value.nested.qqbotSecret, '[redacted]')
  assert.match(value.nested.path, /<dsh-home>/u)
})

test('startup diagnostic package combines runtime, startup log, recovery, and plugin inventory without raw private data', async () => {
  const diagnostics = await collectStartupDiagnostics({
    application: {
      productName: 'DeepSeek Harness Desktop',
      version: '2.7.0',
      platform: 'win32',
      runtimeVersion: '0.1.0-rc.7',
    },
    controller: {
      status: {
        state: 'starting',
        error: `Cannot find package at ${aliceDshHome}\\profiles\\desktop; OPENAI_API_KEY=openai-secret`,
        restartAttempt: 2,
        url: 'http://127.0.0.1:43125/',
      },
    },
    pluginRecovery: {
      getDiagnostics: async () => ({
        recovery: { safeMode: false },
        profile: {
          dependencies: {
            '@community/broken': `file:${aliceDshHome}\\plugins\\broken`,
          },
          enabledBundles: ['@community/broken'],
        },
      }),
    },
    pluginManager: {
      inventory: async () => [{
        name: '@community/broken',
        requested: `file:${aliceDshHome}\\plugins\\broken`,
        version: '1.0.0',
        enabled: true,
        compatibility: { status: 'unknown', token: 'plugin-token' },
      }],
    },
    logStore: {
      tail: async () => `runtime line Authorization: Bearer log-secret ${aliceDshHome}\\logs\\runtime.log`,
    },
    now: () => new Date('2026-08-20T01:02:03.000Z'),
    redactionRoots,
  })

  assert.equal(diagnostics.schemaVersion, 1)
  assert.equal(diagnostics.generatedAt, '2026-08-20T01:02:03.000Z')
  assert.equal(diagnostics.runtime.state, 'starting')
  assert.equal(diagnostics.runtime.restartAttempt, 2)
  assert.equal(diagnostics.plugins[0].name, '@community/broken')
  assert.match(diagnostics.startup.recentRuntimeLog, /Authorization: Bearer \[redacted\]/u)
  const serialized = JSON.stringify(diagnostics)
  assert.doesNotMatch(serialized, /openai-secret|plugin-token|log-secret|Alice|43125/u)
  assert.match(serialized, /<dsh-home>/u)
})

test('a stalled recovery or inventory collector is recorded instead of blocking startup diagnostic export', async () => {
  const diagnostics = await collectStartupDiagnostics({
    controller: { status: { state: 'starting' } },
    pluginRecovery: { getDiagnostics: async () => await new Promise(() => {}) },
    pluginManager: { inventory: async () => [{ name: '@community/available' }] },
    logStore: { tail: async () => '[startup] shell-ready=10ms' },
    collectionTimeoutMs: 5,
  })
  assert.equal(diagnostics.runtime.state, 'starting')
  assert.equal(diagnostics.plugins[0].name, '@community/available')
  assert.ok(diagnostics.collectionIssues.some((item) => item.source === 'plugin-recovery' && /timed out/u.test(item.message)))
})

test('export asks for a user destination and writes an atomic shareable package without exposing its path to the renderer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-startup-diagnostics-'))
  const target = join(directory, 'report.json')
  const saveCalls = []
  const logLines = []
  try {
    const result = await exportStartupDiagnostics({
      dialog: {
        showSaveDialog: async (_window, options) => {
          saveCalls.push(options)
          return { canceled: false, filePath: target }
        },
      },
      getWindow: () => undefined,
      downloadsDirectory: directory,
      controller: { status: { state: 'crashed', error: 'QQBOT_SECRET=not-for-export' } },
      pluginRecovery: { getDiagnostics: async () => ({ profile: { dependencies: {} } }) },
      pluginManager: { inventory: async () => [] },
      logStore: {
        tail: async () => '[process] exited code=-1',
        append: async (line) => { logLines.push(line) },
      },
      now: () => new Date('2026-08-20T01:02:03.000Z'),
      redactionRoots,
    })
    assert.deepEqual(result, { canceled: false, exported: true })
    assert.equal(Object.hasOwn(result, 'filePath'), false)
    assert.equal(saveCalls.length, 1)
    assert.equal(saveCalls[0].title, '导出启动诊断日志')
    assert.equal(saveCalls[0].defaultPath, join(directory, startupDiagnosticsFilename(new Date('2026-08-20T01:02:03.000Z'))))
    assert.equal(saveCalls[0].showOverwriteConfirmation, true)
    assert.ok(logLines.some((line) => line.includes('startup diagnostic package exported')))
    const written = await readFile(target, 'utf8')
    assert.doesNotMatch(written, /not-for-export/u)
    assert.match(written, /\[redacted\]/u)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('canceling the save dialog returns promptly without waiting for unavailable runtime collectors', async () => {
  let collected = false
  const result = await exportStartupDiagnostics({
    dialog: { showSaveDialog: async () => ({ canceled: true }) },
    pluginRecovery: {
      getDiagnostics: async () => {
        collected = true
        throw new Error('must not collect after cancellation')
      },
    },
  })
  assert.deepEqual(result, { canceled: true })
  assert.equal(collected, false)
})

test('save-dialog errors are redacted and do not expose native paths to the startup page', async () => {
  const logLines = []
  await assert.rejects(
    exportStartupDiagnostics({
      dialog: {
        showSaveDialog: async () => {
          throw new Error(`dialog failed at ${aliceDshHome}\\Downloads with token=dialog-secret`)
        },
      },
      logStore: { append: async (line) => { logLines.push(line) } },
      redactionRoots,
    }),
    /无法打开诊断日志保存窗口/u,
  )
  assert.equal(logLines.length, 1)
  assert.match(logLines[0], /save dialog failed/u)
  assert.doesNotMatch(logLines[0], /Alice|dialog-secret/u)
})

test('write failures are logged in redacted form and return a stable user-facing error', async () => {
  const logLines = []
  await assert.rejects(
    exportStartupDiagnostics({
      dialog: { showSaveDialog: async () => ({ canceled: false, filePath: 'C:\\Users\\Alice\\Downloads\\report.json' }) },
      controller: { status: { state: 'crashed' } },
      pluginRecovery: { getDiagnostics: async () => ({ profile: { dependencies: {} } }) },
      pluginManager: { inventory: async () => [] },
      logStore: {
        tail: async () => '',
        append: async (line) => { logLines.push(line) },
      },
      redactionRoots,
      writeDiagnostics: async () => {
        throw new Error(`EACCES: OPENAI_API_KEY=writer-secret ${aliceDshHome}\\diagnostics`)
      },
    }),
    /无法导出诊断日志/u,
  )
  assert.equal(logLines.length, 1)
  assert.match(logLines[0], /startup diagnostic export failed/u)
  assert.doesNotMatch(logLines[0], /writer-secret|Alice/u)
  assert.match(logLines[0], /OPENAI_API_KEY=\[redacted\]|<dsh-home>/u)
})

test('atomic startup diagnostic writer restores an existing file when replacement cannot complete', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-startup-diagnostics-atomic-'))
  const target = join(directory, 'report.json')
  const original = '{"previous":true}\n'
  let renameCalls = 0
  try {
    await writeStartupDiagnostics(target, original)
    const fileSystem = {
      mkdir: async () => {},
      writeFile: async () => {},
      rename: async (...args) => {
        renameCalls += 1
        if (renameCalls === 1) return await import('node:fs/promises').then(({ rename }) => rename(...args))
        if (renameCalls === 2) throw new Error('target replace failed')
        return await import('node:fs/promises').then(({ rename }) => rename(...args))
      },
      rm: async (...args) => await import('node:fs/promises').then(({ rm }) => rm(...args)),
    }
    await assert.rejects(
      writeStartupDiagnostics(target, '{"next":true}\n', {
        fileSystem,
        randomId: (() => {
          let value = 0
          return () => `id-${value++}`
        })(),
      }),
      /target replace failed/u,
    )
    assert.equal(await readFile(target, 'utf8'), original)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
