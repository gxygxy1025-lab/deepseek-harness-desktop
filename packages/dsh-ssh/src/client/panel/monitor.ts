/** Linux monitoring command. Output is a bounded tab-separated wire format. */
export const MONITOR_COMMAND = String.raw`LC_ALL=C
printf 'DSH_PLATFORM\t'; uname -s
awk '/^cpu / { total=0; for(i=2;i<=NF;i++) total+=$i; printf "DSH_CPU\t%.0f\t%.0f\n", total, $5+$6; exit }' /proc/stat
awk '/MemTotal:/ { total=$2*1024 } /MemAvailable:/ { available=$2*1024 } END { printf "DSH_MEMORY\t%.0f\t%.0f\n", total, total-available }' /proc/meminfo
df -Pk / | awk 'NR==2 { printf "DSH_DISK\t%.0f\t%.0f\n", $2*1024, $3*1024 }'
awk '{ printf "DSH_LOAD\t%s\t%s\t%s\n", $1, $2, $3 }' /proc/loadavg
awk '{ printf "DSH_UPTIME\t%.0f\n", $1 }' /proc/uptime
printf 'DSH_PROCESS_COUNT\t'; ps -e --no-headers 2>/dev/null | wc -l
ps -eo pid=,pcpu=,pmem=,comm= --sort=-pcpu 2>/dev/null | head -n 6 | awk '{ printf "DSH_PROCESS\t%s\t%s\t%s\t%s\n", $1, $2, $3, $4 }'
if command -v systemctl >/dev/null 2>&1; then systemctl --failed --type=service --no-legend --no-pager 2>/dev/null | awk 'NR<=8 { printf "DSH_SERVICE\t%s\n", $1 }'; fi`

export const MONITOR_POLL_MS = 3000

export interface MonitorProcess { pid: number; cpuPercent: number; memoryPercent: number; command: string }
export interface CpuCounters { total: number; idle: number }
export interface MonitorSnapshot {
  platform: string
  supported: boolean
  cpuPercent: number | null
  cpuCounters: CpuCounters
  memoryTotal: number
  memoryUsed: number
  diskTotal: number
  diskUsed: number
  loadAverage: [number, number, number]
  uptimeSeconds: number
  processCount: number
  processes: MonitorProcess[]
  failedServices: string[]
  collectedAt: number
}

function finite(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function isSafeServiceName(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_.@-]{0,95}$/u.test(value)
}

/** Parse one bounded monitor frame and derive CPU use from the prior counters. */
export function parseMonitorOutput(output: string, previous?: CpuCounters): MonitorSnapshot {
  let platform = ''
  let cpuCounters: CpuCounters = { total: 0, idle: 0 }
  let memoryTotal = 0
  let memoryUsed = 0
  let diskTotal = 0
  let diskUsed = 0
  let loadAverage: [number, number, number] = [0, 0, 0]
  let uptimeSeconds = 0
  let processCount = 0
  const processes: MonitorProcess[] = []
  const failedServices: string[] = []
  for (const rawLine of output.split(/\r?\n/u)) {
    const [kind, ...values] = rawLine.trim().split('\t')
    if (kind === 'DSH_PLATFORM') platform = values[0]?.trim() ?? ''
    else if (kind === 'DSH_CPU') cpuCounters = { total: finite(values[0]), idle: finite(values[1]) }
    else if (kind === 'DSH_MEMORY') [memoryTotal, memoryUsed] = [finite(values[0]), finite(values[1])]
    else if (kind === 'DSH_DISK') [diskTotal, diskUsed] = [finite(values[0]), finite(values[1])]
    else if (kind === 'DSH_LOAD') loadAverage = [finite(values[0]), finite(values[1]), finite(values[2])]
    else if (kind === 'DSH_UPTIME') uptimeSeconds = finite(values[0])
    else if (kind === 'DSH_PROCESS_COUNT') processCount = finite(values[0])
    else if (kind === 'DSH_PROCESS' && processes.length < 6) {
      const pid = finite(values[0])
      if (Number.isInteger(pid) && pid > 1) processes.push({ pid, cpuPercent: finite(values[1]), memoryPercent: finite(values[2]), command: (values[3] ?? '').slice(0, 160) })
    } else if (kind === 'DSH_SERVICE' && failedServices.length < 8) {
      const service = values[0] ?? ''
      if (isSafeServiceName(service)) failedServices.push(service)
    }
  }
  const deltaTotal = previous === undefined ? 0 : cpuCounters.total - previous.total
  const deltaIdle = previous === undefined ? 0 : cpuCounters.idle - previous.idle
  const cpuPercent = deltaTotal > 0 ? Math.max(0, Math.min(100, ((deltaTotal - deltaIdle) / deltaTotal) * 100)) : null
  return { platform, supported: platform.toLowerCase() === 'linux', cpuPercent, cpuCounters, memoryTotal, memoryUsed, diskTotal, diskUsed, loadAverage, uptimeSeconds, processCount, processes, failedServices, collectedAt: Date.now() }
}

export function processSignalCommand(pid: number, signal: 'TERM' | 'KILL' = 'TERM'): string {
  if (!Number.isSafeInteger(pid) || pid < 2) throw new TypeError('invalid process id')
  if (signal !== 'TERM' && signal !== 'KILL') throw new TypeError('invalid signal')
  return `kill -${signal} ${pid}`
}

export function serviceCommand(service: string, action: 'start' | 'stop' | 'restart'): string {
  if (!isSafeServiceName(service)) throw new TypeError('invalid service name')
  if (!['start', 'stop', 'restart'].includes(action)) throw new TypeError('invalid service action')
  return `sudo -n systemctl ${action} ${service}`
}
