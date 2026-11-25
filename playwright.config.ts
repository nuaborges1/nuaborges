import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = Number(process.env.QA_E2E_PORT || 3199);
const BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['json', { outputFile: './tests/reports/playwright-results.json' }],
    ['html', { outputFolder: './tests/reports/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'msedge',
      },
    },
  ],
  webServer: {
    command: `node tests/setup/e2eTestServer.mjs`,
    url: `${BASE_URL}/__qa__/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      QA_E2E_PORT: String(E2E_PORT),
      QA_ISOLATED_MODE: 'true',
    },
  },
});
