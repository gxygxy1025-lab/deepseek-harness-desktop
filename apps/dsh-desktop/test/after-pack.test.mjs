import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { classifyPrunableFile, resolvePackagedNodeModulesRoot } = require('../scripts/after-pack.cjs')

test('after-pack resolves the Windows unpacked node_modules path', () => {
  assert.equal(
    resolvePackagedNodeModulesRoot({ electronPlatformName: 'win32', appOutDir: 'out' }),
    join('out', 'resources', 'app.asar.unpacked', 'node_modules'),
  )
})

test('after-pack resolves node_modules inside the macOS app bundle', () => {
  assert.equal(
    resolvePackagedNodeModulesRoot({
      electronPlatformName: 'darwin',
      appOutDir: 'out',
      packager: { appInfo: { productFilename: 'DeepSeek Harness Desktop' } },
    }),
    join(
      'out',
      'DeepSeek Harness Desktop.app',
      'Contents',
      'Resources',
      'app.asar.unpacked',
      'node_modules',
    ),
  )
})

test('Windows package pruning removes Darwin and non-x64 optional binaries', () => {
  for (const path of [
    '@img/sharp-darwin-arm64/package.json',
    '@koromix/koffi-darwin-x64/koffi.node',
    '@vscode/ripgrep-darwin-arm64/bin/rg',
    'node-addon-require-builtin-darwin-x64/index.node',
    '@vscode/ripgrep-win32-arm64/bin/rg.exe',
    '@koromix/koffi-win32-ia32/koffi.node',
    'node-addon-require-builtin-win32-arm64/index.node',
    'node-addon-require-builtin-win32-arm64-msvc/index.node',
  ]) {
    assert.equal(classifyPrunableFile(path), 'foreign-native-binary')
  }
})
