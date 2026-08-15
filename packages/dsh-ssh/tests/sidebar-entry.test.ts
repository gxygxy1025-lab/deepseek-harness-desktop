// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSidebarEntry, SURFACE_NAVIGATION_EVENT } from '../src/client/sidebar-entry.ts'

function shell(): HTMLButtonElement {
  document.body.innerHTML = '<aside data-pane="sidebar"><div><div class="logoRow"><button class="newSession">New</button></div><button class="workspaceRow">Workspace</button></div></aside>'
  return document.querySelector<HTMLButtonElement>('.workspaceRow')!
}

describe('SSH sidebar navigation', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('closes the panel when an original sidebar destination is clicked', () => {
    const original = shell()
    const controller = {
      toggle: vi.fn(),
      close: vi.fn(),
      subscribe: () => () => {},
      getSnapshot: () => ({ panelOpen: true }),
    }
    const dispose = mountSidebarEntry(controller as never)

    original.click()

    expect(controller.close).toHaveBeenCalledOnce()
    dispose()
  })

  it('announces itself and closes when another custom surface opens', () => {
    shell()
    const controller = {
      toggle: vi.fn(),
      close: vi.fn(),
      subscribe: () => () => {},
      getSnapshot: () => ({ panelOpen: false }),
    }
    const dispose = mountSidebarEntry(controller as never)
    document.querySelector<HTMLButtonElement>('[data-dsh-ssh-entry]')!.click()
    expect(controller.toggle).toHaveBeenCalledOnce()

    document.dispatchEvent(new CustomEvent(SURFACE_NAVIGATION_EVENT, { detail: { surface: 'task-board' } }))
    expect(controller.close).toHaveBeenCalledOnce()
    dispose()
  })
})
