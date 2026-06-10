import { test, expect } from '@playwright/test';
import { loginAs, logout } from '../helpers/auth.helper';
import { TEST_USERS } from '../fixtures/test-data';

/**
 * E2E specification tests for the 10 audit items.
 *
 * Items marked [CURRENT] validate existing behavior.
 * Items marked [SPEC] define expected behavior for features not yet implemented
 * — they will fail until the feature is built. Use test.fixme() to skip them
 * while still documenting the requirement.
 */

// ─────────────────────────────────────────────────────────────
// 1. Token expiration & 401 handling
// ─────────────────────────────────────────────────────────────
test.describe('[ITEM-01] Token expiration & 401 handling', () => {
  test('[CURRENT] clearing cookie redirects to login on reload', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/dashboard/);

    // Simulate expired token by clearing cookies
    await page.context().clearCookies();
    await page.reload();

    await expect(page).toHaveURL(/^\/$/, { timeout: 10_000 });
  });

  test.fixme(
    '[SPEC] 401 API response triggers automatic logout and redirect',
    async ({ page }) => {
      // When backend returns 401 on any API call, the frontend should:
      // 1. Show a toast "Session expired, please login again"
      // 2. Clear the cookie
      // 3. Redirect to /
      await page.goto('/dashboard');
      await page.route('**/leads**', (route) =>
        route.fulfill({ status: 401, body: '{"message":"Unauthorized"}' })
      );
      await page.reload();

      await expect(page.getByText(/session expired|sesión expirada/i)).toBeVisible();
      await expect(page).toHaveURL(/^\/$/, { timeout: 10_000 });
    }
  );

  test.fixme(
    '[SPEC] token refresh happens transparently before expiry',
    async ({ page }) => {
      // When the JWT is close to expiring (e.g., 5 min left),
      // the frontend should silently refresh it via /auth/refresh
      // without interrupting the user.
      await page.goto('/dashboard');

      const refreshCalled = page.waitForRequest((req) =>
        req.url().includes('/auth/refresh')
      );
      // Simulate near-expiry token — implementation will handle this
      // For now, this documents the expected behavior.
      await expect(refreshCalled).resolves.toBeTruthy();
    }
  );
});

// ─────────────────────────────────────────────────────────────
// 2. KPI cards for new states (In Progress / Waiting on Client)
// ─────────────────────────────────────────────────────────────
test.describe('[ITEM-02] KPI cards — new states', () => {
  test('[CURRENT] admin dashboard renders 8 KPI cards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 25_000 });

    const existingLabels = [
      'New Leads',
      'Pulled Leads',
      'In Progress',
      'Flagged',
      'Sent Back Leads (REVIEW)',
      'Retained',
      'Expired',
      'Disabled',
    ];
    for (const label of existingLabels) {
      await expect(page.getByText(label, { exact: false })).toBeVisible();
    }
  });

  test.fixme(
    '[SPEC] admin dashboard shows Waiting on Client KPI card',
    async ({ page }) => {
      // After backend adds WAITING_ON_CLIENT state:
      // A new KPI card should appear with label "Waiting on Client"
      // and filter leads by that status on click
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Waiting on Client')).toBeVisible();

      const card = page.locator('button.group', {
        hasText: 'Waiting on Client',
      });
      const text = await card.first().innerText();
      expect(text).toMatch(/\d/);
      expect(text).not.toMatch(/NaN/i);
    }
  );

  test.fixme(
    '[SPEC] lawyer dashboard shows Waiting on Client KPI card',
    async ({ page }) => {
      await logout(page);
      await loginAs(page, 'lawyer');
      await page.goto('/dash-lawyers');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Waiting on Client')).toBeVisible();
    }
  );
});

// ─────────────────────────────────────────────────────────────
// 3. Pending Lawyer Action event capture
// ─────────────────────────────────────────────────────────────
test.describe('[ITEM-03] Pending Lawyer Action event', () => {
  test.fixme(
    '[SPEC] timeline shows Pending Lawyer Action event when backend emits it',
    async ({ page }) => {
      // After backend creates the PENDING_LAWYER_ACTION intermediate state:
      // - The lead timeline should show a "Pending Lawyer Action" event
      // - This event appears automatically when the system triggers it
      // - The frontend only needs to render it, not trigger it
      await page.goto('/lead-management');
      await page.waitForLoadState('networkidle');

      // Open a lead that has the pending action event
      const firstRow = page.locator('[role="row"]').nth(1);
      await firstRow.click();

      // Check timeline renders the event
      await expect(
        page.getByText(/pending lawyer action/i)
      ).toBeVisible({ timeout: 10_000 });
    }
  );
});

