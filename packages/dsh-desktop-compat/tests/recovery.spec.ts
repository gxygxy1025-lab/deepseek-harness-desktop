import { describe, expect, it, vi } from 'vitest'
import {
  FRIENDLY_CANCELLED_MESSAGE,
  createQueueRecoveryScheduler,
  normalizeCancellationDecision,
  recoverQueuedTurns,
} from '../src/recovery.ts'

interface Message {
  id: string
  content: string
}

function fakeAgent(messages: Message[], status: 'idle' | 'running' = 'idle') {
  const nextTurn = [...messages]
  const followup = vi.fn((message: Message) => nextTurn.push(message))
  return {
    agent: {
      status,
      inbox: {
        get nextTurn() { return nextTurn },
        remove(id: string) {
          const index = nextTurn.findIndex((message) => message.id === id)
          if (index === -1) return false
          nextTurn.splice(index, 1)
          return true
        },
        append(_target: 'next-turn', message: Message) { nextTurn.push(message) },
      },
      followup,
    },
    followup,
    nextTurn,
  }
}

describe('queued turn recovery', () => {
  it('re-arms an idle queue without changing FIFO order or duplicating messages', () => {
    const first = { id: 'first', content: 'first' }
    const second = { id: 'second', content: 'second' }
    const third = { id: 'third', content: 'third' }
    const { agent, followup, nextTurn } = fakeAgent([first, second, third])

    expect(recoverQueuedTurns(agent as never)).toBe(true)
    expect(followup).toHaveBeenCalledOnce()
    expect(followup).toHaveBeenCalledWith(third)
    expect(nextTurn).toEqual([first, second, third])
  })

  it('does nothing while the agent is running or when no ordinary turn is queued', () => {
    expect(recoverQueuedTurns(fakeAgent([], 'idle').agent as never)).toBe(false)
    expect(recoverQueuedTurns(fakeAgent([{ id: 'one', content: 'one' }], 'running').agent as never)).toBe(false)
  })

  it('coalesces repeated idle events and rechecks state before recovery', () => {
    const callbacks: Array<() => void> = []
    const schedule = createQueueRecoveryScheduler((callback) => callbacks.push(callback))
    const fixture = fakeAgent([{ id: 'one', content: 'one' }])

    schedule(fixture.agent as never, 'idle')
    schedule(fixture.agent as never, 'idle')
    expect(callbacks).toHaveLength(1)
    callbacks[0]?.()
    expect(fixture.followup).toHaveBeenCalledOnce()
  })

  it('restores the final queued message if followup submission fails', () => {
    const fixture = fakeAgent([
      { id: 'first', content: 'first' },
      { id: 'second', content: 'second' },
    ])
    fixture.followup.mockImplementationOnce(() => { throw new Error('wake failed') })

    expect(() => recoverQueuedTurns(fixture.agent as never)).toThrow('wake failed')
    expect(fixture.nextTurn.map(({ id }) => id)).toEqual(['first', 'second'])
  })
})

describe('cancellation presentation', () => {
  it('replaces only the recognized run_code object-string abort failure', () => {
    const decision = normalizeCancellationDecision(
      { name: 'run_code' } as never,
      {
        isError: true,
        error: {
          message: 'code run failed (abort): [object Object]',
          info: { code: 'CODE_RUN_FAILED' },
        },
        content: [{ type: 'text', text: 'Error: code run failed (abort): [object Object]' }],
      } as never,
      { kind: 'accept' },
    )

    expect(decision).toEqual({
      kind: 'accept',
      content: [{ type: 'text', text: FRIENDLY_CANCELLED_MESSAGE }],
    })
  })

  it('preserves unrelated errors and downstream blocking decisions', () => {
    const unrelated = { kind: 'accept' } as const
    expect(normalizeCancellationDecision(
      { name: 'run_code' } as never,
      { isError: true, error: { message: 'permission denied' }, content: [] } as never,
      unrelated,
    )).toBe(unrelated)

    const blocked = { kind: 'block', feedback: [{ type: 'text', text: 'blocked' }] } as const
    expect(normalizeCancellationDecision(
      { name: 'run_code' } as never,
      {
        isError: true,
        error: { message: 'code run failed (abort): [object Object]', info: { code: 'CODE_RUN_FAILED' } },
        content: [],
      } as never,
      blocked as never,
    )).toBe(blocked)
  })
})
