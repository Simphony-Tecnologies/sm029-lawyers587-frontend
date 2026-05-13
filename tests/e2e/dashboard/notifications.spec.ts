import { test, expect } from '@playwright/test';

// Sistema de notificaciones — bug crítico: el código admin estaba
// comentado, sólo se hacía fetch a /notifications/lawyer/:id para
// TODOS los roles. Admin no recibía nada.
//
// Estos tests verifican que la rama correcta se llama según el rol.

test.describe('Notifications — admin', () => {
  test('mount dispara GET /notifications (rama admin)', async ({ page }) => {
    let adminHit = 0;
    let lawyerHit = 0;
    page.on('request', (req) => {
      const url = req.url();
      if (req.method() !== 'GET') return;
      // /notifications sin sufijo /lawyer/X
      if (/\/notifications(?:\?|$)/.test(url)) adminHit++;
      if (/\/notifications\/lawyer\//.test(url)) lawyerHit++;
    });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 25_000 });

    // Para admin debe pegar al endpoint global, NO al de lawyer.
    expect(adminHit).toBeGreaterThanOrEqual(1);
    expect(lawyerHit).toBe(0);
  });
});

test.describe('Notifications — lawyer', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.skip(
    !process.env.E2E_LAWYER_EMAIL || !process.env.E2E_LAWYER_PASSWORD,
    'E2E_LAWYER_EMAIL / E2E_LAWYER_PASSWORD no configurados'
  );

  test('mount dispara GET /notifications/lawyer/:id (rama lawyer)', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByPlaceholder('Email Address')
      .fill(process.env.E2E_LAWYER_EMAIL!);
    await page.getByPlaceholder('Password').fill(process.env.E2E_LAWYER_PASSWORD!);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL(/\/dash-lawyers/, { timeout: 15_000 });

    let adminHit = 0;
    let lawyerHit = 0;
    page.on('request', (req) => {
      const url = req.url();
      if (req.method() !== 'GET') return;
      if (/\/notifications\/lawyer\/\d+/.test(url)) lawyerHit++;
      else if (/\/notifications(?:\?|$)/.test(url)) adminHit++;
    });
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 25_000 });

    expect(lawyerHit).toBeGreaterThanOrEqual(1);
    expect(adminHit).toBe(0);
  });
});
