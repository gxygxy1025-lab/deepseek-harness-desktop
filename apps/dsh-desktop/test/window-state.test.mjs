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
    { x: 2000, y: 30, width: 720, height: 540, maximized: true },
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

test('window close persists the final geometry before BrowserWindow destruction', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-window-state-close-'))
  const statePath = join(root, 'window-state.json')
  const window = new EventEmitter()
  let destroyed = false
  let bounds = { x: 80, y: 60, width: 960, height: 700 }
  window.isDestroyed = () => destroyed
  window.getNormalBounds = () => ({ ...bounds })
  window.isMaximized = () => false
  try {
    const save = attachWindowStatePersistence(window, statePath)
    window.emit('resize')
    bounds = { x: 120, y: 90, width: 720, height: 540 }
    window.emit('close')
    destroyed = true
    window.emit('closed')

    await save()
    assert.deepEqual(JSON.parse(await readFile(statePath, 'utf8')), {
      x: 120,
      y: 90,
      width: 720,
      height: 540,
      maximized: false,
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
