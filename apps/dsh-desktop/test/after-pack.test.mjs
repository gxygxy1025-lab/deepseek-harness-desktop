import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const {
  classifyMacPrunableFile,
  classifyPrunableFile,
  isUniversalMacTemporaryPackage,
  resolvePackagedNodeModulesRoot,
} = require('../scripts/after-pack.cjs')

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

test('after-pack defers pruning only for electron-universal temporary apps', () => {
  for (const appOutDir of [
    'dist/mac-universal-x64-temp',
    'dist\\mac-universal-arm64-temp',
  ]) {
    assert.equal(isUniversalMacTemporaryPackage({ electronPlatformName: 'darwin', appOutDir }), true)
  }

  for (const context of [
    { electronPlatformName: 'darwin', appOutDir: 'dist/mac-arm64' },
    { electronPlatformName: 'darwin', appOutDir: 'dist/mac-universal' },
    { electronPlatformName: 'win32', appOutDir: 'dist/mac-universal-x64-temp' },
  ]) {
    assert.equal(isUniversalMacTemporaryPackage(context), false)
  }
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

test('macOS package pruning removes foreign binaries and preserves both Darwin architectures', () => {
  for (const path of [
    '@img/sharp-win32-x64/package.json',
    '@koromix/koffi-linux-x64/koffi.node',
    '@vscode/ripgrep-win32-x64/bin/rg.exe',
    'node-addon-require-builtin-linux-x64/index.node',
    'node-pty/prebuilds/win32-x64/pty.node',
    'node-pty/third_party/conpty/OpenConsole.exe',
    'pnpm/dist/vendor/fastlist-0.3.0-x64.exe',
  ]) {
    assert.equal(classifyMacPrunableFile(path), 'foreign-native-binary')
  }

  for (const path of [
    '@img/sharp-darwin-arm64/package.json',
    '@koromix/koffi-darwin-x64/koffi.node',
    '@vscode/ripgrep-darwin-arm64/bin/rg',
    'node-addon-require-builtin-darwin-x64/index.node',
    'pnpm/dist/templates/completion.ps1',
  ]) {
    assert.equal(classifyMacPrunableFile(path), undefined)
  }
})
