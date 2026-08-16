// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SshApi } from '../src/client/api.ts'
import { MonitorTab } from '../src/client/panel/MonitorTab.tsx'
import {
  MONITOR_COMMAND,
  MONITOR_POLL_MS,
  parseMonitorOutput,
  processSignalCommand,
  serviceCommand,
} from '../src/client/panel/monitor.ts'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const output = [
  'DSH_PLATFORM\tLinux',
  'DSH_CPU\t1000\t700',
  'DSH_MEMORY\t17179869184\t8589934592',
  'DSH_DISK\t107374182400\t53687091200',
  'DSH_LOAD\t0.25\t0.50\t0.75',
  'DSH_UPTIME\t176400',
  'DSH_PROCESS_COUNT\t123',
  'DSH_PROCESS\t42\t18.5\t3.2\tnode',
  'DSH_SERVICE\tworker.service',
  'DSH_SERVICE\tbad;service',
].join('\n')

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

describe('monitor wire format and action guards', () => {
  it('parses bounded Linux metrics and calculates CPU deltas', () => {
    const snapshot = parseMonitorOutput(output, { total: 900, idle: 650 })
    expect(snapshot.supported).toBe(true)
    expect(snapshot.cpuPercent).toBe(50)
    expect(snapshot.memoryUsed).toBe(8589934592)
    expect(snapshot.loadAverage).toEqual([0.25, 0.5, 0.75])
    expect(snapshot.processes).toEqual([{ pid: 42, cpuPercent: 18.5, memoryPercent: 3.2, command: 'node' }])
    expect(snapshot.failedServices).toEqual(['worker.service'])
  })

  it('keeps remote operation strings allowlisted and rejects injection shapes', () => {
    expect(processSignalCommand(42)).toBe('kill -TERM 42')
    expect(serviceCommand('worker.service', 'restart')).toBe('sudo -n systemctl restart worker.service')
    expect(() => processSignalCommand(1)).toThrow(/process id/u)
    expect(() => serviceCommand('worker; reboot', 'restart')).toThrow(/service name/u)
    expect(MONITOR_COMMAND).toContain("systemctl --failed")
    expect(MONITOR_COMMAND.length).toBeLessThan(3000)
  })
})

describe('MonitorTab live refresh', () => {
  it('polls every three seconds while mounted and stops on unmount', async () => {
    vi.useFakeTimers()
    const exec = vi.fn(async () => ({ success: true, exitCode: 0, timedOut: false, stdout: output, stderr: '', durationMs: 2 }))
    const api = {
      listHosts: vi.fn(async () => [{ alias: 'web', host: '10.0.0.2', port: 22, user: 'root', auth: 'key', keyReady: true, proxyJump: [], tags: [], createdAt: 1, updatedAt: 1 }]),
      exec,
    } as unknown as SshApi
    const root = createRoot(document.body.appendChild(document.createElement('div')))
    await act(async () => { root.render(<MonitorTab api={api} onConnect={() => undefined} />) })
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(exec).toHaveBeenCalledWith('web', MONITOR_COMMAND, 10_000)
    const initial = exec.mock.calls.length
    await act(async () => { vi.advanceTimersByTime(MONITOR_POLL_MS); await Promise.resolve() })
    expect(exec.mock.calls.length).toBe(initial + 1)
    expect(document.body.textContent).toContain('CPU 占用最高的进程')
    await act(async () => { root.unmount() })
  })
})
