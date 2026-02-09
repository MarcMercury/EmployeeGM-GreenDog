import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['server/agents/**', 'server/utils/agents/**'],
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
      '~~': resolve(__dirname),
      '~/types/agent.types': resolve(__dirname, 'app/types/agent.types'),
      '~~/app/types/agent.types': resolve(__dirname, 'app/types/agent.types'),
    },
  },
})
