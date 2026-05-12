import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';
import { LAWYER_ROUTES } from '../fixtures/test-data';

// Lawyer specs anulan el storage admin pre-cargado y hacen login propio.
// Skip toda la suite si no hay credenciales lawyer configuradas.
test.use({ storageState: { cookies: [], origins: [] } });
test.skip(
  !process.env.E2E_LAWYER_EMAIL || !process.env.E2E_LAWYER_PASSWORD,
  'E2E_LAWYER_EMAIL / E2E_LAWYER_PASSWORD no configurados'
);

test.describe('Lawyer — smoke navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'lawyer');
  });

  for (const route of LAWYER_ROUTES) {
    test(`lawyer abre ${route} sin errores ni respuestas 5xx`, async ({
      page,
    }) => {
      const serverErrors: { url: string; status: number }[] = [];

      page.on('response', (res) => {
        if (res.status() >= 500) {
          serverErrors.push({ url: res.url(), status: res.status() });
        }
      });

      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 20_000 });

      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, '\\/')));
      const text = await page.locator('body').innerText();
      expect(text.length).toBeGreaterThan(20);
      expect(serverErrors).toEqual([]);
    });
  }
});

test.describe('Lawyer — RBAC bloquea rutas admin', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'lawyer');
  });

  test('lawyer no puede acceder a /lawyer-management', async ({ page }) => {
    await page.goto('/lawyer-management');
    // Middleware redirige a /
    await page.waitForURL(/\/$/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/$/);
  });

  test('lawyer no puede acceder a /lead-management', async ({ page }) => {
    await page.goto('/lead-management');
    await page.waitForURL(/\/$/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/$/);
  });
});
