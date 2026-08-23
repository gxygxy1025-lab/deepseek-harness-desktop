export function architectureHint(path) {
  const normalized = path.replaceAll('\\', '/').toLowerCase()
  const matches = [...normalized.matchAll(/(?:^|[-_/])(arm64|aarch64|x64|x86_64)(?=[-_/]|$)/gu)]
  const hint = matches.at(-1)?.[1]
  if (hint === 'arm64' || hint === 'aarch64') return 'arm64'
  if (hint === 'x64' || hint === 'x86_64') return 'x86_64'
  return undefined
}

export function requiredArchitectures(path, expectedArchitecture) {
  const hint = architectureHint(path)
  if (expectedArchitecture === 'universal') return hint ? [hint] : ['x86_64', 'arm64']
  if (expectedArchitecture === 'x64') return hint === 'arm64' ? [] : ['x86_64']
  if (expectedArchitecture === 'arm64') return hint === 'x86_64' ? [] : ['arm64']
  throw new Error(`unsupported expected architecture: ${expectedArchitecture}`)
}
