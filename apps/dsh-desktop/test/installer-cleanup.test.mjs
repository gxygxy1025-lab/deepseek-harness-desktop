import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const desktopRoot = join(import.meta.dirname, '..')

test('NSIS preflight cleans only stale processes owned by the previous install', async () => {
  const config = await readFile(join(desktopRoot, 'electron-builder.yml'), 'utf8')
  const include = await readFile(join(desktopRoot, 'build', 'installer.nsh'), 'utf8')
  const cleanup = await readFile(join(desktopRoot, 'build', 'cleanup-stale-processes.ps1'), 'utf8')

  assert.match(config, /include: build\/installer\.nsh/u)
  assert.match(include, /customInit/u)
  assert.match(include, /cleanup-stale-processes\.ps1/u)
  assert.match(cleanup, /DeepSeek Harness Desktop\.exe/u)
  assert.match(cleanup, /StartsWith\(\$resourcePrefix, \$comparison\)/u)
  assert.match(cleanup, /GetCimInstance|Get-CimInstance/u)
  assert.match(cleanup, /Sort-Object[\s\S]*Descending/u)
  assert.match(cleanup, /for \(\$attempt = 0; \$attempt -lt \$maxAttempts/u)
  assert.match(cleanup, /Start-Sleep -Milliseconds/u)
  assert.match(cleanup, /exit 32/u)
  assert.match(include, /IDRETRY cleanup_retry/u)
  assert.match(include, /StrCmp \$0 "0" cleanup_done/u)
  assert.doesNotMatch(cleanup, /taskkill|\/IM\s|ProcessName/u)
})

test('Windows installer preflight terminates an exact-path owned process', {
  skip: process.platform !== 'win32',
  timeout: 15_000,
}, async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-installer-cleanup-'))
  const executable = join(temporary, 'DeepSeek Harness Desktop.exe')
  let ownedProcess
  try {
    await copyFile(process.execPath, executable)
    ownedProcess = spawn(executable, ['-e', 'setInterval(() => {}, 1000)'], {
      windowsHide: true,
      stdio: 'ignore',
    })
    await once(ownedProcess, 'spawn')
    const ownedExit = once(ownedProcess, 'exit')
    const cleanupProcess = spawn(
      'powershell.exe',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        join(desktopRoot, 'build', 'cleanup-stale-processes.ps1'),
        '-InstallDirectory',
        temporary,
      ],
      { windowsHide: true, stdio: 'ignore' },
    )
    const [cleanupExitCode] = await once(cleanupProcess, 'exit')
    assert.equal(cleanupExitCode, 0)
    const [ownedExitCode] = await ownedExit
    assert.notEqual(ownedExitCode, 0)
  } finally {
    if (ownedProcess?.exitCode === null) ownedProcess.kill('SIGKILL')
    await rm(temporary, { recursive: true, force: true })
  }
})
