import { test, expect } from '@playwright/test';

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

test('admin ve la cola de verificación y aprueba un registro pendiente', async ({
  page,
  browser,
}) => {
  const email = `e2e-verif-${Date.now()}@test.example.com`;

  // 1) Crear un abogado pendiente en un contexto anónimo.
  const anon = await browser.newContext({ storageState: undefined });
  const anonPage = await anon.newPage();
  await anonPage.goto('/signup');
  await anonPage.locator('#signup-email').fill(email);
  await anonPage.locator('#signup-password').fill('T3st!ng_S3cure_2026#');
  await anonPage.getByRole('button', { name: 'Next' }).click();
  await anonPage.locator('#signup-firstName').fill('Queue');
  await anonPage.locator('#signup-lastName').fill('Case');
  await anonPage.locator('#signup-phone').fill('+1 555 010 2026');
  await anonPage.locator('#signup-license').fill('QUEUE-0001');
  await anonPage.locator('#signup-firm').fill('Queue Firm');
  await anonPage.getByRole('button', { name: 'Next' }).click();
  await anonPage
    .locator('#signup-file')
    .setInputFiles({ name: 'license.png', mimeType: 'image/png', buffer: PNG_1x1 });
  await anonPage.getByRole('button', { name: /Create account/i }).click();
  await expect(
    anonPage.getByRole('heading', { name: /Registration received/i })
  ).toBeVisible({ timeout: 30_000 });
  await anon.close();

  // 2) Como admin (storageState del config principal), abrir la cola.
  await page.goto('/lawyer-management/verification');
  const row = page.getByRole('row', { name: new RegExp(email, 'i') });
  await expect(row).toBeVisible({ timeout: 15_000 });

  // 3) Aprobar y confirmar que la fila desaparece.
  await row.getByRole('button', { name: /Approve/i }).click();
  await expect(page.getByText(/approved/i)).toBeVisible();
  await expect(
    page.getByRole('row', { name: new RegExp(email, 'i') })
  ).toHaveCount(0);
});
