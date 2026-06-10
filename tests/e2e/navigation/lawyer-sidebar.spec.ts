import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';

// Lawyer sidebar restructure — validates the new sub-items and navigation.
test.use({ storageState: { cookies: [], origins: [] } });
test.skip(
  !process.env.E2E_LAWYER_EMAIL || !process.env.E2E_LAWYER_PASSWORD,
  'E2E_LAWYER_EMAIL / E2E_LAWYER_PASSWORD not configured'
);

test.describe('Lawyer — sidebar structure', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'lawyer');
  });

  test('My Workflow dropdown is open by default', async ({ page }) => {
    // Sub-items should be visible without clicking to expand
    await expect(page.getByText('My Active Leads')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Flagged Leads')).toBeVisible();
    await expect(page.getByText('Retained Leads')).toBeVisible();
  });

  test('sidebar shows correct lawyer labels', async ({ page }) => {
    const sidebar = page.locator('aside, nav').first();

    // New labels
    await expect(sidebar.getByText('My Workflow')).toBeVisible();
    await expect(sidebar.getByText('My Active Leads')).toBeVisible();
    await expect(sidebar.getByText('Lead Pool')).toBeVisible();

    // Old labels should NOT exist
    await expect(sidebar.getByText('All Leads', { exact: true })).not.toBeVisible();
    await expect(sidebar.getByText('New Leads', { exact: true })).not.toBeVisible();
  });

  test('Lead Pool shows numeric badge', async ({ page }) => {
    const poolItem = page.getByText('Lead Pool').locator('..');
    // Badge should contain a number
    const badge = poolItem.locator('span', { hasText: /^\d+$/ });
    await expect(badge).toBeVisible({ timeout: 10_000 });
    const count = await badge.innerText();
    expect(Number(count)).toBeGreaterThanOrEqual(0);
  });

  test('Waiting on Client is disabled with "Soon" badge', async ({ page }) => {
    const waitingItem = page.getByText('Waiting on Client');
    await expect(waitingItem).toBeVisible();

    // Should be a disabled button
    const button = waitingItem.locator('..');
    await expect(button).toBeDisabled();

    // "Soon" badge visible
    await expect(button.getByText('Soon')).toBeVisible();
  });

  test('clicking My Active Leads navigates to /all-leads', async ({
    page,
  }) => {
    await page.getByText('My Active Leads').click();
    await page.waitForURL(/\/all-leads/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/all-leads/);
  });

  test('clicking Flagged Leads navigates to /all-leads with filter', async ({
    page,
  }) => {
    await page.getByText('Flagged Leads').click();
    await page.waitForURL(/\/all-leads/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/all-leads/);

    // Wait for table to load
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // If there are flagged leads, they should have the Flagged status pill
    const rows = page.locator('[role="row"]');
    const rowCount = await rows.count();
    if (rowCount > 1) {
      // Header row + at least 1 data row
      const statusPills = page.locator('[class*="StatusPill"], [class*="status"]');
      // All visible pills should be "Flagged" (filtered)
      const pillTexts = await statusPills.allInnerTexts();
      for (const t of pillTexts) {
        if (t.trim()) {
          expect(t.trim()).toMatch(/flagged/i);
        }
      }
    }
  });

  test('clicking Retained Leads navigates to /all-leads with filter', async ({
    page,
  }) => {
    await page.getByText('Retained Leads').click();
    await page.waitForURL(/\/all-leads/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/all-leads/);
  });

  test('clicking Waiting on Client does NOT navigate (disabled)', async ({
    page,
  }) => {
    const currentUrl = page.url();
    await page.getByText('Waiting on Client').click({ force: true });
    // URL should not change
    expect(page.url()).toBe(currentUrl);
  });
});
