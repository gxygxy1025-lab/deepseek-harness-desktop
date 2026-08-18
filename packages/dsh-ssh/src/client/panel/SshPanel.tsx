/**
 * The SSH operations panel shell: a header with a close control, a six-tab
 * bar, and the active tab's content. Tab state lives here (browser session
 * state). The terminal stays mounted while another SSH tab is active so its
 * PTY connection and scrollback survive navigation; the other inactive tabs
 * unmount. The hosts tab's connect action switches here to the terminal tab
 * with the chosen alias preselected.
 */
import { useRef, useState } from 'react'
import type { SshApi } from '../api.ts'
import type { PanelController } from './controller.ts'
import { tt } from './helpers.ts'
import { ClusterTab } from './ClusterTab.tsx'
import { HostsTab } from './HostsTab.tsx'
import { MonitorTab } from './MonitorTab.tsx'
import { TerminalTab } from './TerminalTab.tsx'
import { TransferTab } from './TransferTab.tsx'
import { TunnelsTab } from './TunnelsTab.tsx'
import css from './panel.module.css'

/** The panel's tab identifiers. */
export type SshTab = 'hosts' | 'monitor' | 'terminal' | 'transfer' | 'tunnels' | 'cluster'

/** Panel shell props. */
export interface SshPanelProps {
  /** The panel state owner (open/close/toggle). */
  controller: PanelController
  /** The SSH API client every tab operates through. */
  api: SshApi
}

/** The tab bar definition (labels resolved at render time). */
const TABS: ReadonlyArray<{ id: SshTab; label: () => string }> = [
  { id: 'hosts', label: () => tt('tab.hosts') },
  { id: 'monitor', label: () => tt('tab.monitor') },
  { id: 'terminal', label: () => tt('tab.terminal') },
  { id: 'transfer', label: () => tt('tab.transfer') },
  { id: 'tunnels', label: () => tt('tab.tunnels') },
  { id: 'cluster', label: () => tt('tab.cluster') },
]

/** A pending "connect this host" request handed to the terminal tab. */
interface ConnectRequest {
  alias: string
  nonce: number
}

/** The tabbed SSH panel. */
export function SshPanel({ controller, api }: SshPanelProps) {
  const [activeTab, setActiveTab] = useState<SshTab>('hosts')
  const [connectRequest, setConnectRequest] = useState<ConnectRequest | null>(null)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleConnect = (alias: string): void => {
    setActiveTab('terminal')
    setConnectRequest(prev => ({ alias, nonce: (prev?.nonce ?? 0) + 1 }))
  }

  const selectTab = (index: number): void => {
    const next = TABS[index]
    if (next === undefined) return
    setActiveTab(next.id)
    tabRefs.current[index]?.focus()
  }

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>{tt('panel.title')}</h2>
        <button type="button" className={css.iconButton} title={tt('common.close')} aria-label={tt('common.close')} onClick={() => { controller.close() }}>×</button>
      </div>
      <div className={css.tabBar} role="tablist">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => { tabRefs.current[index] = element }}
            id={`dsh-ssh-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-controls="dsh-ssh-tab-panel"
            aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            data-active={activeTab === tab.id ? '' : undefined}
            className={css.tab}
            onClick={() => { setActiveTab(tab.id) }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') { event.preventDefault(); selectTab((index + 1) % TABS.length) }
              else if (event.key === 'ArrowLeft') { event.preventDefault(); selectTab((index - 1 + TABS.length) % TABS.length) }
              else if (event.key === 'Home') { event.preventDefault(); selectTab(0) }
              else if (event.key === 'End') { event.preventDefault(); selectTab(TABS.length - 1) }
            }}
          >
            {tab.label()}
          </button>
        ))}
      </div>
      <div id="dsh-ssh-tab-panel" role="tabpanel" aria-labelledby={`dsh-ssh-tab-${activeTab}`} className={css.panelContent}>
        {activeTab === 'hosts' && <HostsTab api={api} onConnect={handleConnect} />}
        {activeTab === 'monitor' && <MonitorTab api={api} onConnect={handleConnect} />}
        <div hidden={activeTab !== 'terminal'}>
          <TerminalTab
            api={api}
            visible={activeTab === 'terminal'}
            presetAlias={connectRequest?.alias}
            requestId={connectRequest?.nonce}
          />
        </div>
        {activeTab === 'transfer' && <TransferTab api={api} />}
        {activeTab === 'tunnels' && <TunnelsTab api={api} />}
        {activeTab === 'cluster' && <ClusterTab api={api} />}
      </div>
    </div>
  )
}
