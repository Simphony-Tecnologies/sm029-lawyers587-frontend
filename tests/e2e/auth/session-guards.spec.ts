import { test, expect } from '@playwright/test';

/**
 * Guardas de sesión inválida — batch de seguridad (Sep 2026).
 * Cubre:
 *  - middleware.ts: cookie `currentUser` malformada ya NO crashea con 500
 *    (jwtDecode movido dentro del try/catch) → redirige al login.
 *  - Sesión ausente en ruta protegida → redirige al login.
 *
 * Estos tests corren SIN la sesión admin (storageState vacío) a propósito.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3002';
const atLogin = /\/(login)?$/;

test.describe('Session guards — invalid/expired session', () => {
  test('sin sesión, una ruta protegida de admin redirige al login', async ({ page }) => {
    await page.goto('/lead-management');
    await expect(page).toHaveURL(atLogin);
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test('sin sesión, una ruta protegida de lawyer redirige al login', async ({ page }) => {
    await page.goto('/dash-lawyers');
    await expect(page).toHaveURL(atLogin);
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test('cookie currentUser malformada redirige al login sin crash 500', async ({ page, context }) => {
    // Regresión del fix en middleware.ts: antes jwtDecode lanzaba InvalidTokenError
    // fuera del try → 500 en toda ruta. Ahora se trata como sesión inválida.
    await context.addCookies([
      { name: 'currentUser', value: 'INVALID_TOKEN_TEST', url: BASE },
    ]);
    const res = await page.goto('/dash-lawyers');
    expect(res?.status() ?? 200).toBeLessThan(500);
    await expect(page).toHaveURL(atLogin);
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });
});
