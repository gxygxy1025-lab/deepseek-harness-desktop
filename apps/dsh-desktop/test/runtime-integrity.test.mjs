import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  CRITICAL_RUNTIME_FILES,
  assertRuntimeIntegrity,
} from '../src/runtime-integrity.mjs'

const machineIdPath = [
  '@deepseek-ai',
  'dsh-session-telemetry-otel',
  'node_modules',
  '@opentelemetry',
  'resources',
  'build',
  'src',
  'detectors',
  'platform',
  'node',
  'machine-id',
  'getMachineId.js',
].join('/')

test('runtime integrity includes the OpenTelemetry machine identifier reported missing in the field', () => {
  assert.ok(Object.isFrozen(CRITICAL_RUNTIME_FILES))
  assert.ok(CRITICAL_RUNTIME_FILES.includes(machineIdPath))
})

test('runtime integrity reports an incomplete installation and recommends reinstalling', async () => {
  const modulesRoot = await mkdtemp(join(tmpdir(), 'dsh-runtime-integrity-'))
  try {
    assert.throws(
      () => assertRuntimeIntegrity({ modulesRoot }),
      (error) => {
        assert.equal(error.code, 'DSH_DESKTOP_INSTALLATION_INCOMPLETE')
        assert.match(error.message, /getMachineId\.js/u)
        assert.match(error.message, /重新安装 Desktop/u)
        return true
      },
    )

    for (const relativePath of CRITICAL_RUNTIME_FILES) {
      const target = join(modulesRoot, ...relativePath.split('/'))
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, 'verified')
    }
    assert.doesNotThrow(() => assertRuntimeIntegrity({ modulesRoot }))
  } finally {
    await rm(modulesRoot, { recursive: true, force: true })
  }
})

test('package verification consumes the shared critical runtime file contract', async () => {
  const source = await readFile(fileURLToPath(new URL('../scripts/verify-package.mjs', import.meta.url)), 'utf8')
  assert.match(source, /CRITICAL_RUNTIME_FILES/u)
  assert.match(source, /for \(const relativePath of CRITICAL_RUNTIME_FILES\)/u)
})
