import { chmodSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { Service, type Context } from '@deepseek-ai/cordis'

export const SKIN_STATE_START = '# --- dsh-skin managed (auto-generated; do not edit) ---'
export const SKIN_STATE_END = '# --- end dsh-skin managed ---'

const LOADER_ID_RE = /^[A-Za-z0-9._/@-]+$/
const PACKAGE_NAME_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/

export interface SkinLoaderEntry {
  options: { id?: string; name?: string }
}

export interface DesktopSkinStateFace {
  migrateLegacy(disabledNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string>
  disabledNames(themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string>
  activateBundleTheme(name: string, themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): void
}

function readText(path: string): string {
  try { return readFileSync(path, 'utf8') } catch { return '' }
}

function sectionBounds(text: string): { start: number; end: number } | null {
  const start = text.indexOf(SKIN_STATE_START)
  if (start === -1) return null
  const markerEnd = text.indexOf(SKIN_STATE_END, start)
  if (markerEnd === -1) throw new Error('desktopSkinState: managed skin section is unterminated')
  return { start, end: markerEnd + SKIN_STATE_END.length }
}

function controlledRows(text: string): Map<string, boolean> {
  const bounds = sectionBounds(text)
  const rows = new Map<string, boolean>()
  if (bounds === null) return rows
  const lines = text.slice(bounds.start, bounds.end).split(/\r?\n/u)
  for (let index = 0; index < lines.length; index += 1) {
    const id = /^- id:\s*([A-Za-z0-9._/@-]+)\s*$/u.exec(lines[index] ?? '')?.[1]
    if (id === undefined) continue
    const disabled = /^\s{2}disabled:\s*(true|false)\s*$/u.exec(lines[index + 1] ?? '')?.[1]
    rows.set(id, disabled === 'true')
  }
  return rows
}

function managedIds(text: string): Set<string> {
  const bounds = sectionBounds(text)
  if (bounds === null) return new Set()
  const ids = new Set<string>()
  for (const line of text.slice(bounds.start, bounds.end).split(/\r?\n/u)) {
    const id = /^\s*- id:\s*([A-Za-z0-9._/@-]+)\s*$/u.exec(line)?.[1]
    if (id !== undefined) ids.add(id)
  }
  return ids
}

function renderRows(rows: Map<string, boolean>): string {
  const lines = [SKIN_STATE_START]
  for (const [id, disabled] of [...rows].sort(([left], [right]) => left.localeCompare(right))) {
    lines.push(`- id: ${id}`, `  disabled: ${disabled ? 'true' : 'false'}`)
  }
  lines.push(SKIN_STATE_END)
  return lines.join('\n')
}

function appendDisabledRows(text: string, ids: Iterable<string>): string {
  const bounds = sectionBounds(text)
  const existing = controlledRows(text)
  const additions = [...new Set(ids)].filter(id => !existing.has(id)).sort()
  if (additions.length === 0) return text
  const rows = additions.flatMap(id => [`- id: ${id}`, '  disabled: true']).join('\n')
  if (bounds === null) return replaceSection(text, `${SKIN_STATE_START}\n${rows}\n${SKIN_STATE_END}`)
  const beforeEnd = text.slice(0, bounds.end - SKIN_STATE_END.length).replace(/\s*$/u, '')
  return `${beforeEnd}\n${rows}\n${text.slice(bounds.end - SKIN_STATE_END.length)}`
}

function replaceSection(text: string, section: string): string {
  const bounds = sectionBounds(text)
  const rawOutside = bounds === null
    ? text.trim()
    : `${text.slice(0, bounds.start)}${text.slice(bounds.end)}`.trim()
  // A `[]` empty YAML list is a placeholder left by earlier cleanups or
  // other tools. It is not a patch the user owns: keep any surrounding
  // comments but drop the bare list so the managed section stays the single
  // root value of the file (otherwise the file holds two YAML documents and
  // dsh fails to parse it).
  const withoutEmptyList = rawOutside
    .split(/\r?\n/u)
    .filter(line => !/^[ \t]*\[\]$/u.test(line))
    .join('\n')
    .trim()
  const outside = withoutEmptyList
  return outside ? `${outside}\n\n${section}\n` : `${section}\n`
}

function writeAtomic(path: string, content: string): void {
  const parent = dirname(path)
  mkdirSync(parent, { recursive: true })
  let mode = 0o600
  try { mode = statSync(path).mode & 0o777 } catch { /* first write */ }
  const temporaryDir = mkdtempSync(join(parent, `${basename(path)}.tmp-`))
  const temporary = join(temporaryDir, basename(path))
  try {
    writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx' })
    chmodSync(temporary, mode)
    renameSync(temporary, path)
  } finally {
    rmSync(temporaryDir, { recursive: true, force: true })
  }
  if (readFileSync(path, 'utf8') !== content) {
    throw new Error(`desktopSkinState: write verification failed: ${path}`)
  }
}

export class DesktopSkinStateStore implements DesktopSkinStateFace {
  readonly home: string
  readonly profile: string

  constructor(home = process.env.DSH_HOME ?? join(homedir(), '.dsh'), profile = process.env.DSH_PROFILE ?? 'desktop') {
    this.home = home
    this.profile = profile
  }

  private get patchPath(): string { return join(this.home, 'cordis.patch.yml') }
  private get profileDir(): string { return join(this.home, 'profiles', this.profile) }

  private wiredPackageNames(): Set<string> {
    try {
      const manifest = JSON.parse(readFileSync(join(this.profileDir, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, unknown>
        dsh?: { profile?: { bundles?: unknown } }
      }
      const names = new Set<string>()
      const bundles = manifest.dsh?.profile?.bundles
      if (Array.isArray(bundles)) {
        for (const value of bundles) if (typeof value === 'string') names.add(value)
      }
      if (typeof manifest.dependencies === 'object' && manifest.dependencies !== null) {
        for (const name of Object.keys(manifest.dependencies)) names.add(name)
      }
      return names
    } catch {
      return new Set()
    }
  }

  private loaderId(name: string, entries: Iterable<SkinLoaderEntry>): string | null {
    if (!PACKAGE_NAME_RE.test(name)) return null
    const packagePatch = readText(join(this.profileDir, 'node_modules', ...name.split('/'), 'cordis.patch.yml'))
    let pending: string | null = null
    for (const line of packagePatch.split(/\r?\n/u)) {
      const id = /^\s*-\s+id:\s*['"]?([A-Za-z0-9._/@-]+)/u.exec(line)
      if (id !== null) pending = id[1]
      const packageName = /^\s*name:\s*['"]?([^'"\s]+)/u.exec(line)
      if (pending !== null && packageName?.[1] === name) return pending
    }
    for (const entry of entries) {
      if (entry.options.name === name && typeof entry.options.id === 'string' && LOADER_ID_RE.test(entry.options.id)) {
        return entry.options.id
      }
    }
    return null
  }

  migrateLegacy(disabledNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string> {
    const entryList = [...entries]
    const migrated = new Set<string>()
    const text = readText(this.patchPath)
    const ids: string[] = []
    for (const name of disabledNames) {
      const id = this.loaderId(name, entryList)
      if (id === null) continue
      ids.push(id)
      migrated.add(name)
    }
    const next = appendDisabledRows(text, ids)
    if (next !== text) writeAtomic(this.patchPath, next)
    return migrated
  }

  disabledNames(themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string> {
    const entryList = [...entries]
    const rows = controlledRows(readText(this.patchPath))
    const disabled = new Set<string>()
    for (const name of themeNames) {
      const id = this.loaderId(name, entryList)
      if (id !== null && rows.get(id) === true) disabled.add(name)
    }
    return disabled
  }

  activateBundleTheme(name: string, themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): void {
    const wiredPackages = this.wiredPackageNames()
    if (!wiredPackages.has(name)) {
      throw new Error(`desktopSkinState: ${name} is not wired through the active profile`)
    }
    const entryList = [...entries]
    const targetId = this.loaderId(name, entryList)
    if (targetId === null) throw new Error(`desktopSkinState: no loader id for ${name}`)
    const text = readText(this.patchPath)
    const rows = controlledRows(text)
    for (const id of rows.keys()) rows.set(id, true)
    // An insert row represents the currently active Skin Center choice. Market
    // activation intentionally normalizes it to a disabled id overlay so the
    // shared authority section still has exactly one active theme.
    for (const id of managedIds(text)) {
      if (!rows.has(id)) rows.set(id, true)
    }
    for (const themeName of themeNames) {
      if (!wiredPackages.has(themeName)) continue
      const id = this.loaderId(themeName, entryList)
      if (id !== null) rows.set(id, themeName !== name)
    }
    rows.set(targetId, false)
    writeAtomic(this.patchPath, replaceSection(text, renderRows(rows)))
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    desktopSkinState: DesktopSkinStateService
  }
}

export class DesktopSkinStateService extends Service implements DesktopSkinStateFace {
  private readonly store: DesktopSkinStateStore

  constructor(ctx: Context) {
    super(ctx, 'desktopSkinState')
    this.store = new DesktopSkinStateStore()
  }

  migrateLegacy(disabledNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string> {
    return this.store.migrateLegacy(disabledNames, entries)
  }

  disabledNames(themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): Set<string> {
    return this.store.disabledNames(themeNames, entries)
  }

  activateBundleTheme(name: string, themeNames: Iterable<string>, entries: Iterable<SkinLoaderEntry>): void {
    this.store.activateBundleTheme(name, themeNames, entries)
  }
}
