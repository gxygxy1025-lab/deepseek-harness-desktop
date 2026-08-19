import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DOWNLOAD_TELEMETRY_ENDPOINT,
  reportInstallerDownloadClick,
} from '../website/download-telemetry.mjs'

const INSTALLER_URL = 'https://github.com/ningbainb/deepseek-harness-desktop/releases/download/desktop-v2.5.0/DeepSeek-Harness-Desktop-Setup-2.5.0-x64.exe'

test('official installer click sends one exact form-encoded beacon', () => {
  const beacons = []
  const sent = reportInstallerDownloadClick({
    navigator: {
      sendBeacon(endpoint, body) {
        beacons.push({ endpoint, body: body.toString() })
        return true
      },
    },
    siteUrl: 'https://ningbainb.github.io/deepseek-harness-desktop/',
    downloadUrl: INSTALLER_URL,
    version: '2.5.0',
    source: 'hero',
  })

  assert.equal(sent, true)
  assert.deepEqual(beacons, [{
    endpoint: DOWNLOAD_TELEMETRY_ENDPOINT,
    body: 'schema=1&version=2.5.0&source=hero',
  }])
})

test('official custom domains can report without changing the installer link', () => {
  for (const siteUrl of ['https://1521003.xyz/', 'https://www.1521003.xyz/download']) {
    const beacons = []
    const sent = reportInstallerDownloadClick({
      navigator: {
        sendBeacon(endpoint, body) {
          beacons.push({ endpoint, body: body.toString() })
          return true
        },
      },
      siteUrl,
      downloadUrl: INSTALLER_URL,
      version: '2.5.0',
      source: 'install',
    })
    assert.equal(sent, true)
    assert.equal(beacons.length, 1)
  }
})

test('forks, non-installer links, and unknown positions never report', () => {
  let calls = 0
  const navigator = { sendBeacon: () => { calls += 1; return true } }
  const base = {
    navigator,
    downloadUrl: INSTALLER_URL,
    version: '2.5.0',
    source: 'hero',
  }

  assert.equal(reportInstallerDownloadClick({
    ...base,
    siteUrl: 'https://fork.example/',
  }), false)
  assert.equal(reportInstallerDownloadClick({
    ...base,
    siteUrl: 'https://ningbainb.github.io/deepseek-harness-desktop/',
    downloadUrl: 'https://github.com/ningbainb/deepseek-harness-desktop',
  }), false)
  assert.equal(reportInstallerDownloadClick({
    ...base,
    siteUrl: 'https://ningbainb.github.io/deepseek-harness-desktop/',
    source: 'button-label-from-dom',
  }), false)
  assert.equal(calls, 0)
})

test('missing or failing Beacon support is contained synchronously', () => {
  const base = {
    siteUrl: 'https://ningbainb.github.io/deepseek-harness-desktop/',
    downloadUrl: INSTALLER_URL,
    version: '2.5.0',
    source: 'install',
  }
  assert.equal(reportInstallerDownloadClick({ ...base, navigator: {} }), false)
  assert.equal(reportInstallerDownloadClick({
    ...base,
    navigator: { sendBeacon: () => { throw new Error('offline') } },
  }), false)
})
