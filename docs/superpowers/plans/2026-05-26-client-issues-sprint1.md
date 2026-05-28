# Client Issues Sprint 1 — Frontend Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 confirmed client-reported bugs that are frontend-only (no backend changes needed).

**Architecture:** All fixes are isolated edits to existing files. No new files, no new dependencies. Each task touches 1-2 files max. Changes are additive (add options, add API calls, convert component pattern) — no removal of existing working functionality.

**Tech Stack:** Next.js 14 / React 18 / Zustand / HeadlessUI / Tailwind

**CRITICAL RULE:** Do NOT modify any logic that is currently working. Each fix targets a specific, confirmed bug. Do NOT refactor surrounding code, add types, rename variables, or "improve" adjacent code.

---

## File Map

| File | Tasks | Changes |
|------|-------|---------|
| `src/constants/status.ts` | T1 | Add EXPIRED to statusSelectAll |
| `src/app/(dashboard)/lead-management/LeadManagement.tsx` | T1, T5 | Add EXPIRED to statusSelect + remove console.log |
| `src/components/atoms/Input.tsx` | T2 | Convert select from uncontrolled to controlled |
| `src/app/(dashboard)/select-lead/SelectLead.tsx` | T3, T4 | Add PUT after pull + dynamic plural text |
| `src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx` | T5 | Remove checkbox silent override |
| `src/app/(dashboard)/lawyer-management/assigned-leads/AssignedLeads.tsx` | T6 | Convert to client component with handlers |

---

### Task 1: Add EXPIRED status to dropdowns (ISSUE-02)

**Files:**
- Modify: `src/constants/status.ts:1-27`
- Modify: `src/app/(dashboard)/lead-management/LeadManagement.tsx:31-53`

**Context:** When a lead has status EXPIRED, the admin's Lead Info modal dropdown shows the wrong value because EXPIRED is not an option in any status array. The `<select defaultValue='EXPIRED'>` doesn't match any `<option>`, so the browser shows the placeholder or first option.

- [ ] **Step 1: Add EXPIRED to `statusSelectAll` in constants**

In `src/constants/status.ts`, add EXPIRED before the closing bracket:

```typescript
// After line 26 (after the Disabled entry), add:
  {
    name: 'Expired',
    value: 'EXPIRED',
  },
```

The full file should be:
```typescript
export const statusSelectAll = [
  {
    name: 'New',
    value: 'NEW',
  },
  {
    name: 'In progress',
    value: 'IN PROGRESS',
  },

  {
    name: 'Problematic',
    value: 'PROBLEMATIC',
  },
  {
    name: 'Send back',
    value: 'LOST',
  },
  {
    name: 'Retained',
    value: 'CLOSED',
  },
  {
    name: 'Disabled',
    value: 'DISABLED',
  },
  {
    name: 'Expired',
    value: 'EXPIRED',
  },
];
```

- [ ] **Step 2: Add EXPIRED to `statusSelect` in LeadManagement**

In `src/app/(dashboard)/lead-management/LeadManagement.tsx`, add to the `statusSelect` array (after line 52, before the closing `];`):

```typescript
    {
      name: 'Expired',
      value: 'EXPIRED',
    },
```

- [ ] **Step 3: Verify manually**

Run `npm run dev`. Open Lead Management as admin. If there's a lead with EXPIRED status, open its modal — the dropdown should show "Expired" selected correctly. The filter chips should also show "Expired" for any EXPIRED leads in the list.

- [ ] **Step 4: Commit**

```bash
git add src/constants/status.ts src/app/\(dashboard\)/lead-management/LeadManagement.tsx
git commit -m "fix: add EXPIRED status to dropdown options (ISSUE-02)"
```

---

### Task 2: Convert Input select to controlled component (ISSUE-11)

**Files:**
- Modify: `src/components/atoms/Input.tsx:39-93`

