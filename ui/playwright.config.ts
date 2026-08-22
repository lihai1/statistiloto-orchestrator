import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: 'http://localhost',
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
    // Launch Chrome visibly so the user can watch the test flows.
    launchOptions: {
      headless: false,
      args: ['--start-maximized'],
    },
    viewport: null,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'echo "use docker compose"',
    url: 'http://localhost',
    reuseExistingServer: true,
    timeout: 5000,
  },
});
