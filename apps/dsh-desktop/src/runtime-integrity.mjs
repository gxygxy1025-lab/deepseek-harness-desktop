import { constants, accessSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const RESOURCES_MACHINE_ID_FILE = 'build/src/detectors/platform/node/machine-id/getMachineId.js'
const PACKAGED_RESOURCES_ROOT = '@deepseek-ai/dsh-session-telemetry-otel/node_modules/@opentelemetry/resources'

export const CRITICAL_RUNTIME_FILES = Object.freeze([
  `${PACKAGED_RESOURCES_ROOT}/${RESOURCES_MACHINE_ID_FILE}`,
])

export function resolveRuntimeCriticalFiles(anchor = import.meta.url) {
  const require = createRequire(anchor)
  const telemetryManifest = require.resolve('@deepseek-ai/dsh-session-telemetry-otel/package.json')
  const telemetryRequire = createRequire(telemetryManifest)
  const resourcesManifest = telemetryRequire.resolve('@opentelemetry/resources/package.json')
  return Object.freeze([join(dirname(resourcesManifest), ...RESOURCES_MACHINE_ID_FILE.split('/'))])
}

export function assertRuntimeIntegrity({
  modulesRoot,
  resolvedFiles,
  accessFile = accessSync,
} = {}) {
  if (resolvedFiles === undefined && (typeof modulesRoot !== 'string' || modulesRoot.length === 0)) {
    throw new TypeError('runtime modules root or resolved files are required')
  }
  if (resolvedFiles !== undefined && (!Array.isArray(resolvedFiles) || resolvedFiles.length !== CRITICAL_RUNTIME_FILES.length)) {
    throw new TypeError('resolved runtime files must match the critical file contract')
  }
  for (let index = 0; index < CRITICAL_RUNTIME_FILES.length; index += 1) {
    const relativePath = CRITICAL_RUNTIME_FILES[index]
    const target = resolvedFiles?.[index] ?? join(modulesRoot, ...relativePath.split('/'))
    try {
      accessFile(target, constants.R_OK)
    } catch (cause) {
      const error = new Error(
        `Desktop 安装不完整，缺少运行时文件 ${relativePath}。请重新安装 Desktop；如果问题仍然存在，请检查安全软件的隔离记录。`,
        { cause },
      )
      error.code = 'DSH_DESKTOP_INSTALLATION_INCOMPLETE'
      error.missingFile = relativePath
      throw error
    }
  }
  return true
}
