import { describe, expect, it } from 'vitest'
import {
  isMissingPublishedSdkSourceMapWarning,
  suppressMissingPublishedSdkSourceMapWarnings,
} from '../vitest-sdk.ts'

const windowsWarning = `Failed to load source map for C:\\repo\\node_modules\\.pnpm\\@deepseek-ai+dsh-client-runtime@1.0.0\\node_modules\\@deepseek-ai\\dsh-client-runtime\\lib\\client.js.
Error: ENOENT: no such file or directory, open 'C:\\repo\\node_modules\\.pnpm\\@deepseek-ai+dsh-client-runtime@1.0.0\\node_modules\\@deepseek-ai\\dsh-client-runtime\\lib\\client.js.map'`

describe('published SDK source map warning filter', () => {
  it('recognizes missing maps from scoped SDK packages on Windows and POSIX', () => {
    expect(isMissingPublishedSdkSourceMapWarning(windowsWarning)).toBe(true)
    expect(isMissingPublishedSdkSourceMapWarning(
      "Failed to load source map for /repo/node_modules/@deepseek-ai/dsh-host/lib/index.js.\nError: ENOENT: no such file or directory, open '/repo/node_modules/@deepseek-ai/dsh-host/lib/index.js.map'",
    )).toBe(true)
  })

  it('keeps workspace, unrelated package, and non-ENOENT warnings visible', () => {
    expect(isMissingPublishedSdkSourceMapWarning(
      "Failed to load source map for C:\\repo\\shared\\client.js.\nError: ENOENT: no such file or directory, open 'C:\\repo\\shared\\client.js.map'",
    )).toBe(false)
    expect(isMissingPublishedSdkSourceMapWarning(
      "Failed to load source map for /repo/node_modules/example/lib/index.js.\nError: ENOENT: no such file or directory, open '/repo/node_modules/example/lib/index.js.map'",
    )).toBe(false)
    expect(isMissingPublishedSdkSourceMapWarning(
      'Failed to load source map for /repo/node_modules/@deepseek-ai/example/lib/index.js.\nError: invalid JSON in index.js.map',
    )).toBe(false)
  })

  it('wraps the resolved Vite logger and forwards unrelated warnings', () => {
    const received: string[] = []
    const plugin = suppressMissingPublishedSdkSourceMapWarnings()
    expect(typeof plugin.configResolved).toBe('function')
    if (typeof plugin.configResolved !== 'function') throw new Error('expected a configResolved hook')

    const config = {
      logger: {
        warn(message: string) {
          received.push(message)
        },
      },
    }
    plugin.configResolved.call({} as never, config as never)
    config.logger.warn(windowsWarning)
    config.logger.warn('an unrelated warning')

    expect(received).toEqual(['an unrelated warning'])
  })
})
