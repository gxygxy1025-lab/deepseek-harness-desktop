import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveRuntimeExecutable } from '../src/runtime-executable.mjs'

test('Windows x64 runtime uses the bundled Node executable', () => {
  assert.equal(resolveRuntimeExecutable({
    platform: 'win32',
    arch: 'x64',
    fallback: 'desktop.exe',
    resolvePackage: (specifier) => {
      assert.equal(specifier, 'node-win-x64/package.json')
      return 'C:\\app\\node_modules\\node-win-x64\\package.json'
    },
  }), 'C:\\app\\node_modules\\node-win-x64\\bin\\node.exe')
})

test('packaged Windows runtime resolves the physical unpacked Node executable', () => {
  assert.equal(resolveRuntimeExecutable({
    platform: 'win32',
    arch: 'x64',
    resolvePackage: () => 'C:\\app\\resources\\app.asar\\node_modules\\node-win-x64\\package.json',
  }), 'C:\\app\\resources\\app.asar.unpacked\\node_modules\\node-win-x64\\bin\\node.exe')
})

test('non-Windows runtime keeps the application executable fallback', () => {
  assert.equal(resolveRuntimeExecutable({
    platform: 'darwin',
    arch: 'arm64',
    fallback: '/Applications/DeepSeek Harness Desktop',
    resolvePackage: () => { throw new Error('must not resolve Windows Node') },
  }), '/Applications/DeepSeek Harness Desktop')
})
