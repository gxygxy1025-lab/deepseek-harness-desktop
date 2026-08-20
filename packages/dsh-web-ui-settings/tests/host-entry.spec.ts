/**
 * Published 0.2.3 host-entry behavior retained by Desktop's local fork:
 * config never embeds the proxy secret and a duplicate aggregate/standalone
 * load cannot re-register the same host routes.
 */

import { describe, expect, it, vi } from 'vitest'
import { Config, DEFAULT_PROXY_TOKEN_ENV, resolveProxyAccess } from '../src/index.ts'
import { mountOnce } from '../src/mount-once.ts'

describe('host entry configuration', () => {
  it('uses the published defaults and resolves an opt-in proxy token from the environment', () => {
    expect(Config({})).toEqual({
      trustedProxyHosts: [],
      proxyTokenEnv: DEFAULT_PROXY_TOKEN_ENV,
    })
    expect(resolveProxyAccess({ trustedProxyHosts: ['desktop.example.test:8443'] }, {
      [DEFAULT_PROXY_TOKEN_ENV]: 'shared-secret',
    })).toEqual({
      trustedProxyHosts: ['desktop.example.test:8443'],
      proxyToken: 'shared-secret',
    })
  })

  it('refuses an authenticated proxy configuration without a non-empty environment token', () => {
    expect(() => resolveProxyAccess({ trustedProxyHosts: ['desktop.example.test'] }, {}))
      .toThrow(DEFAULT_PROXY_TOKEN_ENV)
    expect(() => resolveProxyAccess({
      trustedProxyHosts: ['desktop.example.test'],
      proxyTokenEnv: '   ',
    }, { '   ': 'shared-secret' })).toThrow('proxyTokenEnv must not be empty')
  })
})

describe('mountOnce', () => {
  it('makes a duplicate host load a no-op until the original lifecycle disposes', () => {
    let dispose: (() => void) | undefined
    const ctx = {
      effect: (callback: () => () => void) => {
        dispose = callback()
        return dispose
      },
    }
    const body = vi.fn((_ctx: typeof ctx, value: number) => value)
    const packageName = 'web-ui-settings-test-' + Date.now() + '-' + Math.random()
    const once = mountOnce(packageName, body)

    expect(once(ctx, 1)).toBe(1)
    expect(once(ctx, 2)).toBeUndefined()
    expect(body).toHaveBeenCalledTimes(1)

    dispose?.()
    expect(once(ctx, 3)).toBe(3)
    expect(body).toHaveBeenCalledTimes(2)
  })
})
