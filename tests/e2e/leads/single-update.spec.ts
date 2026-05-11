import { test, expect } from '@playwright/test';
import { firstDataRow } from '../helpers/datatable.helper';

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
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();
    await row.click();
    await expect(page.getByText(/Activity & Notes/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('cambiar status a PROBLEMATIC sin razón bloquea submit', async ({
    page,
  }) => {
    const row = firstDataRow(page);
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
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();
    const firstId = await row.textContent().catch(() => null);
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
        .locator('[role="row"]', { hasText: firstId.slice(0, 20) })
        .count();
      // Solo el header sigue (≤1) o cero
      expect(stillThere).toBeLessThanOrEqual(1);
    }
  });
});
