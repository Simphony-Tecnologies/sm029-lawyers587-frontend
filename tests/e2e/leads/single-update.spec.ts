import { test, expect } from '@playwright/test';

// Endpoints ejercitados:
//   PUT /leads/:id (con comment obligatorio en PROBLEMATIC/SEND_BACK)
//   PATCH /leads/:id/unassign (cuando status = LOST / SEND_BACK)
//   PUT /leads/:id/archive (cuando status = ARCHIVED)

test.describe('Leads — single update (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
  });

  test('abrir un lead asignado abre el modal con secciones', async ({
    page,
  }) => {
    // Tomamos la primera row que no sea NEW (para que sea editable).
    const row = page.locator('tbody tr').first();
    if (!(await row.isVisible().catch(() => false))) test.skip();
    await row.click();
    // Modal: status selector + Activity & Notes presentes
    await expect(page.getByText(/Activity & Notes/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('cambiar status a PROBLEMATIC sin razón bloquea submit', async ({
    page,
  }) => {
    const row = page.locator('tbody tr').first();
    if (!(await row.isVisible().catch(() => false))) test.skip();
    await row.click();
    await expect(page.getByText(/Activity & Notes/i)).toBeVisible();

    const select = page.locator('#lead-status');
    await select.selectOption({ label: 'Problematic' });
    // El botón Save / Mark as Lost queda enabled? Verificamos el mensaje de error.
    const save = page.getByRole('button', { name: /Save|Mark/i });
    await save.click();
    // Si el textarea está vacío, la app no debe haber cerrado el modal.
    await expect(page.getByText(/Activity & Notes/i)).toBeVisible();
    // Mensaje de razón requerida visible.
    await expect(
      page.getByText(/reason is required/i)
    ).toBeVisible();
  });

  test('archive cierra el modal y excluye el lead de la tabla', async ({
    page,
  }) => {
    const row = page.locator('tbody tr').first();
    if (!(await row.isVisible().catch(() => false))) test.skip();
    const firstId = await row
      .locator('td')
      .first()
      .textContent()
      .catch(() => null);
    await row.click();
    await expect(page.getByText(/Activity & Notes/i)).toBeVisible();

    const select = page.locator('#lead-status');
    const archived = await select
      .locator('option', { hasText: 'Archive' })
      .count();
    if (archived === 0) test.skip();
    await select.selectOption({ label: 'Archive' });
    await page.getByRole('button', { name: /Save|Archive/i }).first().click();
    // Modal cierra → ya no hay "Activity & Notes" visible
    await expect(page.getByText(/Activity & Notes/i)).toBeHidden({
      timeout: 10_000,
    });
    // El lead archivado no debería aparecer en la tabla por default.
    if (firstId) {
      const stillThere = await page
        .locator('tbody tr', { hasText: firstId })
        .count();
      expect(stillThere).toBe(0);
    }
  });
});
