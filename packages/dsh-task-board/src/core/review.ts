/** Explicit, auditable Evidence review actions. */

import {
  appendAudit,
  reviewTransition,
  type AuditEntry,
  type Evidence,
  type ReviewAction,
  type ReviewResult,
} from './runs.ts'
import type { EvidenceStore } from './evidence.ts'

export interface ReviewWorktreeFace {
  commitWorktree(worktreeId: string, message: string): Promise<{ ok: true; value: { revision: string } } | { ok: false; error: { code: string; message: string } }>
  mergeWorktree(worktreeId: string, targetBranch: string): Promise<{ ok: true; value: { revision: string } } | { ok: false; error: { code: string; message: string } }>
  removeWorktree(input: { worktreeId: string; preserveBranch?: boolean; force?: boolean; confirmDiscard?: boolean | 'DISCARD' }): Promise<{ ok: true; value: unknown } | { ok: false; error: { code: string; message: string } }>
}

export interface EvidenceReviewOptions {
  store: EvidenceStore
  worktrees: ReviewWorktreeFace
  now?: () => number
  targetBranch?: string
}

function audit(action: ReviewAction, status: AuditEntry['status'], summary: string, at: number): AuditEntry {
  return { action, status, summary: summary.slice(0, 500), at }
}

function result(status: ReviewResult['status'], entry: AuditEntry, error?: ReviewResult['error']): ReviewResult {
  return { ok: error === undefined, status, audit: entry, ...(error === undefined ? {} : { error }) }
}

/**
 * Review service. Every action is explicit, and a failed precheck only writes
 * a bounded audit summary. No Secret or raw Session event is retained.
 */
export class EvidenceReviewService {
  private readonly now: () => number
  private readonly targetBranch: string

  constructor(private readonly options: EvidenceReviewOptions) {
    this.now = options.now ?? Date.now
    this.targetBranch = options.targetBranch ?? 'main'
  }

  async commit(evidenceId: string, message: string): Promise<ReviewResult> {
    return this.perform(evidenceId, 'commit', async (evidence) => {
      if (evidence.worktreeId === undefined) return { ok: false, error: { code: 'no-worktree', message: 'shared-workspace runs cannot be committed here' } }
      const transition = reviewTransition(evidence.resultStatus, 'commit')
      if (transition.blocked) return { ok: false, error: { code: 'review-blocked', message: transition.blocked } }
      const response = await this.options.worktrees.commitWorktree(evidence.worktreeId, message)
      return response.ok ? { ok: true, status: 'accepted' as const, summary: response.value.revision ? `committed ${response.value.revision}` : 'commit accepted' } : { ok: false, error: response.error }
    })
  }

  async merge(evidenceId: string, targetBranch = this.targetBranch): Promise<ReviewResult> {
    return this.perform(evidenceId, 'merge', async (evidence) => {
      if (evidence.worktreeId === undefined) return { ok: false, error: { code: 'no-worktree', message: 'shared-workspace runs cannot be merged here' } }
      const transition = reviewTransition(evidence.resultStatus, 'merge')
      if (transition.blocked) return { ok: false, error: { code: 'review-blocked', message: transition.blocked } }
      const response = await this.options.worktrees.mergeWorktree(evidence.worktreeId, targetBranch)
      return response.ok ? { ok: true, status: 'accepted' as const, summary: `merged into ${targetBranch}` } : { ok: false, error: response.error }
    })
  }

  async keep(evidenceId: string): Promise<ReviewResult> {
    return this.perform(evidenceId, 'keep', async (evidence) => {
      const transition = reviewTransition(evidence.resultStatus, 'keep')
      if (transition.blocked) return { ok: false, error: { code: 'review-blocked', message: transition.blocked } }
      return { ok: true, status: 'kept' as const, summary: 'worktree and branch retained' }
    })
  }

  async discard(evidenceId: string, confirmed: boolean): Promise<ReviewResult> {
    return this.perform(evidenceId, 'discard', async (evidence) => {
      if (!confirmed) return { ok: false, error: { code: 'confirmation-required', message: 'discard requires a second confirmation' } }
      const transition = reviewTransition(evidence.resultStatus, 'discard')
      if (transition.blocked) return { ok: false, error: { code: 'review-blocked', message: transition.blocked } }
      if (evidence.worktreeId !== undefined) {
        const response = await this.options.worktrees.removeWorktree({ worktreeId: evidence.worktreeId, preserveBranch: false, force: true, confirmDiscard: 'DISCARD' })
        if (!response.ok) return { ok: false, error: response.error }
      }
      return { ok: true, status: 'discarded' as const, summary: 'worktree discarded after explicit confirmation' }
    })
  }

  private async perform(
    evidenceId: string,
    action: ReviewAction,
    operation: (evidence: Evidence) => Promise<{ ok: true; status: ReviewResult['status']; summary: string } | { ok: false; error: { code: string; message: string } }>,
  ): Promise<ReviewResult> {
    const loaded = await this.options.store.get(evidenceId)
    if (loaded === undefined) {
      return result('failed', audit(action, 'failed', 'evidence was not found', this.now()), { code: 'evidence-not-found', message: 'evidence was not found' })
    }
    const outcome = await operation(loaded)
    if (!outcome.ok) {
      const entry = audit(action, 'blocked', outcome.error.message, this.now())
      await this.options.store.put(appendAudit(loaded, entry))
      return result(loaded.resultStatus, entry, outcome.error)
    }
    const entry = audit(action, 'ok', outcome.summary, this.now())
    const updated = appendAudit({ ...loaded, resultStatus: outcome.status }, entry)
    await this.options.store.put(updated)
    return result(outcome.status, entry)
  }
}
