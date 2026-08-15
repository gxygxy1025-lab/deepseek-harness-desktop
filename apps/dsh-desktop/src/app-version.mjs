import { readFile } from 'node:fs/promises'

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u

function normalizeVersion(value) {
  const version = String(value || '').trim()
  if (!VERSION_PATTERN.test(version)) throw new TypeError(`invalid desktop version: ${JSON.stringify(value)}`)
  return version
}

export async function resolveDesktopVersion({ isPackaged, appVersion, manifestPath, readText = readFile }) {
  if (isPackaged) return normalizeVersion(appVersion)
  if (!manifestPath) throw new TypeError('manifestPath is required in development')
  const manifest = JSON.parse(await readText(manifestPath, 'utf8'))
  return normalizeVersion(manifest.version)
}
