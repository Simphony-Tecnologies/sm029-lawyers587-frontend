# WAITING_ON_CLIENT Status Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the backend's new `WAITING_ON_CLIENT` status as a first-class citizen across the entire frontend — type system, shared UI, lawyer views, and admin views.

**Architecture:** Pure additive change. Add the status to all type unions, display mappings, option arrays, and active-status sets. No new components, no new API calls, no new routes. The scaffolding (KPI, pipeline, sidebar route) already exists but is disabled with type casts and null guards — this plan converts them to real support.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, Zustand, CVA (class-variance-authority)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/api.types.ts` | Modify line 17 | Master LeadStatus union |
| `src/store/useSelectStatus.ts` | Modify line 3-10 | Status filter store union |
| `src/components/ui/organisms/LeadInfoModal/leadStatusMeta.ts` | Modify lines 1-9, 21-94, 103 | Status styling, labels, reason-required set |
| `src/components/ui/atoms/StatusPill/StatusPill.tsx` | Modify lines 9-60 | Pill variant, label, mapping |
| `src/constants/status.ts` | Modify lines 1-39 | Global status dropdown options |
| `src/configs/statusColor.ts` | Modify lines 1-12 | Hex color for charts |
| `src/components/Layout/Sidebar.tsx` | Modify line 87 | Enable lawyer sidebar item |
| `src/app/(dashboard)/dash-lawyers/DashboardLawyers.tsx` | Modify lines 75, 87-95, 207 | Remove casts, add action tone |
| `src/app/(dashboard)/all-leads/AllLeads.tsx` | Modify lines 48-53, 168-169 | Lawyer status options + reason check |
| `src/app/(dashboard)/lead-management/LeadManagement.tsx` | Modify lines 70-78, 102-109 | Admin status options (single + bulk) |
| `src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx` | Modify lines 95-103, 105, 109-120, 643-644 | Lawyer detail: options, active set, labels, reason |
| `src/app/(dashboard)/lawyer-management/LawyerManagement.tsx` | Modify lines 193-198 | Active leads count filter |
| `src/app/(dashboard)/lawyer-management/assigned-leads/AssignedLeads.tsx` | Modify line 30 | Active statuses set |

---

### Task 1: Type System Foundation

Add `WAITING_ON_CLIENT` to every type union so the rest of the plan compiles.

**Files:**
- Modify: `src/types/api.types.ts:7-17`
- Modify: `src/store/useSelectStatus.ts:3-10`

- [ ] **Step 1: Add to LeadStatus union**

In `src/types/api.types.ts`, add `'WAITING_ON_CLIENT'` after `'SEND_BACK'`:

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
  | 'WAITING_ON_CLIENT';
```

- [ ] **Step 2: Add to useSelectStatus store union**

In `src/store/useSelectStatus.ts`, add `'WAITING_ON_CLIENT'` to the `status` type:

```typescript
type status =
  | 'NEW'
  | 'ASSIGNED'
  | 'PROBLEMATIC'
  | 'IN PROGRESS'
  | 'LOST'
  | 'EXPIRED'
  | 'DISABLED'
  | 'WAITING_ON_CLIENT';
```

- [ ] **Step 3: Verify no new type errors**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | grep -v "tests/e2e" | tail -20`
Expected: No new errors (existing e2e test error is pre-existing)

---

### Task 2: Shared UI — StatusPill + leadStatusMeta + constants

Wire the display layer so the status renders correctly everywhere.

**Files:**
- Modify: `src/components/ui/atoms/StatusPill/StatusPill.tsx:9-60`
- Modify: `src/components/ui/organisms/LeadInfoModal/leadStatusMeta.ts:1-9,21-94,103`
- Modify: `src/constants/status.ts:1-39`
- Modify: `src/configs/statusColor.ts:1-12`

- [ ] **Step 1: Add StatusPill variant**

In `src/components/ui/atoms/StatusPill/StatusPill.tsx`:

Add to `statusPillStyles` variants object (after `'in-progress'` line):
```typescript
        'waiting-on-client': 'bg-orange-50 text-orange-700',
```

Add to `StatusPillVariant` type (after `'in-progress'`):
```typescript
  | 'waiting-on-client'
```

Add to `LABELS` record (after `'in-progress'` entry):
```typescript
  'waiting-on-client': 'Waiting on Client',
```

Add to `RAW_TO_VARIANT` record (after `'IN PROGRESS'` entry):
```typescript
  WAITING_ON_CLIENT: 'waiting-on-client',
```

- [ ] **Step 2: Add leadStatusMeta entry**

In `src/components/ui/organisms/LeadInfoModal/leadStatusMeta.ts`:

Add `'WAITING_ON_CLIENT'` to `LeadStatusKey` union (after `'PROBLEMATIC'`):
```typescript
  | 'WAITING_ON_CLIENT'
