import assert from 'node:assert/strict'
import { join } from 'node:path'
import test from 'node:test'

import { promptForDownloadDestination } from '../src/download-destination.mjs'

test('download destination assigns the selected path exactly once', async () => {
  const assigned = []
  const downloadsDirectory = 'C:\\Downloads'
  const result = await promptForDownloadDestination({
    item: {
      getFilename: () => '..\\report.pdf',
      setSavePath: (path) => assigned.push(path),
      cancel: () => { throw new Error('unexpected cancellation') },
    },
    downloadsDirectory,
    showSaveDialog: async (_window, options) => {
      assert.equal(options.defaultPath, join(downloadsDirectory, 'report.pdf'))
      return { canceled: false, filePath: 'D:\\Exports\\report.pdf' }
    },
  })

  assert.equal(result, 'selected')
  assert.deepEqual(assigned, ['D:\\Exports\\report.pdf'])
})

test('download destination cancels cleanly when the user closes the dialog', async () => {
  let cancellations = 0
  const logs = []
  const result = await promptForDownloadDestination({
    item: {
      getFilename: () => 'report.pdf',
      setSavePath: () => { throw new Error('unexpected path assignment') },
      cancel: () => { cancellations += 1 },
    },
    downloadsDirectory: 'C:\\Downloads',
    showSaveDialog: async () => ({ canceled: true }),
    log: (line) => logs.push(line),
  })

  assert.equal(result, 'canceled')
  assert.equal(cancellations, 1)
  assert.deepEqual(logs, [])
})

test('download destination failures cancel the item and never reject', async () => {
  let cancellations = 0
  const logs = []
  const result = await promptForDownloadDestination({
    item: {
      getFilename: () => 'report.pdf',
      setSavePath: () => {},
      cancel: () => { cancellations += 1 },
    },
    downloadsDirectory: 'C:\\Downloads',
    showSaveDialog: async () => { throw new Error('dialog unavailable') },
    log: (line) => logs.push(line),
  })

  assert.equal(result, 'failed')
  assert.equal(cancellations, 1)
  assert.equal(logs.length, 1)
  assert.match(logs[0], /dialog unavailable/u)
})

test('download destination reports both the original and cancellation failures', async () => {
  const logs = []
  const result = await promptForDownloadDestination({
    item: {
      getFilename: () => 'report.pdf',
      setSavePath: () => {},
      cancel: () => { throw new Error('download item already destroyed') },
    },
    downloadsDirectory: 'C:\\Downloads',
    showSaveDialog: async () => { throw new Error('dialog unavailable') },
    log: (line) => logs.push(line),
  })

  assert.equal(result, 'failed')
  assert.equal(logs.length, 1)
  assert.match(logs[0], /dialog unavailable/u)
  assert.match(logs[0], /download item already destroyed/u)
})
