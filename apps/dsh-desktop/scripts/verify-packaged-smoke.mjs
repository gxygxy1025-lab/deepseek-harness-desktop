import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { runPackagedDesktop } from './packaged-smoke-runner.mjs'

const executableArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'))
const appPath = executableArgument
  ? resolve(executableArgument)
  : resolve('dist', 'win-unpacked', 'DeepSeek Harness Desktop.exe')
const userData = await mkdtemp(join(tmpdir(), 'dsh-packaged-smoke-'))

try {
  const result = await runPackagedDesktop({
    appPath,
    userData,
    dshHome: join(userData, 'dsh-home'),
  })
  console.log(`packaged desktop smoke ${JSON.stringify({ elapsedMs: result.elapsedMs, ...result.timings })}`)
} finally {
  await rm(userData, { recursive: true, force: true })
}
