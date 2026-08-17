/**
 * Lazy browser runtime for the SSH terminal. The host serves the two reviewed
 * UMD assets from same-origin immutable routes, keeping xterm out of the
 * plugin's eagerly evaluated client bundle.
 */

import type { Terminal, IDisposable } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import { SSH_API } from '../../protocol.ts'

/** Public xterm instance types used by TerminalTab without a runtime import. */
export type XtermTerminal = Terminal
export type XtermFitAddon = FitAddon
export type XtermDisposable = IDisposable

/** Constructors exposed by the reviewed UMD builds. */
export interface XtermRuntime {
  Terminal: typeof Terminal
  FitAddon: typeof FitAddon
}

type VendorWindow = Window & {
  Terminal?: typeof Terminal
  FitAddon?: { FitAddon?: typeof FitAddon }
}

let runtimePromise: Promise<XtermRuntime> | undefined

function vendorWindow(): VendorWindow {
  return window as VendorWindow
}

function loadScript(name: string, source: string, ready: () => boolean): Promise<void> {
  if (ready()) return Promise.resolve()
  if (typeof document === 'undefined') return Promise.reject(new Error(`dsh-ssh: cannot load ${name} outside a browser`))

  const selector = `script[data-dsh-ssh-vendor="${name}"]`
  const existing = document.querySelector<HTMLScriptElement>(selector)
  const script = existing ?? document.createElement('script')
  if (existing === null) {
    script.dataset.dshSshVendor = name
    script.src = source
    script.async = true
  }

  return new Promise((resolve, reject) => {
    const cleanup = (): void => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }
    const onLoad = (): void => {
      cleanup()
      if (ready()) resolve()
      else {
        script.remove()
        reject(new Error(`dsh-ssh: ${name} loaded without its expected global`))
      }
    }
    const onError = (): void => {
      cleanup()
      script.remove()
      reject(new Error(`dsh-ssh: failed to load ${name}`))
    }
    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })
    // Install listeners before insertion: a memory-cached local asset can
    // complete in the same task on fast Electron builds.
    if (existing === null) document.head.appendChild(script)
  })
}

async function loadRuntime(): Promise<XtermRuntime> {
  await loadScript('xterm', SSH_API.xtermScript, () => typeof vendorWindow().Terminal === 'function')
  await loadScript('fit-addon', SSH_API.fitAddonScript, () => typeof vendorWindow().FitAddon?.FitAddon === 'function')
  const globals = vendorWindow()
  if (globals.Terminal === undefined || globals.FitAddon?.FitAddon === undefined) {
    throw new Error('dsh-ssh: xterm runtime globals are incomplete')
  }
  return { Terminal: globals.Terminal, FitAddon: globals.FitAddon.FitAddon }
}

/** Load and memoize the xterm runtime; failures clear the memo so users can retry. */
export function loadXtermRuntime(): Promise<XtermRuntime> {
  if (runtimePromise !== undefined) return runtimePromise
  const pending = loadRuntime()
  runtimePromise = pending
  void pending.catch(() => {
    if (runtimePromise === pending) runtimePromise = undefined
  })
  return pending
}

/** @internal Test isolation for the module-level success memo. */
export function resetXtermRuntimeForTest(): void {
  runtimePromise = undefined
}
