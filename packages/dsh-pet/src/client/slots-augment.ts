/**
 * Local slot-table augmentation for the shell overlay contract. Keeping the
 * small root-slot shape here lets this package typecheck in isolation while
 * the runtime seat is supplied by dsh-client-ui-layout.
 */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Frame-wide, root-scoped floating layer supplied by ui-layout. */
    'shell.overlay': {
      kind: 'list'
      scope: 'root'
    }
  }
}
