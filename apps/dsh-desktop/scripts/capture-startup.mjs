import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import electronPath from 'electron'
import { _electron as electron } from 'playwright'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagedExecutable = process.env.DSH_DESKTOP_E2E_EXECUTABLE
const updateMode = process.argv.includes('--update')
const compactMode = process.argv.includes('--compact')
const outputArgument = process.argv.find((argument) => argument.toLowerCase().endsWith('.png'))
const delayArgument = process.argv.find((argument) => argument.startsWith('--delay='))
const captureDelayMs = Math.max(0, Number(delayArgument?.slice('--delay='.length)) || 0)
const output = resolve(outputArgument || (updateMode ? 'update-preview.png' : 'startup-preview.png'))
const temporary = await mkdtemp(resolve(tmpdir(), 'dsh-desktop-capture-'))
let electronApp
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
      DSH_DESKTOP_USER_DATA: resolve(temporary, 'user-data'),
      DSH_HOME: resolve(temporary, 'dsh-home'),
    },
  })
  const firstWindow = await electronApp.firstWindow()
  const page = firstWindow
  await page.waitForLoadState('domcontentloaded')
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
  await page.setViewportSize(compactMode ? { width: 1024, height: 720 } : { width: 1440, height: 900 })
  if (captureDelayMs > 0) await page.waitForTimeout(captureDelayMs)
  await page.screenshot({ path: output })
  console.log(`captured startup UI: ${output}`)
} finally {
  await electronApp?.close()
  await rm(temporary, { recursive: true, force: true })
}
