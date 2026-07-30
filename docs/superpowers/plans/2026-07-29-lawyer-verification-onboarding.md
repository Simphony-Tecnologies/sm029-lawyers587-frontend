# Lawyer Verification + Onboarding (Activity 24 — remaining FE pieces) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the frontend pieces of Activity 24 that were left unbuilt after the signup wizard: the login verification gate, the admin verification panel (approve/reject), the first-login onboarding video modal, and the profile "Restart onboarding" control.

**Architecture:** Additive, non-breaking. Extend the existing `database` service (raw-`fetch`, JSON-crudo — these endpoints are NOT wrapped in `GenericResponse`), extend the `LawyerData` store type with the new fields, and add UI that reuses the existing design system (`Modal`, `MenuItem`, Tailwind slate/emerald/amber/rose palette). The onboarding modal mounts once in the shared dashboard layout, gated on `user.onboarding_status === 'pending'`. Admin verification lives as a new child route under lawyer-management.

**Tech Stack:** Next.js 14 (App Router, client components), Zustand (`useAuth` persisted store), `nookies` cookie token, react-hot-toast, `@headlessui/react` (Dialog/Menu), react-icons/md, Tailwind. Tests: Playwright E2E (`@playwright/test`).

**Backend contracts (feature/lawyer-signup-activity-24, deployed to prod):**
- `POST /auth/login` → on gate: `401 { message: "Your account is pending verification." }` (pending) or `401 { message: "Your registration was not approved." }` (rejected). Success `200` → `lawyer` now includes `verification_status`, `onboarding_status`.
- `GET /lawyers/verification/pending` → `VerificationQueueItem[]` (JSON crudo).
- `GET /lawyers/:id/license-document` → binary blob (admin/owner; `403`/`404` otherwise). Requires `Authorization` header.
- `PATCH /lawyers/:id/verification` → body `{ action: 'verify' }` or `{ action: 'reject', reason: string }`.
- `GET /lawyers/me/onboarding` → `{ status, videos: [{ id, embedUrl }] }` (JSON crudo; `videos: []` when unconfigured).
- `PATCH /lawyers/me/onboarding` → body `{ action: 'complete' | 'skip' | 'restart' }` → `{ status }`.

**Test strategy (repo reality):** This repo has NO unit runner — the only test layer is Playwright E2E. All E2E in this plan run against a **real feature backend on `:3000`** (no mocks — per project decision). Reuse `playwright.signup.config.ts` (anonymous, no globalSetup, reuses the `:3002` dev server which posts to `NEXT_PUBLIC_URL=http://localhost:3000`). Admin-scoped specs additionally need the admin `storageState` and a seeded pending lawyer; those prerequisites are called out per task. Every task ends with `npx tsc --noEmit` green + its E2E green + a commit.

**Prerequisite for running any real E2E in this plan:** the feature backend must serve `/auth/*` and `/lawyers/*` on `:3000`:
```bash
cd /Users/soycamilortiz/.config/superpowers/worktrees/sm029-lawyers587-backend/lawyer-signup
PORT=3000 npm run start:dev   # ensure its .env (DB, storage, Resend) is present
```

---

## File Structure

**Phase 0 — Foundation (types + service + store)**
- Modify: `src/types/api.types.ts` — add `VerificationQueueItem`, `VerificationAction`, `VerificationActionBody`, `OnboardingVideo`, `OnboardingState`, `OnboardingAction`.
- Modify: `src/types/lawyerData.types.ts` — add optional `verification_status`, `onboarding_status`, `license_document_url`, `verified_at`, `rejection_reason`.
- Modify: `src/services/database.ts` — add `getPendingVerifications`, `getLicenseDocumentUrl`, `verifyLawyer`, `getMyOnboarding`, `patchMyOnboarding`.

**Phase 1 — Login verification gate**
- Modify: `src/app/auth.tsx` — replace hardcoded 401/404 toasts with the backend `messages`.
- Test: `tests/e2e/auth/verification-gate.spec.ts` (new).

