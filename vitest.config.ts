import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Override default excludes to allow tests/dist/
    exclude: ['node_modules/**', 'dist/**', '.git/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/types/**', 'node_modules/**'],
      thresholds: {
        lines: 50,
        statements: 50,
        branches: 50,
        functions: 35,
      },
    },
  },
})
