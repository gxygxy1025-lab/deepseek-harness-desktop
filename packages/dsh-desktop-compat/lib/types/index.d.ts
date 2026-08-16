import type { Context } from '@deepseek-ai/cordis';
export declare const name = "desktop-compat";
export declare const inject: string[];
/** Install Desktop-only compatibility behavior through public DSH hooks. */
export declare function apply(ctx: Context): void;
export { FRIENDLY_CANCELLED_MESSAGE, createQueueRecoveryScheduler, normalizeCancellationDecision, recoverQueuedTurns, } from './recovery.ts';
