import assert from 'node:assert/strict'
import test from 'node:test'

import { createRetryableLazyLoader } from '../src/optional-integrations.mjs'

test('optional integration loader memoizes success and retries a failed import', async () => {
  let attempts = 0
  const expected = { value: 'loaded' }
  const load = createRetryableLazyLoader(async () => {
    attempts += 1
    if (attempts === 1) throw new Error('temporary module read failure')
    return expected
  })

  await assert.rejects(load(), /temporary module read failure/u)
  assert.equal(await load(), expected)
  assert.equal(await load(), expected)
  assert.equal(attempts, 2)
})
