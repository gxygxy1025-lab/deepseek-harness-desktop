import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const legacyPlugin = ['vite', 'tsconfig', 'paths'].join('-')
const ignoredSegments = new Set(['dist', 'lib', 'node_modules'])

async function configurationSources() {
  const files = []
  for (const rootName of ['packages', 'shared', 'scripts']) {
    const root = join(repositoryRoot, rootName)
    const entries = await readdir(root, { recursive: true, withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      const path = resolve(entry.parentPath, entry.name)
      const relativePath = relative(repositoryRoot, path)
      if (relativePath.split(/[\\/]/u).some((segment) => ignoredSegments.has(segment))) continue
      if (entry.name === 'package.json' || ['.ts', '.mjs'].includes(extname(entry.name)) || entry.name === 'dsh-skin-new') {
        files.push(path)
      }
    }
  }
  return files.toSorted()
}

test('workspace configs and templates use Vite native TypeScript path resolution', async () => {
  const legacyReferences = []
  for (const path of await configurationSources()) {
    const source = await readFile(path, 'utf8')
    if (source.includes(legacyPlugin)) legacyReferences.push(relative(repositoryRoot, path))
  }
  assert.deepEqual(legacyReferences, [])

  for (const path of [
    join(repositoryRoot, 'packages', 'skins', 'harbor', 'vitest.config.ts'),
    join(repositoryRoot, 'packages', 'skins', 'qq2006', 'vitest.config.ts'),
    join(repositoryRoot, 'scripts', 'dsh-skin-new'),
  ]) {
    const source = await readFile(path, 'utf8')
    assert.match(source, /tsconfigPaths:\s*true/u, `${relative(repositoryRoot, path)} must enable resolve.tsconfigPaths`)
  }
})

test('SDK-inlining Vitest configs use the narrow shared source map warning filter', async () => {
  const sdkConfigs = []
  for (const path of await configurationSources()) {
    if (!path.endsWith('vitest.config.ts')) continue
    const source = await readFile(path, 'utf8')
    if (!source.includes('inline: [/@deepseek-ai\\//]')) continue
    sdkConfigs.push(relative(repositoryRoot, path))
    assert.match(source, /suppressMissingPublishedSdkSourceMapWarnings\(\)/u)
    assert.doesNotMatch(source, /sourcemapIgnoreList/u)
  }
  assert.equal(sdkConfigs.length, 10)
})

test('skin-center bounds nested fork concurrency for Windows workspace runs', async () => {
  const source = await readFile(
    join(repositoryRoot, 'packages', 'skins', 'skin-center', 'vitest.config.ts'),
    'utf8',
  )
  assert.match(source, /pool:\s*'forks'[\s\S]*maxWorkers:\s*1/u)
})
