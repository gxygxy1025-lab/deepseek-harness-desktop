import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'

import { collectWebsiteErrors } from './validate-website.mjs'

const websitePath = resolve(import.meta.dirname, '..', 'website', 'index.html')

test('website fallback installer matches the desktop release version', async () => {
  const html = await readFile(websitePath, 'utf8')
  assert.deepEqual(await collectWebsiteErrors(html, '0.1.7'), [])
})

test('website validation rejects stale fallback installers', async () => {
  const html = (await readFile(websitePath, 'utf8')).replaceAll('0.1.7', '0.1.6')
  const errors = await collectWebsiteErrors(html, '0.1.7')
  assert.ok(errors.some(error => error.includes('stale installer version 0.1.6')))
  assert.ok(errors.some(error => error.includes('fallback label')))
})
