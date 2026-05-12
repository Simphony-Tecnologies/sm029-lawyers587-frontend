import { expect, type Page } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-data';

type Role = keyof typeof TEST_USERS;

export async function loginAs(page: Page, role: Role): Promise<void> {
  const { email, password } = TEST_USERS[role];
  await page.goto('/');
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /login|sign in|iniciar/i }).click();

  const expectedPath = role === 'admin' ? '/dashboard' : '/dash-lawyers';
  await page.waitForURL(new RegExp(expectedPath), { timeout: 15_000 });
  await expect(page).toHaveURL(new RegExp(expectedPath));
}

export async function logout(page: Page): Promise<void> {
  // El logout dispara destroyCookie('currentUser'). Forzamos limpieza
  // de cookies a nivel de contexto y vamos al root para confirmar redirect.
  await page.context().clearCookies();
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
}
