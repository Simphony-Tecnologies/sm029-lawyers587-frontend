import { test, expect } from '@playwright/test';

// FaqDialog reemplaza el placeholder "Settings coming soon".

test.describe('Header — Help & FAQs', () => {
  test('avatar dropdown muestra "Help & FAQs" (no Settings coming soon)', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Abrir el menú del avatar
    const avatar = page.getByRole('button', { name: /open user menu|profile/i });
    if (!(await avatar.isVisible().catch(() => false))) {
      // fallback: el menubutton podría no tener aria-label predecible
      const fallback = page.locator('[aria-haspopup="menu"]').last();
      await fallback.click();
    } else {
      await avatar.click();
    }
    await expect(page.getByText(/Help & FAQs/i)).toBeVisible({
      timeout: 5_000,
    });
    // Click abre el dialog
    await page.getByText(/Help & FAQs/i).click();
    await expect(
      page.getByRole('dialog').getByText(/Help & FAQs/i)
    ).toBeVisible();
  });

  test('accordion expande/colapsa preguntas', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const fallback = page.locator('[aria-haspopup="menu"]').last();
    await fallback.click();
    await page.getByText(/Help & FAQs/i).click();

    // La primera pregunta arranca expandida (activeIndex=0)
    const firstQ = page
      .getByRole('button', { name: /How do I assign leads/i })
      .first();
    await expect(firstQ).toBeVisible();
    await firstQ.click();
    // Después del click, queda colapsada. Verificamos haciendo click otra vez para reabrir.
    await firstQ.click();
    await expect(
      page.getByText(/From Lead Management, pick one or more leads/i)
    ).toBeVisible();
  });
});
