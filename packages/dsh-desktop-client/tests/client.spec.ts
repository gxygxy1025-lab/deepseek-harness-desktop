import { describe, expect, it, vi } from 'vitest'

import {
  createDesktopClient,
  runDeepLink,
  taskDeepLink,
} from '../src/index.js'

describe('Desktop Client SDK v1', () => {
  it('is a quiet unavailable facade in ordinary DSH web', async () => {
    const client = createDesktopClient({ globalObject: {} })
    expect(await client.getDesktopInfo()).toEqual({ available: false, reason: 'unavailable' })
    expect(await client.getContract()).toEqual({ available: false, reason: 'unavailable' })
    expect(await client.getRuntimeStatus()).toEqual({ available: false, reason: 'unavailable' })
    expect(await client.showNotification({ category: 'task', id: 'task:ordinary-web', title: 'Done', body: 'No desktop' })).toEqual({ available: false, reason: 'unavailable' })
    expect(await client.openDesktopSurface('extensions')).toBe(false)
    expect(await client.openWorkspaceFile({ root: '/workspace', path: 'README.md' })).toEqual({ available: false, reason: 'unavailable' })
    expect(client.subscribeRuntimeStatus(() => {})).not.toThrow()
  })

  it('uses a narrow typed contract without exposing the preload bridge', async () => {
    const onStatus = vi.fn()
    const onDeepLink = vi.fn()
    const bridge = {
      getInfo: vi.fn(async () => ({ appId: 'desktop', productName: 'Desktop', version: '2.7.0', platform: 'win32' })),
      getContract: vi.fn(async () => ({ apiVersion: '1.2.0', surface: 'main', capabilities: ['notifications.show', 'workspace-files.open'] })),
      getStatus: vi.fn(async () => ({
        state: 'ready',
        restartAttempt: 0,
        background: { enabled: true, trayAvailable: true, closeBehavior: 'minimize-to-tray' },
      })),
      onStatus: vi.fn((listener) => { listener({ state: 'ready', restartAttempt: 0 }); return () => {} }),
      onDeepLink: vi.fn((listener) => { listener({ href: 'dsh://task/task-1' }); return () => {} }),
      showNotification: vi.fn(async () => ({ shown: true })),
      toolAction: vi.fn(async () => true),
      helpAction: vi.fn(async () => true),
      openWorkspaceFile: vi.fn(async () => ({ opened: true })),
    }
    const client = createDesktopClient({ globalObject: { dshDesktop: bridge } })
    expect(await client.getDesktopInfo()).toMatchObject({ version: '2.7.0' })
    expect(await client.hasCapability('workspace-files.open')).toBe(true)
    expect(await client.hasCapability('workspace-files.open', 2)).toBe(false)
    expect(await client.getRuntimeStatus()).toMatchObject({
      state: 'ready',
      background: { enabled: true, trayAvailable: true, closeBehavior: 'minimize-to-tray' },
    })
    client.subscribeRuntimeStatus(onStatus)
    client.subscribeDeepLinks(onDeepLink)
    expect(onStatus).toHaveBeenCalledWith({ state: 'ready', restartAttempt: 0 })
    expect(onDeepLink).toHaveBeenCalledWith('dsh://task/task-1')
    expect(await client.showNotification({ category: 'run', id: 'run:1', title: 'Done', body: 'Run complete' })).toEqual({ shown: true })
    expect(await client.openDesktopSurface('extensions')).toBe(true)
    expect(await client.openDesktopSurface('updates')).toBe(true)
    expect(await client.openWorkspaceFile({ root: 'C:/work', path: 'src/main.ts' })).toEqual({ opened: true })
    expect(bridge.openWorkspaceFile).toHaveBeenCalledWith({ root: 'C:/work', path: 'src/main.ts' })
    expect('bridge' in client).toBe(false)
  })

  it('rejects file traversal before invoking the Desktop bridge', async () => {
    const openWorkspaceFile = vi.fn(async () => ({ opened: true }))
    const client = createDesktopClient({ globalObject: { dshDesktop: { openWorkspaceFile } } })
    await expect(client.openWorkspaceFile({ root: '/work', path: '../secret.txt' })).rejects.toMatchObject({ code: 'desktop-invalid-argument' })
    expect(openWorkspaceFile).not.toHaveBeenCalled()
  })

  it('creates safe task and run deep links', () => {
    expect(taskDeepLink('task-1')).toBe('dsh://task/task-1')
    expect(runDeepLink('run-1')).toBe('dsh://run/run-1')
  })
})
