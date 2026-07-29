import { test, expect, type Page } from '@playwright/test';

// /signup es público (middleware.ts no lo protege). Todos los tests corren
// anónimos, sin el storageState admin del proyecto por defecto.
test.use({ storageState: { cookies: [], origins: [] } });

// PNG 1x1 válido (~68 bytes). El backend lo acepta como image/png real.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Email único por corrida → cada registro real es un abogado nuevo (sin 409).
const uniqueEmail = (): string => `e2e-signup-${Date.now()}@test.example.com`;

const VALID_PASSWORD = 'T3st!ng_S3cure_2026#';

const PROFESSIONAL = {
  firstName: 'E2E',
  lastName: 'Tester',
  phone: '+1 555 010 2026',
  license: 'E2E-LIC-0001',
  firm: 'E2E Test Law Firm',
};

// ─── Helpers de wizard ───────────────────────────────────────────────────────

async function fillAccount(
  page: Page,
  email: string,
  password: string = VALID_PASSWORD
): Promise<void> {
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(password);
}

async function fillProfessional(page: Page): Promise<void> {
  await page.locator('#signup-firstName').fill(PROFESSIONAL.firstName);
  await page.locator('#signup-lastName').fill(PROFESSIONAL.lastName);
  await page.locator('#signup-phone').fill(PROFESSIONAL.phone);
  await page.locator('#signup-license').fill(PROFESSIONAL.license);
  await page.locator('#signup-firm').fill(PROFESSIONAL.firm);
}

async function uploadLicense(
  page: Page,
  file: { name?: string; mimeType?: string; buffer?: Buffer } = {}
): Promise<void> {
  await page.locator('#signup-file').setInputFiles({
    name: file.name ?? 'license.png',
    mimeType: file.mimeType ?? 'image/png',
    buffer: file.buffer ?? PNG_1x1,
  });
}

const clickNext = (page: Page) =>
  page.getByRole('button', { name: 'Next' }).click();

const clickCreate = (page: Page) =>
  page.getByRole('button', { name: /Create account/i }).click();

// Avanza el wizard hasta el paso License (2) con datos válidos.
async function goToLicenseStep(page: Page, email: string): Promise<void> {
  await fillAccount(page, email);
  await clickNext(page);
  await fillProfessional(page);
  await clickNext(page);
  await expect(page.getByText(/Click to upload/i)).toBeVisible();
}

// ─── Navegación y validación (100% cliente, sin backend) ─────────────────────

