import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/global-setup.ts'],
  globalSetup: require.resolve('./tests/e2e/global-setup'),
  fullyParallel: false, // Tests escriben/leen al backend; evitar carreras
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3002',
    storageState: 'tests/e2e/.auth/admin.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'admin-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'no-auth',
      testMatch: /auth\/login\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: undefined },
    },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3002',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