**Context:** The `<select>` in `Input.tsx` uses `defaultValue` (uncontrolled). This means: (1) when a new `defaultValue` is passed without remounting, the select ignores it, and (2) the `selectedColor` state is only initialized on mount, so the color styling can be stale. Converting to a controlled `value` + `useEffect` sync fixes both.

**CRITICAL:** This component is used in ~15 places across the app (LeadManagement, LawyerManagement, IdLawyer, AllLeads, modals). The fix must maintain the exact same external API (same props, same behavior). We're only changing internal state management.

- [ ] **Step 1: Add useEffect import**

In `src/components/atoms/Input.tsx`, verify that `useEffect` is imported. Currently line 1 only imports `useState`:

```typescript
// Change line 1 from:
import { useState } from 'react';
// To:
import { useState, useEffect } from 'react';
```

- [ ] **Step 2: Add controlled state and sync effect**

Replace lines 39-41 with:

```typescript
}: inputProps) => {
  const [selectValue, setSelectValue] = useState(defaultValue);
  const [selectedColor, setSelectedColor] = useState(
    statusColors ? statusColors[defaultValue] : null
  );

  useEffect(() => {
    setSelectValue(defaultValue);
    if (statusColors) {
      setSelectedColor(statusColors[defaultValue] || null);
    }
  }, [defaultValue]);
```

- [ ] **Step 3: Update handleChangeColor to also update selectValue**

Replace lines 45-54 with:

```typescript
  const handleChangeColor = (event: any) => {
    const newValue = event.target.value;
    setSelectValue(newValue);
    if (statusColors) {
      setSelectedColor(statusColors[newValue]);
    }
    if (setOnChange) {
      setOnChange(newValue);
    }
  };
```

- [ ] **Step 4: Change select element from defaultValue to value**

In the `<select>` element (around line 66-69), change `defaultValue` to `value`:

```typescript
        <select
          className="flex flex-row w-full max-w-lg border border-gray-300 p-1 rounded-lg placeholder:font-light text-text"
          name={name}
          value={selectValue}
          onChange={handleChangeColor}
          style={{
            color: selectedColor,
            borderColor: selectedColor,
            outline: 'none',
          }}
        >
```

- [ ] **Step 5: Verify manually**

Run `npm run dev`. Test these scenarios:
1. Admin Lead Management: open a PROBLEMATIC lead → dropdown shows "Problematic" with correct color → change to "In Progress" → save → should work.
2. Open another lead with different status → dropdown should update to the new status.
3. LawyerManagement: edit a lawyer → role and is_active selects should still work.
4. AllLeads (lawyer view): open a lead → status dropdown should show current status.

- [ ] **Step 6: Commit**

```bash
git add src/components/atoms/Input.tsx
git commit -m "fix: convert select to controlled component for reliable defaultValue sync (ISSUE-11)"
```

---

### Task 3: Update lead status after pull (ISSUE-07 + ISSUE-08)

**Files:**
- Modify: `src/app/(dashboard)/select-lead/SelectLead.tsx:255-313`

**Context:** When a lawyer pulls leads from the pool, `postAssignLeads` only creates the assignment (POST /leads-assigned) but never updates the lead's status to ASSIGNED or refreshes `updated_at`. This causes: (a) pulled leads still show as EXPIRED/NEW in AllLeads, (b) the 48h countdown timer shows 0 because `date_updated` is stale.

- [ ] **Step 1: Add PUT calls to update each lead after assignment**

In `src/app/(dashboard)/select-lead/SelectLead.tsx`, inside `postAssignLeads`, after the error check on line 280, add the status update loop. Replace lines 275-281 with:

```typescript
    const respond: any = await Promise.all(promises);

    if (respond.some((item: any) => item.code === 404 || item.code === 500)) {
      setLoading(false);
      return toast.error(`Error ${respond[0].code}: ${respond[0].messages}`);
    }

    const updatePromises = selectRowLeads.map(async (lead) => {
      const leadId = lead['lead id'];
      return database.updateData(
        `${process.env.NEXT_PUBLIC_URL}/leads/${leadId}`,
        { status: 'ASSIGNED' }
      );
    });
    await Promise.all(updatePromises);

    fetchLeads();
```

