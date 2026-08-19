import { defineConfig } from 'vitest/config'
import { suppressMissingPublishedSdkSourceMapWarnings } from '../../shared/vitest-sdk.ts'

export default defineConfig({
  plugins: [suppressMissingPublishedSdkSourceMapWarnings()],
  test: {
    include: ['tests/**/*.spec.{ts,tsx}'],
    pool: 'forks',
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    server: { deps: { inline: [/@deepseek-ai\//] } },
  },
})
