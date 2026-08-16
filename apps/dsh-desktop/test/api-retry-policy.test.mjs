import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { parse } from 'yaml'

import {
  DEFAULT_API_RETRY_POLICY,
  ensureApiRetryPolicies,
  withDefaultApiRetryPolicies,
} from '../src/api-retry-policy.mjs'

test('default API recovery is bounded and limited to transient provider failures', () => {
  assert.equal(DEFAULT_API_RETRY_POLICY.mode, 'normal')
  assert.equal(DEFAULT_API_RETRY_POLICY.maxRetries, 4)
  assert.deepEqual(DEFAULT_API_RETRY_POLICY.retryableCodes, [
    'EMPTY_RESPONSE',
    'RATE_LIMIT',
    'SERVER',
    'TIMEOUT',
    'TRANSPORT',
    'STREAM_CLOSED',
  ])
  assert.equal(DEFAULT_API_RETRY_POLICY.retryableCodes.includes('AUTH'), false)
  assert.equal(DEFAULT_API_RETRY_POLICY.retryableCodes.includes('QUOTA'), false)
})

test('retry defaults fill only missing provider policies and preserve explicit choices', () => {
  const explicit = { mode: 'normal', maxRetries: 1 }
  const result = withDefaultApiRetryPolicies({
    'llm-deepseek': { baseURL: 'https://gateway.example' },
    'llm-pi-ai': {
      providers: {
        openai: { apiKeyEnv: 'OPENAI_API_KEY' },
        custom: { baseURL: 'https://custom.example', retryPolicy: explicit },
      },
    },
    pet: { visible: true },
  })

  assert.equal(result.changed, true)
  assert.deepEqual(result.settings['llm-deepseek'].retryPolicy, DEFAULT_API_RETRY_POLICY)
  assert.deepEqual(result.settings['llm-pi-ai'].providers.openai.retryPolicy, DEFAULT_API_RETRY_POLICY)
  assert.deepEqual(result.settings['llm-pi-ai'].providers.custom.retryPolicy, explicit)
  assert.deepEqual(result.settings.pet, { visible: true })
})

test('retry defaults do not create dormant provider sections', () => {
  const result = withDefaultApiRetryPolicies({ pet: { visible: true } })
  assert.equal(result.changed, false)
  assert.equal(result.settings['llm-deepseek'], undefined)
  assert.equal(result.settings['llm-pi-ai'], undefined)
})

test('settings file migration is idempotent and keeps unrelated settings', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-api-retry-'))
  try {
    await mkdir(root, { recursive: true })
    const path = join(root, 'settings.yaml')
    await writeFile(path, '# user settings\nllm-pi-ai:\n  providers:\n    openai:\n      apiKeyEnv: OPENAI_API_KEY\npet:\n  visible: true\n')
    const first = await ensureApiRetryPolicies({ dshHome: root })
    const firstText = await readFile(path, 'utf8')
    const second = await ensureApiRetryPolicies({ dshHome: root })

    assert.equal(first.changed, true)
    assert.equal(second.changed, false)
    assert.equal(await readFile(path, 'utf8'), firstText)
    assert.match(firstText, /# user settings/u)
    const settings = parse(firstText)
    assert.equal(settings.pet.visible, true)
    assert.equal(settings['llm-pi-ai'].providers.openai.retryPolicy.maxRetries, 4)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