This adds a second round of API calls: after all assignments are created, each lead gets its status updated to ASSIGNED via `PUT /leads/:id`. The backend should update `updated_at` automatically on PUT. Then `fetchLeads()` refreshes the global store.

- [ ] **Step 2: Verify manually**

Run `npm run dev`. As a lawyer:
1. Go to Select Lead → select a lead → click "Pull leads"
2. Go to All Leads → the pulled lead should show status "ASSIGNED" (not EXPIRED/NEW)
3. Click the lead → CountdownTimer should show ~48 hours remaining (not 0)

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/select-lead/SelectLead.tsx
git commit -m "fix: update lead status to ASSIGNED after pull from pool (ISSUE-07, ISSUE-08)"
```

---

### Task 4: Dynamic plural/singular for Pull button (ISSUE-06)

**Files:**
- Modify: `src/app/(dashboard)/select-lead/SelectLead.tsx:449,312`

**Context:** The "Pull leads" button and success toast always use plural text, even when only 1 lead is selected.

- [ ] **Step 1: Make button text dynamic**

In `src/app/(dashboard)/select-lead/SelectLead.tsx`, replace the Button on line 448-453:

```typescript
          <Button
            disabled={isLoading}
            type='button'
            name={`Pull ${selectRowLeads.length || ''} lead${selectRowLeads.length !== 1 ? 's' : ''}`}
            onClick={postAssignLeads}
            color={`${isLoading ? 'animate-pulse bg-gray-400' : 'bg-primary'} `}
          />
```

- [ ] **Step 2: Make toast message dynamic**

On line 312, replace:

```typescript
    toast.success('Leads successfully added');
```

With:

```typescript
    toast.success(selectRowLeads.length === 1 ? 'Lead successfully added' : 'Leads successfully added');
```

- [ ] **Step 3: Verify manually**

Select 1 lead → button says "Pull 1 lead", toast says "Lead successfully added".
Select 3 leads → button says "Pull 3 leads", toast says "Leads successfully added".

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/select-lead/SelectLead.tsx
git commit -m "fix: dynamic singular/plural for Pull button and toast (ISSUE-06)"
```

---

### Task 5: Fix checkbox silent override + cleanup console.log (ISSUE-13 + minor)

**Files:**
- Modify: `src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx:185-290`
- Modify: `src/app/(dashboard)/lead-management/LeadManagement.tsx:192`

**Context for ISSUE-13:** In IdLawyer's `saveLeadContact`, line 189-190, `e.target.checkbox.checked === true ? 'DISABLED' : e.target.status.value` silently forces status to DISABLED when the hidden checkbox is checked, ignoring whatever the admin selected in the dropdown. The checkbox is also visually confusing (custom styled peer-hidden input). This same checkbox is already commented out in LeadManagement.tsx.

**Context for console.log:** LeadManagement.tsx line 192 has `console.log(selectedLead.status)` in production code.

- [ ] **Step 1: Fix IdLawyer saveLeadContact — remove checkbox override**

In `src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx`, replace lines 188-192:

```typescript
    const dataUpdate = {
      status: e.target.status.value,
      comments: e.target.comments.value,
    };
```

This removes the `e.target.checkbox.checked` ternary so the dropdown value is always used.

- [ ] **Step 2: Remove the checkbox UI from IdLawyer**

In the same file, remove lines 272-286 (the entire checkbox block):