**Phase 2 — Admin verification panel**
- Create: `src/app/(dashboard)/lawyer-management/verification/page.tsx`
- Create: `src/app/(dashboard)/lawyer-management/verification/Verification.tsx`
- Create: `src/components/ui/atoms/VerificationBadge/VerificationBadge.tsx` (+ `index.ts`)
- Modify: `src/routes/routes.ts` — add the "Verification" child link under Lawyers.
- Test: `tests/e2e/verification/admin-queue.spec.ts` (new).

**Phase 3 — Onboarding video modal (first login)**
- Create: `src/components/ui/organisms/OnboardingModal/OnboardingModal.tsx` (+ `index.ts`)
- Modify: `src/app/(dashboard)/layout.tsx` — mount `<OnboardingModal />`.
- Test: `tests/e2e/onboarding/first-login.spec.ts` (new).

**Phase 4 — Profile "Restart onboarding"**
- Modify: `src/components/Layout/Header.tsx` — add a lawyer-only "Restart onboarding" menu item.
- Test: covered by extending `tests/e2e/onboarding/first-login.spec.ts`.

Each phase is independently shippable and committable.

---

## Phase 0 — Foundation: types, service methods, store plumbing

### Task 0.1: Add Activity-24 API types

**Files:**
- Modify: `src/types/api.types.ts` (append after the existing `SignupResult` block, ~line 605)

- [ ] **Step 1: Add the new types**

Append to `src/types/api.types.ts`:

```ts
// ── Verification queue (admin) — GET /lawyers/verification/pending (JSON crudo)
export interface VerificationQueueItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  code: string;
  law_firm: string;
  license_number: string | null;
  license_document_url: string | null;
  verification_status: VerificationStatus;
  created_at: string;
  role: { id: number; name: string };
}

export type VerificationAction = 'verify' | 'reject';

export interface VerificationActionBody {
  action: VerificationAction;
  reason?: string; // requerido por el backend cuando action === 'reject'
}

// ── Onboarding — GET/PATCH /lawyers/me/onboarding (JSON crudo)
export interface OnboardingVideo {
  id: string;
  embedUrl: string; // youtube.com/embed/<id>
}

export interface OnboardingState {
  status: OnboardingStatus;
  videos: OnboardingVideo[];
}

export type OnboardingAction = 'complete' | 'skip' | 'restart';
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/types/api.types.ts
git commit -m "feat(types): add verification queue + onboarding contracts (Activity 24)"
```

### Task 0.2: Extend the store's `LawyerData` type with the new lawyer fields

**Files:**
- Modify: `src/types/lawyerData.types.ts`

- [ ] **Step 1: Add the optional fields**

In `src/types/lawyerData.types.ts`, add these fields inside the object type (after `profile_image_url: string;`, before the closing `} | null;`):

```ts
  verification_status?: 'pending' | 'verified' | 'rejected';
  onboarding_status?: 'pending' | 'completed' | 'skipped';
  license_document_url?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
```

