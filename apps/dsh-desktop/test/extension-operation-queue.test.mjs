import assert from 'node:assert/strict'
import test from 'node:test'

import { createExtensionOperationQueue } from '../src/ui/extension-operation-queue.mjs'

const tick = () => new Promise((resolve) => setImmediate(resolve))

test('extension operations run FIFO and expose one continuous busy interval', async () => {
  const events = []
  const busy = []
  let releaseFirst
  const firstBarrier = new Promise((resolve) => { releaseFirst = resolve })
  const queue = createExtensionOperationQueue({
    onBusyChange: (value) => busy.push(value),
  })

  const first = queue.run(async () => {
    events.push('first:start')
    await firstBarrier
    events.push('first:end')
    return 1
  })
  const second = queue.run(async () => {
    events.push('second')
    return 2
  })
  await tick()

  assert.equal(queue.busy, true)
  assert.deepEqual(events, ['first:start'])
  assert.deepEqual(busy, [true])
  releaseFirst()

  assert.deepEqual(await Promise.all([first, second]), [1, 2])
  assert.equal(queue.busy, false)
  assert.deepEqual(events, ['first:start', 'first:end', 'second'])
  assert.deepEqual(busy, [true, false])
})

test('a rejected extension operation does not poison the queue', async () => {
  const queue = createExtensionOperationQueue()
  await assert.rejects(queue.run(async () => { throw new Error('scan failed') }), /scan failed/u)
  assert.equal(await queue.run(async () => 'recovered'), 'recovered')
  assert.equal(queue.busy, false)
})