Remove this block:
```
            <p className='flex gap-1 col-span-2 text-gray-500 '>
              <input
                name='checkbox'
                id={`checkbox-lead`}
                className='peer hidden'
                type='checkbox'
              />
              <label
                htmlFor={`checkbox-lead`}
                className='flex items-center justify-center w-5 h-5 border border-green-500 rounded bg-white cursor-pointer relative  text-white peer-checked:text-green-500'
              >
                <i className='fi fi-rr-check absolute  text-sm  peer-checked:block '></i>
              </label>{' '}
              Do not contact this lead again
            </p>
```

- [ ] **Step 3: Remove console.log from LeadManagement**

In `src/app/(dashboard)/lead-management/LeadManagement.tsx`, remove line 192:

```typescript
    console.log(selectedLead.status);
```

- [ ] **Step 4: Verify manually**

1. As admin, go to Lawyer Management → click a lawyer → open a lead's modal
2. Change status to any option → Save → the selected status should be saved (not DISABLED)
3. Lead Management: delete a lead → no console.log in browser devtools

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/lawyer-management/\[id\]/IdLawyer.tsx src/app/\(dashboard\)/lead-management/LeadManagement.tsx
git commit -m "fix: remove checkbox silent status override in IdLawyer + remove console.log (ISSUE-13)"
```

---

### Task 6: Fix AssignedLeads to allow interaction (ISSUE-16)

**Files:**
- Modify: `src/app/(dashboard)/lawyer-management/assigned-leads/AssignedLeads.tsx` (full rewrite — currently 53 lines, stub component)

**Context:** AssignedLeads is a Server Component (async function) that renders SortableTable without any event handlers. Users cannot click, select, or edit any lead. The component also fetches data differently from all other pages (uses `getData` which strips passwords but doesn't join with leads-assigned). Since `/lawyer-management/[id]` (IdLawyer) already handles the "view leads for a specific lawyer" use case properly, and the sidebar sub-routes are commented out, the simplest fix is to redirect this route to a meaningful page OR make it a functional client component.

**Decision:** Since the sidebar children routes are commented out (routes.ts:25-40) and this page is only reachable via direct URL, the most pragmatic fix is to redirect to `/lawyer-management`. This avoids duplicating IdLawyer logic.

- [ ] **Step 1: Replace AssignedLeads with redirect**

Replace the entire content of `src/app/(dashboard)/lawyer-management/assigned-leads/page.tsx` with a redirect:

First, read the current page.tsx:

```typescript
// Current content is likely just:
// import AssignedLeads from './AssignedLeads';
// export default function Page() { return <AssignedLeads />; }
```

Replace with:

```typescript
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/lawyer-management');
}
```

- [ ] **Step 2: Do the same for lost-leads and reassigned-leads pages**

Replace `src/app/(dashboard)/lawyer-management/lost-leads/page.tsx`:

```typescript
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/lawyer-management');
}
```

Replace `src/app/(dashboard)/lawyer-management/reassigned-leads/page.tsx`:

```typescript
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/lawyer-management');
}
```

- [ ] **Step 3: Verify manually**

Navigate directly to `/lawyer-management/assigned-leads` → should redirect to `/lawyer-management`.
Same for `/lawyer-management/lost-leads` and `/lawyer-management/reassigned-leads`.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/lawyer-management/assigned-leads/page.tsx src/app/\(dashboard\)/lawyer-management/lost-leads/page.tsx src/app/\(dashboard\)/lawyer-management/reassigned-leads/page.tsx
git commit -m "fix: redirect stub sub-routes to lawyer-management (ISSUE-16)"
```

---

## Post-Sprint Verification

After all 6 tasks are complete:

- [ ] Run `npx tsc --noEmit` — should exit 0 (no type errors)
- [ ] Run `npm run build` — should succeed
- [ ] Manual smoke test:
  - Login as admin → Dashboard cards → Lead Management → open lead modal → change status → save
  - Lawyer Management → edit lawyer → check selects work
  - Login as lawyer → Select Lead → pull 1 lead → All Leads → verify ASSIGNED + countdown
  - Navigate to /lawyer-management/assigned-leads → should redirect