They are optional so existing admin/lawyer objects (which don't carry them) still typecheck.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/types/lawyerData.types.ts
git commit -m "feat(types): carry verification/onboarding status on LawyerData store type"
```

### Task 0.3: Add verification service methods to `database`

**Files:**
- Modify: `src/services/database.ts` (imports block ~line 47, and add methods after the `signup` method which ends ~line 193)

- [ ] **Step 1: Add the new type imports**

In the `import type { ... } from '@/types/api.types';` block, add:

```ts
  VerificationQueueItem,
  VerificationActionBody,
  OnboardingState,
  OnboardingAction,
  OnboardingStatus,
```

- [ ] **Step 2: Add the three verification methods**

Insert immediately after the `signup: async (...) => { ... },` method (after ~line 193):

```ts
  // Cola de verificación (admin). JSON crudo (array directo o {data}).
  getPendingVerifications: async (token?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/verification/pending`;
      const response = await fetch(url, {
        method: 'GET',
        headers: jsonHeaders(resolveToken(token)),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => []);
      if (!response.ok) {
        return {
          success: false,
          code: safeStatus(response),
          data: [] as VerificationQueueItem[],
          messages: body?.message ?? 'request failed',
        };
      }
      const list = Array.isArray(body) ? body : unwrapList(body);
      return {
        success: true,
        code: 200,
        data: list as VerificationQueueItem[],
        messages: '',
      };
    } catch (error: any) {
      return {
        success: false,
        code: 0,
        data: [] as VerificationQueueItem[],
        messages: error?.message ?? 'error connecting to database',
      };
    }
  },

  // Documento de licencia (blob privado). Devuelve un object URL para abrir en
  // otra pestaña; el caller es responsable de URL.revokeObjectURL().
  getLicenseDocumentUrl: async (id: number, token?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/${id}/license-document`;
      const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(resolveToken(token)),
      });
      if (!response.ok) {
        return {
          success: false,
          code: safeStatus(response),
          data: null as string | null,
          messages: 'document not available',
        };
      }
      const blob = await response.blob();
      return {
        success: true,
        code: 200,
        data: URL.createObjectURL(blob),
        messages: '',
      };
    } catch (error: any) {
      return {
        success: false,
        code: 0,
        data: null as string | null,
        messages: error?.message ?? 'error connecting to database',
      };
    }
  },

  // Aprobar/rechazar (admin). PATCH /lawyers/:id/verification.
  verifyLawyer: async (
    id: number,
    body: VerificationActionBody,
    token?: string
  ) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/${id}/verification`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: jsonHeaders(resolveToken(token)),
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok,
        code: data?.statusCode ?? response.status,
        data,
        messages: data?.message ?? '',
      };
    } catch (error: any) {
      return {
        success: false,
        code: 0,
        data: null,
        messages: error?.message ?? 'error connecting to database',
      };
    }
  },
```

- [ ] **Step 3: Add the two onboarding methods**

Immediately after `verifyLawyer`:

```ts
  // Onboarding del usuario autenticado. JSON crudo.
  getMyOnboarding: async (token?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/me/onboarding`;
      const response = await fetch(url, {
        method: 'GET',
        headers: jsonHeaders(resolveToken(token)),
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          code: safeStatus(response),
          data: null as OnboardingState | null,
          messages: body?.message ?? 'request failed',
        };
      }
      return {
        success: true,
        code: 200,
        data: body as OnboardingState,
        messages: '',
      };
    } catch (error: any) {
      return {
        success: false,
        code: 0,
        data: null as OnboardingState | null,
        messages: error?.message ?? 'error connecting to database',
      };
    }
  },

  // Guardar la elección de onboarding. PATCH /lawyers/me/onboarding.
  patchMyOnboarding: async (action: OnboardingAction, token?: string) => {
    try {
      const url = `${process.env.NEXT_PUBLIC_URL}/lawyers/me/onboarding`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: jsonHeaders(resolveToken(token)),
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      return {
        success: response.ok,
        code: data?.statusCode ?? response.status,
        data: data as { status: OnboardingStatus },
        messages: data?.message ?? '',
      };
    } catch (error: any) {
      return {
        success: false,
        code: 0,
        data: null,
        messages: error?.message ?? 'error connecting to database',
      };
    }
  },
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/database.ts
git commit -m "feat(service): add verification + onboarding API methods (Activity 24)"
```

---

## Phase 1 — Login verification gate

The backend now returns `401` with a human message when the account is `pending`/`rejected`. Today `auth.tsx:37` maps every 401 to `"error password"`, hiding the real reason. Fix: surface `login.messages` (the backend text) verbatim.

### Task 1.1: Show the backend gate message on failed login

**Files:**
- Modify: `src/app/auth.tsx:37-48`

- [ ] **Step 1: Write the failing E2E test**

Create `tests/e2e/auth/verification-gate.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run (main config — reuses `:3002`, `globalSetup` passes with backend on `:3000`; the spec forces anonymous state via `test.use`):
`npx playwright test tests/e2e/auth/verification-gate.spec.ts --project=admin-chromium`
Expected: FAIL — current code toasts `"error password"`, so `getByText(/pending verification/i)` is not found.

