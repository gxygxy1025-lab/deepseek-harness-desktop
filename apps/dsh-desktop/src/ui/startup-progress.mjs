const STATE_RANGES = Object.freeze({
  stopped: Object.freeze({ floor: 8, ceiling: 8 }),
  starting: Object.freeze({ floor: 18, ceiling: 88 }),
  ready: Object.freeze({ floor: 100, ceiling: 100 }),
  stopping: Object.freeze({ floor: 76, ceiling: 76 }),
  restarting: Object.freeze({ floor: 32, ceiling: 90 }),
  crashed: Object.freeze({ floor: 58, ceiling: 100 }),
})

export function clampProgress(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, numeric))
}

export function initialProgressForState(state, current = 0) {
  const range = STATE_RANGES[state] ?? STATE_RANGES.crashed
  if (state === 'crashed') return Math.max(clampProgress(current), range.floor)
  if (state === 'starting' || state === 'restarting') {
    return Math.max(clampProgress(current), range.floor)
  }
  return range.floor
}

export function advanceStartupProgress(state, current) {
  const range = STATE_RANGES[state]
  if (!range) return initialProgressForState('crashed', current)
  const value = initialProgressForState(state, current)
  if (state !== 'starting' && state !== 'restarting') return value
  if (value >= range.ceiling) return range.ceiling
  const step = Math.max(0.08, (range.ceiling - value) * 0.012)
  return Math.min(range.ceiling, value + step)
}

export function phaseIndexForProgress(progress) {
  const value = clampProgress(progress)
  if (value < 34) return 0
  if (value < 72) return 1
  return 2
}
