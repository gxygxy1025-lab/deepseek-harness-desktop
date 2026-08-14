import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveDesktopVersion } from '../src/app-version.mjs'

test('packaged desktop version comes from the application bundle', async () => {
  const version = await resolveDesktopVersion({
    isPackaged: true,
    appVersion: '0.1.7',
    readText: async () => { throw new Error('manifest should not be read') },
  })
  assert.equal(version, '0.1.7')
})

test('development desktop version comes from its package manifest', async () => {
  const version = await resolveDesktopVersion({
    isPackaged: false,
    appVersion: '43.4.0',
    manifestPath: 'package.json',
    readText: async (path, encoding) => {
      assert.equal(path, 'package.json')
      assert.equal(encoding, 'utf8')
      return JSON.stringify({ version: '0.1.7' })
    },
  })
  assert.equal(version, '0.1.7')
})

test('desktop version rejects malformed manifest values', async () => {
  await assert.rejects(
    resolveDesktopVersion({
      isPackaged: false,
      manifestPath: 'package.json',
      readText: async () => JSON.stringify({ version: 'latest' }),
    }),
    /invalid desktop version/u,
  )
})
