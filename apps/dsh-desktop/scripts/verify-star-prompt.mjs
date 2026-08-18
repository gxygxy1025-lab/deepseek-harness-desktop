import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import electronPath from 'electron'
import { _electron as electron } from 'playwright'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const temporary = await mkdtemp(resolve(tmpdir(), 'dsh-desktop-star-e2e-'))
const userData = resolve(temporary, 'user-data')
const dshHome = resolve(temporary, 'dsh-home')

async function launchDesktop() {
  return electron.launch({
    executablePath: electronPath,
    args: [resolve(appDir, 'src', 'main.mjs')],
    cwd: appDir,
    env: {
      ...process.env,
      DSH_DESKTOP_DISABLE_UPDATES: '1',
      DSH_DESKTOP_USER_DATA: userData,
      DSH_HOME: dshHome,
    },
  })
}

async function waitForHarnessPage(electronApp) {
  const page = await electronApp.firstWindow()
  await page.waitForURL(/^http:\/\/127\.0\.0\.1:/u, { timeout: 60_000 })
  await page.locator('#dsh-desktop-window-chrome').waitFor({ state: 'visible' })
  return page
}

let electronApp
try {
  electronApp = await launchDesktop()
  const firstPage = await waitForHarnessPage(electronApp)
  const prompt = firstPage.locator('#dsh-desktop-star-prompt[data-open="true"]')
  await prompt.waitFor({ state: 'visible', timeout: 10_000 })
  const communityButton = firstPage.getByRole('button', { name: '加入社群，随时反馈 Bug' })
  await communityButton.waitFor({ state: 'visible' })
  const communityWindowPromise = electronApp.waitForEvent('window', {
    predicate: (page) => page.url().includes('community.html'),
    timeout: 10_000,
  })
  await communityButton.click()
  await prompt.waitFor({ state: 'hidden' })
  const communityPage = await communityWindowPromise
  await communityPage.locator('#community-qr[src^="data:image/png;base64,"]').waitFor({ state: 'visible' })
  await communityPage.close()

  const state = JSON.parse(await readFile(resolve(userData, 'star-prompt-state.json'), 'utf8'))
  if (state.shownVersions?.join(',') !== '2.3.0') {
    throw new Error(`unexpected Star prompt state: ${JSON.stringify(state)}`)
  }

  await firstPage.reload({ waitUntil: 'domcontentloaded' })
  await firstPage.waitForTimeout(1_600)
  if (await firstPage.locator('#dsh-desktop-star-prompt[data-open="true"]').isVisible()) {
    throw new Error('Star prompt reappeared after a main-page reload')
  }

  await electronApp.close()
  electronApp = await launchDesktop()
  const secondPage = await waitForHarnessPage(electronApp)
  await secondPage.waitForTimeout(1_600)
  if (await secondPage.locator('#dsh-desktop-star-prompt[data-open="true"]').isVisible()) {
    throw new Error('Star prompt reappeared on the next application launch')
  }
  console.log('verified Star prompt: community action, first 2.3.0 launch only, reload-safe, restart-safe')
} finally {
  await electronApp?.close()
  await rm(temporary, { recursive: true, force: true })
}
