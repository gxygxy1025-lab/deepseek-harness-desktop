const { cp, mkdir, readFile, readdir, rm, stat, writeFile } = require('node:fs/promises')
const { dirname, join, relative } = require('node:path')

// electron-builder cannot always disambiguate pnpm packages that have several
// peer-dependency snapshots. These are required by the DSH boot graph, so copy
// the app's explicitly pinned instance only when the collector omitted it.
const REQUIRED_PACKAGED_PEERS = Object.freeze([
  '@deepseek-ai/dsh-atomic-write',
  '@deepseek-ai/dsh-attachment',
  '@deepseek-ai/dsh-agent-presets',
  '@deepseek-ai/dsh-brand',
  '@deepseek-ai/dsh-code-runtime',
  '@deepseek-ai/dsh-host-directory-picker',
  '@deepseek-ai/dsh-host-webserver',
  '@deepseek-ai/dsh-jobs',
  '@deepseek-ai/dsh-pwsh-local',
  '@deepseek-ai/dsh-sandbox-policy',
  '@deepseek-ai/dsh-sandbox-windows-acl',
  '@deepseek-ai/dsh-session-format',
  '@deepseek-ai/dsh-session-format-v0-to-v1',
  '@deepseek-ai/dsh-session-format-v1-to-v2',
  '@deepseek-ai/dsh-session-format-v2-to-v3',
  '@deepseek-ai/dsh-settings',
  '@deepseek-ai/dsh-timeout',
  '@deepseek-ai/dsh-typert-protocol',
  '@deepseek-ai/dsh-user-approval',
  '@deepseek-ai/dsh-win32-process',
  '@deepseek-ai/dsh-workflow',
  '@deepseek-ai/dsh-workspace',
  '@deepseek-ai/node-addon-system',
  '@vscode/ripgrep',
  'chokidar',
  'turndown',
])

const SOURCE_ROOTS = new Map([
  ['@anthropic-ai/sdk', ['src']],
  ['@mistralai/mistralai', ['packages', 'src']],
  ['ajv', ['lib']],
  ['openai', ['src']],
  ['zod', ['src']],
])

const DEVELOPMENT_DIRECTORIES = new Set([
  '__tests__',
  'coverage',
  'example',
  'examples',
  'test',
  'tests',
])

function splitPackagePath(relativePath) {
  const parts = relativePath.split(/[\\/]/u)
  if (parts[0]?.startsWith('@')) {
    return { packageName: `${parts[0]}/${parts[1]}`, packageParts: parts.slice(2) }
  }
  return { packageName: parts[0], packageParts: parts.slice(1) }
}

function classifyPrunableFile(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/')
  const { packageName, packageParts } = splitPackagePath(normalized)
  if (/\.d\.(?:ts|mts|cts)$/u.test(packageParts.at(-1) ?? '')) return 'type-declaration'
  if (packageParts.some((part) => DEVELOPMENT_DIRECTORIES.has(part))) return 'development-material'

  // Workspace packages arrive through pnpm links, so electron-builder sees
  // files that npm's package `files` allowlist would omit. Runtime entry
  // points live in lib/; preview images and manifests deliberately remain.
  const sourceRoots = SOURCE_ROOTS.get(packageName) ?? []
  if (sourceRoots.includes(packageParts[0])) return 'published-source'

  if (
    /^@(?:img|koromix|vscode)\/(?:sharp|sharp-libvips|koffi|ripgrep)-(?:darwin-|win32-(?:arm64|ia32)$)/u.test(packageName)
    || /^node-addon-require-builtin-(?:darwin-|win32-(?:arm64|ia32)(?:-msvc)?$)/u.test(packageName)
  ) return 'foreign-native-binary'

  if (packageName === 'node-pty') {
    const packagePath = packageParts.join('/')
    if (/^prebuilds\/(?:darwin-|win32-arm64)/u.test(packagePath)) return 'foreign-native-binary'
    if (/^third_party\/conpty\/[^/]+\/win10-arm64\//u.test(packagePath)) return 'foreign-native-binary'
  }

  return undefined
}

function classifyMacPrunableFile(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/')
  const { packageName, packageParts } = splitPackagePath(normalized)
  if (/\.d\.(?:ts|mts|cts)$/u.test(packageParts.at(-1) ?? '')) return 'type-declaration'
  if (packageParts.some((part) => DEVELOPMENT_DIRECTORIES.has(part))) return 'development-material'

  const sourceRoots = SOURCE_ROOTS.get(packageName) ?? []
  if (sourceRoots.includes(packageParts[0])) return 'published-source'

  if (/(?:^|[-/])(?:win32|linux|freebsd|openbsd|android)-/u.test(packageName)) {
    return 'foreign-native-binary'
  }

  const packagePath = packageParts.join('/')
  if (/\.(?:dll|exe)$/iu.test(packagePath)) return 'foreign-native-binary'
  if (packageName === 'node-pty') {
    if (/^prebuilds\/(?:win32|linux)-/u.test(packagePath)) return 'foreign-native-binary'
    if (/^third_party\/conpty\//u.test(packagePath)) return 'foreign-native-binary'
  }

  return undefined
}

async function listFiles(root) {
  const pending = [root]
  const files = []
  while (pending.length > 0) {
    const directory = pending.pop()
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) pending.push(path)
      else if (entry.isFile()) files.push(path)
    }
  }
  return files
}

