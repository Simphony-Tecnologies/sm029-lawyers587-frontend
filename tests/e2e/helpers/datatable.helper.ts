import type { Locator, Page } from '@playwright/test';

/**
 * El DataTable del DS usa CSS Grid en vez de <table>, así que los rows
 * son <div role="row">. Estos helpers abstraen eso para los tests.
 *
 * El header también tiene role="row", así que filtramos los que tienen
 * checkboxes / contenido propio de data row.
 */

export function dataRows(page: Page): Locator {
  // Rows de data: el header NO tiene la clase min-h-[52px].
  return page.locator('[role="row"].min-h-\\[52px\\]');
}

export function firstDataRow(page: Page): Locator {
  return dataRows(page).first();
}

export function rowCheckbox(page: Page, rowIndex = 0): Locator {
  return dataRows(page)
    .nth(rowIndex)
    .getByRole('checkbox', { name: /select row/i });
}
