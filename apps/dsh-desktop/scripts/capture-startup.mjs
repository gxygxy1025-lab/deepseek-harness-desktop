import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import electronPath from 'electron'
import { _electron as electron } from 'playwright'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagedExecutable = process.env.DSH_DESKTOP_E2E_EXECUTABLE
const qqBotMode = process.argv.includes('--qqbot-qr')
const communityMode = process.argv.includes('--community')
const extensionMode = process.argv.includes('--extensions') || qqBotMode
const outputArgument = process.argv.find((argument) => argument.toLowerCase().endsWith('.png'))
const output = resolve(outputArgument || (communityMode ? 'community-preview.png' : extensionMode ? 'extensions-preview.png' : 'startup-preview.png'))
const temporary = await mkdtemp(resolve(tmpdir(), 'dsh-desktop-capture-'))
let electronApp
try {
  electronApp = await electron.launch({
    executablePath: packagedExecutable || electronPath,
    args: packagedExecutable ? [] : [resolve(appDir, 'src', 'main.mjs')],
    cwd: appDir,
    env: {
      ...process.env,
      DSH_DESKTOP_HOLD_STARTUP: '1',
      DSH_DESKTOP_DISABLE_UPDATES: '1',
      DSH_DESKTOP_STARTUP_PREVIEW_STATE: extensionMode ? '' : 'starting',
      DSH_DESKTOP_OPEN_EXTENSIONS: extensionMode ? '1' : '0',
      DSH_DESKTOP_OPEN_COMMUNITY: communityMode ? '1' : '0',
      DSH_DESKTOP_USER_DATA: resolve(temporary, 'user-data'),
      DSH_HOME: resolve(temporary, 'dsh-home'),
    },
  })
  const firstWindow = await electronApp.firstWindow()
  let page = firstWindow
  if (extensionMode || communityMode) {
    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      const targetPage = electronApp.windows().find((candidate) => candidate.url().includes(communityMode ? 'community.html' : 'extensions.html'))
      if (targetPage) {
        page = targetPage
        break
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
    }
    if (!page.url().includes(communityMode ? 'community.html' : 'extensions.html')) {
      throw new Error(`${communityMode ? 'community' : 'extension'} window did not open`)
    }
  }
  await page.waitForLoadState('domcontentloaded')
  if (extensionMode) {
    await page.waitForFunction(() => document.body.dataset.busy !== 'true' && document.querySelector('#plugin-count')?.textContent !== '0')
    if (qqBotMode) {
      await page.getByRole('button', { name: '扫码绑定 QQ 机器人' }).click()
      await page.locator('#qqbot-qr[src^="data:image/png;base64,"]').waitFor({ state: 'visible', timeout: 20_000 })
    }
  }
  if (communityMode) {
    await page.locator('#community-qr[src^="data:image/png;base64,"]').waitFor({ state: 'visible' })
  }
  await page.setViewportSize(communityMode ? { width: 580, height: 740 } : { width: 1440, height: 900 })
  if (communityMode) {
    const layout = await page.evaluate(() => ({
      clientHeight: document.documentElement.clientHeight,
      feedbackVisible: document.querySelector('#open-feedback')?.getBoundingClientRect().bottom <= window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }))
    if (!layout.feedbackVisible || layout.scrollHeight > layout.clientHeight) {
      throw new Error(`community layout overflows its normal viewport: ${JSON.stringify(layout)}`)
    }
  }
  await page.screenshot({ path: output })
  console.log(`captured startup UI: ${output}`)
} finally {
  await electronApp?.close()
  await rm(temporary, { recursive: true, force: true })
}
