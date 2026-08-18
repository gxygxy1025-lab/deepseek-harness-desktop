import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  createUpdateShutdownReceipt,
  parseUpdateShutdownRequest,
  readUpdateShutdownReceipt,
  UPDATE_SHUTDOWN_RECEIPT_SCHEMA_VERSION,
  updateShutdownReceiptPath,
  validateUpdateShutdownReceipt,
  writeUpdateShutdownReceipt,
} from '../src/update-shutdown-receipt.mjs'

const TOKEN = 'a'.repeat(64)

test('shutdown request accepts only one strict 64-character hexadecimal token', () => {
  assert.equal(parseUpdateShutdownRequest(['desktop.exe']), undefined)
  assert.deepEqual(
    parseUpdateShutdownRequest(['desktop.exe', '--shutdown-for-update', `--shutdown-token=${TOKEN}`]),
    { requested: true, token: TOKEN },
  )
  assert.deepEqual(
    parseUpdateShutdownRequest(['desktop.exe'], { shutdownForUpdate: true, shutdownToken: TOKEN }),
    { requested: true, token: TOKEN },
  )
  assert.deepEqual(
    parseUpdateShutdownRequest(['desktop.exe', '--shutdown-for-update', '--shutdown-token=../receipt.json']),
    { requested: true, token: undefined },
  )
  assert.deepEqual(
    parseUpdateShutdownRequest([
      'desktop.exe',
      '--shutdown-for-update',
      `--shutdown-token=${TOKEN}`,
      `--shutdown-token=${'b'.repeat(64)}`,
    ]),
    { requested: true, token: undefined },
  )
})

test('receipt path is fixed under the supplied system temporary directory', () => {
  assert.equal(
    updateShutdownReceiptPath(TOKEN, 'C:\\Temp'),
    join('C:\\Temp', `dsh-desktop-shutdown-${TOKEN}.json`),
  )
  for (const token of ['', 'A'.repeat(64), '../receipt', '0'.repeat(63)]) {
    assert.throws(() => updateShutdownReceiptPath(token, 'C:\\Temp'), /invalid update shutdown token/u)
  }
})

test('receipt document requires a stopped runtime and quiesced extensions', () => {
  const receipt = createUpdateShutdownReceipt({
    token: TOKEN,
    pid: 42,
    runtimeStopped: true,
    extensionsQuiesced: true,
    writtenAt: '2026-08-18T12:00:00.000Z',
  })
  assert.equal(receipt.schemaVersion, UPDATE_SHUTDOWN_RECEIPT_SCHEMA_VERSION)
  assert.equal(validateUpdateShutdownReceipt(receipt, { token: TOKEN, pid: 42 }), true)
  assert.equal(validateUpdateShutdownReceipt({ ...receipt, runtimeStopped: false }, { token: TOKEN }), false)
  assert.equal(validateUpdateShutdownReceipt({ ...receipt, token: 'b'.repeat(64) }, { token: TOKEN }), false)
  assert.equal(validateUpdateShutdownReceipt({ ...receipt, schemaVersion: '2' }, { token: TOKEN }), false)
  assert.equal(validateUpdateShutdownReceipt({ ...receipt, pid: '42' }, { token: TOKEN }), false)
  assert.equal(validateUpdateShutdownReceipt({ ...receipt, writtenAt: 'not-a-timestamp' }, { token: TOKEN }), false)
  assert.throws(
    () => createUpdateShutdownReceipt({ token: TOKEN, pid: 42, runtimeStopped: false, extensionsQuiesced: true }),
    /runtime must be stopped/u,
  )
})

test('receipt publication is atomic, validated on read, and never overwrites an existing target', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-shutdown-receipt-'))
  try {
    const path = await writeUpdateShutdownReceipt({
      token: TOKEN,
      pid: 4242,
      runtimeStopped: true,
      extensionsQuiesced: true,
      writtenAt: '2026-08-18T12:00:00.000Z',
    }, { temporaryDirectory: directory })
    assert.equal(path, updateShutdownReceiptPath(TOKEN, directory))
    assert.deepEqual(await readUpdateShutdownReceipt(TOKEN, { temporaryDirectory: directory, pid: 4242 }), {
      schemaVersion: 2,
      token: TOKEN,
      pid: 4242,
      runtimeStopped: true,
      extensionsQuiesced: true,
      writtenAt: '2026-08-18T12:00:00.000Z',
    })
    await assert.rejects(
      writeUpdateShutdownReceipt({
        token: TOKEN,
        pid: 4242,
        runtimeStopped: true,
        extensionsQuiesced: true,
      }, { temporaryDirectory: directory }),
      /EEXIST/u,
    )
    assert.match(await readFile(path, 'utf8'), /"writtenAt":"2026-08-18T12:00:00\.000Z"/u)

    const corruptToken = 'c'.repeat(64)
    await writeFile(updateShutdownReceiptPath(corruptToken, directory), JSON.stringify({ token: corruptToken }))
    await assert.rejects(
      readUpdateShutdownReceipt(corruptToken, { temporaryDirectory: directory }),
      /invalid update shutdown receipt/u,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
