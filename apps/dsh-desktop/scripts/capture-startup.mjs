import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import electronPath from 'electron'
import { _electron as electron } from 'playwright'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagedExecutable = process.env.DSH_DESKTOP_E2E_EXECUTABLE
const communityMode = process.argv.includes('--community')
const updateMode = process.argv.includes('--update')
const starBurstMode = process.argv.includes('--star-burst')
const starPromptMode = process.argv.includes('--star-prompt') || starBurstMode
const compactMode = process.argv.includes('--compact')
const outputArgument = process.argv.find((argument) => argument.toLowerCase().endsWith('.png'))
const delayArgument = process.argv.find((argument) => argument.startsWith('--delay='))
const captureDelayMs = Math.max(0, Number(delayArgument?.slice('--delay='.length)) || 0)
const output = resolve(outputArgument || (communityMode ? 'community-preview.png' : updateMode ? 'update-preview.png' : starBurstMode ? 'star-burst-preview.png' : starPromptMode ? 'star-prompt-preview.png' : 'startup-preview.png'))
const temporary = await mkdtemp(resolve(tmpdir(), 'dsh-desktop-capture-'))
let electronApp
let capturedStarBurst = false
try {
  electronApp = await electron.launch({
    executablePath: packagedExecutable || electronPath,
    args: packagedExecutable ? [] : [resolve(appDir, 'src', 'main.mjs')],
    cwd: appDir,
    env: {
      ...process.env,
      DSH_DESKTOP_HOLD_STARTUP: updateMode ? '0' : '1',
      DSH_DESKTOP_DISABLE_UPDATES: '1',
      DSH_DESKTOP_STARTUP_PREVIEW_STATE: 'starting',
      DSH_DESKTOP_OPEN_COMMUNITY: communityMode ? '1' : '0',
      DSH_DESKTOP_STAR_PROMPT_PREVIEW: starPromptMode ? '1' : '0',
      DSH_DESKTOP_USER_DATA: resolve(temporary, 'user-data'),
      DSH_HOME: resolve(temporary, 'dsh-home'),
    },
  })
  const firstWindow = await electronApp.firstWindow()
  let page = firstWindow
  if (communityMode) {
    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      const targetPage = electronApp.windows().find((candidate) => candidate.url().includes('community.html'))
      if (targetPage) {
        page = targetPage
        break
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100))
    }
    if (!page.url().includes('community.html')) {
      throw new Error('community window did not open')
    }
  }
  await page.waitForLoadState('domcontentloaded')
  if (starPromptMode) {
    if (compactMode) await page.setViewportSize({ width: 1024, height: 720 })
    await page.locator('#dsh-desktop-star-prompt[data-open="true"]').waitFor({ state: 'visible' })
    if (starBurstMode) {
      await page.getByRole('button', { name: '去 GitHub 点个 Star' }).click()
      const particleCount = await page.locator('.dsh-star-particle').count()
      if (particleCount < 40) throw new Error(`expected at least 40 confetti particles, found ${particleCount}`)
      await page.waitForTimeout(400)
      const particleState = await page.locator('.dsh-star-particle').first().evaluate((element) => {
        const style = getComputedStyle(element)
        const bounds = element.getBoundingClientRect()
        return { animationName: style.animationName, opacity: style.opacity, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } }
      })
      if (particleState.animationName === 'none' || Number(particleState.opacity) <= 0 || particleState.bounds.width <= 0) {
        throw new Error(`Star particle is not visibly animated: ${JSON.stringify(particleState)}`)
      }
      await page.screenshot({ path: output })
      capturedStarBurst = true
    }
  }
  if (updateMode) {
    await page.waitForURL(/^http:\/\/127\.0\.0\.1:/u, { timeout: 60_000 })
    await page.locator('#dsh-desktop-window-chrome').waitFor({ state: 'visible' })
    const continueButton = page.getByRole('button', { name: '继续', exact: true })
    if (await continueButton.isVisible().catch(() => false)) await continueButton.click()
    const helpButton = page.getByRole('button', { name: '帮助' })
    await helpButton.click()
    await page.getByRole('menuitem', { name: '检查更新' }).click()
    await page.locator('#dsh-desktop-update-surface:not([hidden])').waitFor({ state: 'visible' })
  }
  if (communityMode) {
    await page.getByRole('link', { name: '一键加群' }).waitFor({ state: 'visible' })
  }
  await page.setViewportSize(communityMode ? { width: 580, height: 740 } : compactMode ? { width: 1024, height: 720 } : { width: 1440, height: 900 })
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
  if (captureDelayMs > 0) await page.waitForTimeout(captureDelayMs)
  if (!capturedStarBurst) await page.screenshot({ path: output })
  console.log(`captured startup UI: ${output}`)
} finally {
  await electronApp?.close()
  await rm(temporary, { recursive: true, force: true })
}
