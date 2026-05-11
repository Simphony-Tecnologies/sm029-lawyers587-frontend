import { chromium, type FullConfig } from '@playwright/test';
import { TEST_USERS } from './fixtures/test-data';

// Hace login una sola vez como admin y guarda el storage state en disco.
// Los tests reutilizan `storageState` desde el config → cero re-logins.
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3002';
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseURL);
  await page.getByPlaceholder('Email Address').fill(TEST_USERS.admin.email);
  await page.getByPlaceholder('Password').fill(TEST_USERS.admin.password);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });

  await context.storageState({ path: 'tests/e2e/.auth/admin.json' });
  await browser.close();
}

export default globalSetup;