```

Add to `LEAD_STATUS_META` object (after the PROBLEMATIC entry):
```typescript
  WAITING_ON_CLIENT: {
    label: 'Waiting on Client',
    dotClass: 'bg-orange-500',
    textClass: 'text-orange-700',
    badgeBgClass: 'bg-orange-50',
    triggerClass: 'bg-orange-50 border-orange-200 text-orange-700',
    triggerHoverClass: 'hover:bg-orange-100 hover:border-orange-300',
    triggerMetaClass: 'text-orange-700/70',
  },
```

Add `'WAITING_ON_CLIENT'` to `REASON_REQUIRED_STATUSES` set (backend requires comment):
```typescript
const REASON_REQUIRED_STATUSES = new Set(['LOST', 'PROBLEMATIC', 'SEND_BACK', 'WAITING_ON_CLIENT']);
```

- [ ] **Step 3: Add to status constants**

In `src/constants/status.ts`, add after the `'Flagged'` entry:
```typescript
  {
    name: 'Waiting on Client',
    value: 'WAITING_ON_CLIENT',
  },
```

- [ ] **Step 4: Add to statusColor config**

In `src/configs/statusColor.ts`, add after `PROBLEMATIC`:
```typescript
  WAITING_ON_CLIENT: '#FF9066',
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | grep -v "tests/e2e" | tail -20`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add src/types/api.types.ts src/store/useSelectStatus.ts src/components/ui/atoms/StatusPill/StatusPill.tsx src/components/ui/organisms/LeadInfoModal/leadStatusMeta.ts src/constants/status.ts src/configs/statusColor.ts
git commit -m "feat(status): add WAITING_ON_CLIENT to type system and shared UI

Adds the new status to LeadStatus union, StatusPill variants (orange
theme), leadStatusMeta (label + colors), reason-required set, status
constants, and statusColor config.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Lawyer Views — Sidebar + Dashboard + AllLeads

Enable the status in all lawyer-facing pages.

**Files:**
- Modify: `src/components/Layout/Sidebar.tsx:87`
- Modify: `src/app/(dashboard)/dash-lawyers/DashboardLawyers.tsx:75,87-95,207`
- Modify: `src/app/(dashboard)/all-leads/AllLeads.tsx:48-53,168-169`

- [ ] **Step 1: Enable sidebar "Waiting on Client" item**

In `src/components/Layout/Sidebar.tsx`, change line 87 from:
```typescript
    '/all-leads/waiting': null, // disabled until backend implements WAITING_ON_CLIENT
```
to:
```typescript
    '/all-leads/waiting': ['WAITING_ON_CLIENT'],
```

- [ ] **Step 2: Clean up DashboardLawyers casts + add action tone**

In `src/app/(dashboard)/dash-lawyers/DashboardLawyers.tsx`:

**Line 75** — remove the cast. Change:
```typescript
    statuses: ['WAITING_ON_CLIENT' as LeadStatus],
```
to:
```typescript
    statuses: ['WAITING_ON_CLIENT'],
```

**Lines 87-95** — add WAITING_ON_CLIENT entry to `ACTION_TONE_BY_STATUS`. Add after the EXPIRED entry:
```typescript
  WAITING_ON_CLIENT: { bg: 'bg-orange-100', fg: 'text-orange-700', icon: <MdSchedule size={14} /> },
```

**Line 207** — remove the string cast. Change:
```typescript
      value: leads.filter((l) => (l.status as string) === 'WAITING_ON_CLIENT').length,
```
to:
```typescript
      value: leads.filter((l) => l.status === 'WAITING_ON_CLIENT').length,
```

- [ ] **Step 3: Add to AllLeads status options + reason check**

In `src/app/(dashboard)/all-leads/AllLeads.tsx`:

**Lines 48-53** — add to `STATUS_OPTIONS` (after 'In progress' entry):
```typescript
  { name: 'Waiting on Client', value: 'WAITING_ON_CLIENT' },
```

**Lines 168-169** — add to `reasonRequired` check. Change:
```typescript
    const reasonRequired =
      upper === 'PROBLEMATIC' || upper === 'SEND_BACK' || upper === 'LOST';
```
to:
```typescript
    const reasonRequired =
      upper === 'PROBLEMATIC' || upper === 'SEND_BACK' || upper === 'LOST' || upper === 'WAITING_ON_CLIENT';
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | grep -v "tests/e2e" | tail -20`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout/Sidebar.tsx "src/app/(dashboard)/dash-lawyers/DashboardLawyers.tsx" "src/app/(dashboard)/all-leads/AllLeads.tsx"
git commit -m "feat(lawyer): enable WAITING_ON_CLIENT in sidebar, dashboard, and all-leads

Enables the Waiting on Client sidebar item, removes type casts in
DashboardLawyers (KPI + pipeline), adds orange action tone for
recent leads, and adds the status option to AllLeads with required
reason validation.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Admin Views — LeadManagement + LawyerManagement + IdLawyer + AssignedLeads

Enable the status in all admin-facing pages.

**Files:**
- Modify: `src/app/(dashboard)/lead-management/LeadManagement.tsx:70-78,102-109`
- Modify: `src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx:95-103,105,109-120,643-644`
- Modify: `src/app/(dashboard)/lawyer-management/LawyerManagement.tsx:193-198`
- Modify: `src/app/(dashboard)/lawyer-management/assigned-leads/AssignedLeads.tsx:30`

- [ ] **Step 1: Add to LeadManagement status options**

In `src/app/(dashboard)/lead-management/LeadManagement.tsx`:

**Lines 70-78** — add to `STATUS_OPTIONS_SELECT` (after 'In progress' entry):
```typescript
  { name: 'Waiting on Client', value: 'WAITING_ON_CLIENT' },
