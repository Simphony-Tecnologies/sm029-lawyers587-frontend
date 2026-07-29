import { defineConfig, devices } from '@playwright/test';

// Config aislada para la suite de signup.
//
// /signup es público → NO necesita el globalSetup (login admin) ni el
// storageState admin del config principal. Reutiliza el dev server del
// frontend en :3002, que ya apunta al backend vía NEXT_PUBLIC_URL.
//
// Requisito para los tests de "registro real": un backend con el endpoint
// POST /auth/signup escuchando donde apunta NEXT_PUBLIC_URL (por defecto
// http://localhost:3000). El backend con ese endpoint vive en la rama
// feature/lawyer-signup-activity-24.
export default defineConfig({
  testDir: './tests/e2e/signup',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3002',
    storageState: { cookies: [], origins: [] },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'signup-anon',
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
