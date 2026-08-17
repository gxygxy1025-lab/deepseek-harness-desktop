import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COMMUNITY_QQ_URL,
  GITHUB_FEEDBACK_URL,
  GITHUB_PROJECT_URL,
} from '../src/community-links.mjs'
import { createCommunityQrImage } from '../src/community.mjs'
import { createApplicationMenuTemplate } from '../src/menu.mjs'

test('community and feedback destinations are fixed secure URLs', () => {
  assert.equal(COMMUNITY_QQ_URL, 'https://qm.qq.com/q/vehlNjaeye')
  assert.equal(GITHUB_FEEDBACK_URL, 'https://github.com/ningbainb/deepseek-harness-desktop/issues/new/choose')
  assert.equal(GITHUB_PROJECT_URL, 'https://github.com/ningbainb/deepseek-harness-desktop')
})

test('community QR is generated from the fixed join destination', async () => {
  const image = await createCommunityQrImage()
  assert.match(image, /^data:image\/png;base64,/u)
  assert.ok(image.length > 500)
})

test('Tools and Help menus expose Extension Dock and community actions', () => {
  const calls = []
  const template = createApplicationMenuTemplate({
    app: { getVersion: () => '0.1.8' },
    shell: { openExternal: (url) => calls.push(['project', url]) },
    controller: { restart: () => calls.push(['restart']) },
    openCommunity: () => calls.push(['community']),
    openFeedback: () => calls.push(['feedback']),
    openExtensions: () => calls.push(['extensions']),
    openLogs: () => calls.push(['logs']),
    checkForUpdates: (options) => calls.push(['updates', options]),
  })
  const tools = template.find((entry) => entry.label === '工具 / Tools')
  const extensions = tools.submenu.find((entry) => entry.label === '扩展坞 / Extension Dock')
  const help = template.find((entry) => entry.label === '帮助 / Help')
  const community = help.submenu.find((entry) => entry.label === '加入社群 / Join QQ Group')
  const feedback = help.submenu.find((entry) => entry.label === '提建议 / Suggest an Idea')
  const project = help.submenu.find((entry) => entry.label === 'GitHub 项目')

  assert.equal(extensions.accelerator, 'CmdOrCtrl+Shift+X')
  extensions.click()
  community.click()
  feedback.click()
  project.click()
  assert.deepEqual(calls, [
    ['extensions'],
    ['community'],
    ['feedback'],
    ['project', GITHUB_PROJECT_URL],
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
