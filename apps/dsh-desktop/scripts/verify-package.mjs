import { access, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BUILTIN_RUNTIME_PACKAGES, packagePathSegments } from '../src/profile.mjs'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const resources = resolve(process.argv[2] || join(appDir, 'dist', 'win-unpacked', 'resources'))
const unpackedModules = join(resources, 'app.asar.unpacked', 'node_modules')
const requiredPackages = ['@deepseek-ai/dsh', 'pnpm', ...BUILTIN_RUNTIME_PACKAGES]

for (const packageName of requiredPackages) {
  const manifestPath = join(unpackedModules, ...packagePathSegments(packageName), 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.name !== packageName) throw new Error(`packaged manifest mismatch for ${packageName}`)
}

await access(join(unpackedModules, '@deepseek-ai', 'dsh', 'lib', 'bin.js'))
await access(join(unpackedModules, 'pnpm', 'bin', 'pnpm.mjs'))
await access(join(resources, 'app.asar'))

console.log(`verified ${requiredPackages.length} packaged runtime packages in ${resources}`)
