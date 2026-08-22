import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import test from 'node:test'

const repositoryRoot = resolve(import.meta.dirname, '..', '..', '..')

test('only the official release workflow may inject an anonymous metrics endpoint', async () => {
  const [configuration, workflow, packaging] = await Promise.all([
    readFile(resolve(import.meta.dirname, '..', 'build', 'telemetry-config.json'), 'utf8'),
    readFile(resolve(repositoryRoot, '.github', 'workflows', 'desktop-release.yml'), 'utf8'),
    readFile(resolve(import.meta.dirname, '..', 'electron-builder.yml'), 'utf8'),
  ])

  assert.deepEqual(JSON.parse(configuration), { endpoint: '' })
  assert.match(workflow, /vars\.DSH_TELEMETRY_ENDPOINT/u)
  assert.match(workflow, /product metrics remain disabled/u)
  assert.doesNotMatch(workflow, /Repository variable DSH_TELEMETRY_ENDPOINT is required/u)
  assert.match(workflow, /AbsolutePath -ne '\/v1\/events'/u)
  assert.match(workflow, /telemetry-config\.json/u)
  assert.match(packaging, /from: build\/telemetry-config\.json[\s\S]*to: telemetry-config\.json/u)
})
