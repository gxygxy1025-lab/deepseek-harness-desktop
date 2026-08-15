import { describe, expect, it, vi } from 'vitest'
import { ModeSwitcherController, type ModeSwitcherDeps } from '../src/client/mode-controller.ts'

function deps(blank: boolean): ModeSwitcherDeps & { publish(id: string): void } {
  const listeners = new Set<() => void>()
  const state = { current: 'old' as string | undefined, byId: { old: { id: 'old', cwd: 'C:/repo', blank, agentPreset: 'code' } } as Record<string, any> }
  return {
    sessions: {
      list: { getSnapshot: () => state, subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn) } } },
      clear: vi.fn(() => { state.current = undefined }),
      noteAgentPreset: vi.fn(),
    },
    workspaces: {
      list: { getSnapshot: () => ({ items: [{ id: 'workspace', path: 'C:/repo' }] }) },
      startSession: vi.fn(),
    },
    api: {
      agentPresets: {
        list: vi.fn(async () => ({ result: { ok: true, value: { presets: [] } } })),
        select: vi.fn(async ({ agentPreset }) => ({ result: { ok: true, value: { agentPreset } } })),
      },
    },
    timeoutMs: 100,
    publish(id) {
      state.byId[id] = { id, cwd: 'C:/repo', blank: true }
      state.current = id
      for (const listener of listeners) listener()
    },
  }
}

describe('ModeSwitcherController', () => {
  it('switches an empty session in place', async () => {
    const d = deps(true)
    const controller = new ModeSwitcherController(d)
    await expect(controller.switch('old', 'plan')).resolves.toBe('old')
    expect(d.sessions.clear).not.toHaveBeenCalled()
    expect(d.api.agentPresets.select).toHaveBeenCalledWith({ sessionId: 'old', agentPreset: 'plan' })
  })

  it('starts a same-workspace session before switching a non-empty conversation', async () => {
    const d = deps(false)
    const controller = new ModeSwitcherController(d)
    const result = controller.switch('old', 'plan')
    d.publish('new')
    await expect(result).resolves.toBe('new')
    expect(d.workspaces.startSession).toHaveBeenCalledWith('workspace')
    expect(d.api.agentPresets.select).toHaveBeenCalledWith({ sessionId: 'new', agentPreset: 'plan' })
  })
})
