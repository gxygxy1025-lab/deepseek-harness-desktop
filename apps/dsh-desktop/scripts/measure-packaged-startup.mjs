import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { runPackagedDesktop } from './packaged-smoke-runner.mjs'
import { STARTUP_DERIVED_METRICS, STARTUP_PHASES, summarizeSamples } from './startup-metrics.mjs'

const iterationsArgument = process.argv.find((argument) => /^--iterations=\d+$/u.test(argument))
const iterations = Number(iterationsArgument?.split('=')[1] ?? 3)
if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 10) {
  throw new TypeError('--iterations must be between 1 and 10')
}

const appPath = resolve('dist', 'win-unpacked', 'DeepSeek Harness Desktop.exe')
const temporary = await mkdtemp(join(tmpdir(), 'dsh-packaged-startup-benchmark-'))
const metricNames = [...STARTUP_PHASES, ...STARTUP_DERIVED_METRICS, 'elapsed']

function createSampleSet() {
  return Object.fromEntries(metricNames.map((name) => [name, []]))
}

function addSample(samples, result) {
  for (const phase of STARTUP_PHASES) samples[phase].push(result.timings[phase])
  for (const metric of STARTUP_DERIVED_METRICS) samples[metric].push(result.timings[metric])
  samples.elapsed.push(result.elapsedMs)
}

function summarize(sampleSet) {
  return Object.fromEntries(metricNames.map((name) => [name, summarizeSamples(sampleSet[name])]))
}

try {
  const cold = createSampleSet()
  for (let index = 0; index < iterations; index += 1) {
    const root = join(temporary, `cold-${index}`)
    addSample(cold, await runPackagedDesktop({
      appPath,
      userData: join(root, 'user-data'),
      dshHome: join(root, 'dsh-home'),
      agentsHome: join(root, 'agents'),
    }))
  }

  const warmRoot = join(temporary, 'warm')
  await runPackagedDesktop({
    appPath,
    userData: join(warmRoot, 'user-data'),
    dshHome: join(warmRoot, 'dsh-home'),
    agentsHome: join(warmRoot, 'agents'),
  })
  const warm = createSampleSet()
  for (let index = 0; index < iterations; index += 1) {
    addSample(warm, await runPackagedDesktop({
      appPath,
      userData: join(warmRoot, 'user-data'),
      dshHome: join(warmRoot, 'dsh-home'),
      agentsHome: join(warmRoot, 'agents'),
    }))
  }

  console.log(JSON.stringify({
    iterations,
    cold: summarize(cold),
    warm: summarize(warm),
  }, null, 2))
} finally {
  await rm(temporary, { recursive: true, force: true })
}
