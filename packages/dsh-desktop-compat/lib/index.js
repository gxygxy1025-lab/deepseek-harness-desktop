import { FRIENDLY_CANCELLED_MESSAGE, createQueueRecoveryScheduler, normalizeCancellationDecision, recoverQueuedTurns } from "./recovery.js";
//#region src/index.ts
const name = "desktop-compat";
const inject = ["tools"];
/** Install Desktop-only compatibility behavior through public DSH hooks. */
function apply(ctx) {
	const scheduleRecovery = createQueueRecoveryScheduler(queueMicrotask, (error) => {
		const detail = error instanceof Error ? error.message : String(error);
		ctx.logger?.warn?.(`dsh-desktop-compat: queued turn recovery failed: ${detail}`);
	});
	ctx.on("agent/status", ({ agent, status }) => {
		scheduleRecovery(agent, status);
	});
	ctx.on("tools/post-execute", async (exec, result, next) => {
		return normalizeCancellationDecision(exec, result, await next());
	});
}
//#endregion
export { FRIENDLY_CANCELLED_MESSAGE, apply, createQueueRecoveryScheduler, inject, name, normalizeCancellationDecision, recoverQueuedTurns };
