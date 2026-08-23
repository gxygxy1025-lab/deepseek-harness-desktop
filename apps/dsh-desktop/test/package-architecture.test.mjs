import assert from 'node:assert/strict'
import test from 'node:test'

import {
  architectureHint,
  requiredArchitectures,
} from '../scripts/package-architecture.mjs'

test('macOS package architecture uses the marker closest to the native file', () => {
  const mixedPath = '/dist/mac-arm64/App.app/node_modules/node-pty/prebuilds/darwin-x64/pty.node'
  assert.equal(architectureHint(mixedPath), 'x86_64')
  assert.deepEqual(requiredArchitectures(mixedPath, 'arm64'), [])
  assert.deepEqual(requiredArchitectures(mixedPath, 'universal'), ['x86_64'])
})

test('macOS package architecture requires the target for unlabelled native files', () => {
  const unlabelledPath = '/dist/mac-universal/App.app/Contents/MacOS/App'
  assert.deepEqual(requiredArchitectures(unlabelledPath, 'arm64'), ['arm64'])
  assert.deepEqual(requiredArchitectures(unlabelledPath, 'x64'), ['x86_64'])
  assert.deepEqual(requiredArchitectures(unlabelledPath, 'universal'), ['x86_64', 'arm64'])
})
