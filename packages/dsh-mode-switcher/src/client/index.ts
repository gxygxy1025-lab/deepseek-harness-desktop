import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { ModeSwitcher } from './ModeSwitcher.tsx'
import { ModeSwitcherController } from './mode-controller.ts'

export const inject = ['slots', 'sessions', 'workspaces', 'connection', 'conversation']

export function apply(ctx: ClientContext): void {
  const controller = new ModeSwitcherController({
    sessions: ctx.sessions,
    workspaces: ctx.workspaces,
    api: ctx.get('connection').api,
  } as never)
  const injected = () => ({
    loadModes: () => controller.list(),
    switchMode: (sessionId: string, preset: string) => controller.switch(sessionId, preset),
  })
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'mode-switcher',
    order: -9,
    inject: injected,
  }, ModeSwitcher))
}
