import { describe, expect, it, vi } from 'vitest'
import { openPreviewWorkspaceFile } from '../src/client/preview/open-external.ts'

describe('PreviewPanel external-open feedback', () => {
  it('does not show an error when the Desktop SDK opens the file', async () => {
    const notify = vi.fn()
    await expect(openPreviewWorkspaceFile(
      { root: '/workspace', path: 'README.md' },
      { open: async () => ({ opened: true }), notify },
    )).resolves.toBe(true)
    expect(notify).not.toHaveBeenCalled()
  })

  it('shows generic feedback for a rejected or unavailable Desktop open', async () => {
    const rejected = vi.fn()
    await expect(openPreviewWorkspaceFile(
      { root: '/workspace', path: 'README.md' },
      { open: async () => ({ opened: false, reason: 'shell-failed' }), notify: rejected },
    )).resolves.toBe(false)
    expect(rejected).toHaveBeenCalledWith(expect.any(String))

    const unavailable = vi.fn()
    await expect(openPreviewWorkspaceFile(
      { root: '/workspace', path: 'README.md' },
      { open: async () => ({ available: false, reason: 'unavailable' }), notify: unavailable },
    )).resolves.toBe(false)
    expect(unavailable).toHaveBeenCalledWith(expect.any(String))

    const failed = vi.fn()
    await expect(openPreviewWorkspaceFile(
      { root: '/workspace', path: 'README.md' },
      { open: async () => { throw new Error('bridge rejected') }, notify: failed },
    )).resolves.toBe(false)
    expect(failed).toHaveBeenCalledWith(expect.any(String))
  })
})
