/** Renderer-safe Worktree review client: only opaque IDs cross the bridge. */

import type { ReviewWorktreeFace } from '../core/review.ts'

type FetchLike = typeof fetch

type Envelope<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } }

export class RemoteWorktreeReviewClient implements ReviewWorktreeFace {
  constructor(private readonly fetchImpl: FetchLike = globalThis.fetch.bind(globalThis)) {}

  commitWorktree(worktreeId: string, message: string) {
    return this.post<{ revision: string }>('/git-worktree/commit', { worktreeId, message })
  }

  mergeWorktree(worktreeId: string, targetBranch: string) {
    return this.post<{ revision: string }>('/git-worktree/merge', { worktreeId, targetBranch })
  }

  removeWorktree(input: { worktreeId: string; preserveBranch?: boolean; force?: boolean; confirmDiscard?: boolean | 'DISCARD' }) {
    return this.post<unknown>('/git-worktree/remove', input)
  }

  private async post<T>(path: string, payload: unknown): Promise<Envelope<T>> {
    const response = await this.fetchImpl(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    })
    const value = await response.json() as Envelope<T>
    if (!response.ok) return { ok: false, error: { code: 'http', message: `Worktree Host request failed (${response.status})` } }
    return value
  }
}
