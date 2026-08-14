import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import electronPath from 'electron'
import { _electron as electron } from 'playwright'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const screenshotArgument = process.argv.find((argument) => argument.toLowerCase().endsWith('.png'))
const screenshot = screenshotArgument ? resolve(screenshotArgument) : undefined
const packagedExecutable = process.env.DSH_DESKTOP_E2E_EXECUTABLE
const temporary = await mkdtemp(resolve(tmpdir(), 'dsh-window-chrome-e2e-'))
let electronApp

try {
  electronApp = await electron.launch({
    executablePath: packagedExecutable || electronPath,
    args: packagedExecutable ? [] : [resolve(appDir, 'src', 'main.mjs')],
    cwd: appDir,
    env: {
      ...process.env,
      DSH_DESKTOP_USER_DATA: resolve(temporary, 'user-data'),
      DSH_HOME: resolve(temporary, 'dsh-home'),
      DSH_DESKTOP_VERIFY_UPDATER: packagedExecutable ? '1' : '0',
    },
  })
  const page = await electronApp.firstWindow()
  page.on('pageerror', (error) => console.error(`renderer error: ${error.message}`))
  await page.waitForURL(/^http:\/\/127\.0\.0\.1:/u, { timeout: 60_000 })
  try {
    await page.waitForSelector('#dsh-desktop-window-chrome')
  } catch (error) {
    console.error(`window chrome missing at ${page.url()}: ${(await page.locator('body').innerText()).slice(0, 1_000)}`)
    throw error
  }
  const state = await page.evaluate(() => ({
    chromeCount: document.querySelectorAll('#dsh-desktop-window-chrome').length,
    context: document.querySelector('.dsh-window-chrome-context')?.textContent,
    paddingTop: getComputedStyle(document.body).paddingTop,
    url: location.origin,
  }))
  assert.equal(state.context, 'Web Surface')
  assert.equal(state.paddingTop, '46px')
  assert.equal(state.chromeCount, 1)
  await page.evaluate(() => {
    document.body.removeAttribute('data-ds-dark-theme')
    document.documentElement.style.colorScheme = 'light'
    document.body.style.backgroundColor = 'rgb(250, 250, 250)'
  })
  await page.waitForFunction(() => document.documentElement.dataset.dshDesktopChromeTheme === 'light')
  assert.equal(await page.locator('.dsh-window-chrome-title').evaluate((element) => getComputedStyle(element).color), 'rgb(17, 24, 39)')
  await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
  await page.waitForFunction(() => document.documentElement.dataset.dshDesktopChromeTheme === 'dark')
  const assertDialogUsesSafeViewport = async (dialog) => {
    await dialog.waitFor({ state: 'visible' })
    const state = await dialog.evaluate((element) => ({
      layerClass: element.parentElement?.className,
      layerTop: element.parentElement?.getBoundingClientRect().top,
    }))
    assert.match(String(state.layerClass), /dsh-desktop-modal-layer/u)
    assert.ok(Number(state.layerTop) >= 45, `modal layer starts under the title bar: ${state.layerTop}`)
  }
  const introDialog = page.locator('[role="dialog"]').filter({ hasText: '内测声明' })
  await assertDialogUsesSafeViewport(introDialog)
  await page.getByRole('button', { name: '继续', exact: true }).click()
  await introDialog.waitFor({ state: 'hidden' })
  await page.locator('button').filter({ hasText: /^设置$/u }).first().evaluate((button) => button.click())
  const settingsDialog = page.locator('[role="dialog"]').filter({ hasText: '插件市场' })
  await assertDialogUsesSafeViewport(settingsDialog)
  const nativeWindowState = await electronApp.evaluate(({ app, BrowserWindow, Menu, nativeImage }) => {
    const window = BrowserWindow.getAllWindows()[0]
    const helpMenu = Menu.getApplicationMenu()?.items.find((item) => item.label.includes('Help'))
    const updateMenu = helpMenu?.submenu?.items.find((item) => item.label.includes('Check for Updates'))
    const packagedIcon = app.isPackaged
      ? nativeImage.createFromPath(`${process.resourcesPath}\\app-icon.png`)
      : undefined
    return {
      appName: app.getName(),
      closable: window.isClosable(),
      hasUpdateMenu: Boolean(updateMenu),
      packagedIconValid: packagedIcon ? !packagedIcon.isEmpty() : true,
      maximizable: window.isMaximizable(),
      menuBarVisible: window.isMenuBarVisible(),
      minimizable: window.isMinimizable(),
    }
  })
  assert.deepEqual(nativeWindowState, {
    appName: 'DeepSeek Harness Desktop',
    closable: true,
    hasUpdateMenu: true,
    packagedIconValid: true,
    maximizable: true,
    menuBarVisible: false,
    minimizable: true,
  })
  const pnpmShim = await readFile(resolve(temporary, 'user-data', 'runtime-bin', 'pnpm.cmd'), 'utf8')
  assert.match(pnpmShim, /ELECTRON_RUN_AS_NODE=1/u)
  assert.match(pnpmShim, /pnpm\.(?:mjs|cjs)/u)
  if (screenshot) await page.screenshot({ path: screenshot })
  console.log(`verified runtime window chrome at ${state.url}`)
} finally {
  await electronApp?.close()
  await rm(temporary, { recursive: true, force: true })
}