- [ ] **Step 3: Fix the login failure branch**

In `src/app/auth.tsx`, replace lines 37-48 (the `code === 401`, `code === 404`, and `!login.success` blocks):

```ts
    if (!login.success) {
      setLoading(false);
      return toast.error(
        login.messages || 'Unable to sign in. Check your credentials.'
      );
    }
```

This surfaces the backend message for every failure — pending (`"Your account is pending verification."`), rejected (`"Your registration was not approved."`), bad credentials, or missing email — instead of the misleading hardcoded strings. The `is_active` check (lines 50-54) stays unchanged below.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/auth/verification-gate.spec.ts --project=admin-chromium`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/app/auth.tsx tests/e2e/auth/verification-gate.spec.ts
git commit -m "fix(auth): surface backend gate message on login (pending/rejected) instead of 'error password'"
```

---

## Phase 2 — Admin verification panel

A new admin child route lists pending lawyers and lets the admin view the license document, approve, or reject (with a reason). Reuses the existing `Modal` for the reject-reason dialog.

### Task 2.1: Verification status badge atom

**Files:**
- Create: `src/components/ui/atoms/VerificationBadge/VerificationBadge.tsx`
- Create: `src/components/ui/atoms/VerificationBadge/index.ts`

- [ ] **Step 1: Create the badge**

`src/components/ui/atoms/VerificationBadge/VerificationBadge.tsx`:

```tsx
import type { VerificationStatus } from '@/types/api.types';
import { cn } from '@/lib/cn';

const STYLES: Record<VerificationStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700' },
  verified: { label: 'Verified', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700' },
};

export const VerificationBadge = ({ status }: { status: VerificationStatus }) => {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
        s.className
      )}
    >
      {s.label}
    </span>
  );
};

VerificationBadge.displayName = 'VerificationBadge';
```

`src/components/ui/atoms/VerificationBadge/index.ts`:

```ts
export { VerificationBadge } from './VerificationBadge';
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/ui/atoms/VerificationBadge
git commit -m "feat(ui): add VerificationBadge atom"
```

### Task 2.2: Verification panel component + route

**Files:**
- Create: `src/app/(dashboard)/lawyer-management/verification/Verification.tsx`
- Create: `src/app/(dashboard)/lawyer-management/verification/page.tsx`

- [ ] **Step 1: Create the panel component**

