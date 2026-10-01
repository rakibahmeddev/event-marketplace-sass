import next from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...next,
  ...nextTs,
  {
    ignores: [
      '.next/**',
      '.next-e2e/**',
      '.next-prod/**',
      'node_modules/**',
      'functions/**',
      'design/**',
      'next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
    ],
  },
];

export default config;
