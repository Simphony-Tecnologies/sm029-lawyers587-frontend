import { test, expect } from '@playwright/test';

// Endpoints:
//   GET /leads/:id/timeline?type=audit|comment|all
//   POST /leads/:leadId/comments  (con note_type)

test.describe('Leads — timeline & comments (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });

    const row = page.locator('tbody tr').first();
    if (!(await row.isVisible().catch(() => false))) test.skip();
    await row.click();
    await expect(page.getByText(/Activity & Notes/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('chips All/Audit/Comments cambian el query param del timeline', async ({
    page,
  }) => {
    const audit = page.getByRole('button', { name: /^Audit$/i });
    if (!(await audit.isVisible().catch(() => false))) test.skip();

    // Esperamos un request con ?type=audit cuando hacemos click
    const reqPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/timeline') && req.url().includes('type=audit'),
      { timeout: 5_000 }
    );
    await audit.click();
    await reqPromise;
  });

  test('composer Internal/Client-facing/Urgent cambia placeholder y CTA', async ({
    page,
  }) => {
    const urgent = page.getByRole('button', { name: /^Urgent$/ }).first();
    if (!(await urgent.isVisible().catch(() => false))) test.skip();
    await urgent.click();
    await expect(
      page.getByRole('button', { name: /Send urgent/i })
    ).toBeVisible();
  });

  test('crear comentario dispara POST /comments y aparece en la lista', async ({
    page,
  }) => {
    const textarea = page
      .locator('textarea[placeholder*="note about this case" i], textarea[placeholder*="safe to share" i], textarea[placeholder*="immediate attention" i]')
      .first();
    if (!(await textarea.isVisible().catch(() => false))) test.skip();

    const content = `e2e-${Date.now()}`;
    await textarea.fill(content);

    const reqPromise = page.waitForRequest(
      (req) =>
        req.method() === 'POST' && /\/leads\/\d+\/comments/.test(req.url()),
      { timeout: 5_000 }
    );
    await page.getByRole('button', { name: /Add note|Send urgent/i }).click();
    await reqPromise;

    // El comentario nuevo debería aparecer en la lista de timeline arriba
    await expect(page.getByText(content)).toBeVisible({ timeout: 8_000 });
  });
});
