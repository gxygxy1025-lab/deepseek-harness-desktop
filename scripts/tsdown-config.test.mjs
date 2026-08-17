import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const deprecatedProperty = /^\s*(?:external|noExternal)\s*:/mu

async function tsdownConfigSources() {
  const packageRoot = join(repositoryRoot, 'packages')
  const entries = await readdir(packageRoot, { recursive: true, withFileTypes: true })
  const packageConfigs = entries
    .filter((entry) => entry.isFile() && /^tsdown(?:\.[a-z0-9-]+)?\.config\.ts$/u.test(entry.name))
    .map((entry) => resolve(entry.parentPath, entry.name))
  return [join(repositoryRoot, 'shared', 'tsdown.client.ts'), ...packageConfigs].toSorted()
}

test('tsdown configs use the supported deps API for dependency boundaries', async () => {
  const violations = []
  for (const path of await tsdownConfigSources()) {
    const source = await readFile(path, 'utf8')
    if (deprecatedProperty.test(source)) violations.push(relative(repositoryRoot, path))
  }
  assert.deepEqual(violations, [])
})

test('tsdown configs do not opt out of bundled dependency validation', async () => {
  const violations = []
  for (const path of await tsdownConfigSources()) {
    const source = await readFile(path, 'utf8')
    if (/onlyBundle\s*:\s*false/u.test(source)) violations.push(relative(repositoryRoot, path))
  }
  assert.deepEqual(violations, [])
})

test('remote web UI prepare build preserves reviewed dependency boundaries', async () => {
  const packageRoot = join(repositoryRoot, 'packages', 'dsh-remote-web-ui')
  const production = await import(pathToFileURL(join(packageRoot, 'tsdown.config.ts')).href)
  const prepare = await import(pathToFileURL(join(packageRoot, 'tsdown.prepare.config.ts')).href)
  const [library] = prepare.default({ env: {} })

  assert.ok(library.deps.neverBundle.includes('@deepseek-ai/dsh-settings'))
  assert.deepEqual(production.REMOTE_WEB_UI_CLIENT_ONLY_BUNDLE, ['clsx', 'qrcode.react'])
})
