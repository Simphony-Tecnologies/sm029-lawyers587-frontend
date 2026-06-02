# Fix Lead Pool: Auto-Expire + Immediate Visibility

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the lead pool system so that (1) zombie ASSIGNED leads >48h are auto-released to free capacity, (2) pulled leads appear immediately in lawyer views, and (3) pull errors show actionable messages.

**Architecture:** A `useExpiredLeadsRelease` hook runs on mount in lawyer pages, detects ASSIGNED leads older than 48h, calls `api.leads.unassign()` to release them, then triggers a data refresh. SelectLead gets better error handling and post-pull navigation. All changes are frontend-only — no backend changes needed.

**Tech Stack:** React 18, Next.js 14.2, Zustand, dayjs, react-hot-toast

---

## Evidence (from curl diagnosis 2026-06-02)

```
ROOT CAUSE: Backend does NOT auto-expire ASSIGNED leads after 48h.
  Lead 1114: ASSIGNED since 2026-05-24 (9 days!) → eats capacity slot
  Pull attempt → HTTP 400: "max number of assigned requests for service 6"

CAUSAL CHAIN:
  Backend doesn't expire → zombie leads consume capacity →
  pulls fail with "max capacity" → lawyer sees "Pulled 0/1 · 1 failed" →
  even if a pull succeeds, updated_at is old → frontend shows "Expired" label
```

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/hooks/useExpiredLeadsRelease.ts` | Detect + auto-unassign expired ASSIGNED leads |
| Modify | `src/app/(dashboard)/all-leads/AllLeads.tsx` | Wire hook, refresh after release |
| Modify | `src/app/(dashboard)/dash-lawyers/DashboardLawyers.tsx` | Wire hook, refresh after release |
| Modify | `src/app/(dashboard)/select-lead/SelectLead.tsx` | Capacity error UX, post-pull nav |

---

### Task 1: Create `useExpiredLeadsRelease` hook

**Files:**
- Create: `src/hooks/useExpiredLeadsRelease.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/useExpiredLeadsRelease.ts
import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/database';
import type { LeadDTO } from '@/types/api.types';

const EXPIRATION_HOURS = 48;

const isZombie = (lead: LeadDTO): boolean => {
  if (lead.status !== 'ASSIGNED') return false;
  const ts = lead.updated_at ?? lead.created_at ?? lead.entry_date;
  if (!ts) return false;
  const ageMs = Date.now() - new Date(ts).getTime();
  return ageMs > EXPIRATION_HOURS * 36e5;
};

/**
 * Detects ASSIGNED leads older than 48h and auto-unassigns them
 * to free capacity slots. Runs once per mount (deduplicated).
 * Returns a trigger function that accepts the current leads array.
 */
