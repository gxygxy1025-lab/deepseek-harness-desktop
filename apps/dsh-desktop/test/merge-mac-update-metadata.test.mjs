import assert from 'node:assert/strict'
import test from 'node:test'

import { mergeMacUpdateInfos } from '../scripts/merge-mac-update-metadata.mjs'

test('merges x64 and arm64 macOS update files', () => {
  const result = mergeMacUpdateInfos(
    { version: '1.0.10', files: [{ url: 'DeepSeek-Harness-Desktop-1.0.10-x64.zip', sha512: 'x64-hash' }] },
    { version: '1.0.10', files: [{ url: 'DeepSeek-Harness-Desktop-1.0.10-arm64.zip', sha512: 'arm64-hash' }] },
  )

  assert.deepEqual(result.files.map((file) => file.url), [
    'DeepSeek-Harness-Desktop-1.0.10-x64.zip',
    'DeepSeek-Harness-Desktop-1.0.10-arm64.zip',
  ])
  assert.equal(result.path, 'DeepSeek-Harness-Desktop-1.0.10-x64.zip')
  assert.equal(result.sha512, 'x64-hash')
})

test('rejects metadata without both architecture ZIPs', () => {
  assert.throws(
    () => mergeMacUpdateInfos(
      { version: '1.0.10', files: [{ url: 'DeepSeek-Harness-Desktop-1.0.10-x64.zip', sha512: 'x64-hash' }] },
      { version: '1.0.10', files: [{ url: 'DeepSeek-Harness-Desktop-1.0.10.dmg', sha512: 'dmg-hash' }] },
    ),
    /both x64 and arm64 ZIP files/u,
  )
})
