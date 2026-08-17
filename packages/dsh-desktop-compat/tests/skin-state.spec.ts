import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DesktopSkinStateStore, SKIN_STATE_END, SKIN_STATE_START } from '../src/skin-state.ts'

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
  return { home, patch: join(home, 'cordis.patch.yml'), store: new DesktopSkinStateStore(home, 'desktop') }
}

describe('desktop skin state', () => {
  it('persists a bundle theme as the only enabled managed skin', () => {
    const { patch, store } = fixture()
    writeFileSync(patch, `- id: retained\n  disabled: false\n\n${SKIN_STATE_START}\n- insert:\n    - id: ui-skin-qq98\n      name: '@linxin666/dsh-ui-skin-qq98'\n${SKIN_STATE_END}\n`)

    store.activateBundleTheme('dsh-liquid-glass', ['dsh-liquid-glass', 'dsh-solarized'], [])

    const content = readFileSync(patch, 'utf8')
    expect(content).toContain('- id: retained\n  disabled: false')
    expect(content).toContain('- id: liquid-glass\n  disabled: false')
    expect(content).toContain('- id: solarized\n  disabled: true')
    expect(content).toContain('- id: ui-skin-qq98\n  disabled: true')
    expect(content.split(SKIN_STATE_START)).toHaveLength(2)
    expect(store.disabledNames(['dsh-liquid-glass', 'dsh-solarized'], [])).toEqual(new Set(['dsh-solarized']))
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

  it('migrates legacy market disables without rewriting a skin-center insert', () => {
    const { patch, store } = fixture()
    const originalInsert = "- insert:\n    - id: ui-skin-qq98\n      name: '@linxin666/dsh-ui-skin-qq98'"
    writeFileSync(patch, `${SKIN_STATE_START}\n${originalInsert}\n${SKIN_STATE_END}\n`)

    expect(store.migrateLegacy(['dsh-liquid-glass'], [])).toEqual(new Set(['dsh-liquid-glass']))

    const content = readFileSync(patch, 'utf8')
    expect(content).toContain(originalInsert)
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

  it('refuses to persist a non-bundle skin through the market channel', () => {
    const { store } = fixture()
    expect(() => store.activateBundleTheme('@linxin666/dsh-ui-skin-qq98', [], [])).toThrow('not wired through the active profile')
  })
})