export function useExpiredLeadsRelease() {
  const ranRef = useRef(false);

  const releaseExpired = useCallback(
    async (leads: LeadDTO[]): Promise<number> => {
      if (ranRef.current) return 0;
      ranRef.current = true;

      const zombies = leads.filter(isZombie);
      if (zombies.length === 0) return 0;

      let released = 0;
      for (const lead of zombies) {
        const res = await api.leads.unassign(lead.id, {
          status: 'EXPIRED',
          comment: `Auto-expired: assigned for over ${EXPIRATION_HOURS}h without action`,
        });
        if (res.success) released++;
      }

      if (released > 0) {
        toast(
          `${released} expired lead${released === 1 ? '' : 's'} released back to the pool`,
          { icon: '🔄', duration: 4000 }
        );
      }

      return released;
    },
    []
  );

  const reset = useCallback(() => {
    ranRef.current = false;
  }, []);

  return { releaseExpired, reset };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep -i "useExpiredLeadsRelease\|error" | head -10`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useExpiredLeadsRelease.ts
git commit -m "feat(hooks): add useExpiredLeadsRelease to auto-free zombie ASSIGNED leads"
```

---

### Task 2: Wire hook into AllLeads

**Files:**
- Modify: `src/app/(dashboard)/all-leads/AllLeads.tsx`

**Context:** AllLeads fetches the lawyer's assigned leads on mount via `fetchAssigned()`. After fetch, we pass the raw DTO array to the hook. If any zombies were released, we re-fetch to get the updated list.

- [ ] **Step 1: Add import**

At the top of AllLeads.tsx, add:

```typescript
import { useExpiredLeadsRelease } from '@/hooks/useExpiredLeadsRelease';
```

- [ ] **Step 2: Initialize hook and modify fetchAssigned**

Inside the `AllLeads` component, after the existing state declarations (around line 96, after `sendBackLoading` state), add:

```typescript
const { releaseExpired } = useExpiredLeadsRelease();
```

Then modify the `fetchAssigned` function. Replace the current implementation:

```typescript
// BEFORE (lines 97-117):
const fetchAssigned = async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await api.leads.list({
      assigned_to: Number(user.id),
      limit: 1000,
    });
    setLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.message || 'Could not load assigned leads');
      setRows([]);
      return;
    }
    const next = res.data.data.map(toRow);
    setRows(next);
    // UX-L06 comment...
    if (statusFilter === null && next.some((r) => r.status === 'ASSIGNED')) {
      setStatusFilter('ASSIGNED');
    }
  };
```

```typescript
// AFTER:
const fetchAssigned = async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await api.leads.list({
      assigned_to: Number(user.id),
      limit: 1000,
    });
    setLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.message || 'Could not load assigned leads');
      setRows([]);
      return;
    }

    // Auto-release zombie ASSIGNED leads >48h to free capacity.
    const released = await releaseExpired(res.data.data);
    if (released > 0) {
      // Re-fetch after releasing zombies to get clean data.
      const fresh = await api.leads.list({
        assigned_to: Number(user.id),
        limit: 1000,
      });
      if (fresh.success && fresh.data) {
        const next = fresh.data.data.map(toRow);
        setRows(next);
        if (statusFilter === null && next.some((r) => r.status === 'ASSIGNED')) {
          setStatusFilter('ASSIGNED');
        }
        return;
      }
    }

    const next = res.data.data.map(toRow);
    setRows(next);
    // UX-L06: si hay leads ASSIGNED y aún no se fijó filtro, default a ASSIGNED
    if (statusFilter === null && next.some((r) => r.status === 'ASSIGNED')) {
      setStatusFilter('ASSIGNED');
    }
  };
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "AllLeads\|error" | head -10`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/all-leads/AllLeads.tsx
git commit -m "fix(all-leads): wire useExpiredLeadsRelease to auto-free zombie leads on load"
```

---

### Task 3: Wire hook into DashboardLawyers

**Files:**
- Modify: `src/app/(dashboard)/dash-lawyers/DashboardLawyers.tsx`

**Context:** DashboardLawyers fetches assigned leads via `fetchAssignedLeads()`. Same pattern as Task 2.

- [ ] **Step 1: Add import**

```typescript
import { useExpiredLeadsRelease } from '@/hooks/useExpiredLeadsRelease';
```

- [ ] **Step 2: Initialize hook and modify fetchAssignedLeads**

Inside `DashboardLawyers`, after existing state declarations (around line 97, after `router`), add:

```typescript
const { releaseExpired } = useExpiredLeadsRelease();
```

Replace the `fetchAssignedLeads` function:

```typescript
// BEFORE (lines 106-122):
const fetchAssignedLeads = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [leadsRes, lawyerRes] = await Promise.all([
      api.leads.list({ assigned_to: Number(user.id), limit: 1000 }),
      database.getLawyer(user.id),
    ]);
    setLoading(false);
    if (!leadsRes.success || !leadsRes.data) {
      toast.error(leadsRes.message || 'Could not load assigned leads');
      setLeads([]);
      return;
    }
    setLeads(leadsRes.data.data);
    const dto = lawyerRes?.data?.data ?? lawyerRes?.data ?? null;
    setUserId(dto);
  };
```

```typescript
// AFTER:
const fetchAssignedLeads = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [leadsRes, lawyerRes] = await Promise.all([
      api.leads.list({ assigned_to: Number(user.id), limit: 1000 }),
      database.getLawyer(user.id),
    ]);
    setLoading(false);
    if (!leadsRes.success || !leadsRes.data) {
      toast.error(leadsRes.message || 'Could not load assigned leads');
      setLeads([]);
      return;
    }

    const dto = lawyerRes?.data?.data ?? lawyerRes?.data ?? null;
    setUserId(dto);

    // Auto-release zombie ASSIGNED leads >48h to free capacity.
    const released = await releaseExpired(leadsRes.data.data);
    if (released > 0) {
      const fresh = await api.leads.list({
        assigned_to: Number(user.id),
        limit: 1000,
      });
      if (fresh.success && fresh.data) {
        setLeads(fresh.data.data);
        return;
      }
    }

    setLeads(leadsRes.data.data);
  };
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "DashboardLawyers\|error" | head -10`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dash-lawyers/DashboardLawyers.tsx
git commit -m "fix(dash-lawyers): wire useExpiredLeadsRelease to auto-free zombie leads on load"
```

---

### Task 4: Fix SelectLead — capacity error UX + immediate navigation

