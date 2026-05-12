// Credenciales de prueba. Sobrescribibles via env para CI o entornos compartidos.
export const TEST_USERS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@example.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
  },
  lawyer: {
    email: process.env.E2E_LAWYER_EMAIL || 'lawyer@example.com',
    password: process.env.E2E_LAWYER_PASSWORD || 'lawyer123',
  },
} as const;

export const ADMIN_ROUTES = [
  '/dashboard',
  '/lead-management',
  '/lawyer-management',
  '/lawyer-management/assigned-leads',
  '/lawyer-management/lost-leads',
  '/lawyer-management/reassigned-leads',
] as const;

export const LAWYER_ROUTES = [
  '/dash-lawyers',
  '/all-leads',
  '/select-lead',
] as const;
