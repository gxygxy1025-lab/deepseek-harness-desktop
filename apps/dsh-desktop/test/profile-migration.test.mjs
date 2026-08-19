import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { WebProfileMigrationService } from '../src/profile-migration.mjs'

test('web profile migration previews selectable, incompatible, missing, and managed plugins', async () => {
  const dshHome = await mkdtemp(join(tmpdir(), 'dsh-web-profile-migration-'))
  const web = join(dshHome, 'profiles', 'web')
  try {
    await mkdir(web, { recursive: true })
    await writeFile(join(web, 'package.json'), JSON.stringify({
      dependencies: {
        '@community/compatible': '2.0.0',
        '@community/unknown': '1.0.0',
        '@community/incompatible': '3.0.0',
        '@community/missing': '4.0.0',
        '@deepseek-ai/dsh': '0.1.0-rc.6',
        '@community/ranged': '^1.0.0',
      },
    }))
    const compatibleRoot = join(web, 'node_modules', '@community', 'compatible')
    await mkdir(compatibleRoot, { recursive: true })
    await writeFile(join(compatibleRoot, 'package.json'), JSON.stringify({
      name: '@community/compatible',
      version: '2.0.0',
      dsh: { bundle: { patch: './cordis.patch.yml' } },
    }))
    await writeFile(join(compatibleRoot, 'cordis.patch.yml'), '- id: compatible-config\n')
    await writeFile(join(web, 'cordis.patch.yml'), [
      '- insert:',
      '    - id: compatible-entry',
      "      name: '@community/compatible'",
      '      config:',
      '        enabled: true',
      '- id: compatible-config',
      '  config:',
      '    theme: dark',
      '- id: compatible-config',
      '  config:',
      '    apiToken: must-not-migrate',
      '- id: unrelated',
      '  config:',
      '    enabled: true',
      '',
    ].join('\n'))
    const manager = {
      inventory: async () => [{ name: '@community/compatible', version: '1.0.0' }],
      inspect: async (spec) => {
        if (spec.startsWith('@community/missing@')) throw new Error('registry package missing')
        const name = spec.slice(0, spec.lastIndexOf('@'))
        if (name === '@deepseek-ai/dsh') return { name, status: 'managed' }
        const status = name.endsWith('/incompatible') ? 'incompatible' : name.endsWith('/unknown') ? 'unknown' : 'compatible'
        return {
          name,
          status,
          version: spec.slice(spec.lastIndexOf('@') + 1),
          spec,
          bundle: true,
          compatibility: { status, reasons: status === 'incompatible' ? [{ code: 'desktop-range' }] : [] },
        }
      },
    }
    const service = new WebProfileMigrationService({ dshHome, pluginManager: manager })
    const preview = await service.preview()
    assert.deepEqual(preview.configuration, { fragments: 2, skipped: 1 })
    const statuses = Object.fromEntries(preview.items.map((item) => [item.name, item.status]))
    assert.deepEqual(statuses, {
      '@community/compatible': 'update',
      '@community/incompatible': 'incompatible',
      '@community/missing': 'missing',
      '@community/ranged': 'incompatible',
      '@community/unknown': 'unknown',
      '@deepseek-ai/dsh': 'managed',
    })
    assert.deepEqual(
      service.selectedSpecs(preview.id, ['@community/compatible']),
      ['@community/compatible@2.0.0'],
    )
    assert.throws(
      () => service.selectedSpecs(preview.id, ['@community/unknown']),
      /unknown Desktop compatibility/u,
    )
    assert.deepEqual(
      service.selectedSpecs(preview.id, ['@community/unknown'], { allowUnknown: true }),
      ['@community/unknown@1.0.0'],
    )
    assert.throws(
      () => service.selectedSpecs(preview.id, ['@community/missing']),
      /cannot be migrated/u,
    )
    const desktopPatch = join(dshHome, 'profiles', 'desktop', 'cordis.patch.yml')
    await mkdir(join(dshHome, 'profiles', 'desktop'), { recursive: true })
    await writeFile(desktopPatch, '- id: retained-desktop-row\n')
    const selection = service.resolveSelection(preview.id, ['@community/compatible'])
    const configTransaction = await service.stageConfig(selection.record, selection.names)
    assert.equal(configTransaction.fragments, 2)
    await configTransaction.apply()
    const migrated = await readFile(desktopPatch, 'utf8')
    assert.match(migrated, /retained-desktop-row/u)
    assert.match(migrated, /compatible-entry/u)
    assert.match(migrated, /compatible-config/u)
    assert.doesNotMatch(migrated, /apiToken|must-not-migrate|unrelated/u)
    await configTransaction.rollback()
    assert.equal(await readFile(desktopPatch, 'utf8'), '- id: retained-desktop-row\n')
  } finally {
    await rm(dshHome, { recursive: true, force: true })
  }
})

test('web profile migration reports no migration source when the fixed web profile is absent', async () => {
  const dshHome = await mkdtemp(join(tmpdir(), 'dsh-web-profile-absent-'))
  try {
    const service = new WebProfileMigrationService({
      dshHome,
      pluginManager: { inspect: async () => {}, inventory: async () => [] },
    })
    assert.deepEqual(await service.preview(), { available: false, items: [] })
  } finally {
    await rm(dshHome, { recursive: true, force: true })
  }
})