test.describe('Signup · navegación y validación (cliente)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('carga anónima muestra el paso Account activo', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Create your account/i })
    ).toBeVisible();
    await expect(page.getByText(/Start with your login credentials/i)).toBeVisible();
    await expect(page.locator('#signup-email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  });

  test('Next sin datos no avanza y marca email/password', async ({ page }) => {
    await clickNext(page);

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(
      page.getByText('Password must be at least 8 characters')
    ).toBeVisible();
    // Sigue en Account (no avanzó a Professional).
    await expect(page.locator('#signup-email')).toBeVisible();
    await expect(page.locator('#signup-firstName')).toHaveCount(0);
  });

  test('email con formato inválido es rechazado', async ({ page }) => {
    await fillAccount(page, 'not-an-email');
    await clickNext(page);
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
  });

  test('password menor a 8 caracteres es rechazado', async ({ page }) => {
    await fillAccount(page, uniqueEmail(), '1234567');
    await clickNext(page);
    await expect(
      page.getByText('Password must be at least 8 characters')
    ).toBeVisible();
  });

  test('Account válido avanza a Professional', async ({ page }) => {
    await fillAccount(page, uniqueEmail());
    await clickNext(page);
    await expect(page.locator('#signup-firstName')).toBeVisible();
    await expect(
      page.getByText(/Tell us about your professional profile/i)
    ).toBeVisible();
  });

  test('Back desde Professional conserva los datos de Account', async ({
    page,
  }) => {
    const email = uniqueEmail();
    await fillAccount(page, email);
    await clickNext(page);
    await page.getByRole('button', { name: /Back/i }).click();
    await expect(page.locator('#signup-email')).toHaveValue(email);
    await expect(page.locator('#signup-password')).toHaveValue(VALID_PASSWORD);
  });

  test('Professional vacío marca los cinco campos requeridos', async ({
    page,
  }) => {
    await fillAccount(page, uniqueEmail());
    await clickNext(page);
    await clickNext(page); // intenta avanzar sin llenar Professional

    await expect(page.getByText('First name is required')).toBeVisible();
    await expect(page.getByText('Last name is required')).toBeVisible();
    await expect(page.getByText('Phone is required')).toBeVisible();
    await expect(page.getByText('License number is required')).toBeVisible();
    await expect(page.getByText('Law firm is required')).toBeVisible();
  });

  test('Professional válido avanza a License con botón Create account', async ({
    page,
  }) => {
    await goToLicenseStep(page, uniqueEmail());
    await expect(
      page.getByRole('button', { name: /Create account/i })
    ).toBeVisible();
    await expect(
      page.getByText(/Upload your license for verification/i)
    ).toBeVisible();
  });

  test('Create account sin archivo pide subir el documento', async ({
    page,
  }) => {
    await goToLicenseStep(page, uniqueEmail());
    await clickCreate(page);
    await expect(
      page.getByText('Upload your license document')
    ).toBeVisible();
  });

  test('subir imagen válida muestra el archivo y permite quitarlo', async ({
    page,
  }) => {
    await goToLicenseStep(page, uniqueEmail());
    await uploadLicense(page, { name: 'my-license.png' });

    await expect(page.getByText('my-license.png')).toBeVisible();
    await page.getByRole('button', { name: 'Remove file' }).click();
    await expect(page.getByText(/Click to upload/i)).toBeVisible();
  });

  test('archivo con tipo no permitido es rechazado al enviar', async ({
    page,
  }) => {
    await goToLicenseStep(page, uniqueEmail());
    await uploadLicense(page, {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a license'),
    });
    await clickCreate(page);
    await expect(
      page.getByText('File must be an image (PNG, JPG, WEBP) or a PDF')
    ).toBeVisible();
  });

  test('link Sign in vuelve al login', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

// ─── Registro real contra el backend ─────────────────────────────────────────

test.describe('Signup · registro real contra backend', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('registro completo crea el abogado y muestra el código LIC', async ({
    page,
  }) => {
    const email = uniqueEmail();

    // Cuenta el POST real; verifica de paso que no haya doble submit.
    const signupRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/auth/signup')) signupRequests.push(req.url());
    });
    const signupResponse = page.waitForResponse((r) =>
      r.url().includes('/auth/signup')
    );

    await fillAccount(page, email);
    await clickNext(page);
    await fillProfessional(page);
    await clickNext(page);
    await uploadLicense(page);
    await clickCreate(page);

    const response = await signupResponse;
    expect(response.ok()).toBeTruthy();

    // Paso 3 — StepCode: confirmación + código de referencia LIC-YYYY-#####.
    await expect(
      page.getByRole('heading', { name: /Registration received/i })
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(
        new RegExp(`Welcome, ${PROFESSIONAL.firstName} ${PROFESSIONAL.lastName}`, 'i')
      )
    ).toBeVisible();
    await expect(page.getByText(/LIC-\d{4}-\d+/)).toBeVisible();

    // Un único POST — el guard de submitting evita duplicados.
    expect(signupRequests).toHaveLength(1);

    // Paso 4 — StepPending: verificación manual del admin.
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(
      page.getByRole('heading', { name: /Pending verification/i })
    ).toBeVisible();
    await expect(
      page.getByText(/An administrator will review your license/i)
    ).toBeVisible();

    // Go to login → vuelve al root (sin sesión, no hay redirect).
    await page.getByRole('button', { name: /Go to login/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('doble click en Create account no duplica el registro', async ({
    page,
  }) => {
    const email = uniqueEmail();
    const signupRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/auth/signup')) signupRequests.push(req.url());
    });

    await goToLicenseStep(page, email);
    await uploadLicense(page);
    // dblclick: el segundo click cae sobre un botón ya deshabilitado.
    await page.getByRole('button', { name: /Create account/i }).dblclick();

    await expect(
      page.getByRole('heading', { name: /Registration received/i })
    ).toBeVisible({ timeout: 30_000 });
    expect(signupRequests).toHaveLength(1);
  });

  test('email ya registrado devuelve 409 y regresa a Account con error', async ({
    page,
  }) => {
    // Auto-contenido: registra un email nuevo y lo reintenta → 409 determinista
    // en cualquier backend, sin depender de datos sembrados.
    const email = uniqueEmail();

    // 1er registro — debe tener éxito.
    await fillAccount(page, email);
    await clickNext(page);
    await fillProfessional(page);
    await clickNext(page);
    await uploadLicense(page);
    await clickCreate(page);
    await expect(
      page.getByRole('heading', { name: /Registration received/i })
    ).toBeVisible({ timeout: 30_000 });

    // 2do registro con el MISMO email — el backend responde 409.
    await page.goto('/signup');
    const conflict = page.waitForResponse((r) =>
      r.url().includes('/auth/signup')
    );
    await fillAccount(page, email);
    await clickNext(page);
    await fillProfessional(page);
    await clickNext(page);
    await uploadLicense(page);
    await clickCreate(page);

    expect((await conflict).status()).toBe(409);

    // routeSubmitError(409) → vuelve al paso Account con error en el email.
    await expect(page.locator('#signup-email')).toBeVisible();
    await expect(page.locator('p.text-rose-600')).toBeVisible();
    // No avanzó a la pantalla de éxito.
    await expect(
      page.getByRole('heading', { name: /Registration received/i })
    ).toHaveCount(0);
  });
});
