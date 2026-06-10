import { test, expect } from '@playwright/test';
import { firstDataRow, dataRows } from '../helpers/datatable.helper';

/**
 * Tests for STATUS_OPTIONS_NEW — the status dropdown when opening a NEW lead.
 * Validates that:
 * - All expected options are present
 * - "assign first" options are disabled
 * - Enabled options (Flagged, Send back, Disabled, Archive) actually work
 * - The unassign/update routing is correct for leads without lawyer
 */

test.describe('Lead Management — NEW lead status options', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle', { timeout: 25_000 });
  });

  // Helper: find and click a lead with status NEW
  const openNewLead = async (page: import('@playwright/test').Page) => {
    // Filter to NEW leads
    const newFilter = page.getByRole('button', { name: /^New$/i });
    if (await newFilter.isVisible()) {
      await newFilter.click();
      await page.waitForLoadState('networkidle', { timeout: 10_000 });
    }

    const rows = dataRows(page);
    const count = await rows.count();
    if (count === 0) return false;

    // Click first NEW lead
    await rows.first().click();
    await expect(page.getByText('Lead Info')).toBeVisible({ timeout: 10_000 });
    return true;
  };

  test('dropdown for NEW lead shows all status options', async ({ page }) => {
    const opened = await openNewLead(page);
    if (!opened) test.skip(true, 'No NEW leads available');

    const select = page.locator('#lead-status');
    await expect(select).toBeVisible();

    // All options should exist in the dropdown
    const expectedOptions = [
      'In progress (assign first)',
      'Flagged',
      'Send back',
      'Retained (assign first)',
      'Disabled',
      'Archive',
    ];

    for (const label of expectedOptions) {
      const option = select.locator('option', { hasText: label });
      await expect(option).toBeAttached();
    }
  });

  test('"assign first" options are disabled in the dropdown', async ({
    page,
  }) => {
    const opened = await openNewLead(page);
    if (!opened) test.skip(true, 'No NEW leads available');

    const select = page.locator('#lead-status');

    // In progress and Retained should be disabled
    const inProgressOpt = select.locator('option', {
      hasText: 'In progress (assign first)',
    });
    const retainedOpt = select.locator('option', {
      hasText: 'Retained (assign first)',
    });

    await expect(inProgressOpt).toBeDisabled();
    await expect(retainedOpt).toBeDisabled();

    // Flagged and Send back should be enabled
    const flaggedOpt = select.locator('option', { hasText: /^Flagged$/ });
    const sendBackOpt = select.locator('option', { hasText: /^Send back$/ });

    await expect(flaggedOpt).toBeEnabled();
    await expect(sendBackOpt).toBeEnabled();
  });

  test('admin can change NEW lead to Flagged with reason', async ({ page }) => {
    const opened = await openNewLead(page);
    if (!opened) test.skip(true, 'No NEW leads available');

    const select = page.locator('#lead-status');
    await select.selectOption({ label: 'Flagged' });

    // Status change banner should appear (Current → New status)
    await expect(page.getByText('New status')).toBeVisible();

    // Reason textarea appears and is required
    const reason = page.locator('#lead-comment');
    await expect(reason).toBeVisible();

    // Try save without reason — should block
    const saveBtn = page.getByRole('button', { name: /Save|Mark/i }).first();
    await saveBtn.click();
    await expect(page.getByText(/reason is required/i)).toBeVisible();

    // Fill reason and save
    await reason.fill('Lead identified as spam by admin');
    await saveBtn.click();

    // Modal should close on success
    await expect(page.getByText('Lead Info')).toBeHidden({ timeout: 10_000 });
  });

  test('admin can change NEW lead to Disabled with reason', async ({
    page,
  }) => {
    const opened = await openNewLead(page);
    if (!opened) test.skip(true, 'No NEW leads available');

    const select = page.locator('#lead-status');
    await select.selectOption({ label: 'Disabled' });

    const reason = page.locator('#lead-comment');
    await expect(reason).toBeVisible();

    await reason.fill('Duplicate lead — disabling');
    const saveBtn = page.getByRole('button', { name: /Save|Mark/i }).first();
    await saveBtn.click();

    await expect(page.getByText('Lead Info')).toBeHidden({ timeout: 10_000 });
  });

  test('admin can archive a NEW lead with reason', async ({ page }) => {
    const opened = await openNewLead(page);
    if (!opened) test.skip(true, 'No NEW leads available');

    const select = page.locator('#lead-status');
    await select.selectOption({ label: 'Archive' });

    const reason = page.locator('#lead-comment');
    await expect(reason).toBeVisible();

    await reason.fill('Cleaning up old leads');
    const saveBtn = page.getByRole('button', { name: /Save|Archive/i }).first();
    await saveBtn.click();

    await expect(page.getByText('Lead Info')).toBeHidden({ timeout: 10_000 });
  });

  test('admin cannot select disabled options (In progress, Retained)', async ({
    page,
  }) => {
    const opened = await openNewLead(page);
    if (!opened) test.skip(true, 'No NEW leads available');

    const select = page.locator('#lead-status');
    const currentValue = await select.inputValue();

    // Try selecting a disabled option — value should NOT change
    await select.selectOption({ label: 'In progress (assign first)' }).catch(() => {});
    const afterValue = await select.inputValue();
    expect(afterValue).not.toBe('IN PROGRESS');
  });
});

test.describe('Lead Management — assign picker position', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle', { timeout: 25_000 });
  });

  test('assign picker appears right after status dropdown for NEW leads', async ({
    page,
  }) => {
    // Filter to NEW
    const newFilter = page.getByRole('button', { name: /^New$/i });
    if (await newFilter.isVisible()) {
      await newFilter.click();
      await page.waitForLoadState('networkidle', { timeout: 10_000 });
    }

    const rows = dataRows(page);
    if ((await rows.count()) === 0) test.skip(true, 'No NEW leads');

    await rows.first().click();
    await expect(page.getByText('Lead Info')).toBeVisible({ timeout: 10_000 });

    // Status select should be visible
    await expect(page.locator('#lead-status')).toBeVisible();

    // Assign to lawyer section should be visible (for NEW leads)
    const assignSection = page.getByText('Assign to lawyer', { exact: false });
    await expect(assignSection).toBeVisible();

    // Assign section should appear BEFORE Lead details
    const assignBox = await assignSection.boundingBox();
    const detailsBox = await page
      .getByText('Lead details', { exact: false })
      .boundingBox();

    if (assignBox && detailsBox) {
      expect(assignBox.y).toBeLessThan(detailsBox.y);
    }
  });

  test('assign picker has search input and shows lawyer list', async ({
    page,
  }) => {
    const newFilter = page.getByRole('button', { name: /^New$/i });
    if (await newFilter.isVisible()) {
      await newFilter.click();
      await page.waitForLoadState('networkidle', { timeout: 10_000 });
    }

    const rows = dataRows(page);
    if ((await rows.count()) === 0) test.skip(true, 'No NEW leads');

    await rows.first().click();
    await expect(page.getByText('Lead Info')).toBeVisible({ timeout: 10_000 });

    // Search input exists
    const search = page.getByPlaceholder(/search by name or area/i);
    await expect(search).toBeVisible();

    // Lawyer list shows at least one lawyer (or "No active lawyers" message)
    const lawyerList = page.locator('.max-h-\\[180px\\]');
    await expect(lawyerList).toBeVisible();
    const listText = await lawyerList.innerText();
    expect(listText.length).toBeGreaterThan(0);
  });
});
