import semver from 'semver'

const { satisfies, valid, validRange } = semver
const RANGE_OPTIONS = Object.freeze({ includePrerelease: true })
const MAX_PUBLIC_VALUE_LENGTH = 256

function publicValue(value) {
  return String(value).slice(0, MAX_PUBLIC_VALUE_LENGTH)
}

function exactVersion(value, label) {
  const normalized = String(value ?? '').trim().replace(/^v/u, '')
  if (valid(normalized) === null) throw new TypeError(`${label} version is invalid`)
  return normalized
}

export function createHostCompatibility({
  desktopVersion,
  nodeVersion,
  runtimeVersion,
  packages = {},
}) {
  if (packages === null || typeof packages !== 'object' || Array.isArray(packages)) {
    throw new TypeError('host packages must be an object')
  }
  const normalizedPackages = {}
  for (const [name, version] of Object.entries(packages).toSorted(([left], [right]) => left.localeCompare(right))) {
    normalizedPackages[name] = exactVersion(version, `${name} package`)
  }
  return Object.freeze({
    desktopVersion: exactVersion(desktopVersion, 'desktop'),
    nodeVersion: exactVersion(nodeVersion, 'Node'),
    runtimeVersion: exactVersion(runtimeVersion, 'runtime'),
    packages: Object.freeze(normalizedPackages),
  })
}

function addRangeAssessment({ reasons, subject, required, actual, mismatchCode }) {
  const range = typeof required === 'string' ? required.trim() : ''
  if (range.length === 0 || validRange(range, RANGE_OPTIONS) === null) {
    reasons.push(Object.freeze({
      code: 'invalid-range',
      subject: publicValue(subject),
      required: publicValue(required),
    }))
    return false
  }
  if (!satisfies(actual, range, RANGE_OPTIONS)) {
    reasons.push(Object.freeze({
      code: mismatchCode,
      subject: publicValue(subject),
      required: publicValue(range),
      actual: publicValue(actual),
    }))
    return false
  }
  return true
}

function isDshPeer(name) {
  return name.startsWith('@deepseek-ai/')
}

export function assessPluginCompatibility(manifest, host) {
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return Object.freeze({
      status: 'incompatible',
      reasons: Object.freeze([Object.freeze({ code: 'invalid-manifest' })]),
    })
  }
  const reasons = []
  const patch = manifest.dsh?.bundle?.patch
  if (typeof patch !== 'string' || patch.trim().length === 0) {
    reasons.push(Object.freeze({ code: 'not-dsh-bundle' }))
  }

  let compatibilityEvidence = false
  const nodeRange = manifest.engines?.node
  if (nodeRange !== undefined) {
    addRangeAssessment({
      reasons,
      subject: 'node',
      required: nodeRange,
      actual: host.nodeVersion,
      mismatchCode: 'node-range',
    })
  }

  const explicit = manifest.dsh?.compatibility
  if (explicit !== undefined && (explicit === null || typeof explicit !== 'object' || Array.isArray(explicit))) {
    reasons.push(Object.freeze({
      code: 'invalid-compatibility',
      subject: 'dsh.compatibility',
    }))
  } else if (explicit) {
    if (explicit.desktop !== undefined) {
      compatibilityEvidence = addRangeAssessment({
        reasons,
        subject: 'desktop',
        required: explicit.desktop,
        actual: host.desktopVersion,
        mismatchCode: 'desktop-range',
      }) || compatibilityEvidence
    }
    if (explicit.runtime !== undefined) {
      compatibilityEvidence = addRangeAssessment({
        reasons,
        subject: 'runtime',
        required: explicit.runtime,
        actual: host.runtimeVersion,
        mismatchCode: 'runtime-range',
      }) || compatibilityEvidence
    }
  }

  const peers = manifest.peerDependencies
  const optionalPeers = manifest.peerDependenciesMeta
  if (peers !== undefined && (peers === null || typeof peers !== 'object' || Array.isArray(peers))) {
    reasons.push(Object.freeze({ code: 'invalid-peer-dependencies' }))
  } else {
    for (const [name, range] of Object.entries(peers ?? {})) {
      const actual = host.packages[name]
      if (actual === undefined) {
        if (optionalPeers?.[name]?.optional === true) continue
        reasons.push(Object.freeze({
          code: 'peer-missing',
          subject: publicValue(name),
          required: publicValue(range),
        }))
        continue
      }
      const matched = addRangeAssessment({
        reasons,
        subject: name,
        required: range,
        actual,
        mismatchCode: 'peer-range',
      })
      if (matched && isDshPeer(name)) compatibilityEvidence = true
    }
  }

  if (reasons.length > 0) {
    return Object.freeze({ status: 'incompatible', reasons: Object.freeze(reasons) })
  }
  if (compatibilityEvidence) {
    return Object.freeze({ status: 'compatible', reasons: Object.freeze([]) })
  }
  return Object.freeze({
    status: 'unknown',
    reasons: Object.freeze([Object.freeze({ code: 'compatibility-undeclared' })]),
  })
}
