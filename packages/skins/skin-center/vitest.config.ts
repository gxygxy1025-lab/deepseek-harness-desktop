import { defineConfig } from 'vitest/config'
import { suppressMissingPublishedSdkSourceMapWarnings } from '../../../shared/vitest-sdk.ts'

export default defineConfig({
  plugins: [suppressMissingPublishedSdkSourceMapWarnings()],
  test: {
    include: ['tests/**/*.{spec,test}.{ts,tsx}'],
    pool: 'forks',
    // These files combine process-global cwd/env changes, Windows junctions,
    // and jsdom execution of real skin bundles. Minimize worker-process churn
    // while the root suite retains package-level concurrency; the Windows
    // worker has exited intermittently during filesystem-heavy test runs.
    maxWorkers: 1,
    // @deepseek-ai SDK packages ship browser bundles (CSS imports included);
    // keep them vite-transformed instead of node-externalized.
    server: {
      deps: {
        inline: [/@deepseek-ai\//],
      },
    },
  },
})
