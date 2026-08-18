import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const desktopRoot = join(import.meta.dirname, '..')
const execFileAsync = promisify(execFile)

async function settleWithin(promise, timeoutMs, message) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function describeWindowsProcesses(ownedProcesses) {
  const traceCommand = [
    "$rows = foreach ($processId in ($env:DSH_TRACE_PIDS -split ',')) {",
    '  $dotnet = Get-Process -Id ([int] $processId) -ErrorAction SilentlyContinue',
    '  $cim = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue',
    '  [pscustomobject]@{ ProcessId = $processId; ProcessName = $dotnet.ProcessName; DotNetPath = $dotnet.Path; CimName = $cim.Name; CimPath = $cim.ExecutablePath }',
    '}',
    '$rows | ConvertTo-Json -Compress',
  ].join('; ')
  try {
    const { stdout, stderr } = await execFileAsync(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', traceCommand],
      {
        env: {
          ...process.env,
          DSH_TRACE_PIDS: ownedProcesses.map(({ child }) => child.pid).join(','),
        },
        timeout: 5_000,
        windowsHide: true,
      },
    )
    const expected = ownedProcesses.map(({ child }) => child.spawnfile).join(' | ')
    return `expected=${expected}; observed=${stdout.trim() || '<empty>'}; stderr=${stderr.trim() || '<empty>'}`
  } catch (error) {
    return `process trace unavailable: ${error.message}`
  }
}

