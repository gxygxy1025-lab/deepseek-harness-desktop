export interface DesktopCompatPatch {
  id: string
  applicableVersions: readonly string[]
  reason: string
  upstreamReference: string
  test: string
  removeWhen: string
  lastVerified: string
}

const PATCH_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u

export function validateCompatPatchRegistry(
  entries: readonly DesktopCompatPatch[],
): readonly DesktopCompatPatch[] {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new TypeError('compat patch registry must contain at least one entry')
  }
  const ids = new Set<string>()
  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object' || !PATCH_ID.test(entry.id)) {
      throw new TypeError('compat patch registry id is invalid')
    }
    if (ids.has(entry.id)) throw new TypeError(`duplicate compat patch id: ${entry.id}`)
    ids.add(entry.id)
    if (
      !Array.isArray(entry.applicableVersions)
      || entry.applicableVersions.length === 0
      || entry.applicableVersions.some((version: unknown) => (
        typeof version !== 'string' || !EXACT_VERSION.test(version)
      ))
    ) {
      throw new TypeError(`compat patch ${entry.id} must use exact applicable versions`)
    }
    for (const field of ['reason', 'upstreamReference', 'test', 'removeWhen'] as const) {
      if (typeof entry[field] !== 'string' || entry[field].trim().length < 8) {
        throw new TypeError(`compat patch ${entry.id} has an invalid ${field}`)
      }
    }
    if (!ISO_DATE.test(entry.lastVerified)) {
      throw new TypeError(`compat patch ${entry.id} has an invalid lastVerified date`)
    }
  }
  return entries
}

export const DESKTOP_COMPAT_PATCHES = Object.freeze(validateCompatPatchRegistry([
  Object.freeze({
    id: 'queued-turn-continuation',
    applicableVersions: Object.freeze(['0.1.0-rc.6']),
    reason: 'Resume a queued user turn after the active turn reaches a terminal status.',
    upstreamReference: '@deepseek-ai/dsh-agent 0.1.0-rc.6 agent/status public hook behavior',
    test: 'packages/dsh-desktop-compat/tests/recovery.spec.ts',
    removeWhen: 'The upstream agent loop natively and deterministically resumes queued turns.',
    lastVerified: '2026-08-18',
  }),
  Object.freeze({
    id: 'cancellation-presentation',
    applicableVersions: Object.freeze(['0.1.0-rc.6']),
    reason: 'Translate the known object-shaped cancellation result into a stable user-facing message.',
    upstreamReference: '@deepseek-ai/dsh-tools 0.1.0-rc.6 tools/post-execute public hook behavior',
    test: 'packages/dsh-desktop-compat/tests/recovery.spec.ts',
    removeWhen: 'The upstream tool runtime returns a stable cancellation presentation contract.',
    lastVerified: '2026-08-18',
  }),
  Object.freeze({
    id: 'desktop-skin-profile-isolation',
    applicableVersions: Object.freeze(['0.1.0-rc.6']),
    reason: 'Keep Desktop skin selection inside the isolated desktop profile patch.',
    upstreamReference: '@deepseek-ai/dsh 0.1.0-rc.6 profile and cordis patch behavior',
    test: 'packages/dsh-desktop-compat/tests/skin-state.spec.ts',
    removeWhen: 'The upstream skin service exposes a profile-scoped public persistence contract.',
    lastVerified: '2026-08-18',
  }),
] satisfies readonly DesktopCompatPatch[]))
