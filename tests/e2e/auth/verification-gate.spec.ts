import { test, expect } from '@playwright/test';

// Login siempre desde estado anónimo.
test.use({ storageState: { cookies: [], origins: [] } });

// PNG 1x1 válido para el upload del signup.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);
const uniqueEmail = () => `e2e-gate-${Date.now()}@test.example.com`;
const PASSWORD = 'T3st!ng_S3cure_2026#';

test('cuenta pendiente: el login muestra el mensaje de verificación, no "error password"', async ({
  page,
}) => {
  const email = uniqueEmail();

  // 1) Registrar un abogado nuevo → nace 'pending'.
  await page.goto('/signup');
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('#signup-firstName').fill('Gate');
  await page.locator('#signup-lastName').fill('Probe');
  await page.locator('#signup-phone').fill('+1 555 010 2026');
  await page.locator('#signup-license').fill('GATE-0001');
  await page.locator('#signup-firm').fill('Gate Firm');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('#signup-file').setInputFiles({
    name: 'license.png',
    mimeType: 'image/png',
    buffer: PNG_1x1,
  });
  await page.getByRole('button', { name: /Create account/i }).click();
  await expect(
    page.getByRole('heading', { name: /Registration received/i })
  ).toBeVisible({ timeout: 30_000 });

  // 2) Intentar login con esa cuenta pendiente.
  await page.goto('/');
  await page.getByPlaceholder('Email Address').fill(email);
  await page.getByPlaceholder('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();

  // 3) Debe mostrar el mensaje del backend (pending), no "error password",
  //    y NO navegar al dashboard.
  await expect(page.getByText(/pending verification/i)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/error password/i)).toHaveCount(0);
});
