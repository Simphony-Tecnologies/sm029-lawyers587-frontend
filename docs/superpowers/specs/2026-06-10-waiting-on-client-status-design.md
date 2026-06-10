# WAITING_ON_CLIENT Status Integration — Design Spec

**Date:** 2026-06-10
**Status:** Ready for implementation
**Backend:** Already deployed (enum, migration, validation, capacity, cron exclusion)

---

## Overview

Integrate the new `WAITING_ON_CLIENT` lead status into the frontend. The backend already supports it: the enum is in MySQL, the PUT/PATCH endpoints validate it, comment is required, capacity counts include it, and the 48h expiration cron skips it.

The frontend has partial scaffolding (KPI, pipeline chart, sidebar route) but everything is disabled with type casts and `null` guards. This spec converts those placeholders into first-class support.

---

## Backend Contract

| Property | Value |
|----------|-------|
| Enum value | `WAITING_ON_CLIENT` |
| Comment required | YES — 400 if missing on PUT /leads/:id and PATCH /leads/bulk/status |
| Counts as active | YES — capacity = ASSIGNED + IN PROGRESS + WAITING_ON_CLIENT |
| Cron expiration | NO — only ASSIGNED leads expire after 48h |
| Unassign on transition | NO — lawyer stays assigned |
| Endpoints | `PUT /leads/:id` (single), `PATCH /leads/bulk/status` (bulk) |

---

## Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Color palette | Orange (`#FF9066`, `bg-orange-50 text-orange-700`) | Matches existing pipeline chart scaffolding; distinct from amber (PROBLEMATIC/Flagged) |
| Destructive warning | No | Not permanent, not an unassign — just a workflow state |
| Comment required (frontend) | Yes | Backend enforces it; frontend must validate before submit |
| Who can set it | Both admin and lawyer | Lawyer marks "waiting for client response"; admin can also set it |
| Active status (frontend) | Yes | Backend counts it in capacity; frontend must match in ACTIVE_STATUSES sets and activeLeads filters |
| StatusPill variant name | `waiting-on-client` | Consistent with existing kebab-case convention |
| Display label | "Waiting on Client" | Clear, matches backend description |

---

## Change Map

### Layer 1 — Type System & Shared UI (6 files)

**1. `src/types/api.types.ts` (line 7)**
- Add `| 'WAITING_ON_CLIENT'` to `LeadStatus` union

**2. `src/store/useSelectStatus.ts` (line 3)**
- Add `| 'WAITING_ON_CLIENT'` to `status` type union

**3. `src/components/ui/organisms/LeadInfoModal/leadStatusMeta.ts`**
- Add `'WAITING_ON_CLIENT'` to `LeadStatusKey` union (line 1)
- Add entry to `LEAD_STATUS_META` (after PROBLEMATIC):
  ```
  WAITING_ON_CLIENT: {
    label: 'Waiting on Client',
    dotClass: 'bg-orange-500',
    textClass: 'text-orange-700',
    badgeBgClass: 'bg-orange-50',
    triggerClass: 'bg-orange-50 border-orange-200 text-orange-700',
    triggerHoverClass: 'hover:bg-orange-100 hover:border-orange-300',
    triggerMetaClass: 'text-orange-700/70',
  }
  ```
- Add `'WAITING_ON_CLIENT'` to `REASON_REQUIRED_STATUSES` set (line 103) — backend requires comment

**4. `src/components/ui/atoms/StatusPill/StatusPill.tsx`**
- Add `'waiting-on-client': 'bg-orange-50 text-orange-700'` to `statusPillStyles` variants (line 9)
- Add `'waiting-on-client'` to `StatusPillVariant` type (line 26)
- Add `'waiting-on-client': 'Waiting on Client'` to `LABELS` (line 40)
- Add `'WAITING_ON_CLIENT': 'waiting-on-client'` to `RAW_TO_VARIANT` (line 51)

**5. `src/constants/status.ts`**
- Add `{ name: 'Waiting on Client', value: 'WAITING_ON_CLIENT' }` to `statusSelectAll`

