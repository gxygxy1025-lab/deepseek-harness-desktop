import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COMMUNITY_QQ_URL,
  GITHUB_DOWNLOADS_URL,
  GITHUB_FEEDBACK_URL,
  GITHUB_PROJECT_URL,
  PRIVACY_POLICY_URL,
} from '../src/community-links.mjs'
import { createApplicationMenuTemplate } from '../src/menu.mjs'
import { installEditContextMenu } from '../src/menu.mjs'

test('community and feedback destinations are fixed secure URLs', () => {
  assert.equal(COMMUNITY_QQ_URL, 'https://qm.qq.com/q/vehlNjaeye')
  assert.equal(GITHUB_DOWNLOADS_URL, 'https://github.com/gxygxy1025-lab/deepseek-harness-desktop/releases/latest')
  assert.equal(GITHUB_FEEDBACK_URL, 'https://github.com/gxygxy1025-lab/deepseek-harness-desktop/issues/new/choose')
  assert.equal(GITHUB_PROJECT_URL, 'https://github.com/gxygxy1025-lab/deepseek-harness-desktop')
  assert.equal(PRIVACY_POLICY_URL, 'https://github.com/gxygxy1025-lab/deepseek-harness-desktop/blob/release/core-1.0.0/PRIVACY.md')
})

test('Help menu exposes feedback, project, and privacy actions without community entry', () => {
  const calls = []
  const template = createApplicationMenuTemplate({
    app: { getVersion: () => '0.1.8' },
    shell: { openExternal: (url) => calls.push(['project', url]) },
    controller: { restart: () => calls.push(['restart']) },
    openCommunity: () => calls.push(['community']),
    openFeedback: () => calls.push(['feedback']),
    openLogs: () => calls.push(['logs']),
    openPrivacy: () => calls.push(['privacy']),
    openProject: () => calls.push(['project', GITHUB_PROJECT_URL]),
    checkForUpdates: (options) => calls.push(['updates', options]),
  })
  const help = template.find((entry) => entry.label === '帮助 / Help')
  const feedback = help.submenu.find((entry) => entry.label === '提建议 / Suggest an Idea')
  const project = help.submenu.find((entry) => entry.label === 'GitHub 项目')
  const privacy = help.submenu.find((entry) => entry.label === '隐私政策 / Privacy')

  assert.equal(help.submenu.some((entry) => entry.label === '加入社群 / Join QQ Group'), false)
  feedback.click()
  project.click()
  privacy.click()
  assert.deepEqual(calls, [
    ['feedback'],
    ['project', GITHUB_PROJECT_URL],
    ['privacy'],
  ])
})

test('App menu exposes all persisted close choices and makes background automation an explicit opt-in', async () => {
  const changes = []
  const template = createApplicationMenuTemplate({
    app: { getVersion: () => '2.7.0' },
    shell: { openExternal: () => {} },
    controller: { restart: () => {} },
    openCommunity: () => {},
    openFeedback: () => {},
    openLogs: () => {},
    checkForUpdates: () => {},
    getCloseBehavior: () => 'ask',
    setCloseBehavior: async (value) => { changes.push(value) },
  })
  const app = template.find((entry) => entry.label === '应用 / App')
  const closeBehavior = app.submenu.find((entry) => entry.label === '关闭行为 / Close behavior')
  const ask = closeBehavior.submenu.find((entry) => entry.label.includes('Ask every time'))
  const background = closeBehavior.submenu.find((entry) => entry.label.includes('enable background automation'))
  assert.equal(ask.type, 'radio')
  assert.equal(ask.checked, true)
  assert.equal(background.type, 'radio')
  assert.equal(background.checked, false)
  background.click()
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(changes, ['minimize-to-tray'])
})

test('Edit menu and native context menu expose paste without renderer clipboard access', () => {
  const template = createApplicationMenuTemplate({
    app: { getVersion: () => '2.4.0' },
    shell: { openExternal: () => {} },
    controller: { restart: () => {} },
    openCommunity: () => {},
    openFeedback: () => {},
    openExtensions: () => {},
    openLogs: () => {},
    checkForUpdates: () => {},
  })
  const edit = template.find((entry) => entry.label === '编辑 / Edit')
  const paste = edit.submenu.find((entry) => entry.role === 'paste')
  assert.equal(paste?.label, '粘贴 / Paste')
  assert.equal(paste?.accelerator, 'CmdOrCtrl+V')

  const listeners = new Map()
  const removed = []
  let contextTemplate
  let popupCount = 0
  let pasteCount = 0
  const webContents = {
    on: (name, callback) => { listeners.set(name, callback) },
    removeListener: (name, callback) => { removed.push([name, callback]) },
    paste: () => { pasteCount += 1 },
  }
  const dispose = installEditContextMenu({
    webContents,
    Menu: {
      buildFromTemplate: (entries) => {
        contextTemplate = entries
        return { popup: () => { popupCount += 1 } }
      },
    },
  })
  listeners.get('context-menu')({}, { editFlags: { canCopy: true }, selectionText: 'selected' })
  assert.equal(contextTemplate.find((entry) => entry.role === 'paste')?.enabled, undefined)
  assert.equal(contextTemplate.find((entry) => entry.role === 'copy')?.enabled, true)
  assert.equal(popupCount, 1)
  let prevented = 0
  listeners.get('before-input-event')({ preventDefault: () => { prevented += 1 } }, {
    type: 'keyDown', key: 'V', control: true, shift: true,
  })
  assert.equal(pasteCount, 1)
  assert.equal(prevented, 1)
  dispose()
  assert.deepEqual(removed, [
    ['context-menu', listeners.get('context-menu')],
    ['before-input-event', listeners.get('before-input-event')],
  ])
})

test('menu actions report rejected operations without returning a rejected promise', async () => {
  const errors = []
  const template = createApplicationMenuTemplate({
    app: { getVersion: () => '0.1.8' },
    shell: { openExternal: async () => { throw new Error('project failed') } },
    controller: { restart: async () => { throw new Error('restart failed') } },
    openCommunity: () => {},
    openFeedback: () => {},
    openExtensions: () => {},
    openLogs: () => {},
    checkForUpdates: async () => { throw new Error('update failed') },
    onActionError: (error) => errors.push(error.message),
  })
  const runtime = template.find((entry) => entry.label === '运行时 / Runtime')
  const help = template.find((entry) => entry.label === '帮助 / Help')

  assert.equal(runtime.submenu[0].click(), undefined)
  assert.equal(help.submenu[0].click(), undefined)
  assert.equal(help.submenu.find((entry) => entry.label === 'GitHub 项目').click(), undefined)
  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(errors.toSorted(), ['project failed', 'restart failed', 'update failed'])
})
