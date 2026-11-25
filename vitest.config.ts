import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/components/**/*.test.{ts,tsx}',
      'tests/api/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
      'tests/security/**/*.test.{ts,tsx}',
      'tests/reliability/**/*.test.{ts,tsx}',
      'tests/regression/**/*.test.{ts,tsx}',
    ],
    exclude: ['node_modules/**', 'tests/e2e/**', 'out*/**', '.next/**'],
    environmentMatchGlobs: [
      ['tests/components/**/*.test.tsx', 'jsdom'],
    ],
    reporters: ['default', 'json'],
    outputFile: {
      json: './tests/reports/vitest-results.json',
    },
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
      reportsDirectory: './tests/reports/coverage',
      reporter: ['text', 'json-summary', 'json', 'html'],
      include: [
        'lib/appointmentsCanonical.ts',
        'lib/appointments/availabilityEngine.ts',
        'lib/appointments/timeUtils.ts',
        'lib/personalizadosCanonical.ts',
        'lib/financeCanonical.ts',
        'lib/publicCatalog.ts',
        'lib/editorialRichText.tsx',
        'lib/content/normalize.ts',
        'functions/api/_central/**/*.ts',
        'functions/api/_security.ts',
        'functions/api/_authHelper.ts',
        'functions/api/_mercadopago.ts',
        'functions/api/payments/**/*.ts',
        'functions/api/webhooks/**/*.ts',
        'functions/api/me/**/*.ts',
        'functions/api/id/**/*.ts',
        'functions/api/appointments/**/*.ts',
        'functions/api/personalizados/**/*.ts',
        'functions/api/admin/**/*.ts',
        'functions/api/cron/**/*.ts',
        'functions/api/auth/**/*.ts',
        'functions/api/content/sync.ts',
        'functions/api/media/delete.ts',
        'functions/media/[[path]].ts',
      ],
      exclude: ['**/*.d.ts', '**/types.ts'],
    },
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
