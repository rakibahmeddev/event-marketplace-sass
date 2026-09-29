import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['lib/**/*.test.ts', 'components/**/*.test.ts', 'functions/src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        // Needs the Firestore + Storage emulators: run via `npm run test:rules`, which also passes
        // --no-file-parallelism because every file clears the same emulator between tests.
        test: {
          name: 'rules',
          include: ['tests/rules/**/*.test.ts'],
          environment: 'node',
          testTimeout: 20000,
        },
      },
      {
        extends: true,
        // Needs Auth + Functions + Firestore emulators and seed data: `npm run test:integration`.
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          testTimeout: 30000,
        },
      },
    ],
  },
});
