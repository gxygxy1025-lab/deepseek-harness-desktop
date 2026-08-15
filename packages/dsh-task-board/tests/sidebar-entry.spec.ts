// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSidebarEntry, SURFACE_NAVIGATION_EVENT } from '../src/client/sidebar-entry.ts'

function shell(): HTMLButtonElement {
  document.body.innerHTML = '<aside data-pane="sidebar"><div><div class="logoRow"><button class="newSession">New</button></div><button class="sessionRow">Session</button></div></aside>'
  return document.querySelector<HTMLButtonElement>('.sessionRow')!
}

describe('task-board sidebar navigation', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('closes the board when an original sidebar destination is clicked', () => {
    const original = shell()
    const controller = {
      toggleBoard: vi.fn(),
      closeBoard: vi.fn(),
      subscribe: () => () => {},
      getSnapshot: () => ({ boardOpen: true }),
    }
    const dispose = mountSidebarEntry(controller as never)

    original.click()

    expect(controller.closeBoard).toHaveBeenCalledOnce()
    dispose()
  })

  it('announces itself and closes when another custom surface opens', () => {
    shell()
    const controller = {
      toggleBoard: vi.fn(),
      closeBoard: vi.fn(),
      subscribe: () => () => {},
      getSnapshot: () => ({ boardOpen: false }),
    }
    const dispose = mountSidebarEntry(controller as never)
    document.querySelector<HTMLButtonElement>('[data-dsh-taskboard-entry]')!.click()
    expect(controller.toggleBoard).toHaveBeenCalledOnce()

    document.dispatchEvent(new CustomEvent(SURFACE_NAVIGATION_EVENT, { detail: { surface: 'ssh' } }))
    expect(controller.closeBoard).toHaveBeenCalledOnce()
    dispose()
  })
})
