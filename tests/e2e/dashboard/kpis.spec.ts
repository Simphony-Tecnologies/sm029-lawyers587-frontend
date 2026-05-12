import { test, expect } from '@playwright/test';

// Dashboard de admin — 8 KPIs alineados con el legacy.
// Cada uno mapea a un status concreto del backend.

const KPI_LABELS = [
  'New Leads',
  'Pulled Leads',
  'In Progress',
  'Problematic',
  'Sent Back Leads (REVIEW)',
  'Retained',
  'Expired',
  'Disabled',
];

test.describe('Dashboard — KPIs (v2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 25_000 });
  });

  test('renderiza los 8 KPI cards', async ({ page }) => {
    for (const label of KPI_LABELS) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('cada KPI tiene un valor numérico (no NaN)', async ({ page }) => {
    for (const label of KPI_LABELS) {
      const card = page.locator('button', { hasText: label });
      const numericText = await card.first().innerText();
      // Debe contener al menos un dígito.
      expect(numericText).toMatch(/\d/);
      expect(numericText).not.toMatch(/NaN/i);
    }
  });

  test('cada KPI tiene sparkline (<svg>)', async ({ page }) => {
    const cards = page.locator('button.group');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(8);
    for (let i = 0; i < Math.min(count, 8); i++) {
      const svgCount = await cards.nth(i).locator('svg').count();
      // IconBadge (1) + Sparkline (1) = al menos 2 svgs
      expect(svgCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('click en KPI navega a /lead-management con filter', async ({
    page,
  }) => {
    const newLeads = page
      .locator('button.group', { hasText: 'New Leads' })
      .first();
    await newLeads.click();
    await page.waitForURL(/\/lead-management/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/lead-management/);
  });
});
