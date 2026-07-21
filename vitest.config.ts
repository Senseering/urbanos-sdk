import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/src/**/*.test.ts', 'create-urbanos-app/src/**/*.test.ts'],
  },
});
