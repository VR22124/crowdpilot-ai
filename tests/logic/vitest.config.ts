import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/logic/vitest.setup.ts'],
    include: ['tests/logic/**/*.test.ts', 'tests/logic/**/*.test.tsx'],
    reporters: ['default', 'json'],
    outputFile: {
      json: 'tests/report/artifacts/logic.json',
    },
    coverage: {
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'tests/report/artifacts/coverage',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
})