`src/app/(dashboard)/lawyer-management/verification/Verification.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { MdDescription, MdCheck, MdClose } from 'react-icons/md';
import { database } from '@/services/database';
import Modal from '@/components/organisms/Modal';
import { VerificationBadge } from '@/components/ui/atoms/VerificationBadge';
import { formatDate } from '@/utils/formatDate';
import type { VerificationQueueItem } from '@/types/api.types';

const Verification = () => {
  const [rows, setRows] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VerificationQueueItem | null>(
    null
  );
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await database.getPendingVerifications();
    setRows(res.success ? res.data : []);
    setLoading(false);
    if (!res.success) toast.error(res.messages || 'Failed to load queue');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const viewDocument = async (id: number) => {
    const res = await database.getLicenseDocumentUrl(id);
    if (!res.success || !res.data) {
      toast.error(res.messages || 'Document not available');
      return;
    }
    window.open(res.data, '_blank', 'noopener');
    // El object URL se libera cuando la pestaña/documento ya no lo usa.
    setTimeout(() => URL.revokeObjectURL(res.data as string), 60_000);
  };

  const approve = async (item: VerificationQueueItem) => {
    setBusyId(item.id);
    const res = await database.verifyLawyer(item.id, { action: 'verify' });
    setBusyId(null);
    if (res.success) {
      toast.success(`${item.firstName} ${item.lastName} approved`);
      setRows((prev) => prev.filter((r) => r.id !== item.id));
    } else {
      toast.error(res.messages || 'Approval failed');
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (reason.trim().length === 0) {
      toast.error('A reason is required to reject');
      return;
    }
    setBusyId(rejectTarget.id);
    const res = await database.verifyLawyer(rejectTarget.id, {
      action: 'reject',
      reason: reason.trim(),
    });
    setBusyId(null);
    if (res.success) {
      toast.success(`${rejectTarget.firstName} rejected`);
      setRows((prev) => prev.filter((r) => r.id !== rejectTarget.id));
      setRejectTarget(null);
      setReason('');
    } else {
      toast.error(res.messages || 'Rejection failed');
    }
  };

  return (
    <div className='flex flex-col gap-6'>
      <Toaster />
      <div>
        <h1 className='text-2xl font-extrabold text-slate-900'>
          Lawyer verification
        </h1>
        <p className='text-sm text-slate-500'>
          Review license documents and approve or reject new sign-ups.
        </p>
      </div>

      <Modal
        title='Reject sign-up'
        isOpen={rejectTarget !== null}
        setIsOpen={(open: boolean) => {
          if (!open) {
            setRejectTarget(null);
            setReason('');
          }
        }}
        className='max-w-md'
      >
        <div className='flex flex-col gap-3'>
          <p className='text-sm text-slate-600'>
            Rejecting{' '}
            <span className='font-semibold'>
              {rejectTarget?.firstName} {rejectTarget?.lastName}
            </span>
            . The reason is emailed to the lawyer and stored in the audit log.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder='Reason for rejection'
            className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25'
          />
          <div className='flex justify-end gap-2'>
            <button
              type='button'
              onClick={() => {
                setRejectTarget(null);
                setReason('');
              }}
              className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={confirmReject}
              disabled={busyId === rejectTarget?.id}
              className='rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60'
            >
              Reject
            </button>
          </div>
        </div>
      </Modal>

      {loading ? (
        <p className='text-sm text-slate-400'>Loading…</p>
      ) : rows.length === 0 ? (
        <div className='rounded-xl border border-slate-200 bg-white p-10 text-center'>
          <p className='text-sm font-semibold text-slate-700'>
            No pending verifications
          </p>
          <p className='text-xs text-slate-400'>All sign-ups are reviewed.</p>
        </div>
      ) : (
        <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
          <table className='w-full text-left text-sm'>
            <thead className='border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500'>
              <tr>
                <th className='px-4 py-3'>Lawyer</th>
                <th className='px-4 py-3'>Firm</th>
                <th className='px-4 py-3'>LIC</th>
                <th className='px-4 py-3'>Requested</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className='border-b border-slate-100'>
                  <td className='px-4 py-3'>
                    <div className='font-semibold text-slate-800'>
                      {item.firstName} {item.lastName}
                    </div>
                    <div className='text-xs text-slate-400'>{item.email}</div>
                  </td>
                  <td className='px-4 py-3 text-slate-600'>{item.law_firm}</td>
                  <td className='px-4 py-3 font-mono text-xs text-slate-600'>
                    {item.code}
                  </td>
                  <td className='px-4 py-3 text-slate-500'>
                    {formatDate(item.created_at)}
                  </td>
                  <td className='px-4 py-3'>
                    <VerificationBadge status={item.verification_status} />
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center justify-end gap-2'>
                      <button
                        type='button'
                        onClick={() => viewDocument(item.id)}
                        title='View document'
                        className='inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50'
                      >
                        <MdDescription /> Document
                      </button>
                      <button
                        type='button'
                        onClick={() => approve(item)}
                        disabled={busyId === item.id}
                        title='Approve'
                        className='inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-opacity-90 disabled:opacity-60'
                      >
                        <MdCheck /> Approve
                      </button>
                      <button
                        type='button'
                        onClick={() => setRejectTarget(item)}
                        disabled={busyId === item.id}
                        title='Reject'
                        className='inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60'
                      >
                        <MdClose /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Verification;
```

