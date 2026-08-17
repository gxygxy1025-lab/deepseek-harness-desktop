// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SSH jsdom capabilities', () => {
  it('reports Canvas as unavailable without emitting a jsdom implementation error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(document.createElement('canvas').getContext('2d')).toBeNull()
    expect(consoleError).not.toHaveBeenCalled()
  })
})
