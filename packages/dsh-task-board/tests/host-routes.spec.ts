import type { IncomingMessage } from 'node:http'
import { describe, expect, it } from 'vitest'

import { HostTaskFileStore } from '../src/host/file-store.ts'
import {
  TASK_BOARD_API_PATH,
  TASK_BOARD_EVENTS_PATH,
  isTrustedTaskBoardRequest,
  makeTaskBoardRoutes,
} from '../src/host/routes.ts'

function request(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    socket: { remoteAddress: '127.0.0.1' },
    headers: { host: '127.0.0.1:43125', origin: 'http://127.0.0.1:43125' },
    ...overrides,
  } as unknown as IncomingMessage
}

describe('Task Board Host routes', () => {
  it('registers only fixed task and event paths', () => {
    const family = makeTaskBoardRoutes(new HostTaskFileStore({ path: 'unused.json' }))
    expect(family.routes.map(route => [route.kind, route.path])).toEqual([
      ['exact', TASK_BOARD_API_PATH],
      ['exact', TASK_BOARD_EVENTS_PATH],
    ])
    family.dispose()
  })

  it('accepts loopback same-origin requests and rejects cross-site or LAN callers', () => {
    expect(isTrustedTaskBoardRequest(request())).toBe(true)
    expect(isTrustedTaskBoardRequest(request({ headers: { host: '127.0.0.1:43125', 'sec-fetch-site': 'cross-site' } }))).toBe(false)
    expect(isTrustedTaskBoardRequest(request({ socket: { remoteAddress: '192.168.1.2' } as IncomingMessage['socket'] }))).toBe(false)
    expect(isTrustedTaskBoardRequest(request({ headers: { host: '127.0.0.1:43125', origin: 'https://evil.example' } }))).toBe(false)
  })
})
