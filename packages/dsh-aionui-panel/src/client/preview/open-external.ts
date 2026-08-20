/** User-visible failure handling for the optional Desktop native-file action. */

import { openWorkspaceFile } from '@linxin666/dsh-desktop-client'
import type { WorkspaceFileOpenRequest, WorkspaceFileOpenResult } from '@linxin666/dsh-desktop-client'
import { toast } from '../components/overlay.tsx'
import { t } from '../locales.ts'

type OpenWorkspaceFile = (request: WorkspaceFileOpenRequest) => Promise<WorkspaceFileOpenResult>

/**
 * Keep the native-open failure deliberately generic: the Desktop authority
 * does not expose filesystem or policy details to browser code.
 */
export async function openPreviewWorkspaceFile(
  request: WorkspaceFileOpenRequest,
  {
    open = openWorkspaceFile,
    notify = toast,
  }: {
    open?: OpenWorkspaceFile
    notify?: (message: string) => void
  } = {},
): Promise<boolean> {
  try {
    const result = await open(request)
    if ('opened' in result && result.opened) return true
  } catch {
    // Invalid input and Desktop-side failures have the same user-facing copy.
  }
  notify(t('preview.openExternalFailed'))
  return false
}
