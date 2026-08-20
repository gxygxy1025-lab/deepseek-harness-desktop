import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DesktopSkinStateStore,
  SKIN_STATE_END,
  SKIN_STATE_START,
} from '../src/skin-state.ts'

function fixture({
  bundles = ['dsh-liquid-glass', 'dsh-solarized'],
  dependencies = {},
}: {
  bundles?: string[]
  dependencies?: Record<string, string>
} = {}) {
  const home = mkdtempSync(join(tmpdir(), 'dsh-skin-state-'))
  const profileDir = join(home, 'profiles', 'desktop')
  mkdirSync(profileDir, { recursive: true })
  writeFileSync(join(profileDir, 'package.json'), JSON.stringify({
    dependencies,
    dsh: { profile: { bundles } },
  }))
  for (const [name, id] of [['dsh-liquid-glass', 'liquid-glass'], ['dsh-solarized', 'solarized']]) {
    const packageDir = join(profileDir, 'node_modules', name)
    mkdirSync(packageDir, { recursive: true })
    writeFileSync(join(packageDir, 'cordis.patch.yml'), `- insert:\n    - id: ${id}\n      name: '${name}'\n`)
  }
  return {
    home,
    patch: join(profileDir, 'cordis.patch.yml'),
    globalPatch: join(home, 'cordis.patch.yml'),
    store: new DesktopSkinStateStore(home, 'desktop'),
  }
}

describe('desktop skin state', () => {
  it('persists a bundle theme without carrying a retired Skin Center loader into market state', () => {
    const { globalPatch, patch, store } = fixture()
    writeFileSync(patch, `- id: retained\n  disabled: false\n\n${SKIN_STATE_START}\n- insert:\n    - id: ui-skin-xp\n      name: '@linxin666/dsh-client-ui-skin-xp'\n${SKIN_STATE_END}\n`)

    store.activateBundleTheme('dsh-liquid-glass', ['dsh-liquid-glass', 'dsh-solarized'], [])

    const content = readFileSync(patch, 'utf8')
    expect(content).toContain('- id: retained\n  disabled: false')
    expect(content).toContain('- id: liquid-glass\n  disabled: false')
    expect(content).toContain('- id: solarized\n  disabled: true')
    expect(content).not.toContain('ui-skin-')
    expect(content).not.toContain('name:')
    expect(content).not.toContain('- insert:')
    expect(content.split(SKIN_STATE_START)).toHaveLength(2)
    expect(store.disabledNames(['dsh-liquid-glass', 'dsh-solarized'], [])).toEqual(new Set(['dsh-solarized']))
    expect(() => readFileSync(globalPatch, 'utf8')).toThrow()
  })

  it('accepts a market theme wired only through profile dependencies', () => {
    const { patch, store } = fixture({
      bundles: [],
      dependencies: {
        'dsh-liquid-glass': '^1.0.0',
        'dsh-solarized': '^1.0.0',
      },
    })

    expect(() => store.activateBundleTheme(
      'dsh-liquid-glass',
      ['dsh-liquid-glass', 'dsh-solarized'],
      [],
    )).not.toThrow()
    expect(readFileSync(patch, 'utf8')).toContain('- id: liquid-glass\n  disabled: false')
  })

  it('does not copy a retired Skin Center marker after runtime startup has begun', () => {
    const { home, patch } = fixture()
    const legacyMarker = [
      '# --- dsh-skin managed (auto-generated; do not edit) ---',
      '- insert:',
      '    - id: ui-skin-xp',
      `      name: '@linxin666/dsh-client-ui-skin-xp'`,
      '# --- end dsh-skin managed ---',
      '',
    ].join('\n')
    writeFileSync(patch, legacyMarker)

    new DesktopSkinStateStore(home, 'desktop')

    const content = readFileSync(patch, 'utf8')
    expect(content).toBe(legacyMarker)
    expect(content).not.toContain(SKIN_STATE_START)
  })

  it('migrates legacy market disables without rewriting a Skin Center loader', () => {
    const { patch, store } = fixture()
    const originalMarketState = '- id: solarized\n  disabled: false'
    writeFileSync(patch, `${SKIN_STATE_START}\n${originalMarketState}\n${SKIN_STATE_END}\n`)

    expect(store.migrateLegacy(['dsh-liquid-glass'], [])).toEqual(new Set(['dsh-liquid-glass']))

    const content = readFileSync(patch, 'utf8')
    expect(content).toContain(originalMarketState)
    expect(content).toContain('- id: liquid-glass\n  disabled: true')
  })

  it('replaces an empty YAML list instead of appending a second root value', () => {
    const { patch, store } = fixture()
    writeFileSync(patch, '[]\n')

    store.migrateLegacy(['dsh-liquid-glass'], [])

    const content = readFileSync(patch, 'utf8')
    expect(content).not.toContain('[]')
    expect(content).toContain('- id: liquid-glass\n  disabled: true')
  })

  it('drops a bare empty list even when comments surround it', () => {
    const { patch, store } = fixture()
    writeFileSync(
      patch,
      '# cleaned by an earlier tool\n# keep this note\n[]\n',
    )

    store.migrateLegacy(['dsh-liquid-glass'], [])

    const content = readFileSync(patch, 'utf8')
    expect(content).not.toContain('[]')
    expect(content).toContain('# cleaned by an earlier tool')
    expect(content).toContain('# keep this note')
    expect(content).toContain('- id: liquid-glass\n  disabled: true')
    // The managed section must be the only root value: comments are fine,
    // but a second YAML document (the bare `[]`) must not survive.
    expect(content).toMatch(/^\S/u)
  })

  it('preserves unrelated non-empty outside content', () => {
    const { patch, store } = fixture()
    writeFileSync(patch, '- id: retained\n  disabled: false\n')

    store.activateBundleTheme('dsh-liquid-glass', ['dsh-liquid-glass', 'dsh-solarized'], [])

    const content = readFileSync(patch, 'utf8')
    expect(content).toContain('- id: retained\n  disabled: false')
    expect(content).toContain('- id: liquid-glass\n  disabled: false')
  })

  it('clears the Skin Center v2 selection when a market theme is activated', () => {
    const { home, store } = fixture()
    const activeSelection = join(home, 'skin-center-active.json')
    writeFileSync(activeSelection, '{"active":"xp"}\\n')

    store.activateBundleTheme('dsh-liquid-glass', ['dsh-liquid-glass', 'dsh-solarized'], [])

    expect(() => readFileSync(activeSelection, 'utf8')).toThrow()
  })

  it('refuses to persist a non-bundle skin through the market channel', () => {
    const { store } = fixture()
    expect(() => store.activateBundleTheme('@linxin666/dsh-client-ui-skin-xp', [], [])).toThrow('not wired through the active profile')
  })
})
