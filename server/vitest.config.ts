import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'json-summary'],
      include: ['middleware/**/*.ts', 'modules/**/*.ts'],
      exclude: ['**/*.d.ts'],
    },
  },
});
