import assert from 'node:assert/strict'
import test from 'node:test'

import { DeepLinkRouter, normalizeDeepLink } from '../src/deep-links.mjs'

test('deep links expose only fixed navigation routes and bounded safe identifiers', () => {
  assert.deepEqual(normalizeDeepLink('dsh://updates'), { kind: 'updates', href: 'dsh://updates' })
  assert.deepEqual(normalizeDeepLink('dsh://task/review-42'), {
    kind: 'task', id: 'review-42', href: 'dsh://task/review-42',
  })
  assert.deepEqual(normalizeDeepLink('dsh://session/session_1'), {
    kind: 'session', id: 'session_1', href: 'dsh://session/session_1',
  })
  assert.deepEqual(normalizeDeepLink('dsh://run/run_1'), {
    kind: 'run', id: 'run_1', href: 'dsh://run/run_1',
  })
})
test('deep links reject commands, arbitrary paths or URLs, dangerous queries, and malformed IDs', () => {
  for (const value of [
    'dsh://command/run',
    'dsh://updates?command=whoami',
    'dsh://task/../updates',
    'dsh://task/a%2Fb',
    'dsh://session/UPPER',
    'dsh://updates#fragment',
    'dsh://user:pass@extensions',
    'https://example.com/',
  ]) {
    assert.throws(() => normalizeDeepLink(value), /deep link/u, value)
  }
})

test('deep link routing queues until ready, deduplicates, and dispatches each route once', async () => {
  const dispatched = []
  const router = new DeepLinkRouter({ dispatch: async (link) => { dispatched.push(link.href) }, maxPending: 2 })
  assert.deepEqual(router.enqueue('dsh://updates').accepted, true)
  assert.deepEqual(router.enqueue('dsh://updates'), { accepted: false, reason: 'duplicate' })
  assert.deepEqual(router.enqueue('dsh://task/one').queued, true)
  assert.deepEqual(router.enqueue('dsh://task/two'), { accepted: false, reason: 'queue-full' })
  assert.deepEqual(dispatched, [])
  assert.equal(router.setReady(true), 2)
  await router.idle()
  assert.deepEqual(dispatched, ['dsh://updates', 'dsh://task/one'])
  assert.equal(router.enqueue('dsh://run/three').queued, false)
  await router.idle()
  assert.deepEqual(dispatched, ['dsh://updates', 'dsh://task/one', 'dsh://run/three'])
  router.dispatchValidated({ href: 'dsh://updates' })
  await router.idle()
  assert.deepEqual(dispatched, ['dsh://updates', 'dsh://task/one', 'dsh://run/three', 'dsh://updates'])
  assert.throws(() => router.dispatchValidated({ href: 'dsh://command/run' }), /allowlisted/u)
})