// ─────────────────────────────────────────────────────────────
// 4. Rename Pending → Waiting on Client
// ─────────────────────────────────────────────────────────────
test.describe('[ITEM-04] Rename Pending → Waiting on Client', () => {
  test.fixme(
    '[SPEC] no UI element shows "Pending" label — all say "Waiting on Client"',
    async ({ page }) => {
      // After the rename:
      // - StatusPill should show "Waiting on Client" not "Pending"
      // - Filter buttons should say "Waiting on Client"
      // - KPI cards should say "Waiting on Client"
      // - No occurrence of bare "Pending" as a status label
      await page.goto('/lead-management');
      await page.waitForLoadState('networkidle');

      // Check that "Pending" does not appear as a status label
      const filterBar = page.locator('[class*="filter"], [class*="Filter"]');
      const filterText = await filterBar.allInnerTexts();
      for (const txt of filterText) {
        expect(txt).not.toMatch(/\bPending\b/);
      }

      // "Waiting on Client" should be present if leads have that status
      // (depends on data — this just validates the label exists in the UI)
    }
  );
});

// ─────────────────────────────────────────────────────────────
// 5. Assignment select dropdown UX
// ─────────────────────────────────────────────────────────────
test.describe('[ITEM-05] Assignment select dropdown', () => {
  test('[CURRENT] admin can see LawyerPicker in bulk assign dialog', async ({
    page,
  }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle');

    // Select a row
    const checkbox = page
      .locator('[role="row"]')
      .nth(1)
      .getByRole('checkbox')
      .first();
    if (await checkbox.isVisible()) {
      await checkbox.check();

      // Click "Assign to" in bulk bar
      const assignBtn = page.getByRole('button', { name: /assign to/i });
      if (await assignBtn.isVisible()) {
        await assignBtn.click();

        // LawyerPicker should show search and lawyer list
        await expect(
          page.getByPlaceholder(/search|buscar/i).last()
        ).toBeVisible();
      }
    }
  });

  test.fixme(
    '[SPEC] LawyerPicker shows full lawyer list immediately on open without requiring search',
    async ({ page }) => {
      // When the assign dropdown opens, lawyers should be visible immediately
      // without the user needing to type anything in the search box.
      await page.goto('/lead-management');
      await page.waitForLoadState('networkidle');

      const checkbox = page
        .locator('[role="row"]')
        .nth(1)
        .getByRole('checkbox')
        .first();
      await checkbox.check();

      const assignBtn = page.getByRole('button', { name: /assign to/i });
      await assignBtn.click();

      // Lawyer options should be immediately visible (not hidden behind search)
      const lawyerOptions = page.locator('[class*="lawyer"], [role="option"]');
      const count = await lawyerOptions.count();
      expect(count).toBeGreaterThan(0);
    }
  );
});

// ─────────────────────────────────────────────────────────────
// 6. Tab filters → Sidebar migration
// ─────────────────────────────────────────────────────────────
test.describe('[ITEM-06] Sidebar navigation replacing tab filters', () => {
  test('[CURRENT] lead-management has tab filter buttons', async ({
    page,
  }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle');

    // Current behavior: inline FilterButton components exist
    const allFilter = page.getByRole('button', { name: /^All$/i });
    await expect(allFilter).toBeVisible();
  });

  test.fixme(
    '[SPEC] sidebar has sub-items per lead status (replacing tabs)',
    async ({ page }) => {
      // After migration:
      // - The sidebar under "Leads" should have sub-items for each status
      // - Clicking a sub-item navigates to a filtered view
      // - No tab filters should exist in the lead-management page
      await page.goto('/lead-management');
      await page.waitForLoadState('networkidle');

      const sidebar = page.locator('aside, nav').first();
      const statusItems = [
        'New',
        'In Progress',
        'Flagged',
        'Closed',
        'Expired',
      ];
      for (const status of statusItems) {
        await expect(sidebar.getByText(status)).toBeVisible();
      }

      // Tab filters should NOT exist
      const tabFilters = page.locator('button', { hasText: /^All$/i });
      await expect(tabFilters).not.toBeVisible();
    }
  );
});

// ─────────────────────────────────────────────────────────────
// 7. New Leads → Lead Pool rename + badge
// ─────────────────────────────────────────────────────────────
test.describe('[ITEM-07] Lead Pool rename with badge counter', () => {
  test('[CURRENT] sidebar says "New Leads" for lawyer role', async ({
    page,
  }) => {
    await logout(page);
    await loginAs(page, 'lawyer');

    const sidebar = page.locator('aside, nav').first();
    await expect(sidebar.getByText('New Leads')).toBeVisible();
  });

  test.fixme(
    '[SPEC] sidebar says "Lead Pool" with numeric badge showing available count',
    async ({ page }) => {
      await logout(page);
      await loginAs(page, 'lawyer');

      const sidebar = page.locator('aside, nav').first();

      // Label should be "Lead Pool" not "New Leads"
      await expect(sidebar.getByText('Lead Pool')).toBeVisible();
      await expect(sidebar.getByText('New Leads')).not.toBeVisible();

      // Badge with count should exist
      const poolLink = sidebar.locator('a, [role="link"]', {
        hasText: 'Lead Pool',
      });
      const badge = poolLink.locator('[class*="badge"], span');
      await expect(badge).toBeVisible();
      const badgeText = await badge.last().innerText();
      expect(badgeText).toMatch(/^\d+$/);
    }
  );
});

