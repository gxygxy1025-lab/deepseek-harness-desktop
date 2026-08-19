import { describe, expect, it } from 'vitest'

import {
  DESKTOP_COMPAT_PATCHES,
  validateCompatPatchRegistry,
  type DesktopCompatPatch,
} from '../src/patch-registry.ts'

describe('Desktop compat patch registry', () => {
  it('contains complete exact-version removal evidence', () => {
    expect(validateCompatPatchRegistry(DESKTOP_COMPAT_PATCHES)).toBe(DESKTOP_COMPAT_PATCHES)
    expect(DESKTOP_COMPAT_PATCHES.map((entry) => entry.id)).toEqual([
      'queued-turn-continuation',
      'cancellation-presentation',
      'desktop-skin-profile-isolation',
    ])
    for (const entry of DESKTOP_COMPAT_PATCHES) {
      expect(entry.applicableVersions).toEqual(['0.1.0-rc.6'])
      expect(entry.test).toMatch(/^packages\/dsh-desktop-compat\/tests\/.+\.spec\.ts$/u)
      expect(entry.lastVerified).toBe('2026-08-18')
    }
  })

  it('rejects duplicates, ranges, and incomplete evidence', () => {
    const valid = DESKTOP_COMPAT_PATCHES[0]
    expect(() => validateCompatPatchRegistry([valid, valid])).toThrow(/duplicate/u)
    expect(() => validateCompatPatchRegistry([{
      ...valid,
      id: 'range-entry',
      applicableVersions: ['^0.1.0'],
    } satisfies DesktopCompatPatch])).toThrow(/exact applicable versions/u)
    expect(() => validateCompatPatchRegistry([{
      ...valid,
      id: 'missing-reason',
      reason: '',
    } satisfies DesktopCompatPatch])).toThrow(/reason/u)
  })
})
