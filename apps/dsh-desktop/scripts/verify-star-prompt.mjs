import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import electronPath from 'electron'
import { _electron as electron } from 'playwright'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagedExecutable = process.env.DSH_DESKTOP_E2E_EXECUTABLE
const runtimeReadyTimeoutMs = packagedExecutable ? 120_000 : 60_000
const temporary = await mkdtemp(resolve(tmpdir(), 'dsh-desktop-star-e2e-'))
const userData = resolve(temporary, 'user-data')
const dshHome = resolve(temporary, 'dsh-home')

async function launchDesktop({ preview = false } = {}) {
  return electron.launch({
    executablePath: packagedExecutable || electronPath,
    args: packagedExecutable ? [] : [resolve(appDir, 'src', 'main.mjs')],
    cwd: appDir,
    env: {
      ...process.env,
      DSH_DESKTOP_DISABLE_UPDATES: '1',
      DSH_DESKTOP_USER_DATA: userData,
      DSH_HOME: dshHome,
      DSH_DESKTOP_STAR_PROMPT_PREVIEW: preview ? '1' : '0',
    },
  })
}

async function waitForHarnessPage(electronApp) {
  const page = await electronApp.firstWindow()
  await page.waitForURL(/^http:\/\/127\.0\.0\.1:/u, { timeout: runtimeReadyTimeoutMs })
  await page.locator('#dsh-desktop-window-chrome').waitFor({ state: 'visible' })
  return page
}

let electronApp
try {
  electronApp = await launchDesktop()
  const firstPage = await waitForHarnessPage(electronApp)
  await firstPage.waitForTimeout(1_600)
  if (await firstPage.locator('#dsh-desktop-star-prompt[data-open="true"]').isVisible()) {
    throw new Error('the retired 2.4.0 Star campaign appeared for the current release')
  }

  await electronApp.close()
  electronApp = await launchDesktop({ preview: true })
  const secondPage = await waitForHarnessPage(electronApp)
  const previewPrompt = secondPage.locator('#dsh-desktop-star-prompt[data-open="true"]')
  await previewPrompt.waitFor({ state: 'visible', timeout: 10_000 })
  await secondPage.getByRole('button', { name: '加入社群，随时反馈 Bug' }).waitFor({ state: 'visible' })
  await secondPage.getByRole('button', { name: '先继续使用', exact: true }).click()
  await previewPrompt.waitFor({ state: 'hidden' })

  try {
    const state = await readFile(resolve(userData, 'star-prompt-state.json'), 'utf8')
    throw new Error(`preview mode unexpectedly persisted Star prompt state: ${state}`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  console.log('verified retired Star campaign stays hidden for 2.5.0 and remains previewable without persistence')
} finally {
  await electronApp?.close()
  await rm(temporary, { recursive: true, force: true })
}
