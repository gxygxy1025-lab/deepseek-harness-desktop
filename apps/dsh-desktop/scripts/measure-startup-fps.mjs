import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import electronPath from 'electron'
import { _electron as electron } from 'playwright'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const temporary = await mkdtemp(resolve(tmpdir(), 'dsh-fps-'))
let electronApp
try {
  electronApp = await electron.launch({
    executablePath: electronPath,
    args: [resolve(appDir, 'src', 'main.mjs')],
    cwd: appDir,
    env: {
      ...process.env,
      DSH_DESKTOP_HOLD_STARTUP: '1',
      DSH_DESKTOP_DISABLE_UPDATES: '1',
      DSH_DESKTOP_STARTUP_PREVIEW_STATE: 'starting',
      DSH_DESKTOP_USER_DATA: resolve(temporary, 'user-data'),
      DSH_HOME: resolve(temporary, 'dsh-home'),
    },
  })
  const page = await electronApp.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(2500)
  const fps = await page.evaluate(() => new Promise((done) => {
    let frames = 0
    const start = performance.now()
    const tick = () => {
      frames += 1
      if (performance.now() - start < 3000) requestAnimationFrame(tick)
      else done((frames / (performance.now() - start)) * 1000)
    }
    requestAnimationFrame(tick)
  }))
  console.log(`FPS: ${fps.toFixed(1)}`)
} finally {
  if (electronApp) await electronApp.close()
  await rm(temporary, { recursive: true, force: true })
}
