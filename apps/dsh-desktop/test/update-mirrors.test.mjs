import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'

import {
  DEFAULT_UPDATE_MIRRORS,
  UpdateDownloadRouter,
  parseUpdateMirrors,
  probeUpdateSource,
  rankUpdateSources,
  rewriteGitHubReleaseUrl,
} from '../src/update-mirrors.mjs'

const OFFICIAL_ASSET = 'https://github.com/ningbainb/deepseek-harness-desktop/releases/download/v2.1.0/DeepSeek-Harness-Desktop-Setup-2.1.0-x64.exe'

test('mirror configuration is HTTPS-only and can be disabled', () => {
  assert.deepEqual(DEFAULT_UPDATE_MIRRORS, [])
  assert.deepEqual(parseUpdateMirrors(undefined), [])
  assert.deepEqual(parseUpdateMirrors(''), [])
  assert.deepEqual(parseUpdateMirrors('official'), [])
  assert.deepEqual(parseUpdateMirrors('off'), [])
  assert.deepEqual(
    parseUpdateMirrors('https://mirror.example/;http://unsafe.example/;https://user:secret@private.example/'),
    [{ id: 'mirror.example', label: '备用线路 mirror.example', prefix: 'https://mirror.example/' }],
  )
})

test('only public GitHub Release asset URLs are rewritten', () => {
  const mirror = { id: 'ghproxy', label: '国内镜像 ghproxy.net', prefix: 'https://ghproxy.net/' }
  assert.equal(
    rewriteGitHubReleaseUrl(OFFICIAL_ASSET, mirror).href,
    `https://ghproxy.net/${OFFICIAL_ASSET}`,
  )
  assert.equal(
    rewriteGitHubReleaseUrl('https://github.com/ningbainb/deepseek-harness-desktop/archive/main.zip', mirror).href,
    'https://github.com/ningbainb/deepseek-harness-desktop/archive/main.zip',
  )
  assert.equal(
    rewriteGitHubReleaseUrl('https://example.com/releases/download/v2.1.0/app.exe', mirror).href,
    'https://example.com/releases/download/v2.1.0/app.exe',
  )
})

test('source probe reads only a bounded range and rejects HTML responses', async () => {
  const requests = []
  let cancelled = false
  const fetchFn = async (url, options) => {
    requests.push({ url, options })
    return {
      ok: true,
      status: 206,
      headers: { get: (name) => name === 'content-type' ? 'application/octet-stream' : null },
      body: {
        getReader: () => ({
          read: async () => ({ done: false, value: new Uint8Array(64 * 1024) }),
          cancel: async () => { cancelled = true },
        }),
      },
    }
  }
  const result = await probeUpdateSource(OFFICIAL_ASSET, { fetchFn, timeoutMs: 500 })
  assert.equal(result.ok, true)
  assert.equal(requests[0].options.headers.Range, 'bytes=0-65535')
  assert.equal(cancelled, true)

  const html = await probeUpdateSource(OFFICIAL_ASSET, {
    fetchFn: async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html; charset=utf-8' },
      body: null,
    }),
  })
  assert.equal(html.ok, false)
})

test('GitHub official stays first while opt-in fallback sources are ranked by availability', async () => {
  const mirrors = [
    { id: 'slow', label: '国内镜像 slow.example', prefix: 'https://slow.example/' },
    { id: 'fast', label: '国内镜像 fast.example', prefix: 'https://fast.example/' },
  ]
  const ranked = await rankUpdateSources({
    officialUrl: OFFICIAL_ASSET,
    mirrors,
    probe: async (_url, source) => ({
      ok: source.id !== 'slow',
      elapsedMs: source.id === 'fast' ? 20 : source.id === 'github' ? 80 : 5,
    }),
  })
  assert.deepEqual(ranked.map((source) => source.id), ['github', 'fast', 'slow'])
})

test('download router preserves checksums, tries GitHub before opt-in mirrors, and restores the provider', async () => {
  const info = {
    tag: 'v2.1.0',
    version: '2.1.0',
    files: [{ url: 'DeepSeek-Harness-Desktop-Setup-2.1.0-x64.exe', sha512: 'trusted-checksum' }],
  }
  const provider = {
    resolveFiles(updateInfo) {
      return [{ url: new URL(OFFICIAL_ASSET), info: updateInfo.files[0] }]
    },
  }
  const originalResolveFiles = provider.resolveFiles
  class RouterUpdater extends EventEmitter {
    updateInfoAndProvider = { info, provider }
    attempts = []

    async downloadUpdate() {
      const resolved = provider.resolveFiles(info)[0]
      this.attempts.push(resolved)
      if (resolved.url.hostname === 'github.com') {
        const error = new Error('GitHub unavailable')
        this.emit('error', error)
        throw error
      }
      return ['downloaded.exe']
    }
  }
  const updater = new RouterUpdater()
  const retryableErrors = []
  const sources = []
  const router = new UpdateDownloadRouter({
    updater,
    mirrors: [{ id: 'fast', label: '国内镜像 fast.example', prefix: 'https://fast.example/' }],
    probe: async () => ({ ok: true, elapsedMs: 10 }),
  })
  updater.on('error', (error) => retryableErrors.push(router.shouldDeferError(error)))

  const result = await router.downloadUpdate(info, {
    onSource: (source) => sources.push(source.id),
  })

  assert.deepEqual(result, ['downloaded.exe'])
  assert.deepEqual(sources, ['github', 'fast'])
  assert.deepEqual(retryableErrors, [true])
  assert.equal(updater.attempts[0].info.sha512, 'trusted-checksum')
  assert.equal(updater.attempts[0].url.href, OFFICIAL_ASSET)
  assert.equal(updater.attempts[1].url.hostname, 'fast.example')
  assert.equal(provider.resolveFiles, originalResolveFiles)
})
