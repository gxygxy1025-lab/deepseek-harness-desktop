import type { Agent, AgentStatus } from '@deepseek-ai/dsh-agent'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { RUN_CODE_NAME } from '@deepseek-ai/dsh-tools'
import type { PostToolDecision, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'

export const FRIENDLY_CANCELLED_MESSAGE = '当前执行已停止，排队消息将继续发送。'

const OBJECT_ABORT_MESSAGE = 'code run failed (abort): [object Object]'

/**
 * Re-arm an idle official agent that retained ordinary turns across a cancel.
 * Removing and re-appending the final item preserves the complete FIFO order,
 * while `followup` supplies the wake edge missing in DSH rc.6.
 */
export function recoverQueuedTurns(agent: Agent): boolean {
  if (agent.status !== 'idle') return false
  const queued = agent.inbox.nextTurn
  const candidate = queued.at(-1)
  if (candidate === undefined) return false
  if (!agent.inbox.remove(candidate.id)) return false

  try {
    agent.followup(candidate)
  } catch (error) {
    const alreadyRestored = agent.inbox.nextTurn.some((message) => message.id === candidate.id)
    if (!alreadyRestored) agent.inbox.append('next-turn', candidate)
    throw error
  }
  return true
}

export type QueueMicrotask = (callback: () => void) => void

/** Coalesce status notifications and recover at most once per idle transition. */
export function createQueueRecoveryScheduler(
  enqueue: QueueMicrotask = queueMicrotask,
  onError: (error: unknown) => void = () => undefined,
): (agent: Agent, status: AgentStatus) => void {
  const pending = new WeakSet<Agent>()

  return (agent, status) => {
    if (status !== 'idle' || pending.has(agent)) return
    pending.add(agent)
    enqueue(() => {
      pending.delete(agent)
      if (agent.status !== 'idle') return
      try {
        recoverQueuedTurns(agent)
      } catch (error) {
        onError(error)
      }
    })
  }
}

function isKnownObjectAbort(exec: ToolExecution, result: Readonly<ToolExecutionResult>): boolean {
  return exec.name === RUN_CODE_NAME
    && result.isError
    && result.error.info?.code === 'CODE_RUN_FAILED'
    && result.error.message.includes(OBJECT_ABORT_MESSAGE)
}

/** Replace only the malformed rc.6 user-cancel presentation. */
export function normalizeCancellationDecision(
  exec: ToolExecution,
  result: Readonly<ToolExecutionResult>,
  decision: PostToolDecision,
): PostToolDecision {
  if (!isKnownObjectAbort(exec, result)) return decision
  if (decision.kind !== 'accept' || 'value' in decision) return decision

  const content: ContentBlock[] = [{ type: 'text', text: FRIENDLY_CANCELLED_MESSAGE }]
  return { ...decision, content }
}
