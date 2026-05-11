import { test, expect } from '@playwright/test';

// FaqDialog reemplaza el placeholder "Settings coming soon".

const openUserMenu = async (page: any) => {
  // El PillProfile (avatar pill) usa el role/displayName como label.
  // HeadlessUI MenuButton no le pone aria-label por default, así que
  // buscamos el botón que contiene el texto "Super Admin" / "Admin".
  const candidates = page.locator(
    'button:has-text("Super Admin"), button:has-text("Admin"), button:has-text("Lawyer")'
  );
  await candidates.first().click();
};

test.describe('Header — Help & FAQs', () => {
  test('avatar dropdown muestra "Help & FAQs"', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await openUserMenu(page);
    await expect(
      page.getByRole('menuitem', { name: /Help & FAQs/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test('click "Help & FAQs" abre el dialog con 5 preguntas', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await openUserMenu(page);
    await page.getByRole('menuitem', { name: /Help & FAQs/i }).click();
    // El Dialog tiene title "Help & FAQs"
    await expect(
      page.getByRole('dialog').getByText(/Help & FAQs/i)
    ).toBeVisible();
    // Las 5 preguntas como buttons
    const questions = page.locator('button[aria-expanded]');
    const count = await questions.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('accordion expande la primera pregunta y muestra answer', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await openUserMenu(page);
    await page.getByRole('menuitem', { name: /Help & FAQs/i }).click();

    // La primera pregunta arranca expandida (activeIndex=0 en el componente).
    await expect(
      page.getByText(/From Lead Management, pick one or more leads/i)
    ).toBeVisible({ timeout: 5_000 });
  });
});
