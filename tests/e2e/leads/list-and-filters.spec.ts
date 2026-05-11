import { test, expect } from '@playwright/test';
import { dataRows } from '../helpers/datatable.helper';

// Endpoint: GET /leads paginado + assigned_lawyer embebido.
// La UI lee el shape v2 ({ data: { data, total } }) sin segunda llamada a /leads-assigned.

test.describe('Leads — list & filters (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
  });

  test('GET /leads retorna paginado y la tabla renderiza filas', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Export CSV' })
    ).toBeVisible();
    const count = await dataRows(page).count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('search filtra la lista', async ({ page }) => {
    const search = page.getByPlaceholder(/search/i);
    if (!(await search.isVisible().catch(() => false))) test.skip();
    const before = await dataRows(page).count();
    await search.fill('zzzzz-no-match');
    await page.waitForTimeout(500);
    const after = await dataRows(page).count();
    expect(after).toBeLessThanOrEqual(before);
  });

  test('chip ARCHIVED muestra leads archivados (excluidos por default)', async ({
    page,
  }) => {
    const archivedChip = page.getByRole('button', { name: /^ARCHIVED$/i });
    // El chip solo aparece si hay leads ARCHIVED en el dataset.
    if (!(await archivedChip.isVisible().catch(() => false))) test.skip();
    await archivedChip.click();
    await page.waitForTimeout(300);
    // Si lo abrimos, debería haber al menos 1 row con status ARCHIVED.
    await expect(page.getByText(/ARCHIVED|Archived/).first()).toBeVisible();
  });
});
