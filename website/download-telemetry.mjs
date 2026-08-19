export const DOWNLOAD_TELEMETRY_ENDPOINT = 'https://dsh-desktop-telemetry.1521003074.workers.dev/v1/download-clicks'

const OFFICIAL_SITE_PATHS = new Map([
  ['https://ningbainb.github.io', '/deepseek-harness-desktop/'],
  ['https://1521003.xyz', '/'],
  ['https://www.1521003.xyz', '/'],
])
const RELEASE_VERSION_PATTERN = /^\d{1,4}\.\d{1,4}\.\d{1,4}(?:-[0-9A-Za-z.-]{1,20})?$/u
const DOWNLOAD_SOURCES = new Set(['nav', 'hero', 'terminal', 'install'])

function urlOf(value) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function isOfficialSite(value) {
  const url = urlOf(value)
  const path = url ? OFFICIAL_SITE_PATHS.get(url.origin) : undefined
  return typeof path === 'string' && url.pathname.startsWith(path)
}

function isOfficialInstaller(value) {
  const url = urlOf(value)
  return url?.protocol === 'https:'
    && url.username === ''
    && url.password === ''
    && url.hostname === 'github.com'
    && /^\/ningbainb\/deepseek-harness-desktop\/releases\/(?:latest\/)?download\//u.test(url.pathname)
    && /DeepSeek-Harness-Desktop-Setup-\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]{1,20})?-x64\.exe$/u.test(url.pathname)
}

export function reportInstallerDownloadClick({
  navigator,
  siteUrl,
  downloadUrl,
  version,
  source,
}) {
  if (
    !isOfficialSite(siteUrl)
    || !isOfficialInstaller(downloadUrl)
    || typeof version !== 'string'
    || !RELEASE_VERSION_PATTERN.test(version)
    || !DOWNLOAD_SOURCES.has(source)
    || typeof navigator?.sendBeacon !== 'function'
  ) return false

  const body = new URLSearchParams({ schema: '1', version, source })
  try {
    return navigator.sendBeacon(DOWNLOAD_TELEMETRY_ENDPOINT, body) === true
  } catch {
    return false
  }
}