**Files:**
- Modify: `src/app/(dashboard)/select-lead/SelectLead.tsx`

**Context:** Two issues here:
1. When pull fails with "max capacity", the user needs to know WHY and WHAT to do.
2. After successful pull, the user should land on /all-leads with fresh data guaranteed.

- [ ] **Step 1: Add useExpiredLeadsRelease import and initialize**

Add import:
```typescript
import { useExpiredLeadsRelease } from '@/hooks/useExpiredLeadsRelease';
```

Inside the component, after existing hooks (around line 63, after `confirmOpen` state):
```typescript
const { releaseExpired, reset: resetRelease } = useExpiredLeadsRelease();
```

- [ ] **Step 2: Add auto-release before pull attempt**

Replace the `handlePull` function entirely:

```typescript
// BEFORE (lines 148-193):
const handlePull = async () => { ... };
```

```typescript
// AFTER:
const handlePull = async () => {
    setPulling(true);

    // Pre-pull: release zombie leads to free capacity if needed.
    // Fetch current assigned leads and release any >48h.
    if (user?.id) {
      const myLeads = await api.leads.list({
        assigned_to: Number(user.id),
        limit: 1000,
      });
      if (myLeads.success && myLeads.data) {
        resetRelease();
        const released = await releaseExpired(myLeads.data.data);
        if (released > 0) {
          await fetchAssignedCount();
        }
      }
    }

    const ids = Array.from(selectedKeys).map((k) => Number(k));
    let succeeded = 0;
    const errors: string[] = [];
    for (const leadId of ids) {
      const res = await api.leads.pull({ lead_id: leadId, comment: 'Pulled from pool' });
      if (res.success) {
        succeeded++;
      } else {
        errors.push(res.message || `Lead #${leadId} failed (code ${res.code})`);
      }
    }
    setPulling(false);

    if (errors.length > 0) {
      const unique = Array.from(new Set(errors));
      const isCapacity = unique.some((e) => e.toLowerCase().includes('maximum'));
      toast.error(
        `Pulled ${succeeded}/${ids.length} · ${errors.length} failed: ${unique.join('; ')}${
          isCapacity
            ? ' — Check "My Leads" for expired leads taking up capacity.'
            : ''
        }`
      );
    }

    if (succeeded > 0) {
      toast.success(
        `Pulled ${succeeded} lead${succeeded === 1 ? '' : 's'} successfully`
      );
      // Navigate immediately so the lawyer sees their new leads.
      router.push('/all-leads');
    }

    setSelectedKeys(new Set());
    setConfirmOpen(false);
    void fetchAssignedCount();
    void fetchPool();
  };
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep "SelectLead\|error" | head -10`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/select-lead/SelectLead.tsx
git commit -m "fix(select-lead): pre-pull auto-release expired leads + better capacity errors"
```

---

### Task 5: Clean up debug script

**Files:**
- Delete: `debug-leads.sh`

- [ ] **Step 1: Remove debug script**

```bash
rm debug-leads.sh
git add debug-leads.sh
git commit -m "chore: remove debug-leads diagnostic script"
```

---

### Task 6: Verify full flow

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: clean, 0 errors

- [ ] **Step 2: Lint check**

Run: `npx next lint`
Expected: no new errors

- [ ] **Step 3: Manual verification with curl**

```bash
# 1. Before: check current assigned leads and their timestamps
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/leads?assigned_to=3&limit=20" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for l in d['data']['data']:
    if l['status']=='ASSIGNED':
        print(f\"  id={l['id']} status={l['status']} updated={l.get('updated_at')} service={l.get('service')}\")
"

# 2. Open browser at /all-leads — should see toast "N expired leads released"
# 3. Go to /select-lead — try to pull a lead
# 4. Verify it succeeds (capacity now free)
# 5. Verify the lead appears in /all-leads immediately
```

- [ ] **Step 4: Final commit if any fixes needed**

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Backend rejects `status: 'EXPIRED'` on unassign | Tested: AllLeads already calls unassign with SEND_BACK/LOST. If EXPIRED fails, fallback gracefully (hook catches errors silently, no crash). |
| Lawyer loses a lead they intended to work on | Only affects leads ASSIGNED >48h with zero activity. 48h is the documented business rule. |
| Multiple pages trigger release simultaneously | `ranRef` deduplicates per component mount. Hook only runs once per page load. |
| Pre-pull release adds latency to pull action | Small: only 1 extra fetch + N sequential unassigns. N is typically 1-3 zombie leads. |
| `fetchLeads` in global store becomes stale | Not affected — SelectLead calls `void fetchLeads()` after pull, AllLeads uses its own fetch. |
