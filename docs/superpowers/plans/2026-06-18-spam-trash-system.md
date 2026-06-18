# Spam Detection & Trash/Archive System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate spam review queue, trash/restore flow, and spam settings CRUD into the existing lawyer lead management frontend.

**Architecture:** Extend existing type system with REVIEW/TRASHED statuses and spam fields. Add dedicated API methods for new endpoints. Modify LeadInfoModal with conditional rendering for special statuses (REVIEW → mark valid/spam; TRASHED → restore/delete). Convert LeadManagement status tabs to a hybrid system: dynamic tabs for statuses in data + fixed tabs for REVIEW/TRASHED/ARCHIVED that require dedicated fetches. Build standalone Spam Settings CRUD page.

**Tech Stack:** Next.js 14.2 App Router, React 18, TypeScript, Zustand, Tailwind CSS, Headless UI, class-variance-authority

---

## File Map

### Modified files

| File | Responsibility |
|------|----------------|
| `src/types/api.types.ts` | Add REVIEW/TRASHED to LeadStatus, extend LeadDTO, add spam/trash DTOs |
| `src/constants/status.ts` | Add Review/Trash to statusSelectAll label catalog |
| `src/configs/statusColor.ts` | Add hex colors for REVIEW/TRASHED (used by PipelineChart) |
| `src/components/ui/atoms/StatusPill/StatusPill.tsx` | Add review/trashed CVA variants + labels + mappings |
| `src/components/ui/organisms/LeadInfoModal/leadStatusMeta.ts` | Add REVIEW/TRASHED to LeadStatusKey + LEAD_STATUS_META + meta helpers |
| `src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx` | Conditional body for REVIEW (spam info + actions) and TRASHED (purge + restore/delete) |
| `src/components/ui/organisms/LeadInfoModal/index.ts` | Re-export new types (SpamReasonLabels) |
| `src/services/database.ts` | Add api.leads.{review,trash,markValid,markSpam,trashLead,restore} + api.spam.{blacklist,patterns} |
| `src/store/useLead.store.ts` | Extend toRow() to carry spam_score, spam_reasons, trashed_at, previous_status |
| `src/app/(dashboard)/lead-management/LeadManagement.tsx` | Fixed tabs for REVIEW/TRASHED/ARCHIVED, conditional fetch, bulk "Move to Trash", pass new modal props |
| `src/routes/routes.ts` | Add Spam Settings sidebar item (admin) |
| `src/middleware.ts` | Protect /spam-settings as admin-only |

### New files

| File | Responsibility |
|------|----------------|
| `src/app/(dashboard)/spam-settings/page.tsx` | Next.js page wrapper |
| `src/app/(dashboard)/spam-settings/SpamSettings.tsx` | Spam Settings page: Blacklist + Patterns tabs with CRUD |

---

## Task 1: Foundation Types

**Files:**
- Modify: `src/types/api.types.ts`

- [ ] **Step 1: Add REVIEW and TRASHED to LeadStatus union**

In `src/types/api.types.ts`, replace the `LeadStatus` type:

```typescript
export type LeadStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN PROGRESS'
  | 'CLOSED'
  | 'LOST'
  | 'PROBLEMATIC'
  | 'EXPIRED'
  | 'DISABLED'
  | 'ARCHIVED'
  | 'SEND_BACK'
  | 'WAITING_ON_CLIENT'
  | 'REVIEW'
  | 'TRASHED';
```

- [ ] **Step 2: Extend LeadDTO with spam/trash fields**

In `src/types/api.types.ts`, add the 4 new fields to `LeadDTO`:

```typescript
export interface LeadDTO {
  id: number;
  code: string;
  entry_date: string;
  created_at: string;
  fullName: string;
  email: string;
  phone: string;
  service: string;
  source: string;
  description: string;
  status: LeadStatus;
  assigned_lawyer: LawyerRef | null;
  assigned_lawyer_id: number | null;
  comments?: string;
  updated_at?: string;
  // Spam / trash fields (populated when relevant)
  trashed_at?: string | null;
  previous_status?: LeadStatus | null;
  spam_score?: number;
  spam_reasons?: string[] | null;
}
```

- [ ] **Step 3: Add spam and trash DTOs**

Append after the `PullLeadDTO` interface (before the `// ─── Lawyers` section):

```typescript
// ─── Spam / Trash ───────────────────────────────────────────────────────────

export interface TrashLeadDTO {
  comment?: string;
}

export interface BlacklistEntry {
  id: number;
  type: 'email' | 'domain';
  value: string;
  created_at: string;
}

export interface CreateBlacklistDTO {
  type: 'email' | 'domain';
  value: string;
}

export interface SuspiciousPattern {
  id: number;
  field_name: 'full_name' | 'email' | 'description' | 'number';
  pattern: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreatePatternDTO {
  field_name: SuspiciousPattern['field_name'];
  pattern: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdatePatternDTO {
  field_name?: SuspiciousPattern['field_name'];
  pattern?: string;
  description?: string;
  is_active?: boolean;
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: No new errors (the existing e2e test error may remain, ignore it).

- [ ] **Step 5: Commit**

```bash
git add src/types/api.types.ts
git commit -m "feat(types): add REVIEW/TRASHED status, spam fields, and trash/spam DTOs"
```

---

## Task 2: Constants & Color Maps

**Files:**
- Modify: `src/constants/status.ts`
- Modify: `src/configs/statusColor.ts`

- [ ] **Step 1: Add Review and Trash to statusSelectAll**

In `src/constants/status.ts`, add two entries at the end of the array (before the closing `]`):

```typescript
  {
    name: 'Review',
    value: 'REVIEW',
  },
  {
    name: 'Trash',
    value: 'TRASHED',
  },
```

- [ ] **Step 2: Add hex colors for REVIEW and TRASHED**

In `src/configs/statusColor.ts`, add inside the `statusColors` object:

```typescript
  REVIEW: '#F59E0B',
  TRASHED: '#EF4444',
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -5`

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/constants/status.ts src/configs/statusColor.ts
git commit -m "feat(constants): add Review/Trash to status catalog and color map"
```

---

## Task 3: API Service Layer

**Files:**
- Modify: `src/services/database.ts`

- [ ] **Step 1: Add lead spam/trash API methods**

In `src/services/database.ts`, inside `api.leads` (after `pull` and before `exportCsv`), add:

