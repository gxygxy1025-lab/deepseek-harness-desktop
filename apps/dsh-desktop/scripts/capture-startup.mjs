import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import electronPath from 'electron'
import { _electron as electron } from 'playwright'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(process.argv[2] || 'startup-preview.png')
const temporary = await mkdtemp(resolve(tmpdir(), 'dsh-desktop-capture-'))
let electronApp
try {
  electronApp = await electron.launch({
    executablePath: electronPath,
    args: [resolve(appDir, 'src', 'main.mjs')],
    cwd: appDir,
    env: {
      ...process.env,
      DSH_DESKTOP_HOLD_STARTUP: '1',
      DSH_DESKTOP_USER_DATA: resolve(temporary, 'user-data'),
      DSH_HOME: resolve(temporary, 'dsh-home'),
    },
  })
  const page = await electronApp.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: output })
  console.log(`captured startup UI: ${output}`)
} finally {
  await electronApp?.close()
  await rm(temporary, { recursive: true, force: true })
}
