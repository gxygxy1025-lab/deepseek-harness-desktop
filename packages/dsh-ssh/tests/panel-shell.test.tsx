// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SshApi } from '../src/client/api.ts'
import type { PanelController } from '../src/client/panel/controller.ts'
import { SshPanel } from '../src/client/panel/SshPanel.tsx'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

describe('SshPanel shell', () => {
  it('supports arrow-key tab navigation and keeps one tab in the tab order', async () => {
    const api = { listHosts: vi.fn(async () => []) } as unknown as SshApi
    const controller = { close: vi.fn() } as unknown as PanelController
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => { root.render(<SshPanel api={api} controller={controller} />) })
    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    expect(tabs).toHaveLength(6)
    expect(tabs[0]?.getAttribute('tabindex')).toBe('0')
    expect(tabs[1]?.getAttribute('tabindex')).toBe('-1')

    await act(async () => {
      tabs[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')
    expect(tabs[1]?.getAttribute('tabindex')).toBe('0')
    expect(document.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(tabs[1]?.id)

    await act(async () => { root.unmount() })
  })

  it('exposes a proper multiplication-sign close control', async () => {
    const api = { listHosts: vi.fn(async () => []) } as unknown as SshApi
    const close = vi.fn()
    const controller = { close } as unknown as PanelController
    const root = createRoot(document.body.appendChild(document.createElement('div')))

    await act(async () => { root.render(<SshPanel api={api} controller={controller} />) })
    const button = Array.from(document.querySelectorAll('button')).find(candidate => candidate.textContent === '×')
    expect(button).toBeDefined()
    await act(async () => { button?.click() })
    expect(close).toHaveBeenCalledOnce()

    await act(async () => { root.unmount() })
  })
})