test('NSIS preflight cleans only stale processes owned by the previous install', async () => {
  const config = await readFile(join(desktopRoot, 'electron-builder.yml'), 'utf8')
  const include = await readFile(join(desktopRoot, 'build', 'installer.nsh'), 'utf8')
  const cleanup = await readFile(join(desktopRoot, 'build', 'cleanup-stale-processes.ps1'), 'utf8')

  assert.match(config, /include: build\/installer\.nsh/u)
  assert.match(config, /from: build\/update-shutdown-v1[\s\S]*to: update-shutdown-v1/u)
  assert.match(include, /customCheckAppRunning/u)
  assert.doesNotMatch(include, /customInit/u)
  assert.match(include, /cleanup-stale-processes\.ps1/u)
  assert.match(include, /-InstallRegistryKey "\$\{INSTALL_REGISTRY_KEY\}"/u)
  assert.match(include, /-UninstallRegistryKey "\$\{UNINSTALL_REGISTRY_KEY\}"/u)
  assert.match(cleanup, /DeepSeek Harness Desktop\.exe/u)
  assert.match(cleanup, /Registry::\$hive\\\$InstallRegistryKey/u)
  assert.match(cleanup, /Get-UninstallerDirectory/u)
  assert.match(cleanup, /StartsWith\(\$resourcePrefix, \$comparison\)/u)
  assert.match(cleanup, /PROCESS_QUERY_LIMITED_INFORMATION/u)
  assert.match(cleanup, /QueryFullProcessImageName/u)
  assert.match(cleanup, /GetLongPathNameW/u)
  assert.match(cleanup, /\[DshInstaller\.ProcessPath\]::TryGet/u)
  assert.match(cleanup, /\[DshInstaller\.ProcessPath\]::Canonicalize/u)
  assert.match(cleanup, /update-shutdown-v1/u)
  assert.match(cleanup, /--shutdown-for-update/u)
  assert.match(cleanup, /Start-Process[\s\S]*-WindowStyle Hidden/u)
  assert.match(cleanup, /Get-CimInstance Win32_Process/u)
  assert.match(cleanup, /\$selfPid/u)
  assert.match(cleanup, /IndexOf\(\$root, \$comparison\)/u)
  assert.match(cleanup, /Get-CommandLineVariants/u)
  assert.match(cleanup, /FromBase64String/u)
  assert.match(cleanup, /\[System\.Text\.Encoding\]::Unicode/u)
  assert.doesNotMatch(cleanup, /\.MainModule|\$process\.Path/u)
  assert.doesNotMatch(cleanup, /GetParentProcessIds|ParentProcessId|CreateToolhelp32Snapshot/u)
  assert.doesNotMatch(cleanup, /Get-ChildItem -LiteralPath \$resourceRoot/u)
  assert.match(cleanup, /for \(\$attempt = 0; \$attempt -lt \$forceAttempts/u)
  assert.match(cleanup, /Start-Sleep -Milliseconds/u)
  assert.match(cleanup, /exit 32/u)
  assert.match(cleanup, /exit 33/u)
  assert.match(include, /IDRETRY cleanup_retry/u)
  assert.match(include, /StrCmp \$0 "0" cleanup_done/u)
  assert.match(include, /StrCmp \$0 "32" cleanup_busy/u)
  assert.doesNotMatch(cleanup, /taskkill|\/IM\s|ProcessName/u)
})

test('Windows installer preflight accepts a missing previous install directory', {
  skip: process.platform !== 'win32',
}, async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-installer-missing-'))
  const missingInstallDirectory = join(temporary, 'already-removed')
  try {
    await execFileAsync(
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
        missingInstallDirectory,
      ],
      { timeout: 10_000, windowsHide: true },
    )
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

test('Windows installer check terminates direct and path-attributed old processes without killing unrelated or same-name apps', {
  skip: process.platform !== 'win32',
  timeout: 20_000,
}, async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-installer-cleanup-'))
  const installDirectory = join(temporary, "用户's Desktop")
  const selectedInstallDirectory = join(temporary, 'new-empty-location')
  const unrelatedDirectory = join(temporary, 'unrelated')
  const registryKey = `Software\\DeepSeekHarnessDesktopTests\\${process.pid}-${Date.now()}`
  const executable = join(installDirectory, 'DeepSeek Harness Desktop.exe')
  const resourceExecutable = join(installDirectory, 'resources', 'bin', 'dsh-runtime-helper.exe')
  const pluginHostExecutable = join(installDirectory, 'resources', 'bin', 'plugin-prepare-host.exe')
  const unrelatedExecutable = join(unrelatedDirectory, 'DeepSeek Harness Desktop.exe')
  const systemPing = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'PING.EXE')
  const ownedProcesses = []
  let unrelatedProcess
  let unrelatedExit
  let pluginDescendantPid
  let encodedUnrelatedProcess
  let officialWebProcess
  try {
    await mkdir(join(installDirectory, 'resources', 'bin'), { recursive: true })
    await mkdir(unrelatedDirectory, { recursive: true })
    await copyFile(systemPing, executable)
    await copyFile(systemPing, resourceExecutable)
    await copyFile(process.execPath, pluginHostExecutable)
    await copyFile(systemPing, unrelatedExecutable)
    await execFileAsync('reg.exe', [
      'ADD',
      `HKCU\\${registryKey}`,
      '/v',
      'InstallLocation',
      '/t',
      'REG_SZ',
      '/d',
      installDirectory,
      '/f',
    ], { timeout: 5_000, windowsHide: true })
    for (const target of [executable, resourceExecutable]) {
      const child = spawn(target, ['-t', '127.0.0.1'], {
        windowsHide: true,
        stdio: 'ignore',
      })
      const exit = once(child, 'exit')
      ownedProcesses.push({ child, exit })
      await once(child, 'spawn')
      assert.equal(child.exitCode, null)
    }
    const pluginHost = spawn(pluginHostExecutable, [
      '-e',
      "const { spawn } = require('node:child_process'); const child = spawn(process.env.SystemRoot + '\\\\System32\\\\PING.EXE', ['-t', '127.0.0.1'], { detached: true, stdio: 'ignore', windowsHide: true }); child.unref(); process.stdout.write(String(child.pid) + '\\n'); setInterval(() => {}, 1000)",
    ], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const pluginHostExit = once(pluginHost, 'exit')
    ownedProcesses.push({ child: pluginHost, exit: pluginHostExit })
    await once(pluginHost, 'spawn')
    const [pidChunk] = await once(pluginHost.stdout, 'data')
    pluginDescendantPid = Number.parseInt(pidChunk.toString('utf8').trim(), 10)
    assert.equal(Number.isInteger(pluginDescendantPid), true)
    assert.doesNotThrow(() => process.kill(pluginDescendantPid, 0))
    const attributedProcess = spawn(process.execPath, [
      '-e',
      'setInterval(() => {}, 1000)',
      installDirectory,
    ], {
      windowsHide: true,
      stdio: 'ignore',
    })
    const attributedExit = once(attributedProcess, 'exit')
    ownedProcesses.push({ child: attributedProcess, exit: attributedExit })
    await once(attributedProcess, 'spawn')
    const powershellExecutable = join(
      process.env.SystemRoot ?? 'C:\\Windows',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe',
    )
    const encodedAttributed = spawn(powershellExecutable, [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle',
      'Hidden',
      '-EncodedCommand',
      Buffer.from(`Write-Host "${installDirectory}"; Start-Sleep -Seconds 300`, 'utf16le').toString('base64'),
    ], {
      windowsHide: true,
      stdio: 'ignore',
    })
    const encodedAttributedExit = once(encodedAttributed, 'exit')
    ownedProcesses.push({ child: encodedAttributed, exit: encodedAttributedExit })
    await once(encodedAttributed, 'spawn')
    encodedUnrelatedProcess = spawn(powershellExecutable, [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle',
      'Hidden',
      '-EncodedCommand',
      Buffer.from('Start-Sleep -Seconds 300', 'utf16le').toString('base64'),
    ], {
      windowsHide: true,
      stdio: 'ignore',
    })
    await once(encodedUnrelatedProcess, 'spawn')
    officialWebProcess = spawn(process.execPath, [
      '-e',
      'setInterval(() => {}, 1000)',
      join(temporary, 'official-web-home'),
    ], {
      windowsHide: true,
      stdio: 'ignore',
    })
    await once(officialWebProcess, 'spawn')
    unrelatedProcess = spawn(unrelatedExecutable, ['-t', '127.0.0.1'], {
      windowsHide: true,
      stdio: 'ignore',
    })
    unrelatedExit = once(unrelatedProcess, 'exit')
    await once(unrelatedProcess, 'spawn')
    await execFileAsync(
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
        selectedInstallDirectory,
        '-InstallRegistryKey',
        registryKey,
      ],
      { timeout: 10_000, windowsHide: true },
    )
    let ownedExits
    try {
      ownedExits = await settleWithin(
        Promise.all(ownedProcesses.map(({ exit }) => exit)),
        3_000,
        'installer cleanup returned without terminating every owned process',
      )
    } catch (error) {
      const trace = await describeWindowsProcesses(ownedProcesses)
      throw new Error(`${error.message}; ${trace}`)
    }
    for (const [ownedExitCode] of ownedExits) {
      assert.notEqual(ownedExitCode, 0)
    }
    assert.doesNotThrow(() => process.kill(pluginDescendantPid, 0), 'external plugin descendant was killed')
    assert.doesNotThrow(() => process.kill(encodedUnrelatedProcess.pid, 0), 'encoded PowerShell without an install-root reference was killed')
    assert.doesNotThrow(() => process.kill(officialWebProcess.pid, 0), 'official web runtime without an install-root reference was killed')
    assert.doesNotThrow(() => process.kill(unrelatedProcess.pid, 0), 'same-name process outside the install root was killed')
  } finally {
    for (const { child } of ownedProcesses) {
      if (child.exitCode === null) child.kill('SIGKILL')
    }
    try {
      await settleWithin(
        Promise.allSettled(ownedProcesses.map(({ exit }) => exit)),
        2_000,
        'owned process teardown did not settle',
      )
    } catch {}
    if (Number.isInteger(pluginDescendantPid)) {
      try { process.kill(pluginDescendantPid, 'SIGKILL') } catch {}
    }
    if (encodedUnrelatedProcess?.exitCode === null) encodedUnrelatedProcess.kill('SIGKILL')
    if (officialWebProcess?.exitCode === null) officialWebProcess.kill('SIGKILL')
    if (unrelatedProcess?.exitCode === null) unrelatedProcess.kill('SIGKILL')
    if (unrelatedExit) await settleWithin(unrelatedExit, 2_000, 'unrelated process teardown did not settle').catch(() => {})
    await execFileAsync('reg.exe', ['DELETE', `HKCU\\${registryKey}`, '/f'], {
      timeout: 5_000,
      windowsHide: true,
    }).catch(() => {})
    await rm(temporary, { recursive: true, force: true })
  }
})