// ─────────────────────────────────────────────────────────────
// 8. Sidebar label accuracy
// ─────────────────────────────────────────────────────────────
test.describe('[ITEM-08] Sidebar text audit', () => {
  test('[CURRENT] admin sidebar shows correct labels', async ({ page }) => {
    await page.goto('/dashboard');
    const sidebar = page.locator('aside, nav').first();

    await expect(sidebar.getByText('Dashboard')).toBeVisible();
    await expect(sidebar.getByText('Lawyers')).toBeVisible();
    await expect(sidebar.getByText('Leads')).toBeVisible();
  });

  test('[CURRENT] lawyer sidebar shows correct labels', async ({ page }) => {
    await logout(page);
    await loginAs(page, 'lawyer');

    const sidebar = page.locator('aside, nav').first();
    await expect(sidebar.getByText('My workflow')).toBeVisible();
    await expect(sidebar.getByText('All Leads')).toBeVisible();
    await expect(sidebar.getByText('New Leads')).toBeVisible();
  });

  test.fixme(
    '[SPEC] lawyer sidebar labels describe functionality precisely',
    async ({ page }) => {
      // After sidebar text audit:
      // Labels should be updated to better describe lawyer profile features
      // e.g., "My Workflow" → "My Dashboard", "All Leads" → "Assigned Leads",
      //        "New Leads" → "Lead Pool"
      // Exact labels TBD by UX team — this test validates they changed.
      await logout(page);
      await loginAs(page, 'lawyer');

      const sidebar = page.locator('aside, nav').first();
      // Verify updated labels exist (adjust after UX decision)
      await expect(sidebar.getByText('Lead Pool')).toBeVisible();
    }
  );
});

// ─────────────────────────────────────────────────────────────
// 9. Description column truncation / blur
// ─────────────────────────────────────────────────────────────
test.describe('[ITEM-09] Description column truncation', () => {
  test('[CURRENT] description column uses CSS truncate in lead-management', async ({
    page,
  }) => {
    await page.goto('/lead-management');
    await page.waitForLoadState('networkidle');

    // Find the description cell (has class "truncate")
    const descCells = page.locator('span.truncate');
    const count = await descCells.count();
    if (count > 0) {
      const firstDesc = descCells.first();
      const hasOverflow = await firstDesc.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return (
          style.overflow === 'hidden' &&
          style.textOverflow === 'ellipsis' &&
          style.whiteSpace === 'nowrap'
        );
      });
      expect(hasOverflow).toBe(true);
    }
  });

  test.fixme(
    '[SPEC] description column shows multi-line excerpt with fade/blur effect',
    async ({ page }) => {
      // After redesign:
      // - Description should show 2-3 lines max
      // - A gradient fade or blur effect at the bottom
      // - Full text visible on hover or click
      await page.goto('/lead-management');
      await page.waitForLoadState('networkidle');

      const descCells = page.locator('[data-col="description"]');
      const first = descCells.first();

      // Should have multi-line clamping
      const hasClamp = await first.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.webkitLineClamp === '3' || (style as Record<string, string>)['line-clamp'] === '3';
      });
      expect(hasClamp).toBe(true);

      // Should show full text on hover
      await first.hover();
      // Full text tooltip or expanded view appears
    }
  );
});

// ─────────────────────────────────────────────────────────────
// 10. Pie Chart widget for lead status distribution
// ─────────────────────────────────────────────────────────────
test.describe('[ITEM-10] Pie Chart widget', () => {
  test('[CURRENT] no pie chart exists on admin dashboard', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Currently only KPI cards + sparklines + activity panel
    const pieChart = page.locator('svg[class*="pie"], [class*="pie-chart"], canvas');
    await expect(pieChart).not.toBeVisible();
  });

  test.fixme(
    '[SPEC] admin dashboard shows pie chart with lead status distribution',
    async ({ page }) => {
      // After implementation:
      // - A card on the dashboard contains a pie chart
      // - Each slice represents a lead status
      // - Percentages are shown (hover or legend)
      // - Colors match statusColor.ts mapping
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Pie chart renders as SVG or canvas
      const pieChart = page.locator('[data-testid="status-pie-chart"]');
      await expect(pieChart).toBeVisible();

      // Legend should have status labels
      const legend = page.locator('[data-testid="pie-chart-legend"]');
      await expect(legend.getByText('New')).toBeVisible();
      await expect(legend.getByText('In Progress')).toBeVisible();
      await expect(legend.getByText('Closed')).toBeVisible();
    }
  );
});
