import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import afterPack from '../scripts/after-pack.cjs'

const { classifyPrunableFile, prunePackagedRuntime, restoreRequiredPackagedPeers } = afterPack

test('release pruner classifies only non-runtime package files', () => {
  assert.equal(classifyPrunableFile('openai/src/client.ts'), 'published-source')
  assert.equal(classifyPrunableFile('@mistralai/mistralai/packages/example.ts'), 'published-source')
  assert.equal(classifyPrunableFile('zod/v4/index.d.cts'), 'type-declaration')
  assert.equal(classifyPrunableFile('sdk/examples/client/demo.js'), 'development-material')
  assert.equal(classifyPrunableFile('node-pty/prebuilds/win32-arm64/pty.node'), 'foreign-native-binary')
  assert.equal(classifyPrunableFile('node-pty/prebuilds/win32-x64/pty.node'), undefined)
  assert.equal(classifyPrunableFile('pnpm/artifacts/exe/dist/pnpm.mjs'), 'duplicate-runtime-artifact')
  assert.equal(
    classifyPrunableFile('pnpm/dist/vendor/fastlist-0.3.0-x86.exe'),
    'foreign-native-binary',
  )
  assert.equal(classifyPrunableFile('pnpm/dist/pnpm.mjs'), undefined)
  assert.equal(classifyPrunableFile('@deepseek-ai/dsh/lib/index.js'), undefined)
  assert.equal(classifyPrunableFile('pnpm/bin/pnpm.mjs'), undefined)
  assert.equal(
    classifyPrunableFile('@linxin666/dsh-client-ui-task-board/docs/e2e/demo.png'),
    'first-party-source',
  )
  assert.equal(
    classifyPrunableFile('@linxin666/dsh-client-ui-skin-dragon-heir/src/client/art.ts'),
    'first-party-source',
  )
  assert.equal(
    classifyPrunableFile('@linxin666/dsh-client-ui-skin-dragon-heir/artwork/original.png'),
    'first-party-source',
  )
  assert.equal(
    classifyPrunableFile('@linxin666/dsh-client-ui-skin-dragon-heir/preview/light.png'),
    undefined,
  )
  assert.equal(
    classifyPrunableFile('@linxin666/dsh-client-ui-task-board/lib/client.js.map'),
    'source-map',
  )
  assert.equal(
    classifyPrunableFile('@linxin666/dsh-client-ui-task-board/lib/client.js'),
    undefined,
  )
})

test('release pruner removes classified files and preserves runtime entries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-prune-'))
  try {
    const fixtures = new Map([
      ['openai/src/client.ts', 'source'],
      ['openai/index.js', 'runtime'],
      ['zod/index.d.cts', 'types'],
      ['node-pty/prebuilds/win32-arm64/pty.node', 'arm64'],
      ['node-pty/prebuilds/win32-x64/pty.node', 'x64'],
      ['@linxin666/dsh-client-ui-task-board/docs/e2e/demo.png', 'docs'],
      ['@linxin666/dsh-client-ui-task-board/lib/client.js', 'runtime'],
      ['@linxin666/dsh-client-ui-skin-dragon-heir/preview/light.png', 'preview'],
      ['@linxin666/dsh-client-ui-skin-dragon-heir/src/client/art.ts', 'source'],
    ])
    for (const [path, content] of fixtures) {
      const absolute = join(root, ...path.split('/'))
      await mkdir(dirname(absolute), { recursive: true })
      await writeFile(absolute, content)
    }

    const report = await prunePackagedRuntime(root)
    assert.equal(report.removedFiles, 5)
    assert.equal(await readFile(join(root, 'openai', 'index.js'), 'utf8'), 'runtime')
    assert.equal(
      await readFile(join(root, 'node-pty', 'prebuilds', 'win32-x64', 'pty.node'), 'utf8'),
      'x64',
    )
    assert.equal(
      await readFile(join(root, '@linxin666', 'dsh-client-ui-task-board', 'lib', 'client.js'), 'utf8'),
      'runtime',
    )
    assert.equal(
      await readFile(join(root, '@linxin666', 'dsh-client-ui-skin-dragon-heir', 'preview', 'light.png'), 'utf8'),
      'preview',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('release recovery restores pnpm peer snapshots omitted by electron-builder', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-runtime-peers-'))
  try {
    const restored = await restoreRequiredPackagedPeers(root)
    assert.deepEqual(restored, [
      '@deepseek-ai/dsh-attachment',
      '@deepseek-ai/dsh-brand',
      '@deepseek-ai/dsh-sandbox-policy',
      '@deepseek-ai/dsh-settings',
      '@deepseek-ai/dsh-timeout',
      '@deepseek-ai/dsh-typert-protocol',
    ])
    for (const packageName of restored) {
      const manifest = JSON.parse(await readFile(join(root, ...packageName.split('/'), 'package.json'), 'utf8'))
      assert.equal(manifest.name, packageName)
    }
    assert.deepEqual(await restoreRequiredPackagedPeers(root), [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
