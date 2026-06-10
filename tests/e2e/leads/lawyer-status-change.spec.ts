import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';
import { firstDataRow } from '../helpers/datatable.helper';

/**
 * BUG: Lawyers cannot change lead status.
 *
 * The AllLeads page (lawyer view) calls `PUT /leads/:id` with `{ status }`,
 * but the backend rejects it with:
 *   "Role 'lawyer' cannot modify field 'status' on lead"
 *
 * This blocks ALL status transitions from the lawyer view:
 *   - In Progress, Waiting on Client, Flagged, Send back, Retained
 *
 * Root cause: PUT /leads/:id has role-based field restrictions.
 * Fix needed: backend must either:
 *   (a) Allow lawyers to modify `status` on their own assigned leads, or
 *   (b) Expose a dedicated PATCH /leads/:id/status endpoint for lawyers
 *
 * These tests are written to PASS once the backend fix is deployed.
 * Until then, they document the broken behavior.
 */

// Lawyer tests: clear admin auth, login as lawyer.
test.use({ storageState: { cookies: [], origins: [] } });
test.skip(
  !process.env.E2E_LAWYER_EMAIL || !process.env.E2E_LAWYER_PASSWORD,
  'E2E_LAWYER_EMAIL / E2E_LAWYER_PASSWORD no configurados'
);

