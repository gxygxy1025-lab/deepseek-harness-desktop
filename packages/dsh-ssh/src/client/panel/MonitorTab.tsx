import { useCallback, useEffect, useRef, useState } from 'react'
import type { SshApi } from '../api.ts'
import type { SshHostSummary } from '../../protocol.ts'
import { errorMessage, tt } from './helpers.ts'
import { MONITOR_COMMAND, MONITOR_POLL_MS, parseMonitorOutput, processSignalCommand, serviceCommand, type CpuCounters, type MonitorSnapshot } from './monitor.ts'
import css from './panel.module.css'

export interface MonitorTabProps { api: SshApi; onConnect: (alias: string) => void }

function percent(used: number, total: number): string { return total > 0 ? `${Math.round((used / total) * 100)}%` : '--' }
function bytes(value: number): string { return value > 0 ? `${(value / 1024 / 1024 / 1024).toFixed(1)} GB` : '--' }
function uptime(seconds: number): string {
  if (seconds <= 0) return '--'
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
}

export function MonitorTab({ api, onConnect }: MonitorTabProps) {
  const [hosts, setHosts] = useState<SshHostSummary[]>([])
  const [alias, setAlias] = useState('')
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionTarget, setActionTarget] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const previousCounters = useRef<CpuCounters | undefined>(undefined)
  const activeAliases = useRef(new Set<string>())
  const requestSequence = useRef(0)

  useEffect(() => {
    let active = true
    void api.listHosts().then((list) => {
      if (!active) return
      setHosts(list)
      setAlias(current => current !== '' && list.some(host => host.alias === current) ? current : list[0]?.alias ?? '')
    }).catch(cause => { if (active) setError(errorMessage(cause)) })
    return () => { active = false }
  }, [api])

  const refresh = useCallback(async (): Promise<void> => {
    if (alias === '' || activeAliases.current.has(alias)) return
    const selectedAlias = alias
    const sequence = ++requestSequence.current
    activeAliases.current.add(selectedAlias)
    setRefreshing(true)
    try {
      const result = await api.exec(selectedAlias, MONITOR_COMMAND, 10_000)
      if (!result.success) throw new Error(result.error ?? (result.stderr.trim() || `exit ${result.exitCode ?? '?'}`))
      const next = parseMonitorOutput(result.stdout, previousCounters.current)
      if (sequence !== requestSequence.current) return
      previousCounters.current = next.cpuCounters
      setSnapshot(next)
      setError(next.supported ? null : tt('monitor.unsupported', { platform: next.platform || 'unknown' }))
    } catch (cause) {
      if (sequence === requestSequence.current) setError(errorMessage(cause))
    } finally {
      activeAliases.current.delete(selectedAlias)
      if (sequence === requestSequence.current) setRefreshing(false)
    }
  }, [alias, api])

  useEffect(() => {
    previousCounters.current = undefined
    setSnapshot(null)
    setNotice(null)
    if (alias === '') return
    void refresh()
    if (!autoRefresh) return
    const timer = setInterval(() => { void refresh() }, MONITOR_POLL_MS)
    return () => { clearInterval(timer) }
  }, [alias, autoRefresh, refresh])

  const runAction = async (target: string, command: string, confirmText: string): Promise<void> => {
    if (!window.confirm(confirmText)) return
    setActionTarget(target)
    setNotice(null)
    try {
      const result = await api.exec(alias, command, 15_000)
      if (!result.success) throw new Error(result.error ?? (result.stderr.trim() || `exit ${result.exitCode ?? '?'}`))
      setNotice(tt('monitor.actionDone'))
      await refresh()
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setActionTarget(null)
    }
  }

  return <div className={css.fillBody}>
    <div className={css.toolbar}>
      <select className={css.search} aria-label={tt('monitor.selectHost')} value={alias} onChange={event => { setAlias(event.target.value) }}>
        {hosts.length === 0 && <option value="">{tt('monitor.noHosts')}</option>}
        {hosts.map(host => <option key={host.alias} value={host.alias}>{host.alias} ({host.host})</option>)}
      </select>
      <label className={css.monitorToggle}><input type="checkbox" checked={autoRefresh} onChange={event => { setAutoRefresh(event.target.checked) }} />{tt('monitor.live')}</label>
      <span className={css.monitorPulse} data-active={autoRefresh && snapshot !== null ? '' : undefined}>{refreshing ? tt('monitor.refreshing') : tt('monitor.interval')}</span>
      <div className={css.toolbarSpacer} />
      <button type="button" className={css.ghostButton} disabled={alias === '' || refreshing} onClick={() => { void refresh() }}>{tt('common.refresh')}</button>
      <button type="button" className={css.primaryButton} disabled={alias === ''} onClick={() => { onConnect(alias) }}>{tt('monitor.openTerminal')}</button>
    </div>
    {notice !== null && <div className={css.banner} data-kind="ok">{notice}</div>}
    {error !== null && <div className={css.banner} data-kind="error">{tt('common.error', { error })}</div>}
    {hosts.length === 0 && <div className={css.empty}>{tt('monitor.noHosts')}</div>}
    {snapshot !== null && snapshot.supported && <div className={css.monitorScroll}>
      <section className={css.metricGrid} aria-label={tt('tab.monitor')}>
        <div className={css.metricCard}><span>{tt('monitor.cpu')}</span><strong>{snapshot.cpuPercent === null ? '--' : `${snapshot.cpuPercent.toFixed(1)}%`}</strong></div>
        <div className={css.metricCard}><span>{tt('monitor.memory')}</span><strong>{percent(snapshot.memoryUsed, snapshot.memoryTotal)}</strong><small>{bytes(snapshot.memoryUsed)} / {bytes(snapshot.memoryTotal)}</small></div>
        <div className={css.metricCard}><span>{tt('monitor.disk')}</span><strong>{percent(snapshot.diskUsed, snapshot.diskTotal)}</strong><small>{bytes(snapshot.diskUsed)} / {bytes(snapshot.diskTotal)}</small></div>
        <div className={css.metricCard}><span>{tt('monitor.load')}</span><strong>{snapshot.loadAverage.map(value => value.toFixed(2)).join(' / ')}</strong></div>
        <div className={css.metricCard}><span>{tt('monitor.uptime')}</span><strong>{uptime(snapshot.uptimeSeconds)}</strong></div>
        <div className={css.metricCard}><span>{tt('monitor.processCount')}</span><strong>{snapshot.processCount}</strong></div>
      </section>
      <section className={css.monitorSection}>
        <h3>{tt('monitor.topProcesses')}</h3>
        <div className={css.tableWrap}><table className={css.table}><thead><tr><th>PID</th><th>{tt('monitor.command')}</th><th>CPU</th><th>MEM</th><th>{tt('hosts.col.actions')}</th></tr></thead><tbody>
          {snapshot.processes.map(process => <tr key={process.pid}><td className={css.mono}>{process.pid}</td><td className={css.mono}>{process.command}</td><td>{process.cpuPercent.toFixed(1)}%</td><td>{process.memoryPercent.toFixed(1)}%</td><td><button type="button" className={css.dangerButton} disabled={actionTarget !== null} onClick={() => { void runAction(`pid:${process.pid}`, processSignalCommand(process.pid), tt('monitor.killConfirm', { pid: process.pid, command: process.command })) }}>{actionTarget === `pid:${process.pid}` ? tt('common.loading') : tt('monitor.terminate')}</button></td></tr>)}
        </tbody></table></div>
      </section>
      <section className={css.monitorSection}>
        <h3>{tt('monitor.failedServices')}</h3>
        {snapshot.failedServices.length === 0 && <div className={css.monitorHealthy}>{tt('monitor.servicesHealthy')}</div>}
        {snapshot.failedServices.map(service => <div className={css.serviceRow} key={service}><span className={css.mono}>{service}</span><button type="button" className={css.ghostButton} disabled={actionTarget !== null} onClick={() => { void runAction(`service:${service}`, serviceCommand(service, 'restart'), tt('monitor.restartConfirm', { service })) }}>{actionTarget === `service:${service}` ? tt('common.loading') : tt('monitor.restart')}</button></div>)}
      </section>
      <div className={css.monitorTimestamp}>{tt('monitor.updatedAt', { time: new Date(snapshot.collectedAt).toLocaleTimeString() })}</div>
    </div>}
  </div>
}
