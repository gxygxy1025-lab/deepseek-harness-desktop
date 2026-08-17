import type { Plugin } from 'vitest/config'

const MISSING_SOURCE_MAP_PREFIX = 'Failed to load source map for '

/**
 * Match only the known publishing defect in transformed @deepseek-ai SDK
 * packages. Workspace and unrelated dependency warnings must remain visible.
 */
export function isMissingPublishedSdkSourceMapWarning(message: string): boolean {
  const normalized = message.replaceAll('\\', '/')
  return normalized.startsWith(MISSING_SOURCE_MAP_PREFIX)
    && normalized.includes('/node_modules/@deepseek-ai/')
    && normalized.includes('ENOENT')
    && /\.map(?:['"\s]|$)/u.test(normalized)
}

/** Suppress only missing published SDK maps after Vite resolves its logger. */
export function suppressMissingPublishedSdkSourceMapWarnings(): Plugin {
  return {
    name: 'dsh:suppress-missing-published-sdk-sourcemaps',
    enforce: 'pre',
    configResolved(config) {
      const warn = config.logger.warn.bind(config.logger)
      config.logger.warn = (message, options) => {
        if (isMissingPublishedSdkSourceMapWarning(message)) return
        warn(message, options)
      }
    },
  }
}
