import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'

import {
  DesktopUpdateController,
  formatUpdateDetails,
  normalizeReleaseNotes,
} from '../src/updater.mjs'

const tick = () => new Promise((resolve) => setImmediate(resolve))

class FakeUpdater extends EventEmitter {
  checks = 0
  downloads = 0
  installs = 0

  async checkForUpdates() {
    this.checks += 1
  }

  async downloadUpdate() {
    this.downloads += 1
  }

  quitAndInstall() {
    this.installs += 1
  }
}

function createHarness({ responses = [], enabled = true } = {}) {
  const updater = new FakeUpdater()
  const messages = []
  const progress = []
  const logs = []
  let beforeInstallCalls = 0
  const controller = new DesktopUpdateController({
    updater,
    enabled,
    currentVersion: '1.0.0',
    dialog: {
      async showMessageBox(...args) {
        const options = args.at(-1)
        messages.push(options)
        return { response: responses.shift() ?? 0 }
      },
    },
    getWindow: () => ({
      isDestroyed: () => false,
      setProgressBar: (value) => progress.push(value),
    }),
    log: (line) => logs.push(line),
    beforeInstall: async () => { beforeInstallCalls += 1 },
    setTimeoutFn: () => ({ unref() {} }),
    setIntervalFn: () => ({ unref() {} }),
    clearTimeoutFn: () => {},
    clearIntervalFn: () => {},
  })
  controller.start()
  return { controller, updater, messages, progress, logs, beforeInstallCalls: () => beforeInstallCalls }
}

test('release notes are converted to safe readable text', () => {
  assert.equal(
    normalizeReleaseNotes('<h2>Highlights</h2><p>Fix &amp; polish</p><ul><li>Fast</li></ul>'),
    'Highlights\nFix & polish\n- Fast',
  )
  const details = formatUpdateDetails({
    version: '1.1.0',
    releaseName: 'Stable release',
    releaseDate: '2026-08-14T00:00:00.000Z',
    releaseNotes: [{ version: '1.1.0', note: '# Changes\n- Faster updates' }],
  }, '1.0.0')
  assert.match(details, /当前版本 \/ Current version: 1\.0\.0/)
  assert.match(details, /新版本 \/ New version: 1\.1\.0/)
  assert.match(details, /更新内容 \/ What's new/)
  assert.match(details, /版本 \/ Version 1\.1\.0\nChanges\n- Faster updates/)
})

test('available update shows notes and respects Later', async () => {
  const harness = createHarness({ responses: [1] })
  await harness.controller.check({ manual: true })
  harness.updater.emit('update-available', {
    version: '1.1.0',
    releaseName: 'Taskbar icon and updater',
    releaseNotes: 'Complete release notes.',
  })
  await tick()
  assert.equal(harness.messages.length, 1)
  assert.match(harness.messages[0].title, /发现新版本 \/ Update available/)
  assert.deepEqual(harness.messages[0].buttons, ['下载更新 / Download update', '稍后 / Later'])
  assert.match(harness.messages[0].detail, /Complete release notes/)
  assert.equal(harness.updater.downloads, 0)
})

test('duplicate checks are suppressed while an update decision is open', async () => {
  let resolveDialog
  const updater = new FakeUpdater()
  const controller = new DesktopUpdateController({
    updater,
    enabled: true,
    currentVersion: '1.0.0',
    dialog: { showMessageBox: () => new Promise((resolve) => { resolveDialog = resolve }) },
    getWindow: () => undefined,
    setTimeoutFn: () => ({ unref() {} }),
    setIntervalFn: () => ({ unref() {} }),
    clearTimeoutFn: () => {},
    clearIntervalFn: () => {},
  })
  controller.start()
  await controller.check()
  updater.emit('update-available', { version: '1.1.0', releaseNotes: 'Ready.' })
  await tick()
  assert.equal(await controller.check(), false)
  assert.equal(updater.checks, 1)
  resolveDialog({ response: 1 })
  await tick()
})

test('accepted update downloads, reports progress, and installs after confirmation', async () => {
  const harness = createHarness({ responses: [0, 0] })
  await harness.controller.check()
  harness.updater.emit('update-available', { version: '1.1.0', releaseNotes: 'Ready.' })
  await tick()
  assert.equal(harness.updater.downloads, 1)
  harness.updater.emit('download-progress', { percent: 42.5 })
  harness.updater.emit('update-downloaded', { version: '1.1.0' })
  await tick()
  assert.ok(harness.progress.includes(0.425))
  assert.equal(harness.beforeInstallCalls(), 1)
  assert.equal(harness.updater.installs, 1)
})

test('manual no-update result is visible while automatic errors stay silent', async () => {
  const harness = createHarness()
  await harness.controller.check({ manual: true })
  harness.updater.emit('update-not-available')
  await tick()
  assert.match(harness.messages[0].message, /已是最新版本.*up to date/s)

  await harness.controller.check()
  harness.updater.emit('error', new Error('network unavailable'))
  await tick()
  assert.equal(harness.messages.length, 1)
  assert.ok(harness.logs.some((line) => line.includes('network unavailable')))
})

test('manual update errors are shown and clear taskbar progress', async () => {
  const harness = createHarness()
  await harness.controller.check({ manual: true })
  harness.updater.emit('error', new Error('metadata missing'))
  await tick()
  assert.equal(harness.messages.at(-1).type, 'error')
  assert.match(harness.messages.at(-1).title, /更新失败 \/ Update failed/)
  assert.match(harness.messages.at(-1).detail, /metadata missing/)
  assert.equal(harness.progress.at(-1), -1)
})