test.describe('Lawyer — lead status change (BUG: blocked by backend)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'lawyer');
    await page.goto('/all-leads');
    await page.waitForLoadState('networkidle', { timeout: 20_000 });
  });

  test('lawyer puede abrir modal de un lead asignado', async ({ page }) => {
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();
    await row.click();
    await expect(
      page.getByText(/Activity & Notes/i).or(page.getByText(/Lead details/i))
    ).toBeVisible({ timeout: 10_000 });
  });

  test('lawyer puede cambiar status a "In Progress" sin error del backend', async ({
    page,
  }) => {
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();

    // Capture API responses to detect the backend rejection
    const apiErrors: { url: string; status: number; body: string }[] = [];
    page.on('response', async (res) => {
      if (res.url().includes('/leads/') && res.status() >= 400) {
        const body = await res.text().catch(() => '');
        apiErrors.push({ url: res.url(), status: res.status(), body });
      }
    });

    await row.click();
    await expect(
      page.getByText(/Activity & Notes/i).or(page.getByText(/Lead details/i))
    ).toBeVisible({ timeout: 10_000 });

    // Change status
    const select = page.locator('#lead-status');
    const hasInProgress = await select
      .locator('option', { hasText: /In progress/i })
      .count();
    if (hasInProgress === 0) test.skip();
    await select.selectOption({ label: 'In progress' });

    // Fill required reason
    const textarea = page.locator('#lead-comment');
    if (await textarea.isVisible()) {
      await textarea.fill('E2E test: transitioning to In Progress');
    }

    // Submit
    const saveBtn = page.getByRole('button', { name: /Save|Update|Mark/i });
    await saveBtn.click();

    // Wait for response
    await page.waitForTimeout(3_000);

    // BUG CHECK: backend should NOT return 400/403 with role restriction
    const roleError = apiErrors.find(
      (e) =>
        e.body.includes('cannot modify field') ||
        e.body.includes('Role') ||
        e.status === 403
    );
    expect(
      roleError,
      `Backend rejected lawyer status change: ${roleError?.body ?? 'unknown'}`
    ).toBeUndefined();

    // Success: toast should show and modal should close
    await expect(
      page
        .getByText(/updated successfully/i)
        .or(page.getByText(/Lead information updated/i))
    ).toBeVisible({ timeout: 5_000 });
  });

  test('lawyer puede cambiar status a "Waiting on Client" con razon obligatoria', async ({
    page,
  }) => {
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();

    const apiErrors: { url: string; status: number; body: string }[] = [];
    page.on('response', async (res) => {
      if (res.url().includes('/leads/') && res.status() >= 400) {
        const body = await res.text().catch(() => '');
        apiErrors.push({ url: res.url(), status: res.status(), body });
      }
    });

    await row.click();
    await expect(
      page.getByText(/Activity & Notes/i).or(page.getByText(/Lead details/i))
    ).toBeVisible({ timeout: 10_000 });

    // Change status to Waiting on Client
    const select = page.locator('#lead-status');
    const hasWaiting = await select
      .locator('option', { hasText: /Waiting on Client/i })
      .count();
    if (hasWaiting === 0) {
      test.fail(
        true,
        'WAITING_ON_CLIENT option not available in lawyer status dropdown'
      );
      return;
    }
    await select.selectOption({ label: 'Waiting on Client' });

    // Submit WITHOUT reason — should be blocked by frontend validation
    const saveBtn = page.getByRole('button', { name: /Save|Update|Mark/i });
    await saveBtn.click();
    await expect(
      page.getByText(/reason is required/i)
    ).toBeVisible({ timeout: 5_000 });

    // Fill reason and retry
    const textarea = page.locator('#lead-comment');
    await textarea.fill('E2E test: client has not responded yet');
    await saveBtn.click();

    // Wait for response
    await page.waitForTimeout(3_000);

    // BUG CHECK
    const roleError = apiErrors.find(
      (e) =>
        e.body.includes('cannot modify field') ||
        e.body.includes('Role') ||
        e.status === 403
    );
    expect(
      roleError,
      `Backend rejected lawyer WAITING_ON_CLIENT change: ${roleError?.body ?? 'unknown'}`
    ).toBeUndefined();

    await expect(
      page
        .getByText(/updated successfully/i)
        .or(page.getByText(/Lead information updated/i))
    ).toBeVisible({ timeout: 5_000 });
  });

  test('lawyer puede marcar lead como "Flagged" con razon obligatoria', async ({
    page,
  }) => {
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();

    const apiErrors: { url: string; status: number; body: string }[] = [];
    page.on('response', async (res) => {
      if (res.url().includes('/leads/') && res.status() >= 400) {
        const body = await res.text().catch(() => '');
        apiErrors.push({ url: res.url(), status: res.status(), body });
      }
    });

    await row.click();
    await expect(
      page.getByText(/Activity & Notes/i).or(page.getByText(/Lead details/i))
    ).toBeVisible({ timeout: 10_000 });

    const select = page.locator('#lead-status');
    const hasFlagged = await select
      .locator('option', { hasText: /Flagged/i })
      .count();
    if (hasFlagged === 0) test.skip();
    await select.selectOption({ label: 'Flagged' });

    // Reason required
    const textarea = page.locator('#lead-comment');
    await textarea.fill('E2E test: lead is flagged for review');

    const saveBtn = page.getByRole('button', { name: /Save|Update|Mark/i });
    await saveBtn.click();
    await page.waitForTimeout(3_000);

    const roleError = apiErrors.find(
      (e) =>
        e.body.includes('cannot modify field') ||
        e.body.includes('Role') ||
        e.status === 403
    );
    expect(
      roleError,
      `Backend rejected lawyer Flagged change: ${roleError?.body ?? 'unknown'}`
    ).toBeUndefined();
  });

  test('lawyer puede hacer "Send back" de un lead', async ({ page }) => {
    const row = firstDataRow(page);
    if (!(await row.isVisible().catch(() => false))) test.skip();

    const apiErrors: { url: string; status: number; body: string }[] = [];
    page.on('response', async (res) => {
      if (res.url().includes('/leads/') && res.status() >= 400) {
        const body = await res.text().catch(() => '');
        apiErrors.push({ url: res.url(), status: res.status(), body });
      }
    });

    await row.click();
    await expect(
      page.getByText(/Activity & Notes/i).or(page.getByText(/Lead details/i))
    ).toBeVisible({ timeout: 10_000 });

    const select = page.locator('#lead-status');
    const hasSendBack = await select
      .locator('option', { hasText: /Send back/i })
      .count();
    if (hasSendBack === 0) test.skip();
    await select.selectOption({ label: 'Send back' });

    const textarea = page.locator('#lead-comment');
    await textarea.fill('E2E test: sending lead back');

    const saveBtn = page.getByRole('button', { name: /Save|Update|Mark/i });
    await saveBtn.click();
    await page.waitForTimeout(3_000);

    // Send back uses /unassign endpoint — may work even if PUT is blocked
    const roleError = apiErrors.find(
      (e) =>
        e.body.includes('cannot modify field') ||
        e.body.includes('Role') ||
        e.status === 403
    );
    expect(
      roleError,
      `Backend rejected lawyer Send back: ${roleError?.body ?? 'unknown'}`
    ).toBeUndefined();
  });
});
