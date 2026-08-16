import type { Agent, AgentStatus } from '@deepseek-ai/dsh-agent';
import type { PostToolDecision, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools';
export declare const FRIENDLY_CANCELLED_MESSAGE = "\u5F53\u524D\u6267\u884C\u5DF2\u505C\u6B62\uFF0C\u6392\u961F\u6D88\u606F\u5C06\u7EE7\u7EED\u53D1\u9001\u3002";
/**
 * Re-arm an idle official agent that retained ordinary turns across a cancel.
 * Removing and re-appending the final item preserves the complete FIFO order,
 * while `followup` supplies the wake edge missing in DSH rc.6.
 */
export declare function recoverQueuedTurns(agent: Agent): boolean;
export type QueueMicrotask = (callback: () => void) => void;
/** Coalesce status notifications and recover at most once per idle transition. */
export declare function createQueueRecoveryScheduler(enqueue?: QueueMicrotask, onError?: (error: unknown) => void): (agent: Agent, status: AgentStatus) => void;
/** Replace only the malformed rc.6 user-cancel presentation. */
export declare function normalizeCancellationDecision(exec: ToolExecution, result: Readonly<ToolExecutionResult>, decision: PostToolDecision): PostToolDecision;