```

**Lines 102-109** — add to `BULK_STATUS_OPTIONS` (after 'In progress' entry):
```typescript
  { name: 'Waiting on Client', value: 'WAITING_ON_CLIENT' },
```

Do NOT add to `STATUS_OPTIONS_NEW` — an unassigned lead can't be "waiting on client".

- [ ] **Step 2: Update IdLawyer — options, active set, labels, reason**

In `src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx`:

**Lines 95-103** — add to `STATUS_OPTIONS_SELECT` (after 'In progress' entry):
```typescript
  { name: 'Waiting on Client', value: 'WAITING_ON_CLIENT' },
```

**Line 105** — add to `ACTIVE_STATUSES`. Change:
```typescript
const ACTIVE_STATUSES = new Set(['ASSIGNED', 'IN PROGRESS']);
```
to:
```typescript
const ACTIVE_STATUSES = new Set(['ASSIGNED', 'IN PROGRESS', 'WAITING_ON_CLIENT']);
```

**Lines 109-120** — add to `LEAD_STATUS_LABEL` (after 'IN PROGRESS' entry):
```typescript
  WAITING_ON_CLIENT: 'Waiting on Client',
```

**Lines 643-644** — add to `reasonRequired` check. Change:
```typescript
    const reasonRequired =
      upper === 'PROBLEMATIC' || upper === 'SEND_BACK' || upper === 'LOST';
```
to:
```typescript
    const reasonRequired =
      upper === 'PROBLEMATIC' || upper === 'SEND_BACK' || upper === 'LOST' || upper === 'WAITING_ON_CLIENT';
```

- [ ] **Step 3: Update LawyerManagement active leads count**

In `src/app/(dashboard)/lawyer-management/LawyerManagement.tsx`, lines 193-198. Change:
```typescript
        res.activeLeads = filterLeads.filter(
          (item: any) =>
            item.status === 'ASSIGNED' ||
            item.status === 'IN PROGRESS' ||
            item.status === 'CLOSED' ||
            item.status === 'PROBLEMATIC'
        ).length;
```
to:
```typescript
        res.activeLeads = filterLeads.filter(
          (item: any) =>
            item.status === 'ASSIGNED' ||
            item.status === 'IN PROGRESS' ||
            item.status === 'WAITING_ON_CLIENT' ||
            item.status === 'CLOSED' ||
            item.status === 'PROBLEMATIC'
        ).length;
```

- [ ] **Step 4: Update AssignedLeads active statuses set**

In `src/app/(dashboard)/lawyer-management/assigned-leads/AssignedLeads.tsx`, line 30. Change:
```typescript
const ACTIVE_STATUSES = new Set(['ASSIGNED', 'IN PROGRESS']);
```
to:
```typescript
const ACTIVE_STATUSES = new Set(['ASSIGNED', 'IN PROGRESS', 'WAITING_ON_CLIENT']);
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | grep -v "tests/e2e" | tail -20`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/lead-management/LeadManagement.tsx" "src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx" "src/app/(dashboard)/lawyer-management/LawyerManagement.tsx" "src/app/(dashboard)/lawyer-management/assigned-leads/AssignedLeads.tsx"
git commit -m "feat(admin): enable WAITING_ON_CLIENT in lead management and lawyer views

Adds status option to LeadManagement (single + bulk), IdLawyer
(options + active set + label + reason), LawyerManagement (active
count), and AssignedLeads (active set). Aligns frontend capacity
counting with backend (ASSIGNED + IN PROGRESS + WAITING_ON_CLIENT).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Final Verification

Full build check and manual review of all touchpoints.

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep -v node_modules | grep -v "tests/e2e"`
Expected: Clean (0 errors from source files)

- [ ] **Step 2: Grep for remaining casts/guards**

Run: `grep -rn "WAITING_ON_CLIENT" src/ --include="*.ts" --include="*.tsx"`
Expected: All references should be clean — no `as LeadStatus`, no `as string`, no `null` guards.

- [ ] **Step 3: Verify no orphaned status lists**

Run: `grep -rn "IN PROGRESS" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "WAITING_ON_CLIENT"`
Scan output: Any `ACTIVE_STATUSES` or status array that has `IN PROGRESS` but NOT `WAITING_ON_CLIENT` may be a miss. Review each hit.

- [ ] **Step 4: Lint check**

Run: `npx next lint 2>&1 | tail -20`
Expected: No new warnings/errors
