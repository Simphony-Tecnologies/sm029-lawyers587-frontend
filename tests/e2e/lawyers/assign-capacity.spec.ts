import { test, expect } from '@playwright/test';
import { firstDataRow } from '../helpers/datatable.helper';

// Regression del bug crítico reportado en producción:
// 1) Admin edita lawyer y le agrega un área nueva (ej. Corporate).
// 2) El form aceptaba submit con max_leads vacío → POST
//    /lawyers-services con max_leads=0.
// 3) Backend rechaza CADA assign futuro con "exceeded" porque
//    cualquier lead supera 0.
// 4) Frontend mostraba toast genérico sin contexto.

test.describe('Lawyer form — max_leads validation', () => {
  test('form bloquea submit si max_leads vacío y hay áreas seleccionadas', async ({
    page,
  }) => {
    await page.goto('/lawyer-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });

    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();

    const edit = page
      .getByRole('button', { name: /edit lawyer/i })
      .first();
    if (!(await edit.isVisible().catch(() => false))) test.skip();
    await edit.click();

    // Si hay al menos una chip seleccionada (active=slate-900) y el
    // input max_leads queda vacío, el submit DEBE estar disabled.
    const activeChips = await page
      .locator('button.bg-slate-900', { hasText: /✓/ })
      .count();
    if (activeChips === 0) test.skip();

    const maxInput = page.locator('input[type="number"]').first();
    await maxInput.fill('');
    await maxInput.blur();

    // Mensaje de error inline
    await expect(
      page.getByText(/Required\. Must be at least 1/i)
    ).toBeVisible({ timeout: 3_000 });

    // Botón Save changes disabled
    const save = page.getByRole('button', { name: /Save changes/i });
    expect(await save.isDisabled()).toBe(true);
  });

  test('form acepta submit con max_leads >= 1', async ({ page }) => {
    await page.goto('/lawyer-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });

    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();
    const edit = page
      .getByRole('button', { name: /edit lawyer/i })
      .first();
    if (!(await edit.isVisible().catch(() => false))) test.skip();
    await edit.click();

    const maxInput = page.locator('input[type="number"]').first();
    await maxInput.fill('5');
    await maxInput.blur();
    const save = page.getByRole('button', { name: /Save changes/i });
    expect(await save.isDisabled()).toBe(false);
  });
});

test.describe('LawyerPicker — capacity visibility', () => {
  test('picker muestra X/Y o Pending setup, nunca solo "active"', async ({
    page,
  }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });

    // Seleccionar el primer lead con checkbox y abrir bulk assign
    const checkbox = page
      .locator('[role="row"].min-h-\\[52px\\] input[type="checkbox"]')
      .first();
    if (!(await checkbox.isVisible().catch(() => false))) test.skip();
    await checkbox.check();
    const assignBtn = page.getByRole('button', { name: /Assign to/i }).first();
    await assignBtn.click();

    // Picker debe mostrar al menos una card.
    const cards = page.locator('div.max-h-\\[220px\\] button');
    await expect(cards.first()).toBeVisible({ timeout: 5_000 });

    // Cada card termina con un badge: "Pending setup" O "X/Y" tabular.
    const firstCardText = await cards.first().innerText();
    const hasCapacityBadge =
      /pending setup/i.test(firstCardText) ||
      /\d+\/\d+/.test(firstCardText);
    expect(hasCapacityBadge).toBe(true);
  });
});

test.describe('Single assign — error handling', () => {
  test('cuando lawyer maxLeads=0, el toast guía al admin', async ({
    page,
  }) => {
    // Este test es defensivo — depende de que exista al menos un
    // lawyer con maxLeads=0 en el set actual.
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });

    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();
    await row.click();

    // El modal del lead debe estar abierto. Si el lead no está en NEW/EXPIRED
    // la sección "Assign to lawyer" no aparece — skip.
    const assignSection = page.getByText(/Assign to lawyer/i);
    if (!(await assignSection.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip();
    }

    // Buscamos un lawyer "Pending setup" en el picker del modal.
    const pendingCard = page
      .getByRole('button', { name: /Pending setup/i })
      .first();
    if (!(await pendingCard.isVisible().catch(() => false))) test.skip();

    await pendingCard.click();
    await page
      .locator('textarea[placeholder*="Reason for assignment"]')
      .fill('regression test');
    await page.getByRole('button', { name: /^Assign lawyer$/i }).click();

    // El toast pre-check client-side debe aparecer SIN haber pegado
    // al backend (no waitForRequest).
    await expect(
      page.getByText(/no capacity configured/i)
    ).toBeVisible({ timeout: 3_000 });
  });
});