async function prunePackagedRuntime(nodeModulesRoot, classifier = classifyPrunableFile) {
  const files = await listFiles(nodeModulesRoot)
  const report = {
    removedBytes: 0,
    removedFiles: 0,
    categories: {},
  }

  for (const path of files) {
    const relativePath = relative(nodeModulesRoot, path)
    const category = classifier(relativePath)
    if (category === undefined) continue
    const metadata = await stat(path)
    await rm(path, { force: true })
    report.removedBytes += metadata.size
    report.removedFiles += 1
    report.categories[category] = (report.categories[category] ?? 0) + 1
  }

  return report
}

async function resolvePackageRoot(packageName) {
  try {
    return dirname(require.resolve(`${packageName}/package.json`))
  } catch (error) {
    if (error?.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error
  }

  let path = dirname(require.resolve(packageName))
  while (true) {
    try {
      const manifest = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'))
      if (manifest.name === packageName) return path
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    const parent = dirname(path)
    if (parent === path) throw new Error(`package root is unavailable: ${packageName}`)
    path = parent
  }
}

async function restoreRequiredPackagedPeers(nodeModulesRoot) {
  const restored = []
  for (const packageName of REQUIRED_PACKAGED_PEERS) {
    const target = join(nodeModulesRoot, ...packageName.split('/'))
    try {
      await stat(target)
      continue
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    const source = await resolvePackageRoot(packageName)
    await mkdir(dirname(target), { recursive: true })
    await cp(source, target, { recursive: true, force: false, errorOnExist: true })
    restored.push(packageName)
  }
  return restored
}

function resolvePackagedNodeModulesRoot(context) {
  if (context.electronPlatformName === 'darwin') {
    const productFilename = context.packager?.appInfo?.productFilename
    if (!productFilename) throw new Error('macOS package product filename is unavailable')
    return join(
      context.appOutDir,
      `${productFilename}.app`,
      'Contents',
      'Resources',
      'app.asar.unpacked',
      'node_modules',
    )
  }
  return join(context.appOutDir, 'resources', 'app.asar.unpacked', 'node_modules')
}

async function afterPack(context) {
  const nodeModulesRoot = resolvePackagedNodeModulesRoot(context)
  const restoredPeers = await restoreRequiredPackagedPeers(nodeModulesRoot)
  const classifier = context.electronPlatformName === 'win32'
    ? classifyPrunableFile
    : context.electronPlatformName === 'darwin'
      ? classifyMacPrunableFile
      : undefined
  const report = classifier
    ? await prunePackagedRuntime(nodeModulesRoot, classifier)
    : { removedBytes: 0, removedFiles: 0, categories: {} }
  report.restoredPeers = restoredPeers
  report.platform = context.electronPlatformName
  const outputPath = join(context.outDir, 'runtime-prune-report.json')
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  process.stdout.write(
    `  - pruned desktop runtime  files=${report.removedFiles} bytes=${report.removedBytes}\n`,
  )
}

module.exports = afterPack
module.exports.REQUIRED_PACKAGED_PEERS = REQUIRED_PACKAGED_PEERS
module.exports.classifyMacPrunableFile = classifyMacPrunableFile
module.exports.classifyPrunableFile = classifyPrunableFile
module.exports.prunePackagedRuntime = prunePackagedRuntime
module.exports.resolvePackageRoot = resolvePackageRoot
module.exports.resolvePackagedNodeModulesRoot = resolvePackagedNodeModulesRoot
module.exports.restoreRequiredPackagedPeers = restoreRequiredPackagedPeers
