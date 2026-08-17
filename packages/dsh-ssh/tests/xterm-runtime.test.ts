// @vitest-environment jsdom
/** Lazy xterm runtime loading: one same-origin script pair, shared by callers. */

import { afterEach, describe, expect, it } from 'vitest'
import { loadXtermRuntime, resetXtermRuntimeForTest } from '../src/client/panel/xterm-runtime.ts'

afterEach(() => {
  resetXtermRuntimeForTest()
  document.head.replaceChildren()
  delete (window as unknown as { Terminal?: unknown }).Terminal
  delete (window as unknown as { FitAddon?: unknown }).FitAddon
})

describe('loadXtermRuntime', () => {
  it('loads xterm then fit once and shares concurrent requests', async () => {
    const first = loadXtermRuntime()
    const second = loadXtermRuntime()
    expect(first).toBe(second)

    const xterm = document.querySelector<HTMLScriptElement>('script[data-dsh-ssh-vendor="xterm"]')
    expect(xterm?.src).toContain('/api/dsh-ssh/vendor/xterm.js')
    expect(document.querySelector('script[data-dsh-ssh-vendor="fit-addon"]')).toBeNull()

    class Terminal {}
    ;(window as unknown as { Terminal: unknown }).Terminal = Terminal
    xterm?.dispatchEvent(new Event('load'))
    await Promise.resolve()

    const fit = document.querySelector<HTMLScriptElement>('script[data-dsh-ssh-vendor="fit-addon"]')
    expect(fit?.src).toContain('/api/dsh-ssh/vendor/addon-fit.js')
    class FitAddon {}
    ;(window as unknown as { FitAddon: unknown }).FitAddon = { FitAddon }
    fit?.dispatchEvent(new Event('load'))

    await expect(first).resolves.toEqual({ Terminal, FitAddon })
    expect(document.querySelectorAll('script[data-dsh-ssh-vendor]')).toHaveLength(2)
  })

  it('removes a failed script and allows a retry', async () => {
    const first = loadXtermRuntime()
    document.querySelector<HTMLScriptElement>('script[data-dsh-ssh-vendor="xterm"]')
      ?.dispatchEvent(new Event('error'))
    await expect(first).rejects.toThrow('xterm')
    expect(document.querySelector('script[data-dsh-ssh-vendor="xterm"]')).toBeNull()

    const retry = loadXtermRuntime()
    expect(retry).not.toBe(first)
    expect(document.querySelectorAll('script[data-dsh-ssh-vendor="xterm"]')).toHaveLength(1)
  })
})
