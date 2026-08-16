import { RUN_CODE_NAME } from "@deepseek-ai/dsh-tools";
//#region src/recovery.ts
const FRIENDLY_CANCELLED_MESSAGE = "当前执行已停止，排队消息将继续发送。";
const OBJECT_ABORT_MESSAGE = "code run failed (abort): [object Object]";
/**
* Re-arm an idle official agent that retained ordinary turns across a cancel.
* Removing and re-appending the final item preserves the complete FIFO order,
* while `followup` supplies the wake edge missing in DSH rc.6.
*/
function recoverQueuedTurns(agent) {
	if (agent.status !== "idle") return false;
	const candidate = agent.inbox.nextTurn.at(-1);
	if (candidate === void 0) return false;
	if (!agent.inbox.remove(candidate.id)) return false;
	try {
		agent.followup(candidate);
	} catch (error) {
		if (!agent.inbox.nextTurn.some((message) => message.id === candidate.id)) agent.inbox.append("next-turn", candidate);
		throw error;
	}
	return true;
}
/** Coalesce status notifications and recover at most once per idle transition. */
function createQueueRecoveryScheduler(enqueue = queueMicrotask, onError = () => void 0) {
	const pending = /* @__PURE__ */ new WeakSet();
	return (agent, status) => {
		if (status !== "idle" || pending.has(agent)) return;
		pending.add(agent);
		enqueue(() => {
			pending.delete(agent);
			if (agent.status !== "idle") return;
			try {
				recoverQueuedTurns(agent);
			} catch (error) {
				onError(error);
			}
		});
	};
}
function isKnownObjectAbort(exec, result) {
	return exec.name === RUN_CODE_NAME && result.isError && result.error.info?.code === "CODE_RUN_FAILED" && result.error.message.includes(OBJECT_ABORT_MESSAGE);
}
/** Replace only the malformed rc.6 user-cancel presentation. */
function normalizeCancellationDecision(exec, result, decision) {
	if (!isKnownObjectAbort(exec, result)) return decision;
	if (decision.kind !== "accept" || "value" in decision) return decision;
	const content = [{
		type: "text",
		text: FRIENDLY_CANCELLED_MESSAGE
	}];
	return {
		...decision,
		content
	};
}
//#endregion
export { FRIENDLY_CANCELLED_MESSAGE, createQueueRecoveryScheduler, normalizeCancellationDecision, recoverQueuedTurns };
