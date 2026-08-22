import assert from 'node:assert/strict'
import test from 'node:test'

import { DesktopNotificationService, normalizeDesktopNotification } from '../src/notifications.mjs'

test('structured notifications validate category, id, bounded text, and allowlisted deep links', () => {
  assert.deepEqual(normalizeDesktopNotification({
    category: 'task',
    id: 'task:review-1:complete',
    title: 'Task complete',
    body: 'Review finished.',
    deepLink: 'dsh://task/review-1',
  }), {
    category: 'task',
    id: 'task:review-1:complete',
    title: 'Task complete',
    body: 'Review finished.',
    deepLink: { kind: 'task', id: 'review-1', href: 'dsh://task/review-1' },
  })
  for (const value of [
    { category: 'command', id: 'x', title: 'X', body: 'Y' },
    { category: 'task', id: '../x', title: 'X', body: 'Y' },
    { category: 'task', id: 'x', title: '', body: 'Y' },
    { category: 'task', id: 'x', title: 'X', body: 'Y', deepLink: 'dsh://command/run' },
    { category: 'task', id: 'x', title: 'X', body: 'Y', path: 'C:\\secret' },
  ]) {
    assert.throws(() => normalizeDesktopNotification(value), /notification|deep link/u)
  }
})

test('notification service suppresses foreground, duplicate, and rapid category notifications', async () => {
  let now = 10_000
  let foreground = true
  const shown = []
  const service = new DesktopNotificationService({
    now: () => now,
    isForeground: () => foreground,
    showNative: async (notification) => { shown.push(notification); return true },
  })
  const first = { category: 'task', id: 'task:one', title: 'Done', body: 'One done' }
  assert.deepEqual(await service.show(first), { shown: false, reason: 'foreground' })
  foreground = false
  assert.deepEqual(await service.show(first), { shown: true })
  assert.deepEqual(await service.show(first), { shown: false, reason: 'duplicate' })
  assert.deepEqual(await service.show({ ...first, id: 'task:two' }), { shown: false, reason: 'rate-limited' })
  now += 15_000
  assert.deepEqual(await service.show({ ...first, id: 'task:two' }), { shown: true })
  assert.equal(shown.length, 2)
})

test('notification clicks route only the already validated structured deep link', async () => {
  let click
  const routed = []
  const service = new DesktopNotificationService({
    showNative: async (notification) => { click = notification.onClick; return true },
    routeDeepLink: async (link) => { routed.push(link) },
  })
  await service.show({
    category: 'update',
    id: 'update:ready',
    title: 'Update ready',
    body: 'A new version is ready.',
    deepLink: 'dsh://updates',
  })
  click()
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(routed, [{ kind: 'updates', href: 'dsh://updates' }])
})