- [ ] **Step 2: Create the route page**

`src/app/(dashboard)/lawyer-management/verification/page.tsx`:

```tsx
export { default } from './Verification';
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (Confirms `formatDate` import path `@/utils/formatDate` and `Modal` default import resolve.)

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/lawyer-management/verification"
git commit -m "feat(verification): admin panel to review, approve and reject sign-ups"
```

### Task 2.3: Add the sidebar link

**Files:**
- Modify: `src/routes/routes.ts:24-50` (the Lawyers `children` array)

- [ ] **Step 1: Add the child entry**

In `src/routes/routes.ts`, add as the first child inside the Lawyers `children` array (after line 25 `children: [`):

```ts
      {
        name: 'Verification',
        route: '/lawyer-management/verification',
        icon: MdChecklist,
        rol: ['admin'],
      },
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/routes/routes.ts
git commit -m "feat(nav): link admin verification queue under Lawyers"
```

### Task 2.4: E2E — admin can see and act on the queue

**Files:**
- Create: `tests/e2e/verification/admin-queue.spec.ts`

> **Prerequisite:** admin `storageState` (`tests/e2e/.auth/admin.json`, produced by the main config's `globalSetup`) and at least one pending lawyer. This spec creates the pending lawyer itself via signup, then switches to admin state to approve it. It runs under the **main** `playwright.config.ts` (admin project), not the signup config.

- [ ] **Step 1: Write the test**

`tests/e2e/verification/admin-queue.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run it (backend on :3000 + admin creds set)**

Run: `npx playwright test tests/e2e/verification/admin-queue.spec.ts --project=admin-chromium`
Expected: PASS. (If `globalSetup` admin login fails, set `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` to valid admin creds.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/verification/admin-queue.spec.ts
git commit -m "test(e2e): admin verification queue approve flow"
```

---

## Phase 3 — Onboarding video modal (first login)

Mount one modal in the dashboard layout. When the logged-in user's `onboarding_status === 'pending'`, fetch the videos and show them; "Skip" or finishing persists the choice server-side and updates the store so it never re-opens (until "Restart" in Phase 4).

### Task 3.1: OnboardingModal organism

**Files:**
- Create: `src/components/ui/organisms/OnboardingModal/OnboardingModal.tsx`
- Create: `src/components/ui/organisms/OnboardingModal/index.ts`

- [ ] **Step 1: Create the component**

`src/components/ui/organisms/OnboardingModal/OnboardingModal.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import Modal from '@/components/organisms/Modal';
import type { OnboardingVideo } from '@/types/api.types';

export const OnboardingModal = () => {
  const { user, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<OnboardingVideo[]>([]);
  const [busy, setBusy] = useState(false);

  const isPending = Boolean(user?.id) && user?.onboarding_status === 'pending';

  useEffect(() => {
    if (!isPending) return;
    let alive = true;
    (async () => {
      const res = await database.getMyOnboarding();
      if (!alive) return;
      const list = res.success && res.data ? res.data.videos : [];
      if (list.length === 0) {
        // Sin videos configurados → no molestar; marcar completo silenciosamente.
        await database.patchMyOnboarding('complete');
        setUser({ ...user, onboarding_status: 'completed' });
        return;
      }
      setVideos(list);
      setOpen(true);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  const finish = async (action: 'complete' | 'skip') => {
    setBusy(true);
    await database.patchMyOnboarding(action);
    setBusy(false);
    setUser({
      ...user,
      onboarding_status: action === 'skip' ? 'skipped' : 'completed',
    });
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Modal
      title='Welcome — quick tour'
      isOpen={open}
      setIsOpen={(next: boolean) => {
        // Cerrar por la X cuenta como "skip".
        if (!next) void finish('skip');
      }}
      className='max-w-2xl'
    >
      <div className='flex flex-col gap-4'>
        <p className='text-sm text-slate-600'>
          Watch these short tutorials to get started. You can restart them later
          from your profile.
        </p>
        <div className='flex flex-col gap-4'>
          {videos.map((v) => (
            <div
              key={v.id}
              className='aspect-video w-full overflow-hidden rounded-lg bg-black'
            >
              <iframe
                title={`Onboarding video ${v.id}`}
                src={v.embedUrl}
                className='h-full w-full'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                allowFullScreen
              />
            </div>
          ))}
        </div>
        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={() => finish('skip')}
            disabled={busy}
            className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60'
          >
            Skip
          </button>
          <button
            type='button'
            onClick={() => finish('complete')}
            disabled={busy}
            className='rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60'
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};

OnboardingModal.displayName = 'OnboardingModal';
```

`src/components/ui/organisms/OnboardingModal/index.ts`:

```ts
export { OnboardingModal } from './OnboardingModal';
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/ui/organisms/OnboardingModal
git commit -m "feat(onboarding): OnboardingModal with embedded videos + skip/complete"
```

### Task 3.2: Mount the modal in the dashboard layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Import and render**

In `src/app/(dashboard)/layout.tsx`, add the import after the existing imports:

```tsx
import { OnboardingModal } from '@/components/ui/organisms/OnboardingModal';
```

Then render it inside the outer `<div>`, right after `<Toaster />`:

```tsx
      <Toaster />
      <OnboardingModal />
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/(dashboard)/layout.tsx"
git commit -m "feat(onboarding): mount OnboardingModal in dashboard layout (first-login gate)"
```

### Task 3.3: E2E — verified lawyer sees the modal on first login

**Files:**
- Create: `tests/e2e/onboarding/first-login.spec.ts`

> **Prerequisite:** a **verified** lawyer whose `onboarding_status === 'pending'` and known credentials, plus onboarding videos configured on the backend. Provide via env: `E2E_ONBOARDING_EMAIL`, `E2E_ONBOARDING_PASSWORD`. The test skips if unset (the full signup→admin-verify→login chain is covered piecemeal by Phases 1–2; a pre-seeded verified account is the reliable way to hit the modal).

- [ ] **Step 1: Write the test**

`tests/e2e/onboarding/first-login.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

const EMAIL = process.env.E2E_ONBOARDING_EMAIL;
const PASSWORD = process.env.E2E_ONBOARDING_PASSWORD;

test.describe('Onboarding en primer login', () => {
  test.skip(
    !EMAIL || !PASSWORD,
    'E2E_ONBOARDING_EMAIL / E2E_ONBOARDING_PASSWORD no configurados'
  );

  test('lawyer verificado con onboarding pending ve el modal de videos', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email Address').fill(EMAIL as string);
    await page.getByPlaceholder('Password').fill(PASSWORD as string);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(
      page.getByRole('heading', { name: /Welcome — quick tour/i })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('iframe').first()).toBeVisible();

    // Al terminar, el modal se cierra y no reaparece al recargar.
    await page.getByRole('button', { name: /^Done$/ }).click();
    await expect(
      page.getByRole('heading', { name: /Welcome — quick tour/i })
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /Welcome — quick tour/i })
    ).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test tests/e2e/onboarding/first-login.spec.ts --project=admin-chromium`
Expected: PASS (or SKIP if the seed env vars are absent).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/onboarding/first-login.spec.ts
git commit -m "test(e2e): onboarding modal on first login (seeded verified lawyer)"
```

---

## Phase 4 — Profile "Restart onboarding"

The requirement puts "Restart onboarding" in the profile. The lawyer's profile surface is the header profile menu. Add a lawyer-only menu item that calls `patchMyOnboarding('restart')`, flips the store status back to `pending` (which re-triggers `OnboardingModal` in the layout), and toasts.

### Task 4.1: Add "Restart onboarding" to the header menu

**Files:**
- Modify: `src/components/Layout/Header.tsx`

- [ ] **Step 1: Add the handler**

In `src/components/Layout/Header.tsx`, add `MdReplayCircleFilled` to the `react-icons/md` import (line 13) and pull `setUser` from the store (line 42):

```tsx
import { MdLogout, MdHelpOutline, MdChevronRight, MdReplayCircleFilled } from 'react-icons/md';
```
```tsx
  const { user, setUser } = useAuth();
```

Then add this handler inside the component (after `signOut`, ~line 86):

```tsx
  const restartOnboarding = async () => {
    const res = await database.patchMyOnboarding('restart');
    if (res.success) {
      setUser({ ...user, onboarding_status: 'pending' });
      toast.success('Onboarding will replay');
    } else {
      toast.error(res.messages || 'Could not restart onboarding');
    }
  };
```

- [ ] **Step 2: Add the menu item (lawyer-only)**

In the profile `MenuPanel` (after the `Help & FAQs` `HuiMenuItem`, before `<MenuDivider />` at ~line 243), insert:

```tsx
                  {user?.role?.name === 'lawyer' ? (
                    <HuiMenuItem>
                      {({ active }) => (
                        <MenuItem
                          icon={<MdReplayCircleFilled size={14} />}
                          active={active}
                          onClick={restartOnboarding}
                        >
                          Restart onboarding
                        </MenuItem>
                      )}
                    </HuiMenuItem>
                  ) : null}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Extend the onboarding E2E with restart**

Append to `tests/e2e/onboarding/first-login.spec.ts` inside the same `describe`:

```ts
  test('Reiniciar onboarding desde el perfil vuelve a mostrar el modal', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByPlaceholder('Email Address').fill(EMAIL as string);
    await page.getByPlaceholder('Password').fill(PASSWORD as string);
    await page.getByRole('button', { name: 'Login' }).click();

    // Cerrar el modal inicial (skip) si aparece.
    const tour = page.getByRole('heading', { name: /Welcome — quick tour/i });
    if (await tour.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /^Skip$/ }).click();
    }

    // Abrir el menú de perfil y reiniciar.
    await page.getByRole('button', { name: new RegExp(EMAIL as string, 'i') })
      .or(page.locator('header button').last())
      .click();
    await page.getByRole('menuitem', { name: /Restart onboarding/i }).click();

    await expect(page.getByText(/Onboarding will replay/i)).toBeVisible();
    await expect(tour).toBeVisible({ timeout: 15_000 });
  });
```

- [ ] **Step 5: Run + commit**

Run: `npx playwright test tests/e2e/onboarding/first-login.spec.ts --project=admin-chromium`
Expected: PASS (or SKIP without seed env).

```bash
git add src/components/Layout/Header.tsx tests/e2e/onboarding/first-login.spec.ts
git commit -m "feat(onboarding): restart onboarding from profile menu (lawyer)"
```

---

## Final verification

- [ ] **Full typecheck:** `npx tsc --noEmit` → PASS
- [ ] **Signup regression (frontend, no backend needed):** `npx playwright test --config=playwright.signup.config.ts -g "cliente"` → 12 passed
- [ ] **Activity-24 real flows (backend on :3000, `--project=admin-chromium`):** `npx playwright test tests/e2e/auth/verification-gate.spec.ts tests/e2e/verification/admin-queue.spec.ts tests/e2e/onboarding/first-login.spec.ts --project=admin-chromium`
- [ ] **Manual smoke:** with the feature backend on :3000 — sign up → (admin) approve in `/lawyer-management/verification` → log in as that lawyer → onboarding modal appears → Skip → profile → Restart onboarding → modal reappears.

---

## Notes / out of scope

- **Refresh interceptor exclusion** (doc §2): the frontend has NO axios refresh interceptor (login uses raw `fetch`), so the "exclude `/auth/login` from refresh" item does not apply. If a global 401→refresh interceptor is ever added, exclude `/auth/login` and `/auth/signup`.
- **Onboarding video source:** URLs come from backend config; the FE only renders `embedUrl`. No FE-side video config needed.
- **Rejected-then-relogin:** stateless refresh token means a rejected lawyer keeps a live session until token expiry (doc §7 — out of scope).
