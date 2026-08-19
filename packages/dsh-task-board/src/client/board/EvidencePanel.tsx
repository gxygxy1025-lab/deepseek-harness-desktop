/** Evidence summary and explicit review controls for one TaskRun. */

import { useState } from 'react'
import type { Evidence } from '../../core/runs.ts'
import { t } from '../locales.ts'
import css from '../board.module.css'

export interface EvidencePanelProps {
  evidence: Evidence
  onOpenSession?: (sessionId: string) => void
  onOpenWorktree?: (worktreeId: string) => void
  onCommit?: (evidenceId: string) => void | Promise<void>
  onMerge?: (evidenceId: string) => void | Promise<void>
  onKeep?: (evidenceId: string) => void | Promise<void>
  onDiscard?: (evidenceId: string) => void | Promise<void>
}

function statusLabel(evidence: Evidence): string {
  if (evidence.resultStatus === 'awaiting-review') return t('detail.evidence.awaiting')
  return evidence.resultStatus
}

/** The panel never renders a raw transcript; only bounded derived Evidence. */
export function EvidencePanel({ evidence, onOpenSession, onOpenWorktree, onCommit, onMerge, onKeep, onDiscard }: EvidencePanelProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const canReview = evidence.resultStatus === 'awaiting-review' || evidence.resultStatus === 'kept' || evidence.resultStatus === 'accepted'
  return (
    <section className={css.evidencePanel} data-evidence-id={evidence.evidenceId}>
      <header className={css.evidenceHeader}>
        <h4>{t('detail.evidence')}</h4>
        <span className={css.executionBadge} data-result={evidence.resultStatus}>{statusLabel(evidence)}</span>
      </header>
      <div className={css.evidenceStats}>
        <span>{t('detail.evidence.stats')}: +{evidence.additions} / -{evidence.deletions}</span>
        <span>{evidence.clean ? 'clean' : evidence.dirty ? 'dirty' : 'unknown'}</span>
        <span>{evidence.changedFiles.length} {t('detail.evidence.files')}</span>
      </div>
      <ul className={css.evidenceFiles}>
        {evidence.changedFiles.slice(0, 50).map(file => (
          <li key={`${file.status}:${file.path}`}>
            <code>{file.path}</code>
            <span>{file.binary ? 'binary' : `+${file.additions ?? 0} / -${file.deletions ?? 0}`}</span>
          </li>
        ))}
      </ul>
      {evidence.preview !== undefined && <pre className={css.evidencePreview}>{evidence.preview}</pre>}
      <div className={css.evidenceActions}>
        {evidence.sessionId !== undefined && onOpenSession !== undefined && <button type="button" className={css.linkButton} onClick={() => onOpenSession(evidence.sessionId as string)}>{t('detail.evidence.openSession')}</button>}
        {evidence.worktreeId !== undefined && onOpenWorktree !== undefined && <button type="button" className={css.linkButton} onClick={() => onOpenWorktree(evidence.worktreeId as string)}>{t('detail.evidence.openWorktree')}</button>}
        {canReview && onCommit !== undefined && evidence.worktreeId !== undefined && <button type="button" className={css.ghostButton} onClick={() => void onCommit(evidence.evidenceId)}>{t('detail.evidence.commit')}</button>}
        {canReview && onMerge !== undefined && evidence.worktreeId !== undefined && <button type="button" className={css.ghostButton} onClick={() => void onMerge(evidence.evidenceId)}>{t('detail.evidence.merge')}</button>}
        {canReview && onKeep !== undefined && <button type="button" className={css.ghostButton} onClick={() => void onKeep(evidence.evidenceId)}>{t('detail.evidence.keep')}</button>}
        {onDiscard !== undefined && evidence.resultStatus !== 'discarded' && (
          confirmDiscard
            ? <button type="button" className={css.dangerButton} onClick={() => { setConfirmDiscard(false); void onDiscard(evidence.evidenceId) }}>{t('detail.evidence.confirmDiscard')}</button>
            : <button type="button" className={css.dangerButton} onClick={() => { setConfirmDiscard(true) }}>{t('detail.evidence.discard')}</button>
        )}
      </div>
    </section>
  )
}
