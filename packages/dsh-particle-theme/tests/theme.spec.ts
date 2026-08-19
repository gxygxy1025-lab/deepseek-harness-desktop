import { describe, expect, it } from 'vitest'

import {
  AdaptiveFrameBudget,
  pageProfile,
  ParticleThemeRegistry,
  resolvePageMode,
  resolveParticleThemeSettings,
} from '../src/client/theme.ts'
import { createWhaleParticleField } from '../src/client/whale.ts'

describe('particle theme settings and page profiles', () => {
  it('resolves conservative defaults and clamps costly or unreadable values', () => {
    expect(resolveParticleThemeSettings({})).toEqual({
      enabled: true,
      theme: 'whale',
      density: 1,
      opacity: 0.26,
      speed: 1,
    })
    expect(resolveParticleThemeSettings({ density: 9, opacity: -2, speed: 0 })).toMatchObject({
      density: 1.5,
      opacity: 0.08,
      speed: 0.4,
    })
  })

  it('prioritizes hidden/reduced/dialog/focused modes and quiets interactive pages', () => {
    expect(resolvePageMode({ hidden: true, reducedMotion: true, dialog: true, editable: true })).toBe('hidden')
    expect(resolvePageMode({ hidden: false, reducedMotion: true, dialog: true, editable: true })).toBe('reduced')
    expect(resolvePageMode({ hidden: false, reducedMotion: false, dialog: true, editable: true })).toBe('dialog')
    expect(resolvePageMode({ hidden: false, reducedMotion: false, dialog: false, editable: true })).toBe('focused')
    expect(pageProfile('dialog').density).toBeLessThan(pageProfile('normal').density)
    expect(pageProfile('focused').opacity).toBeLessThan(pageProfile('normal').opacity)
    expect(pageProfile('reduced').speed).toBe(0)
  })
})

describe('particle theme extension and adaptive quality', () => {
  it('creates a deterministic bounded whale silhouette field', () => {
    const first = createWhaleParticleField(180)
    const second = createWhaleParticleField(180)
    expect(first).toHaveLength(180)
    expect(second).toEqual(first)
    expect(first.every(point => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1)).toBe(true)
    expect(first.some(point => point.tail > 0.7)).toBe(true)
  })

  it('registers independently disposable theme definitions', () => {
    const registry = new ParticleThemeRegistry()
    const definition = { id: 'future', create: () => ({ update: () => {}, dispose: () => {} }) }
    const dispose = registry.register(definition)
    expect(registry.get('future')).toBe(definition)
    expect(() => registry.register(definition)).toThrow(/already registered/u)
    dispose()
    expect(registry.get('future')).toBeUndefined()
  })

  it('reduces load after sustained slow frames and recovers gradually', () => {
    const budget = new AdaptiveFrameBudget()
    for (let index = 0; index < 50; index += 1) budget.record(34)
    const reduced = budget.quality
    expect(reduced).toBeLessThan(1)
    for (let index = 0; index < 260; index += 1) budget.record(14)
    expect(budget.quality).toBeGreaterThan(reduced)
    expect(budget.quality).toBeLessThanOrEqual(1)
  })
})
