import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { attachWindowStatePersistence, normalizeWindowState } from '../src/window-state.mjs'

const displays = [
  { bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
  { bounds: { x: 1920, y: 0, width: 1280, height: 1024 }, workArea: { x: 1920, y: 0, width: 1280, height: 984 } },
]

test('window state preserves visible geometry and clamps size', () => {
  assert.deepEqual(
    normalizeWindowState({ x: 2000, y: 30, width: 300, height: 200, maximized: true }, displays),
    { x: 2000, y: 30, width: 900, height: 640, maximized: true },
  )
})

test('window state recenters geometry that is outside every display', () => {
  assert.deepEqual(
    normalizeWindowState({ x: -9000, y: 9000, width: 1200, height: 800 }, displays),
    { x: 360, y: 120, width: 1200, height: 800, maximized: false },
  )
})

test('window state save is a no-op after the Electron window is destroyed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-window-state-'))
  const statePath = join(root, 'window-state.json')
  const window = new EventEmitter()
  window.isDestroyed = () => true
  window.getNormalBounds = () => { throw new Error('destroyed window was accessed') }
  window.isMaximized = () => { throw new Error('destroyed window was accessed') }
  try {
    const save = attachWindowStatePersistence(window, statePath)
    await save()
    await assert.rejects(readFile(statePath, 'utf8'), (error) => error?.code === 'ENOENT')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