```typescript
    review: (filters?: LeadFilters, token?: string) =>
      apiRequest<Paginated<LeadDTO>>(
        `/leads/review${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),

    trashList: (filters?: LeadFilters, token?: string) =>
      apiRequest<Paginated<LeadDTO>>(
        `/leads/trash${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),

    markValid: (id: number, token?: string) =>
      apiRequest<LeadDTO>(
        `/leads/${id}/mark-valid`,
        { method: 'PATCH' },
        token
      ),

    markSpam: (id: number, token?: string) =>
      apiRequest<LeadDTO>(
        `/leads/${id}/mark-spam`,
        { method: 'PATCH' },
        token
      ),

    trash: (id: number, body?: TrashLeadDTO, token?: string) =>
      apiRequest<{ id: number; status: 'TRASHED' }>(
        `/leads/${id}/trash`,
        {
          method: 'PUT',
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
        token
      ),

    restore: (id: number, token?: string) =>
      apiRequest<LeadDTO>(
        `/leads/${id}/restore`,
        { method: 'PATCH' },
        token
      ),
```

- [ ] **Step 2: Add TrashLeadDTO import**

At the top of `database.ts`, update the import from `@/types/api.types` to include `TrashLeadDTO`:

Find the existing import block that references api.types types and add `TrashLeadDTO` to it. The import line that currently has types like `LeadDTO`, `LeadFilters`, etc. — add `TrashLeadDTO` to that list.

If there is no single consolidated import (the file may use individual type references), add at the top:

```typescript
import type { TrashLeadDTO } from '@/types/api.types';
```

- [ ] **Step 3: Add api.spam namespace**

After the closing `}` of `api.lawyers` (before the final `};` of the `api` export), add:

```typescript
  spam: {
    blacklist: {
      list: (filters?: { limit?: number; offset?: number }, token?: string) =>
        apiRequest<Paginated<BlacklistEntry>>(
          `/spam/blacklist${buildQuery(filters as Record<string, unknown>)}`,
          { method: 'GET' },
          token
        ),
      create: (body: CreateBlacklistDTO, token?: string) =>
        apiRequest<BlacklistEntry>(
          `/spam/blacklist`,
          { method: 'POST', body: JSON.stringify(body) },
          token
        ),
      delete: (id: number, token?: string) =>
        apiRequest<void>(
          `/spam/blacklist/${id}`,
          { method: 'DELETE' },
          token
        ),
    },
    patterns: {
      list: (filters?: { limit?: number; offset?: number }, token?: string) =>
        apiRequest<Paginated<SuspiciousPattern>>(
          `/spam/patterns${buildQuery(filters as Record<string, unknown>)}`,
          { method: 'GET' },
          token
        ),
      create: (body: CreatePatternDTO, token?: string) =>
        apiRequest<SuspiciousPattern>(
          `/spam/patterns`,
          { method: 'POST', body: JSON.stringify(body) },
          token
        ),
      update: (id: number, body: UpdatePatternDTO, token?: string) =>
        apiRequest<SuspiciousPattern>(
          `/spam/patterns/${id}`,
          { method: 'PATCH', body: JSON.stringify(body) },
          token
        ),
      delete: (id: number, token?: string) =>
        apiRequest<void>(
          `/spam/patterns/${id}`,
          { method: 'DELETE' },
          token
        ),
    },
  },
```

- [ ] **Step 4: Add spam type imports**

Add to the imports from `@/types/api.types`:

```typescript
import type {
  BlacklistEntry,
  CreateBlacklistDTO,
  CreatePatternDTO,
  SuspiciousPattern,
  UpdatePatternDTO,
} from '@/types/api.types';
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -10`

Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/database.ts
git commit -m "feat(api): add spam/trash lead endpoints and spam settings CRUD"
```

---

## Task 4: StatusPill Atom Variants

**Files:**
- Modify: `src/components/ui/atoms/StatusPill/StatusPill.tsx`

- [ ] **Step 1: Add review and trashed CVA variants**

In the `variants.variant` object inside `statusPillStyles`, add after the `disabled` entry:

```typescript
        review: 'bg-amber-50 text-amber-700',
        trashed: 'bg-red-50 text-red-700',
```

- [ ] **Step 2: Update StatusPillVariant type**

Add to the union:

```typescript
export type StatusPillVariant =
  | 'new'
  | 'assigned'
  | 'in-progress'
  | 'waiting-on-client'
  | 'problematic'
  | 'closed'
  | 'lost'
  | 'expired'
  | 'disabled'
  | 'review'
  | 'trashed';
```

- [ ] **Step 3: Update LABELS map**

Add entries:

```typescript
  review: 'Review',
  trashed: 'Trashed',
```

- [ ] **Step 4: Update RAW_TO_VARIANT map**

Add entries:

```typescript
  REVIEW: 'review',
  TRASHED: 'trashed',
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/atoms/StatusPill/StatusPill.tsx
git commit -m "feat(ui): add review and trashed variants to StatusPill"
```

---

## Task 5: Lead Status Meta

**Files:**
- Modify: `src/components/ui/organisms/LeadInfoModal/leadStatusMeta.ts`

- [ ] **Step 1: Add REVIEW and TRASHED to LeadStatusKey**

```typescript
export type LeadStatusKey =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN PROGRESS'
  | 'PROBLEMATIC'
  | 'WAITING_ON_CLIENT'
  | 'CLOSED'
  | 'LOST'
  | 'EXPIRED'
  | 'DISABLED'
  | 'REVIEW'
  | 'TRASHED';
```

- [ ] **Step 2: Add REVIEW and TRASHED entries to LEAD_STATUS_META**

Add after the `DISABLED` entry in `LEAD_STATUS_META`:

```typescript
  REVIEW: {
    label: 'Review',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700',
    badgeBgClass: 'bg-amber-50',
    triggerClass: 'bg-amber-50 border-amber-200 text-amber-700',
    triggerHoverClass: 'hover:bg-amber-100 hover:border-amber-300',
    triggerMetaClass: 'text-amber-700/70',
  },
  TRASHED: {
    label: 'Trashed',
    dotClass: 'bg-red-500',
    textClass: 'text-red-700',
    badgeBgClass: 'bg-red-50',
    triggerClass: 'bg-red-50 border-red-200 text-red-700',
    triggerHoverClass: 'hover:bg-red-100 hover:border-red-300',
    triggerMetaClass: 'text-red-700/70',
  },
```

- [ ] **Step 3: Add spam reason label map**

Append at the end of the file:

```typescript
// Friendly labels for machine-generated spam reason codes.
export const SPAM_REASON_LABELS: Record<string, string> = {
  blacklisted_email: 'Blacklisted Email',
  blacklisted_domain: 'Blacklisted Domain',
  suspicious_field: 'Suspicious Content',
  duplicate_email: 'Duplicate Submission',
};

export const SPAM_REASON_TONE: Record<string, string> = {
  blacklisted_email: 'bg-red-50 text-red-700',
  blacklisted_domain: 'bg-red-50 text-red-700',
  suspicious_field: 'bg-amber-50 text-amber-700',
  duplicate_email: 'bg-yellow-50 text-yellow-700',
};

export const SPAM_SCORE_META: Record<number, { label: string; tone: string }> = {
  1: { label: 'Low', tone: 'bg-yellow-50 text-yellow-700' },
  2: { label: 'Medium', tone: 'bg-amber-50 text-amber-700' },
  3: { label: 'High', tone: 'bg-red-50 text-red-700' },
};

// Auto-purge period in days (matches backend TRASH_RETENTION_DAYS).
export const TRASH_PURGE_DAYS = 30;
```

- [ ] **Step 4: Update the barrel export**

In `src/components/ui/organisms/LeadInfoModal/index.ts`, add the new exports:

```typescript
export {
  LeadInfoModal,
  type LeadInfoLead,
  type LeadInfoModalProps,
  type LeadInfoSubmitPayload,
  type LeadStatusOption,
} from './LeadInfoModal';
export {
  LEAD_STATUS_META,
  getLeadStatusMeta,
  isDestructiveStatus,
  isReasonRequired,
  SPAM_REASON_LABELS,
  SPAM_REASON_TONE,
  SPAM_SCORE_META,
  TRASH_PURGE_DAYS,
  type LeadStatusKey,
  type LeadStatusMeta,
} from './leadStatusMeta';
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/organisms/LeadInfoModal/leadStatusMeta.ts src/components/ui/organisms/LeadInfoModal/index.ts
git commit -m "feat(ui): add REVIEW/TRASHED meta, spam reason labels, and purge constant"
```

---

## Task 6: Store Extension

**Files:**
- Modify: `src/store/useLead.store.ts`

- [ ] **Step 1: Extend toRow to carry spam/trash fields**

In `src/store/useLead.store.ts`, update the `toRow` function to pass through the new fields:

```typescript
const toRow = (lead: LeadDTO | any) => ({
  'lead id': lead.id,
  date: new Date(lead.created_at ?? lead.entry_date),
  date_updated: new Date(lead.updated_at ?? lead.created_at ?? lead.entry_date),
  'lead name': pickName(lead),
  email: lead.email ?? '',
  'phone number': pickPhone(lead),
  service: pickService(lead),
  'description lead': lead.description ?? '',
  comments: lead.comments ?? '',
  lawyer: pickLawyerName(lead),
  status: lead.status,
  assigned_lawyer_id: lead.assigned_lawyer_id ?? null,
  // Spam / trash pass-through
  spam_score: lead.spam_score ?? 0,
  spam_reasons: lead.spam_reasons ?? null,
  trashed_at: lead.trashed_at ?? null,
  previous_status: lead.previous_status ?? null,
});
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add src/store/useLead.store.ts
git commit -m "feat(store): pass spam_score, spam_reasons, trashed_at, previous_status through toRow"
```

---

## Task 7: LeadInfoModal — Review & Trash Actions

**Files:**
- Modify: `src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx`
- Modify: `src/components/ui/organisms/LeadInfoModal/index.ts`

This is the largest task. The modal needs conditional rendering for REVIEW and TRASHED leads.

- [ ] **Step 1: Extend LeadInfoLead with spam/trash fields**

Update the interface in `LeadInfoModal.tsx`:

```typescript
export interface LeadInfoLead {
  id: number | string;
  name: string;
  email?: string;
  phone?: string;
  service?: string;
  description?: string;
  comments?: string;
  selectedAt?: string;
  status: string;
  // Spam / trash (optional — only populated for REVIEW/TRASHED leads)
  spam_score?: number;
  spam_reasons?: string[] | null;
  trashed_at?: string | null;
  previous_status?: string | null;
}
```

- [ ] **Step 2: Add new callback props to LeadInfoModalProps**

Update the interface:

```typescript
export interface LeadInfoModalProps {
  open: boolean;
  onClose: () => void;
  lead: LeadInfoLead | null;
  statusOptions: LeadStatusOption[];
  onSubmit: (payload: LeadInfoSubmitPayload) => Promise<void> | void;
  loading?: boolean;
  breadcrumb?: string;
  countdown?: ReactNode;
  assignableLawyers?: AssignableLawyer[];
  onAssign?: (lawyerId: number, comment: string) => Promise<void> | void;
  assignLoading?: boolean;
  // Spam review actions (REVIEW leads only)
  onMarkValid?: (id: number | string) => Promise<void> | void;
  onMarkSpam?: (id: number | string) => Promise<void> | void;
  // Trash/restore actions
  onRestore?: (id: number | string) => Promise<void> | void;
  onTrash?: (id: number | string, comment?: string) => Promise<void> | void;
  onDeletePermanent?: (id: number | string) => Promise<void> | void;
}
```

- [ ] **Step 3: Destructure new props and add status flags**

Update the component parameter destructuring (around line 97):

```typescript
export const LeadInfoModal = ({
  open,
  onClose,
  lead,
  statusOptions,
  onSubmit,
  loading = false,
  breadcrumb = 'My Leads',
  countdown,
  assignableLawyers,
  onAssign,
  assignLoading = false,
  onMarkValid,
  onMarkSpam,
  onRestore,
  onTrash,
  onDeletePermanent,
}: LeadInfoModalProps) => {
```

Add status flag constants right after the existing `const canAssign = ...` block:

```typescript
  const isReviewLead = leadStatusUpper === 'REVIEW';
  const isTrashedLead = leadStatusUpper === 'TRASHED';
  const isArchivedLead = leadStatusUpper === 'ARCHIVED';
  const isSpecialStatus = isReviewLead || isTrashedLead;
```

- [ ] **Step 4: Add imports for spam meta helpers and dayjs**

At the top of the file, add to the import from `./leadStatusMeta`:

```typescript
import {
  getLeadStatusMeta,
  isDestructiveStatus,
  isReasonRequired,
  SPAM_REASON_LABELS,
  SPAM_REASON_TONE,
  SPAM_SCORE_META,
  TRASH_PURGE_DAYS,
  type LeadStatusKey,
} from './leadStatusMeta';
```

Add dayjs import (if not already present):

```typescript
import dayjs from 'dayjs';
```

- [ ] **Step 5: Add delete confirmation state**

After the existing state declarations (around the `commentSubmitting` state), add:

```typescript
  const [confirmDelete, setConfirmDelete] = useState(false);
```

Reset it in the existing `useEffect` that runs on `[open, lead]`:

```typescript
  useEffect(() => {
    if (!open || !lead) return;
    setSelectedStatus(lead.status ?? '');
    setComment('');
    setDoNotContact(true);
    setNewComment('');
    setNewCommentType('internal');
    setAssignLawyerId('');
    setAssignReason('');
    setAssignSearch('');
    setConfirmDelete(false); // ← add this line
  }, [open, lead]);
```

- [ ] **Step 6: Update top accent stripe color**

Replace the `accentClass` line:

```typescript
  const accentClass = isDestructive
    ? 'bg-customRed'
    : isReviewLead
    ? 'bg-amber-500'
    : isTrashedLead
    ? 'bg-red-500'
    : 'bg-sky-500';
```

- [ ] **Step 7: Replace the status block with conditional rendering**

Locate the `{/* Status block */}` section (the `<section>` that contains the status dropdown, approximately lines 382–486). Replace the entire `<section className='flex flex-col gap-2'>` block with:

```tsx
                {/* Status block — conditional by lead type */}
                {isReviewLead ? (
                  // ── REVIEW: spam info + mark valid / confirm spam ──
                  <section className='flex flex-col gap-3'>
                    <span className='text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'>
                      Spam Review
                    </span>

                    {/* Spam score */}
                    {typeof lead?.spam_score === 'number' && lead.spam_score > 0 ? (
                      <div className='flex items-center gap-2'>
                        <span className='text-[11px] font-semibold text-slate-500'>Spam Score</span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold',
                            (SPAM_SCORE_META[lead.spam_score] ?? SPAM_SCORE_META[1]).tone
                          )}
                        >
                          {lead.spam_score}/3 — {(SPAM_SCORE_META[lead.spam_score] ?? SPAM_SCORE_META[1]).label}
                        </span>
                      </div>
                    ) : null}

                    {/* Spam reasons */}
                    {Array.isArray(lead?.spam_reasons) && lead.spam_reasons.length > 0 ? (
                      <div className='flex flex-wrap gap-1.5'>
                        {lead.spam_reasons.map((reason) => (
                          <span
                            key={reason}
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide',
                              SPAM_REASON_TONE[reason] ?? 'bg-slate-100 text-slate-600'
                            )}
                          >
                            {SPAM_REASON_LABELS[reason] ?? reason}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* Action buttons */}
                    <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={() => lead && onMarkValid?.(lead.id)}
                        disabled={loading}
                        className='inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-emerald-200 bg-emerald-50 text-[12px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50'
                      >
                        {loading ? 'Processing…' : 'Mark as Valid'}
                      </button>
                      <button
                        type='button'
                        onClick={() => lead && onMarkSpam?.(lead.id)}
                        disabled={loading}
                        className='inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-red-200 bg-red-50 text-[12px] font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50'
                      >
                        {loading ? 'Processing…' : 'Confirm Spam'}
                      </button>
                    </div>
                  </section>
                ) : isTrashedLead ? (
                  // ── TRASHED: auto-purge countdown + restore / delete ──
                  <section className='flex flex-col gap-3'>
                    <span className='text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'>
                      Trash
                    </span>

                    {/* Auto-purge notice */}
                    {lead?.trashed_at ? (() => {
                      const purgeDate = dayjs(lead.trashed_at).add(TRASH_PURGE_DAYS, 'day');
                      const daysLeft = Math.max(0, purgeDate.diff(dayjs(), 'day'));
                      return (
                        <div className='flex items-start gap-2.5 rounded-[10px] border border-red-200/80 bg-red-50 px-3.5 py-3 text-xs font-medium leading-[1.5] text-slate-700'>
                          <span className='text-red-500'>🗑</span>
                          <span>
                            <strong className='font-bold text-red-700'>Auto-purge in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>
                            <br />
                            <span className='text-slate-500'>
                              Trashed on {dayjs(lead.trashed_at).format('MMM D, YYYY')}
                              {lead.previous_status ? ` · Previously: ${lead.previous_status}` : ''}
                            </span>
                          </span>
                        </div>
                      );
                    })() : null}

                    {/* Action buttons */}
                    <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={() => lead && onRestore?.(lead.id)}
                        disabled={loading}
                        className='inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-sky-200 bg-sky-50 text-[12px] font-bold text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50'
                      >
                        {loading ? 'Restoring…' : 'Restore'}
                      </button>
                      <button
                        type='button'
                        onClick={() => setConfirmDelete(true)}
                        disabled={loading}
                        className='inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-red-200 bg-red-50 text-[12px] font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50'
                      >
                        Delete Permanently
                      </button>
                    </div>

                    {/* Delete confirmation inline */}
                    {confirmDelete ? (
                      <div className='rounded-[10px] border border-red-300 bg-red-50 px-3.5 py-3'>
                        <p className='mb-2 text-[12px] font-semibold text-red-800'>
                          This action cannot be undone. The lead will be permanently deleted.
                        </p>
                        <div className='flex items-center gap-2'>
                          <button
                            type='button'
                            onClick={() => setConfirmDelete(false)}
                            className='inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-50'
                          >
                            Cancel
                          </button>
                          <button
                            type='button'
                            onClick={() => {
                              if (lead) onDeletePermanent?.(lead.id);
                              setConfirmDelete(false);
                            }}
                            disabled={loading}
                            className='inline-flex h-8 items-center rounded-md bg-red-600 px-3 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50'
                          >
                            {loading ? 'Deleting…' : 'Yes, delete forever'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : (
                  // ── Normal status: existing dropdown flow ──
                  <section className='flex flex-col gap-2'>
                    <label
                      htmlFor='lead-status'
                      className='inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'
                    >
                      Status
                    </label>

                    {statusChanged ? (
                      /* … existing Current → New status comparison block (no changes) … */
                    ) : null}

                    {/* … existing select dropdown block (no changes) … */}
                  </section>
                )}
```

**Important:** The `{/* … existing … */}` comments above mean "keep the existing JSX exactly as-is". The only change is wrapping the existing section in the `else` branch of the ternary. Do NOT remove or modify the existing dropdown/comparison blocks — they go inside the `: (` branch unchanged.

- [ ] **Step 8: Hide assignment picker for special statuses**

Change the `canAssign` guard (currently only checks NEW/EXPIRED) to also exclude special statuses. Replace:

```typescript
  const canAssign =
    !!onAssign &&
    Array.isArray(assignableLawyers) &&
    (leadStatusUpper === 'NEW' || leadStatusUpper === 'EXPIRED');
```

With:

```typescript
  const canAssign =
    !!onAssign &&
    Array.isArray(assignableLawyers) &&
    !isSpecialStatus &&
    (leadStatusUpper === 'NEW' || leadStatusUpper === 'EXPIRED');
```

- [ ] **Step 9: Hide footer submit/cancel for special statuses**

The footer currently shows Cancel + Save/Mark as Lost. For REVIEW and TRASHED leads, the actions are inline in the body. Wrap the footer buttons in a conditional. Replace the footer div content:

Find the footer `<div>` (the one with `border-t border-slate-100`). Inside it, wrap the button group in a conditional:

```tsx
              {/* Footer */}
              <div className='flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-6 pb-5 pt-4'>
                <span className='inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500'>
                  {isReviewLead ? (
                    <>
                      <MdInfoOutline size={12} className='text-amber-500' />
                      Flagged for spam review
                    </>
                  ) : isTrashedLead ? (
                    <>
                      <MdInfoOutline size={12} className='text-red-500' />
                      In trash — will be auto-purged
                    </>
                  ) : isDestructive ? (
                    <>
                      <MdLock size={12} className='text-slate-400' />
                      Logged &amp; sent to super admin review
                    </>
                  ) : (
                    <>
                      <MdHistoryEdu size={12} className='text-slate-400' />
                      Changes are logged in the lead history
                    </>
                  )}
                </span>
                {!isSpecialStatus ? (
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={onClose}
                      disabled={loading}
                      className='inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-4 text-[13px] font-bold tracking-[-0.005em] text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={handleSubmit}
                      disabled={loading || reasonRequiredMissing}
                      className={cn(
                        'inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border px-4 text-[13px] font-bold tracking-[-0.005em] text-white transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
                        isDestructive
                          ? 'border-customRed bg-customRed shadow-[0_6px_16px_rgba(240,68,56,0.25)] hover:bg-red-600 focus-visible:ring-customRed/40'
                          : 'border-slate-900 bg-slate-900 hover:bg-slate-800 focus-visible:ring-slate-700/40'
                      )}
                    >
                      {loading
                        ? 'Saving…'
                        : isDestructive
                        ? 'Mark as Lost'
                        : 'Save changes'}
                    </button>
                  </div>
                ) : null}
              </div>
```

- [ ] **Step 10: Add "Move to Trash" button for normal leads**

The spec requires a "Move to Trash" action available on any lead that isn't already TRASHED or REVIEW. Add a trash button in the footer, before the Cancel button, for non-special leads:

In the footer `{!isSpecialStatus ? (` block, add before the Cancel button:

```tsx
                {!isSpecialStatus ? (
                  <div className='flex items-center gap-2'>
                    {onTrash && !isTrashedLead ? (
                      <button
                        type='button'
                        onClick={() => lead && onTrash(lead.id, comment || undefined)}
                        disabled={loading}
                        className='inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border border-red-200 bg-white px-3 text-[12px] font-bold text-red-600 transition-colors hover:bg-red-50 focus:outline-none disabled:opacity-50'
                        title='Move to Trash'
                      >
                        Move to Trash
                      </button>
                    ) : null}
                    <button ... Cancel ... />
                    <button ... Save/Mark as Lost ... />
                  </div>
                ) : null}
```

- [ ] **Step 11: Update barrel export**

In `src/components/ui/organisms/LeadInfoModal/index.ts`, the `LeadInfoLead` and `LeadInfoModalProps` are already exported. No additional re-exports needed here since the extended fields are on existing interfaces.

- [ ] **Step 12: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -15`

Expected: No new errors.

- [ ] **Step 13: Commit**

```bash
git add src/components/ui/organisms/LeadInfoModal/
git commit -m "feat(modal): conditional rendering for REVIEW (spam actions) and TRASHED (restore/delete)"
```

---

## Task 8: LeadManagement — Fixed Tabs & Conditional Fetch

**Files:**
- Modify: `src/app/(dashboard)/lead-management/LeadManagement.tsx`

This task rewires the tab system. Currently all tabs are derived from data in memory. With the new backend behavior, ARCHIVED/REVIEW/TRASHED are excluded from the default `GET /leads` response. We add fixed tabs that fetch from dedicated endpoints when clicked.

- [ ] **Step 1: Add LeadRow type fields**

Update the `LeadRow` type (around line 45) to include spam/trash fields:

```typescript
type LeadRow = {
  'lead id': number;
  date: Date;
  date_updated: Date;
  'lead name': string;
  email: string;
  'phone number': string;
  service: string;
  'description lead': string;
  comments: string;
  lawyer: string;
  status: string;
  assigned_lawyer_id: number | null;
  // Spam / trash
  spam_score: number;
  spam_reasons: string[] | null;
  trashed_at: string | null;
  previous_status: string | null;
};
```

- [ ] **Step 2: Add dedicated fetch state and functions**

After the existing state declarations (around line 152), add:

```typescript
  // Dedicated data for tabs whose leads are excluded from the default fetch.
  const [dedicatedData, setDedicatedData] = useState<LeadRow[] | null>(null);
  const [dedicatedLoading, setDedicatedLoading] = useState(false);

  // Statuses that require a dedicated API fetch (not in default GET /leads).
  const DEDICATED_TABS = ['REVIEW', 'TRASHED', 'ARCHIVED'] as const;
  type DedicatedTab = (typeof DEDICATED_TABS)[number];
  const isDedicatedTab = (s: string | null): s is DedicatedTab =>
    !!s && (DEDICATED_TABS as readonly string[]).includes(s);

  const fetchDedicated = async (status: DedicatedTab) => {
    setDedicatedLoading(true);
    setDedicatedData(null);
    let res;
    if (status === 'REVIEW') {
      res = await api.leads.review({ limit: 10000 });
    } else if (status === 'TRASHED') {
      res = await api.leads.trashList({ limit: 10000 });
    } else {
      res = await api.leads.list({ status, limit: 10000 });
    }
    setDedicatedLoading(false);
    if (!res.success || !res.data) {
      setDedicatedData([]);
      return;
    }
    const toRowLocal = (lead: any) => ({
      'lead id': lead.id,
      date: new Date(lead.created_at ?? lead.entry_date),
      date_updated: new Date(lead.updated_at ?? lead.created_at ?? lead.entry_date),
      'lead name': lead.fullName ?? lead.full_name ?? '',
      email: lead.email ?? '',
      'phone number': lead.phone ?? lead.phone_number ?? lead.number ?? '',
      service: lead.service ?? lead.lawyer_type ?? '',
      'description lead': lead.description ?? '',
      comments: lead.comments ?? '',
      lawyer: (() => {
        const dto = lead.assigned_lawyer;
        if (dto?.firstName || dto?.lastName) return `${dto.firstName ?? ''} ${dto.lastName ?? ''}`.trim();
        return 'No assigned';
      })(),
      status: lead.status,
      assigned_lawyer_id: lead.assigned_lawyer_id ?? null,
      spam_score: lead.spam_score ?? 0,
      spam_reasons: lead.spam_reasons ?? null,
      trashed_at: lead.trashed_at ?? null,
      previous_status: lead.previous_status ?? null,
    });
    setDedicatedData(res.data.data.map(toRowLocal));
  };
```

- [ ] **Step 3: Update handleStatusClick to trigger dedicated fetch**

Replace the existing `handleStatusClick`:

```typescript
  const handleStatusClick = (status: string | null) => {
    setSelecArray([]);
    setStatusFilter(status);
    if (status && isDedicatedTab(status)) {
      void fetchDedicated(status);
    } else {
      setDedicatedData(null);
    }
  };
```

- [ ] **Step 4: Update the filtered useMemo to use dedicatedData when active**

Replace the existing `filtered` useMemo:

```typescript
  const filtered = useMemo<LeadRow[]>(() => {
    // When a dedicated tab is active, use its own dataset.
    if (isDedicatedTab(statusFilter) && dedicatedData !== null) {
      const q = searchText.trim().toLowerCase();
      if (!q) return dedicatedData;
      return dedicatedData.filter(
        (l) =>
          l['lead name']?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l['phone number']?.toLowerCase().includes(q) ||
          l.status?.toLowerCase().includes(q) ||
          String(l['lead id']).includes(q)
      );
    }

    if (!dataLeads) return [];
    let list = dataLeads as LeadRow[];

    if (selecArray.length > 0) {
      const set = new Set(selecArray.map((s) => s.toLowerCase()));
      list = list.filter((l) => set.has(l.status?.toLowerCase()));
    } else if (statusFilter) {
      list = list.filter((l) => l.status === statusFilter);
    } else {
      list = list.filter((l) => l.status !== 'ARCHIVED');
    }

    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l['lead name']?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l['phone number']?.toLowerCase().includes(q) ||
          l.status?.toLowerCase().includes(q) ||
          String(l['lead id']).includes(q)
      );
    }
    return list;
  }, [dataLeads, selecArray, statusFilter, searchText, dedicatedData]);
```

- [ ] **Step 5: Add fixed tabs for REVIEW, TRASHED, ARCHIVED in the toolbar**

Locate the toolbar section (the `{uniqueStatuses.map(…)}` block around line 883). After the map, add fixed tabs. Replace the entire filter buttons section with:

```tsx
        <FilterButton
          label='All'
          active={!statusFilter && selecArray.length === 0}
          onClick={() => handleStatusClick(null)}
        />
        {uniqueStatuses.map((s) => {
          const niceLabel =
            statusSelectAll.find((it) => it.value === s)?.name ?? s;
          return (
            <FilterButton
              key={s}
              label={niceLabel}
              active={statusFilter === s}
              onClick={() => handleStatusClick(s)}
            />
          );
        })}
        {/* Fixed tabs for statuses excluded from default fetch */}
        <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
        <FilterButton
          label='Review'
          active={statusFilter === 'REVIEW'}
          onClick={() => handleStatusClick('REVIEW')}
        />
        <FilterButton
          label='Trash'
          active={statusFilter === 'TRASHED'}
          onClick={() => handleStatusClick('TRASHED')}
        />
        <FilterButton
          label='Archived'
          active={statusFilter === 'ARCHIVED'}
          onClick={() => handleStatusClick('ARCHIVED')}
        />
```

- [ ] **Step 6: Remove ARCHIVED from uniqueStatuses to avoid duplicate tab**

Since ARCHIVED might still appear in data (edge case), filter it out from dynamic tabs. Update `uniqueStatuses`:

```typescript
  const uniqueStatuses = useMemo<string[]>(() => {
    if (!dataLeads) return [];
    return Array.from(new Set((dataLeads as any[]).map((l) => l.status)))
      .filter((s) => s !== 'ARCHIVED' && s !== 'REVIEW' && s !== 'TRASHED');
  }, [dataLeads]);
```

- [ ] **Step 7: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -15`

- [ ] **Step 8: Commit**

```bash
git add src/app/(dashboard)/lead-management/LeadManagement.tsx
git commit -m "feat(leads): fixed tabs for Review/Trash/Archived with dedicated API fetch"
```

---

## Task 9: LeadManagement — Modal Integration & Trash Action

**Files:**
- Modify: `src/app/(dashboard)/lead-management/LeadManagement.tsx`

Wire the new modal callbacks and add "Move to Trash" as a bulk action.

- [ ] **Step 1: Add handler functions for the new modal actions**

After the existing `handleSaveLead` function, add:

```typescript
  const handleMarkValid = async (id: number | string) => {
    setLoading(true);
    const res = await api.leads.markValid(Number(id));
    setLoading(false);
    if (!res.success) {
      toast.error(res.message || 'Error marking lead as valid');
      return;
    }
    toast.success('Lead marked as valid — moved to New');
    setSelectedLead({});
    setIsOpenLead(false);
    if (isDedicatedTab(statusFilter)) void fetchDedicated(statusFilter);
    else await fetchLeads();
  };

  const handleMarkSpam = async (id: number | string) => {
    setLoading(true);
    const res = await api.leads.markSpam(Number(id));
    setLoading(false);
    if (!res.success) {
      toast.error(res.message || 'Error confirming spam');
      return;
    }
    toast.success('Lead confirmed as spam — moved to Trash');
    setSelectedLead({});
    setIsOpenLead(false);
    if (isDedicatedTab(statusFilter)) void fetchDedicated(statusFilter);
    else await fetchLeads();
  };

  const handleRestore = async (id: number | string) => {
    setLoading(true);
    const res = await api.leads.restore(Number(id));
    setLoading(false);
    if (!res.success) {
      toast.error(res.message || 'Error restoring lead');
      return;
    }
    toast.success('Lead restored successfully');
    setSelectedLead({});
    setIsOpenLead(false);
    if (isDedicatedTab(statusFilter)) void fetchDedicated(statusFilter);
    else await fetchLeads();
  };

  const handleTrash = async (id: number | string, comment?: string) => {
    setLoading(true);
    const res = await api.leads.trash(Number(id), comment ? { comment } : undefined);
    setLoading(false);
    if (!res.success) {
      toast.error(res.message || 'Error moving lead to trash');
      return;
    }
    toast.success('Lead moved to trash');
    setSelectedLead({});
    setIsOpenLead(false);
    await fetchLeads();
  };

  const handleDeletePermanent = async (id: number | string) => {
    setLoading(true);
    const res = await database.deleteData(
      `${process.env.NEXT_PUBLIC_URL}/leads/${Number(id)}`
    );
    setLoading(false);
    if (!res.success) {
      toast.error('Error deleting lead permanently');
      return;
    }
    toast.success('Lead permanently deleted');
    setSelectedLead({});
    setIsOpenLead(false);
    if (isDedicatedTab(statusFilter)) void fetchDedicated(statusFilter);
    else await fetchLeads();
  };
```

- [ ] **Step 2: Pass new props to LeadInfoModal**

Update the `<LeadInfoModal>` JSX to include the new props. After the existing `assignLoading` prop, add:

```tsx
        onMarkValid={handleMarkValid}
        onMarkSpam={handleMarkSpam}
        onRestore={handleRestore}
        onTrash={handleTrash}
        onDeletePermanent={handleDeletePermanent}
```

- [ ] **Step 3: Pass spam/trash fields to the lead prop**

Update the `lead` prop object to include the new fields. After `status: selectedLead.status`, add:

```tsx
                spam_score: selectedLead.spam_score,
                spam_reasons: selectedLead.spam_reasons,
                trashed_at: selectedLead.trashed_at,
                previous_status: selectedLead.previous_status,
```

- [ ] **Step 4: Add statusOptions case for REVIEW and TRASHED**

Update the `statusOptions` conditional (around line 791). The REVIEW and TRASHED leads don't use the dropdown (the modal hides it), but we still need to return an array to avoid a type error. Add cases before the existing ternary:

```tsx
        statusOptions={
          selectedLead.status === 'REVIEW' || selectedLead.status === 'TRASHED'
            ? []
            : selectedLead.status === 'ARCHIVED'
            ? STATUS_OPTIONS_ARCHIVED
            : selectedLead.status === 'DISABLED' ||
              selectedLead.status === 'LOST'
            ? STATUS_OPTIONS_DISABLED
            : selectedLead.status === 'NEW' ||
              selectedLead.status === 'EXPIRED'
            ? STATUS_OPTIONS_NEW
            : STATUS_OPTIONS_SELECT
        }
```

- [ ] **Step 5: Add "Move to Trash" bulk action**

In the `bulkActions` array (around line 567), add before the "delete" entry:

```typescript
    {
      key: 'trash',
      label: 'Move to Trash',
      icon: <MdDeleteOutline size={14} />,
      onClick: () => openBulkDialog('trash'),
    },
```

Update the `BulkDialogType` to include 'trash':

```typescript
type BulkDialogType = 'assign' | 'status' | 'archive' | 'delete' | 'trash' | null;
```

- [ ] **Step 6: Add bulk trash dialog and handler**

After the existing bulk delete dialog JSX, add the trash dialog:

```tsx
      {/* Bulk: Move to Trash */}
      <ConfirmationDialog
        open={bulkDialog === 'trash'}
        onClose={closeBulkDialog}
        title='Move to Trash'
        subtitle='These leads will be moved to trash and auto-purged after 30 days.'
        fields={[
          { label: 'Action', value: 'Move to trash' },
          {
            label: 'Leads affected',
            value: `${selectedIds.size} ${selectedIds.size === 1 ? 'lead' : 'leads'}`,
          },
          { label: 'IDs', value: previewIds || '—' },
        ]}
        notice='Trashed leads can be restored before the purge date.'
        confirmLabel='Move to Trash'
        onConfirm={handleConfirmTrash}
        loading={bulkLoading}
        confirmDisabled={bulkComment.trim().length === 0}
      >
        <BulkCommentField
          value={bulkComment}
          onChange={setBulkComment}
          disabled={bulkLoading}
          placeholder='Why are these leads being trashed?'
        />
      </ConfirmationDialog>
```

Add the `handleConfirmTrash` function alongside the existing bulk handlers:

```typescript
  const handleConfirmTrash = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ lead_id: number; message: string }> = [];
    for (const id of selectedIds) {
      const res = await api.leads.trash(id, bulkComment.trim() ? { comment: bulkComment.trim() } : undefined);
      if (res.success) {
        succeeded++;
      } else {
        failed++;
        errors.push({ lead_id: id, message: res.message || 'Unknown error' });
      }
    }
    setBulkLoading(false);
    if (summarizeBulkResult('trash', {
      success: true,
      data: { total: selectedIds.size, succeeded, failed, errors },
    })) finishBulk();
  };
```

**Note:** `summarizeBulkResult` and `finishBulk` are existing helper functions in the component — verify they exist and accept these args. If `summarizeBulkResult` expects a specific shape, pass a `BulkResult` object. If `finishBulk` doesn't exist by that name, look for the cleanup function that clears bulk state and calls `fetchLeads()`.

- [ ] **Step 7: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -15`

- [ ] **Step 8: Commit**

```bash
git add src/app/(dashboard)/lead-management/LeadManagement.tsx
git commit -m "feat(leads): wire modal spam/trash actions + bulk Move to Trash"
```

---

## Task 10: Routes & Middleware

**Files:**
- Modify: `src/routes/routes.ts`
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add Spam Settings route to sidebar**

In `src/routes/routes.ts`, add a new item after the "Leads" entry (before the lawyer routes):

```typescript
  {
    name: 'Spam Settings',
    route: '/spam-settings',
    icon: MdWork,
    rol: ['admin'],
    group: 'Management',
  },
```

**Note:** Using `MdWork` to avoid adding a new icon import. If you prefer a different icon, add `MdSecurity` or `MdShield` to the import list from `react-icons/md`.

- [ ] **Step 2: Protect /spam-settings in middleware**

In `src/middleware.ts`, add `'/spam-settings'` to the `protectedRoutesAdmin` array:

```typescript
  const protectedRoutesAdmin = [
    '/lawyer-management',
    '/lawyer-management/assigned-leads',
    '/lawyer-management/lost-leads',
    '/lawyer-management/reassigned-leads',
    '/lead-management',
    '/dashboard',
    '/spam-settings',
  ];
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 4: Commit**

```bash
git add src/routes/routes.ts src/middleware.ts
git commit -m "feat(nav): add Spam Settings route and middleware protection"
```

---

## Task 11: Spam Settings Page

**Files:**
- Create: `src/app/(dashboard)/spam-settings/page.tsx`
- Create: `src/app/(dashboard)/spam-settings/SpamSettings.tsx`

This is the standalone CRUD page for Blacklist + Suspicious Patterns.

- [ ] **Step 1: Create the page wrapper**

Create `src/app/(dashboard)/spam-settings/page.tsx`:

```tsx
import SpamSettings from './SpamSettings';

export default function SpamSettingsPage() {
  return <SpamSettings />;
}
```

- [ ] **Step 2: Create SpamSettings component**

Create `src/app/(dashboard)/spam-settings/SpamSettings.tsx`:

```tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdAdd,
  MdClose,
  MdDeleteOutline,
  MdEdit,
} from 'react-icons/md';
import { api } from '@/services/database';
import type {
  BlacklistEntry,
  CreateBlacklistDTO,
  CreatePatternDTO,
  SuspiciousPattern,
  UpdatePatternDTO,
} from '@/types/api.types';
import {
  DataTable,
  FilterButton,
  PageHead,
  type DataTableColumn,
} from '@/components/ui';

type ActiveTab = 'blacklist' | 'patterns';

// ─── Blacklist form state ────────────────────────────────────────────
interface BlacklistForm {
  type: 'email' | 'domain';
  value: string;
}
const emptyBlacklistForm: BlacklistForm = { type: 'email', value: '' };

// ─── Pattern form state ──────────────────────────────────────────────
interface PatternForm {
  field_name: SuspiciousPattern['field_name'];
  pattern: string;
  description: string;
  is_active: boolean;
}
const emptyPatternForm: PatternForm = {
  field_name: 'full_name',
  pattern: '',
  description: '',
  is_active: true,
};

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const SpamSettings = () => {
  const [tab, setTab] = useState<ActiveTab>('blacklist');

  // ── Blacklist state ──
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [blLoading, setBlLoading] = useState(false);
  const [blForm, setBlForm] = useState<BlacklistForm>(emptyBlacklistForm);
  const [blDialogOpen, setBlDialogOpen] = useState(false);
  const [blSubmitting, setBlSubmitting] = useState(false);

  // ── Patterns state ──
  const [patterns, setPatterns] = useState<SuspiciousPattern[]>([]);
  const [ptLoading, setPtLoading] = useState(false);
  const [ptForm, setPtForm] = useState<PatternForm>(emptyPatternForm);
  const [ptDialogOpen, setPtDialogOpen] = useState(false);
  const [ptSubmitting, setPtSubmitting] = useState(false);
  const [editingPatternId, setEditingPatternId] = useState<number | null>(null);

  // ── Fetch functions ──
  const fetchBlacklist = async () => {
    setBlLoading(true);
    const res = await api.spam.blacklist.list({ limit: 500 });
    setBlLoading(false);
    if (res.success && res.data) {
      setBlacklist(res.data.data ?? []);
    }
  };

  const fetchPatterns = async () => {
    setPtLoading(true);
    const res = await api.spam.patterns.list({ limit: 500 });
    setPtLoading(false);
    if (res.success && res.data) {
      setPatterns(res.data.data ?? []);
    }
  };

  useEffect(() => {
    void fetchBlacklist();
    void fetchPatterns();
  }, []);

  // ── Blacklist CRUD ──
  const handleCreateBlacklist = async () => {
    if (!blForm.value.trim()) return;
    setBlSubmitting(true);
    const res = await api.spam.blacklist.create({
      type: blForm.type,
      value: blForm.value.trim(),
    });
    setBlSubmitting(false);
    if (!res.success) {
      toast.error(res.message || 'Error adding blacklist entry');
      return;
    }
    toast.success('Blacklist entry added');
    setBlForm(emptyBlacklistForm);
    setBlDialogOpen(false);
    void fetchBlacklist();
  };

  const handleDeleteBlacklist = async (id: number) => {
    const res = await api.spam.blacklist.delete(id);
    if (!res.success) {
      toast.error(res.message || 'Error deleting entry');
      return;
    }
    toast.success('Entry deleted');
    void fetchBlacklist();
  };

  // ── Pattern CRUD ──
  const openCreatePattern = () => {
    setPtForm(emptyPatternForm);
    setEditingPatternId(null);
    setPtDialogOpen(true);
  };

  const openEditPattern = (p: SuspiciousPattern) => {
    setPtForm({
      field_name: p.field_name,
      pattern: p.pattern,
      description: p.description ?? '',
      is_active: p.is_active,
    });
    setEditingPatternId(p.id);
    setPtDialogOpen(true);
  };

  const handleSubmitPattern = async () => {
    if (!ptForm.pattern.trim()) return;
    setPtSubmitting(true);

    if (editingPatternId) {
      const body: UpdatePatternDTO = {
        field_name: ptForm.field_name,
        pattern: ptForm.pattern.trim(),
        description: ptForm.description.trim() || undefined,
        is_active: ptForm.is_active,
      };
      const res = await api.spam.patterns.update(editingPatternId, body);
      setPtSubmitting(false);
      if (!res.success) {
        toast.error(res.message || 'Error updating pattern');
        return;
      }
      toast.success('Pattern updated');
    } else {
      const body: CreatePatternDTO = {
        field_name: ptForm.field_name,
        pattern: ptForm.pattern.trim(),
        description: ptForm.description.trim() || undefined,
        is_active: ptForm.is_active,
      };
      const res = await api.spam.patterns.create(body);
      setPtSubmitting(false);
      if (!res.success) {
        toast.error(res.message || 'Error creating pattern');
        return;
      }
      toast.success('Pattern created');
    }

    setPtForm(emptyPatternForm);
    setEditingPatternId(null);
    setPtDialogOpen(false);
    void fetchPatterns();
  };

  const handleDeletePattern = async (id: number) => {
    const res = await api.spam.patterns.delete(id);
    if (!res.success) {
      toast.error(res.message || 'Error deleting pattern');
      return;
    }
    toast.success('Pattern deleted');
    void fetchPatterns();
  };

  const handleTogglePattern = async (p: SuspiciousPattern) => {
    const res = await api.spam.patterns.update(p.id, { is_active: !p.is_active });
    if (!res.success) {
      toast.error(res.message || 'Error toggling pattern');
      return;
    }
    void fetchPatterns();
  };

  // ── Blacklist columns ──
  const blColumns: DataTableColumn<BlacklistEntry>[] = [
    {
      key: 'type',
      label: 'Type',
      width: '100px',
      sortable: true,
      accessor: (r) => r.type,
      render: (r) => (
        <span className='rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600'>
          {r.type}
        </span>
      ),
    },
    {
      key: 'value',
      label: 'Value',
      width: '1fr',
      sortable: true,
      accessor: (r) => r.value,
      render: (r) => <span className='text-[13px] font-semibold text-slate-900'>{r.value}</span>,
    },
    {
      key: 'created_at',
      label: 'Created',
      width: '140px',
      sortable: true,
      accessor: (r) => new Date(r.created_at).getTime(),
      render: (r) => <span className='text-[12px] text-slate-500'>{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions',
      label: '',
      width: '50px',
      render: (r) => (
        <button
          type='button'
          onClick={(e) => { e.stopPropagation(); handleDeleteBlacklist(r.id); }}
          className='flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500'
          title='Delete'
        >
          <MdDeleteOutline size={16} />
        </button>
      ),
    },
  ];

  // ── Pattern columns ──
  const ptColumns: DataTableColumn<SuspiciousPattern>[] = [
    {
      key: 'field_name',
      label: 'Field',
      width: '120px',
      sortable: true,
      accessor: (r) => r.field_name,
      render: (r) => (
        <span className='rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600'>
          {r.field_name}
        </span>
      ),
    },
    {
      key: 'pattern',
      label: 'Pattern',
      width: 'minmax(150px, 1fr)',
      sortable: true,
      accessor: (r) => r.pattern,
      render: (r) => <span className='text-[13px] font-semibold text-slate-900'>{r.pattern}</span>,
    },
    {
      key: 'description',
      label: 'Description',
      width: 'minmax(150px, 1fr)',
      render: (r) => (
        <span className='text-[12px] text-slate-500'>{r.description || '—'}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Active',
      width: '70px',
      sortable: true,
      accessor: (r) => (r.is_active ? 1 : 0),
      render: (r) => (
        <button
          type='button'
          onClick={(e) => { e.stopPropagation(); handleTogglePattern(r); }}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            r.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
          }`}
        >
          {r.is_active ? 'On' : 'Off'}
        </button>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '80px',
      render: (r) => (
        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={(e) => { e.stopPropagation(); openEditPattern(r); }}
            className='flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600'
            title='Edit'
          >
            <MdEdit size={14} />
          </button>
          <button
            type='button'
            onClick={(e) => { e.stopPropagation(); handleDeletePattern(r.id); }}
            className='flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500'
            title='Delete'
          >
            <MdDeleteOutline size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className='flex flex-col gap-4 min-h-0 flex-1'>
      <PageHead title='Spam Settings' />

      {/* Tabs */}
      <div className='flex items-center gap-2.5'>
        <FilterButton
          label='Blacklist'
          active={tab === 'blacklist'}
          onClick={() => setTab('blacklist')}
          count={blacklist.length}
        />
        <FilterButton
          label='Suspicious Patterns'
          active={tab === 'patterns'}
          onClick={() => setTab('patterns')}
          count={patterns.length}
        />
      </div>

      {/* ── BLACKLIST TAB ── */}
      {tab === 'blacklist' ? (
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <span className='text-[13px] font-medium text-slate-500'>
              Blocked emails and domains won&apos;t generate leads.
            </span>
            <button
              type='button'
              onClick={() => { setBlForm(emptyBlacklistForm); setBlDialogOpen(true); }}
              className='inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-slate-900 px-3 text-[12px] font-bold text-white hover:bg-slate-800'
            >
              <MdAdd size={14} />
              Add Entry
            </button>
          </div>

          <DataTable<BlacklistEntry>
            columns={blColumns}
            data={blacklist}
            rowKey={(r) => r.id}
            pagination={{ enabled: true, initialPageSize: 20 }}
            totalLabel='entries'
            initialSort={{ key: 'created_at', direction: 'desc' }}
            emptyState={
              <div className='flex flex-col items-center gap-1 py-6'>
                <span className='text-[13px] font-semibold text-slate-700'>No blacklist entries</span>
                <span className='text-[11px] text-slate-400'>Add emails or domains to block.</span>
              </div>
            }
          />

          {/* Add blacklist dialog */}
          {blDialogOpen ? (
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]'>
              <div className='w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl'>
                <div className='mb-4 flex items-center justify-between'>
                  <h3 className='text-[16px] font-extrabold text-slate-900'>Add to Blacklist</h3>
                  <button type='button' onClick={() => setBlDialogOpen(false)} className='text-slate-400 hover:text-slate-600'>
                    <MdClose size={18} />
                  </button>
                </div>
                <div className='flex flex-col gap-3'>
                  <div>
                    <label className='mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500'>Type</label>
                    <select
                      value={blForm.type}
                      onChange={(e) => setBlForm({ ...blForm, type: e.target.value as 'email' | 'domain' })}
                      className='h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] text-slate-700'
                    >
                      <option value='email'>Email</option>
                      <option value='domain'>Domain</option>
                    </select>
                  </div>
                  <div>
                    <label className='mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500'>Value</label>
                    <input
                      type='text'
                      value={blForm.value}
                      onChange={(e) => setBlForm({ ...blForm, value: e.target.value })}
                      placeholder={blForm.type === 'email' ? 'spam@example.com' : 'sketchy-domain.ru'}
                      className='h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] text-slate-700 placeholder:text-slate-400'
                    />
                  </div>
                  <div className='flex items-center justify-end gap-2 pt-1'>
                    <button
                      type='button'
                      onClick={() => setBlDialogOpen(false)}
                      className='h-9 rounded-md border border-slate-200 px-3 text-[12px] font-bold text-slate-600 hover:bg-slate-50'
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={handleCreateBlacklist}
                      disabled={blSubmitting || !blForm.value.trim()}
                      className='h-9 rounded-md bg-slate-900 px-4 text-[12px] font-bold text-white hover:bg-slate-800 disabled:opacity-50'
                    >
                      {blSubmitting ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── PATTERNS TAB ── */}
      {tab === 'patterns' ? (
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <span className='text-[13px] font-medium text-slate-500'>
              Patterns flag incoming leads for admin review.
            </span>
            <button
              type='button'
              onClick={openCreatePattern}
              className='inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-slate-900 px-3 text-[12px] font-bold text-white hover:bg-slate-800'
            >
              <MdAdd size={14} />
              Add Pattern
            </button>
          </div>

          <DataTable<SuspiciousPattern>
            columns={ptColumns}
            data={patterns}
            rowKey={(r) => r.id}
            pagination={{ enabled: true, initialPageSize: 20 }}
            totalLabel='patterns'
            initialSort={{ key: 'field_name', direction: 'asc' }}
            emptyState={
              <div className='flex flex-col items-center gap-1 py-6'>
                <span className='text-[13px] font-semibold text-slate-700'>No suspicious patterns</span>
                <span className='text-[11px] text-slate-400'>Add patterns to flag incoming leads.</span>
              </div>
            }
          />

          {/* Add/edit pattern dialog */}
          {ptDialogOpen ? (
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]'>
              <div className='w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl'>
                <div className='mb-4 flex items-center justify-between'>
                  <h3 className='text-[16px] font-extrabold text-slate-900'>
                    {editingPatternId ? 'Edit Pattern' : 'Add Pattern'}
                  </h3>
                  <button type='button' onClick={() => setPtDialogOpen(false)} className='text-slate-400 hover:text-slate-600'>
                    <MdClose size={18} />
                  </button>
                </div>
                <div className='flex flex-col gap-3'>
                  <div>
                    <label className='mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500'>Field</label>
                    <select
                      value={ptForm.field_name}
                      onChange={(e) => setPtForm({ ...ptForm, field_name: e.target.value as SuspiciousPattern['field_name'] })}
                      className='h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] text-slate-700'
                    >
                      <option value='full_name'>Full Name</option>
                      <option value='email'>Email</option>
                      <option value='description'>Description</option>
                      <option value='number'>Phone Number</option>
                    </select>
                  </div>
                  <div>
                    <label className='mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500'>Pattern</label>
                    <input
                      type='text'
                      value={ptForm.pattern}
                      onChange={(e) => setPtForm({ ...ptForm, pattern: e.target.value })}
                      placeholder='e.g. Test, Admin, Jackpot'
                      className='h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] text-slate-700 placeholder:text-slate-400'
                    />
                  </div>
                  <div>
                    <label className='mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500'>
                      Description <span className='font-normal text-slate-400'>(optional)</span>
                    </label>
                    <input
                      type='text'
                      value={ptForm.description}
                      onChange={(e) => setPtForm({ ...ptForm, description: e.target.value })}
                      placeholder='Why this pattern exists'
                      className='h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] text-slate-700 placeholder:text-slate-400'
                    />
                  </div>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => setPtForm({ ...ptForm, is_active: !ptForm.is_active })}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        ptForm.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {ptForm.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <div className='flex items-center justify-end gap-2 pt-1'>
                    <button
                      type='button'
                      onClick={() => setPtDialogOpen(false)}
                      className='h-9 rounded-md border border-slate-200 px-3 text-[12px] font-bold text-slate-600 hover:bg-slate-50'
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={handleSubmitPattern}
                      disabled={ptSubmitting || !ptForm.pattern.trim()}
                      className='h-9 rounded-md bg-slate-900 px-4 text-[12px] font-bold text-white hover:bg-slate-800 disabled:opacity-50'
                    >
                      {ptSubmitting ? 'Saving…' : editingPatternId ? 'Save Changes' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default SpamSettings;
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -15`

- [ ] **Step 4: Verify the page renders**

Run: `pnpm dev`

Navigate to `http://localhost:3002/spam-settings` (as admin). Should see the page with two tabs.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/spam-settings/
git commit -m "feat(spam): add Spam Settings page with Blacklist and Patterns CRUD"
```

---

## Task 12: Build Verification & Smoke Test

- [ ] **Step 1: Full TypeScript check**

Run: `npx tsc --noEmit 2>&1`

Fix any new errors. The only pre-existing error should be in `tests/e2e/specs/10-items-audit.spec.ts` (CSSStyleDeclaration cast).

- [ ] **Step 2: Build check**

Run: `pnpm build 2>&1 | tail -20`

Expected: Successful build.

- [ ] **Step 3: Lint check**

Run: `pnpm lint 2>&1 | tail -10`

Fix any lint errors in modified/created files.

- [ ] **Step 4: Manual smoke test checklist**

1. Login as admin → sidebar shows "Spam Settings" item
2. Navigate to Lead Management → see fixed tabs: Review, Trash, Archived (after dynamic tabs)
3. Click "Review" tab → loads from `/leads/review` endpoint (may show empty if no REVIEW leads)
4. Click "Trash" tab → loads from `/leads/trash` endpoint
5. Click "Archived" tab → loads archived leads
6. Click "All" → returns to normal view
7. Navigate to Spam Settings → see Blacklist and Patterns tabs
8. Click "Add Entry" → dialog opens, can submit
9. Click "Add Pattern" → dialog opens, can submit
10. Open a lead modal → normal status dropdown works as before
11. (If REVIEW lead exists) Open → see spam score, reasons, Mark Valid / Confirm Spam buttons
12. (If TRASHED lead exists) Open → see purge countdown, Restore / Delete Permanently

- [ ] **Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: address build/lint issues from spam-trash integration"
```

---

## Spec Coverage Verification

| Spec Section | Task |
|---|---|
| Lead entity new fields (trashed_at, previous_status, spam_score, spam_reasons) | Task 1 Step 2, Task 6 |
| LeadStatus REVIEW + TRASHED | Task 1 Step 1 |
| GET /leads excludes ARCHIVED/TRASHED/REVIEW | Task 8 Steps 3-4 (dedicated fetch) |
| Review tab in Lead Management | Task 8 Step 5 |
| Trash tab in Lead Management | Task 8 Step 5 |
| Archived tab preserved | Task 8 Step 5 |
| Status badge for REVIEW (amber/warning) | Task 4, Task 5 |
| Status badge for TRASHED (red) | Task 4, Task 5 |
| Spam score display in modal | Task 7 Step 7 |
| Spam reasons chips in modal | Task 7 Step 7 |
| Mark as Valid button | Task 7 Step 7, Task 9 Step 1 |
| Confirm Spam button | Task 7 Step 7, Task 9 Step 1 |
| Restore button (TRASHED/ARCHIVED) | Task 7 Step 7, Task 9 Step 1 |
| Delete Permanently button | Task 7 Step 7, Task 9 Step 1 |
| Auto-purge countdown | Task 7 Step 7 |
| Move to Trash action (individual, modal) | Task 7 Step 10 |
| Move to Trash action (bulk) | Task 9 Steps 5-6 |
| Spam Settings: Blacklist CRUD | Task 11 Step 2 |
| Spam Settings: Patterns CRUD | Task 11 Step 2 |
| Sidebar navigation for Spam Settings | Task 10 Step 1 |
| Middleware protection for /spam-settings | Task 10 Step 2 |
| API endpoints: review, trash, markValid, markSpam, restore | Task 3 Steps 1, 3 |
| SPAM_REASON_LABELS mapping | Task 5 Step 3 |
