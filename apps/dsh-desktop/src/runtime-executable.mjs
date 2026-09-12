import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { materializeFilesystemPath } from './profile.mjs'

export function resolveRuntimeExecutable({
  platform = process.platform,
  arch = process.arch,
  fallback = process.execPath,
  resolvePackage = createRequire(import.meta.url).resolve,
} = {}) {
  if (platform !== 'win32' || arch !== 'x64') return fallback
  const manifest = resolvePackage('node-win-x64/package.json')
  return materializeFilesystemPath(join(dirname(manifest), 'bin', 'node.exe'))
}
