import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-tools'
import {
  createQueueRecoveryScheduler,
  normalizeCancellationDecision,
} from './recovery.ts'
import { DesktopSkinStateService } from './skin-state.ts'

export const name = 'desktop-compat'
export const inject = ['tools']

/** Install Desktop-only compatibility behavior through public DSH hooks. */
export function apply(ctx: Context): void {
  new DesktopSkinStateService(ctx)

  const scheduleRecovery = createQueueRecoveryScheduler(queueMicrotask, (error) => {
    const detail = error instanceof Error ? error.message : String(error)
    ctx.logger?.warn?.(`dsh-desktop-compat: queued turn recovery failed: ${detail}`)
  })

  ctx.on('agent/status', ({ agent, status }) => {
    scheduleRecovery(agent, status)
  })

  ctx.on('tools/post-execute', async (exec, result, next) => {
    const decision = await next()
    return normalizeCancellationDecision(exec, result, decision)
  })
}

export {
  FRIENDLY_CANCELLED_MESSAGE,
  createQueueRecoveryScheduler,
  normalizeCancellationDecision,
  recoverQueuedTurns,
} from './recovery.ts'

export {
  DesktopSkinStateService,
  DesktopSkinStateStore,
  SKIN_STATE_END,
  SKIN_STATE_START,
  type DesktopSkinStateFace,
  type SkinLoaderEntry,
} from './skin-state.ts'
