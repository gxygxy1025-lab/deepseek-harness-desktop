import assert from 'node:assert/strict'
import test from 'node:test'

import { installRendererSecurityHeaders, RENDERER_CSP_REPORT_ONLY } from '../src/renderer-security.mjs'

test('renderer security headers apply only to the active loopback origin', () => {
  let listener
  const registrations = []
  const session = {
    webRequest: {
      onHeadersReceived: (filter, next) => {
        registrations.push([filter, next])
        if (next !== null) listener = next
      },
    },
  }
  const dispose = installRendererSecurityHeaders({
    session,
    getActiveOrigin: () => 'http://127.0.0.1:12345',
  })

  let activeResult
  listener({
    url: 'http://127.0.0.1:12345/index.html',
    responseHeaders: { 'Content-Type': ['text/html'] },
  }, (result) => { activeResult = result })
  assert.deepEqual(activeResult.responseHeaders['X-Content-Type-Options'], ['nosniff'])
  assert.deepEqual(activeResult.responseHeaders['Content-Security-Policy-Report-Only'], [RENDERER_CSP_REPORT_ONLY])

  let foreignResult
  listener({
    url: 'http://127.0.0.1:54321/index.html',
    responseHeaders: { 'Content-Type': ['text/html'] },
  }, (result) => { foreignResult = result })
  assert.equal(foreignResult.responseHeaders['X-Content-Type-Options'], undefined)
  assert.equal(foreignResult.responseHeaders['Content-Security-Policy-Report-Only'], undefined)

  dispose()
  assert.equal(registrations.length, 2)
  assert.deepEqual(registrations[1], [registrations[0][0], null])
})
