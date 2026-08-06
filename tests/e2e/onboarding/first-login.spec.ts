import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

const EMAIL = process.env.E2E_ONBOARDING_EMAIL;
const PASSWORD = process.env.E2E_ONBOARDING_PASSWORD;

test.describe('Onboarding en primer login', () => {
  test.skip(
    !EMAIL || !PASSWORD,
    'E2E_ONBOARDING_EMAIL / E2E_ONBOARDING_PASSWORD no configurados'
  );

  test('lawyer verificado con onboarding pending ve el modal de videos', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email Address').fill(EMAIL as string);
    await page.getByPlaceholder('Password').fill(PASSWORD as string);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(
      page.getByRole('heading', { name: /Welcome — quick tour/i })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('iframe').first()).toBeVisible();

    // Al terminar, el modal se cierra y no reaparece al recargar.
    await page.getByRole('button', { name: /^Done$/ }).click();
    await expect(
      page.getByRole('heading', { name: /Welcome — quick tour/i })
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /Welcome — quick tour/i })
    ).toHaveCount(0);
  });

  test('Reiniciar onboarding desde el perfil vuelve a mostrar el modal', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email Address').fill(EMAIL as string);
    await page.getByPlaceholder('Password').fill(PASSWORD as string);
    await page.getByRole('button', { name: 'Login' }).click();

    // Cerrar el modal inicial (skip) si aparece.
    const tour = page.getByRole('heading', { name: /Welcome — quick tour/i });
    if (await tour.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /^Skip$/ }).click();
    }

    // Abrir el menú de perfil y reiniciar.
    await page
      .getByRole('button', { name: new RegExp(EMAIL as string, 'i') })
      .or(page.locator('header button').last())
      .click();
    await page.getByRole('menuitem', { name: /Restart onboarding/i }).click();

    await expect(page.getByText(/Onboarding will replay/i)).toBeVisible();
    await expect(tour).toBeVisible({ timeout: 15_000 });
  });
});
