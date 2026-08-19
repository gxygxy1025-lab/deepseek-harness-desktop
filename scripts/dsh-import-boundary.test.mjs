import assert from 'node:assert/strict'
import test from 'node:test'

import {
  checkImportBoundary,
  compareImportBoundary,
  createBoundaryBaseline,
  scanSourceText,
} from './dsh-import-boundary.mjs'

test('DSH import scanner recognizes static, dynamic, require, and type-only imports', () => {
  const prefix = '@deepseek-ai/'
  const entries = scanSourceText(`
    import Runtime from '${prefix}dsh-runtime'
    import type { Session } from '${prefix}dsh-session'
    const lazy = import('${prefix}dsh-workspace/client')
    const legacy = require('${prefix}dsh-settings')
  `)
  assert.deepEqual(entries.map(({ kind, specifier, typeOnly }) => ({ kind, specifier, typeOnly })), [
    { kind: 'static-import', specifier: '@deepseek-ai/dsh-runtime', typeOnly: false },
    { kind: 'static-import', specifier: '@deepseek-ai/dsh-session', typeOnly: true },
    { kind: 'dynamic-import', specifier: '@deepseek-ai/dsh-workspace/client', typeOnly: false },
    { kind: 'require', specifier: '@deepseek-ai/dsh-settings', typeOnly: false },
  ])
})

test('boundary rejects a new import and permits controlled adapter imports', () => {
  const specifier = `${'@deepseek-ai/'}dsh-settings`
  const existing = [{
    path: 'packages/example/src/index.ts',
    kind: 'static-import',
    specifier,
    line: 1,
    typeOnly: false,
  }]
  const baseline = createBoundaryBaseline(existing)
  assert.deepEqual(compareImportBoundary([...existing, { ...existing[0], line: 2 }], baseline), [{
    path: 'packages/example/src/index.ts',
    kind: 'static-import',
    specifier: '@deepseek-ai/dsh-settings',
    allowed: 1,
    actual: 2,
  }])
  assert.deepEqual(compareImportBoundary([...existing, {
    ...existing[0],
    path: 'apps/dsh-desktop/src/runtime-provider.mjs',
  }], baseline), [])
})

test('repository matches the committed direct-import baseline', async () => {
  assert.deepEqual(await checkImportBoundary(), [])
})