**6. `src/configs/statusColor.ts`**
- Add `WAITING_ON_CLIENT: '#FF9066'` to `statusColors`

### Layer 2 — Lawyer Views (3 files)

**7. `src/components/Layout/Sidebar.tsx` (line 87)**
- Change `'/all-leads/waiting': null` to `'/all-leads/waiting': ['WAITING_ON_CLIENT']`

**8. `src/app/(dashboard)/dash-lawyers/DashboardLawyers.tsx`**
- Line 75: Remove `as LeadStatus` cast — type system now includes it
- Line 87-95: Add `ACTION_TONE_BY_STATUS` entry:
  ```
  WAITING_ON_CLIENT: { bg: 'bg-orange-100', fg: 'text-orange-700', icon: <MdSchedule size={14} /> }
  ```
- Line 207: Remove `(l.status as string) ===` cast — use `l.status ===` directly

**9. `src/app/(dashboard)/all-leads/AllLeads.tsx`**
- Lines 48-53: Add `{ name: 'Waiting on Client', value: 'WAITING_ON_CLIENT' }` to `STATUS_OPTIONS`
- Line 168-169: Add `upper === 'WAITING_ON_CLIENT'` to `reasonRequired` check

### Layer 3 — Admin Views (4 files)

**10. `src/app/(dashboard)/lead-management/LeadManagement.tsx`**
- Lines 70-78: Add `{ name: 'Waiting on Client', value: 'WAITING_ON_CLIENT' }` to `STATUS_OPTIONS_SELECT`
- Lines 102-109: Add `{ name: 'Waiting on Client', value: 'WAITING_ON_CLIENT' }` to `BULK_STATUS_OPTIONS`
- Note: NOT added to `STATUS_OPTIONS_NEW` — unassigned leads can't be "waiting on client"

**11. `src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx`**
- Line 95-103: Add to `STATUS_OPTIONS_SELECT`
- Line 105: Add to `ACTIVE_STATUSES` set: `new Set(['ASSIGNED', 'IN PROGRESS', 'WAITING_ON_CLIENT'])`
- Line 109-120: Add to `LEAD_STATUS_LABEL`: `WAITING_ON_CLIENT: 'Waiting on Client'`
- Line 643-644: Add `upper === 'WAITING_ON_CLIENT'` to `reasonRequired` check

**12. `src/app/(dashboard)/lawyer-management/LawyerManagement.tsx` (line 193-198)**
- Add `item.status === 'WAITING_ON_CLIENT'` to activeLeads filter

**13. `src/app/(dashboard)/lawyer-management/assigned-leads/AssignedLeads.tsx` (line 30)**
- Add to `ACTIVE_STATUSES` set: `new Set(['ASSIGNED', 'IN PROGRESS', 'WAITING_ON_CLIENT'])`

### No Changes Needed

| File | Reason |
|------|--------|
| `LeadInfoModal.tsx` | Uses `getLeadStatusMeta()` — works once meta is updated |
| `database.ts` | Generic API client, no status lists |
| `useLead.store.ts` | Generic row mapping |
| `Dashboard.tsx` | Admin overview — no KPI for this status needed |
| `LostLeads.tsx` | Only lost/expired/disabled statuses |
| `PipelineChart.tsx` | Generic chart component |
| `routes.ts` | Route already defined (`/all-leads/waiting`) |

---

## Validation Checklist

After implementation:
1. TypeScript compiles clean (`npx tsc --noEmit`)
2. Lawyer can see "Waiting on Client" in sidebar (enabled, no "Soon" badge)
3. Lawyer can change lead status to "Waiting on Client" from AllLeads modal
4. Admin can change lead status to "Waiting on Client" from LeadManagement (single + bulk)
5. StatusPill renders orange pill for WAITING_ON_CLIENT
6. DashboardLawyers KPI counts WAITING_ON_CLIENT leads correctly
7. Pipeline chart shows "Waiting" segment without type casts
8. Comment is required when transitioning to WAITING_ON_CLIENT
9. WAITING_ON_CLIENT leads count in capacity/active totals across admin views
10. Lead stays assigned to lawyer after transitioning to WAITING_ON_CLIENT
