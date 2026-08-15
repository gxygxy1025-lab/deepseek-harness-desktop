export interface SessionSummaryLike {
  id: string
  cwd?: string
  agentPreset?: string
  blank: boolean
}

export interface ModePreset {
  id: string
  label: string
  description?: string
}

export interface ModeSwitcherDeps {
  sessions: {
    list: {
      getSnapshot(): { current: string | undefined; byId: Record<string, SessionSummaryLike> }
      subscribe(fn: () => void): () => void
    }
    clear(): void
    noteAgentPreset(sessionId: string, agentPreset: string): void
  }
  workspaces: {
    list: { getSnapshot(): { items: ReadonlyArray<{ id: string; path: string }> } }
    startSession(workspaceId?: string): void
  }
  api: {
    agentPresets: {
      list(request: Record<string, never>): Promise<{ result: { ok: boolean; value?: { presets: ReadonlyArray<{ id: string; name?: string; description?: string; broken?: string }> }; error?: { message: string } } }>
      select(request: { sessionId: string; agentPreset: string }): Promise<{ result: { ok: boolean; value?: { agentPreset: string }; error?: { message: string } } }>
    }
  }
  timeoutMs?: number
}

export class ModeSwitcherController {
  constructor(private readonly deps: ModeSwitcherDeps) {}

  async list(): Promise<ModePreset[]> {
    const response = await this.deps.api.agentPresets.list({})
    if (!response.result.ok || response.result.value === undefined) {
      throw new Error(response.result.error?.message ?? 'agent preset list failed')
    }
    return response.result.value.presets
      .filter((preset) => preset.broken === undefined)
      .map((preset) => ({
        id: preset.id,
        label: preset.name ?? preset.id,
        ...(preset.description === undefined ? {} : { description: preset.description }),
      }))
  }

  async switch(sessionId: string, agentPreset: string): Promise<string> {
    const summary = this.deps.sessions.list.getSnapshot().byId[sessionId]
    if (summary === undefined) throw new Error('session is no longer available')
    let targetSessionId = sessionId
    if (!summary.blank) {
      const workspaceId = this.deps.workspaces.list.getSnapshot().items
        .find((workspace) => workspace.path === summary.cwd)?.id
      this.deps.sessions.clear()
      this.deps.workspaces.startSession(workspaceId)
      targetSessionId = await this.waitForBlankSession(sessionId)
    }
    const response = await this.deps.api.agentPresets.select({ sessionId: targetSessionId, agentPreset })
    if (!response.result.ok || response.result.value === undefined) {
      throw new Error(response.result.error?.message ?? 'agent preset switch failed')
    }
    this.deps.sessions.noteAgentPreset(targetSessionId, response.result.value.agentPreset)
    return targetSessionId
  }

  private waitForBlankSession(previousId: string): Promise<string> {
    const timeoutMs = this.deps.timeoutMs ?? 10_000
    return new Promise((resolve, reject) => {
      let settled = false
      let unsubscribe = (): void => {}
      const finish = (id: string): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        unsubscribe()
        resolve(id)
      }
      const inspect = (): void => {
        const state = this.deps.sessions.list.getSnapshot()
        const id = state.current
        if (id !== undefined && id !== previousId && state.byId[id]?.blank === true) finish(id)
      }
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        unsubscribe()
        reject(new Error('timed out while starting the new mode session'))
      }, timeoutMs)
      unsubscribe = this.deps.sessions.list.subscribe(inspect)
      inspect()
    })
  }
}
