import { defineConfig } from 'vitest/config'

const TEST_DB_URL =
  'postgresql://postgres:postgres@localhost:5432/phantom_mask?schema=test'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./tests/globalSetup.ts'],
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    pool: 'forks',
    env: {
      DATABASE_URL: TEST_DB_URL,
    },
  },
})
