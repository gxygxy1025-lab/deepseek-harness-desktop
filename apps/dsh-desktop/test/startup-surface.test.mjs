import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { computeWhalePose } from '../src/ui/whale-particles.mjs'

const uiRoot = new URL('../src/ui/', import.meta.url)

test('startup branding contains no decorative blue circle', async () => {
  const [html, css] = await Promise.all([
    readFile(new URL('startup.html', uiRoot), 'utf8'),
    readFile(new URL('startup.css', uiRoot), 'utf8'),
  ])
  assert.doesNotMatch(html, /brand-mark/u)
  assert.doesNotMatch(css, /\.brand-mark/u)
})

test('whale pose stays inside the right-side swim corridor', () => {
  const width = 1440
  const height = 900
  for (let elapsed = 0; elapsed <= 180; elapsed += 0.25) {
    const pose = computeWhalePose(elapsed, width, height, false)
    assert.ok(pose.centerX >= width * 0.73 && pose.centerX <= width * 0.77)
    assert.ok(pose.centerY >= height * 0.36 && pose.centerY <= height * 0.48)
    assert.ok(Math.abs(pose.heading) <= 0.035)
    assert.ok(pose.breathe >= 0.985 && pose.breathe <= 1.015)
  }
})

test('reduced motion returns a stable final pose', () => {
  assert.deepEqual(
    computeWhalePose(1, 1200, 800, true),
    computeWhalePose(100, 1200, 800, true),
  )
})
