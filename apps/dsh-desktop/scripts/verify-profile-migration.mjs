import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

import { _electron as electron } from 'playwright'

import { AGGREGATED_BUNDLES, BUILTIN_BUNDLES } from '../src/profile.mjs'

const executablePath = process.env.DSH_DESKTOP_E2E_EXECUTABLE
if (!executablePath) throw new Error('DSH_DESKTOP_E2E_EXECUTABLE is required')

const temporary = await mkdtemp(resolve(tmpdir(), 'dsh-profile-migration-e2e-'))
const dshHome = resolve(temporary, 'dsh-home')
const userData = resolve(temporary, 'user-data')
const profileDir = resolve(dshHome, 'profiles', 'desktop')
const manifestPath = resolve(profileDir, 'package.json')

async function launchOnce() {
  const app = await electron.launch({
    executablePath,
    env: { ...process.env, DSH_HOME: dshHome, DSH_DESKTOP_USER_DATA: userData },
  })
  try {
    const page = await app.firstWindow()
    try {
      await page.waitForURL(/^http:\/\/127\.0\.0\.1:/u, { timeout: 120_000 })
    } catch (error) {
      const log = await readFile(resolve(userData, 'logs', 'runtime.log'), 'utf8').catch(() => '')
      console.error(`runtime did not become ready; recent log:\n${log.slice(-4_000) || '(no runtime log)'}`)
      throw error
    }
    await page.waitForSelector('style[data-plugin="@linxin666/dsh-client-ui-mode-switcher"]', { state: 'attached' })
  } finally {
    await app.close()
  }
}

try {
  await mkdir(profileDir, { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify({
    name: 'dsh-profile-desktop',
    private: true,
    dependencies: {},
    dsh: {
      profile: {
        bundles: [
          ...BUILTIN_BUNDLES,
          '@linxin666/dsh-client-ui-aionui-panel',
          '@linxin666/dsh-client-ui-git-graph',
          '@linxin666/dsh-client-ui-task-board',
          '@linxin666/dsh-client-ui-skin-center',
        ],
      },
    },
  }, null, 2)}\n`)

  await launchOnce()
  const migrated = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert.deepEqual(migrated.dsh.profile.bundles, BUILTIN_BUNDLES)
  for (const name of AGGREGATED_BUNDLES) {
    assert.equal(migrated.dsh.profile.bundles.includes(name), false, `${name} remained duplicated`)
  }

  await launchOnce()
  const restarted = JSON.parse(await readFile(manifestPath, 'utf8'))
  assert.deepEqual(restarted.dsh.profile.bundles, BUILTIN_BUNDLES)
  console.log('verified aggregate migration and two consecutive packaged restarts')
} finally {
  await rm(temporary, { recursive: true, force: true })
}
