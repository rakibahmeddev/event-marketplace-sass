import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['lib/**/*.test.ts', 'components/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        // Needs the Firestore + Storage emulators: run via `npm run test:rules`.
        test: {
          name: 'rules',
          include: ['tests/rules/**/*.test.ts'],
          environment: 'node',
          testTimeout: 20000,
        },
      },
    ],
  },
});
