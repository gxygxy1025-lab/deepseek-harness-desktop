import { defineConfig } from 'vitest/config'
import { suppressMissingPublishedSdkSourceMapWarnings } from '../../shared/vitest-sdk.ts'

export default defineConfig({
  plugins: [suppressMissingPublishedSdkSourceMapWarnings()],
  test: {
    include: ['tests/**/*.spec.{ts,tsx}'],
    pool: 'forks',
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // @deepseek-ai SDK packages ship browser bundles (CSS imports included);
    // keep them vite-transformed instead of node-externalized.
    server: {
      deps: {
        inline: [/@deepseek-ai\//],
      },
    },
  },
})
