import { test, expect } from '@playwright/test';
import { ADMIN_ROUTES } from '../fixtures/test-data';

// Admin storageState ya provisto por el global-setup → cero login aquí.
test.describe('Admin — smoke navigation', () => {

  for (const route of ADMIN_ROUTES) {
    test(`admin abre ${route} sin errores ni respuestas 5xx`, async ({
      page,
    }) => {
      const serverErrors: { url: string; status: number }[] = [];
      const consoleErrors: string[] = [];

      page.on('response', (res) => {
        if (res.status() >= 500) {
          serverErrors.push({ url: res.url(), status: res.status() });
        }
      });
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto(route);
      await page.waitForLoadState('networkidle', { timeout: 20_000 });

      // No debe haber redirect a login
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, '\\/')));

      // Render mínimo: body con contenido
      const text = await page.locator('body').innerText();
      expect(text.length).toBeGreaterThan(20);

      // Sin 5xx en la carga
      expect(serverErrors).toEqual([]);
      // No fail por console.error solo, pero los reportamos en el output
      if (consoleErrors.length > 0) {
        console.warn(`[${route}] console errors:`, consoleErrors.slice(0, 3));
      }
    });
  }
});
