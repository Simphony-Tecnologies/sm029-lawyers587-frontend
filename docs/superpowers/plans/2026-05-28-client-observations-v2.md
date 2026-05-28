# Client Observations Sprint 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address 6 client-reported observations from 2026-05-28 covering timeline UX, status transitions, mandatory notes, admin role separation, and dashboard defaults.

**Architecture:** All changes are frontend-only, surgical edits to existing components. No new files needed. Each task targets 1-3 files max. One potential backend dependency flagged (actor_role in timeline).

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, Zustand, Headless UI

---

## File Map

| File | Changes |
|------|---------|
| `src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx` | Tasks 1, 3, 4 — TimelineRow redesign, reason label fix, mandatory notes |
| `src/components/ui/organisms/LeadInfoModal/leadStatusMeta.ts` | Task 4 — remove `isDestructiveStatus` gating (keep fn for styling) |
| `src/app/(dashboard)/lead-management/LeadManagement.tsx` | Tasks 2, 4, 5 — ARCHIVED options, submit validation, lawyer role filter |
| `src/app/(dashboard)/dashboard/Dashboard.tsx` | Task 6 — default period |
| `src/types/api.types.ts` | Task 1 — extend TimelineEntry with actor_role |

---

### Task 1: Redesign TimelineRow for richer audit cards

**Context:** The client finds the current timeline cards too sparse. They show `action_type`, `FROM → TO`, and a truncated comment. The client wants a structured layout:
- A clear label like "STATUS CHANGED"
- `OLD → NEW` with prominent styling
- Full note/comment (not truncated to 80 chars)
- Actor name + role (e.g., "Sergio Perez (Admin)")
- Properly formatted timestamp: `May 27, 2026 — 7:17 AM`

**Backend dependency:** The `TimelineEntry` audit type does NOT include `actor_role`. The `AuditEvent` interface has it (`actor_role: string`), so the backend likely returns it in the timeline endpoint — we just don't type it. We need to confirm the field exists in the API response. If it doesn't, the plan includes a safe fallback.

**Files:**
- Modify: `src/types/api.types.ts:137-147` (TimelineEntry audit variant)
- Modify: `src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx:941-953` (formatTs function)
- Modify: `src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx:1048-1117` (TimelineRow component)

- [ ] **Step 1: Extend TimelineEntry audit type with actor_role**

In `src/types/api.types.ts`, add `actor_role` to the audit variant of `TimelineEntry`:

```typescript
export type TimelineEntry =
  | {
      type: 'audit';
      id: number;
      timestamp: string;
      action_type: ActionType;
      actor: LawyerRef;
      actor_role?: string;
      old_value: any;
      new_value: any;
      comment: string | null;
    }
  | {
      type: 'comment';
      id: number;
      timestamp: string;
      note_type: NoteType;
      actor: LawyerRef;
      content: string;
    };
```

- [ ] **Step 2: Update formatTs to match client's desired format**

In `src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx`, replace the `formatTs` function (lines 941-953):

```typescript
const formatTs = (ts: string) => {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }) + ' — ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return ts;
  }
};
```

Expected output: `May 27, 2026 — 7:17 AM`

- [ ] **Step 3: Redesign TimelineRow audit rendering**

Replace the `TimelineRow` component (lines 1048-1117) in `LeadInfoModal.tsx`:

```tsx
const TimelineRow = ({ entry }: { entry: TimelineEntry }) => {
  const actorName =
    `${entry.actor?.firstName ?? ''} ${entry.actor?.lastName ?? ''}`.trim() ||
    'System';
  const initials = initialsFromActor(entry.actor);

  if (entry.type === 'comment') {
    return (
      <div className='flex gap-2.5 px-3.5 py-3'>
        <span className='mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-slate-700 text-[10px] font-bold text-white'>
          {initials}
        </span>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <div className='flex items-center justify-between gap-2'>
            <span className='truncate text-[11px] font-bold text-slate-900'>
              {actorName}
            </span>
            <span className='text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500'>
              Comment
            </span>
          </div>
          <span className='whitespace-pre-wrap text-[12px] leading-[1.5] text-slate-700'>
            {entry.content}
          </span>
          <span className='text-[10px] font-semibold text-slate-400'>
            {formatTs(entry.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  // ── Audit entry ──
  const actionLabel = entry.action_type.replace(/_/g, ' ').toUpperCase();
  const from = entry.old_value?.status;
  const to = entry.new_value?.status;
  const roleSuffix = entry.actor_role
    ? ` (${entry.actor_role.charAt(0).toUpperCase() + entry.actor_role.slice(1)})`
    : '';

  return (
    <div className='flex gap-2.5 px-3.5 py-3'>
      <span className='mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-600'>
        {initials}
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
        {/* Action label */}
        <span className='text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500'>
          {actionLabel}
        </span>

        {/* Status transition (only for status_change) */}
        {entry.action_type === 'status_change' && from && to ? (
          <div className='flex items-center gap-1.5 text-[13px] font-bold text-slate-900'>
            <span>{from}</span>
            <span className='text-slate-400'>→</span>
            <span>{to}</span>
          </div>
        ) : null}

        {/* Note / comment (full, not truncated) */}
        {entry.comment ? (
          <p className='whitespace-pre-wrap text-[12px] leading-[1.5] text-slate-700'>
            {entry.comment}
          </p>
        ) : null}

        {/* Actor + role */}
        <p className='text-[11px] font-medium text-slate-500'>
          By: <span className='font-semibold text-slate-700'>{actorName}{roleSuffix}</span>
        </p>

        {/* Timestamp */}
        <span className='text-[10px] font-semibold text-slate-400'>
          {formatTs(entry.timestamp)}
        </span>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Verify in browser**

Open a lead with audit entries and confirm:
- STATUS CHANGED label appears in uppercase
- Status transition shows `FROM → TO` prominently
- Full comment/note is visible (no 80-char truncation)
- Actor name + role displays (e.g., "Sergio Perez (Admin)")
- Timestamp matches format: `May 27, 2026 — 7:17 AM`
- Comment entries remain unchanged

If `actor_role` comes as `undefined` from backend, the role suffix simply won't show (graceful fallback).

- [ ] **Step 5: Commit**

```bash
git add src/types/api.types.ts src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx
git commit -m "fix(timeline): redesign audit cards with richer layout (ISSUE-01)"
```

---

### Task 2: Allow ARCHIVED leads to return to NEW

**Context:** Currently, when a lead is ARCHIVED and the admin opens its modal, the status dropdown uses `STATUS_OPTIONS_SELECT` (the catch-all) which does NOT include "New". The admin should be able to move archived leads back to the pool as NEW.

**Files:**
- Modify: `src/app/(dashboard)/lead-management/LeadManagement.tsx:70-88` (add status options constant)
- Modify: `src/app/(dashboard)/lead-management/LeadManagement.tsx:773-781` (conditional for modal)

- [ ] **Step 1: Add STATUS_OPTIONS_ARCHIVED constant**

In `LeadManagement.tsx`, after the existing `STATUS_OPTIONS_DISABLED` constant (line 88), add:

```typescript
const STATUS_OPTIONS_ARCHIVED = [
  { name: 'New', value: 'NEW' },
  { name: 'Archive', value: 'ARCHIVED' },
];
```

- [ ] **Step 2: Wire ARCHIVED status to the new options in the modal**

In `LeadManagement.tsx`, update the `statusOptions` prop passed to `LeadInfoModal` (lines 773-781). Replace:

```typescript
        statusOptions={
          selectedLead.status === 'DISABLED' ||
          selectedLead.status === 'LOST'
            ? STATUS_OPTIONS_DISABLED
            : selectedLead.status === 'NEW' ||
              selectedLead.status === 'EXPIRED'
            ? STATUS_OPTIONS_NEW
            : STATUS_OPTIONS_SELECT
        }
```

With:

```typescript
        statusOptions={
          selectedLead.status === 'ARCHIVED'
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

- [ ] **Step 3: Verify the ARCHIVED → NEW transition in handleSaveLead**

Check `handleSaveLead` (line 229-276). When status is `NEW`:
- It does NOT hit the archive endpoint (line 236 checks `upper === 'ARCHIVED'`)
- It does NOT hit unassign (line 258-260 checks for LOST/SEND_BACK)
- It falls through to `api.leads.update(leadId, { status: 'NEW', ... })` — this is correct

No changes needed to the submit handler. The backend PUT `/leads/:id` should accept status=NEW.

- [ ] **Step 4: Verify in browser**

1. Find an ARCHIVED lead in Lead Management
2. Open its modal
3. Confirm the status dropdown shows "New" and "Archive"
4. Select "New" → fill required note (Task 4) → save
5. Confirm lead moves back to NEW in the list

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/lead-management/LeadManagement.tsx
git commit -m "fix(leads): allow admin to move ARCHIVED leads back to NEW (ISSUE-02)"
```

---

### Task 3: Fix reason label — "Reason for lost" → use display label

**Context:** When changing status to "Send back" (internal value: `LOST`), the label reads "Reason for lost" because line 550 uses `selectedStatus.toLowerCase()`. It should use the human-readable label from `LEAD_STATUS_META`, which maps LOST → "Sent back".

**Files:**
- Modify: `src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx:550`

- [ ] **Step 1: Replace raw status with display label**

In `LeadInfoModal.tsx`, line 550, replace:

```tsx
                      Reason for {(selectedStatus ?? '').toLowerCase().replace('_', ' ')}
```

With:

```tsx
                      Reason for {getLeadStatusMeta(selectedStatus).label.toLowerCase()}
```

This maps:
- `LOST` → "sent back" (via meta label "Sent back")
- `PROBLEMATIC` → "problematic" (via meta label "Problematic")
- `SEND_BACK` → falls back to DISABLED meta → "disabled" — but SEND_BACK is never a selectable option in the dropdown, so this case doesn't arise.

- [ ] **Step 2: Verify in browser**

1. Open a lead with status IN PROGRESS
2. Change status to "Send back"
3. Confirm label reads: "Reason for sent back"
4. Change status to "Problematic"
5. Confirm label reads: "Reason for problematic"

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx
git commit -m "fix(modal): use display label for reason field instead of raw status (ISSUE-03)"
```

---

### Task 4: Make notes mandatory for ALL status changes

**Context:** Currently, only "destructive" statuses (LOST, PROBLEMATIC, SEND_BACK) show the reason textarea and require input. The client wants ALL status changes — including non-destructive ones like IN PROGRESS, CLOSED, DISABLED, ARCHIVED — to require a note. This is for legal/audit compliance.

**Important:** The `isDestructiveStatus` function is still needed for styling purposes (red warning banner, red textarea border). We keep it but decouple the "show textarea" logic from it.

**Files:**
- Modify: `src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx:200-225,544-583`
- Modify: `src/app/(dashboard)/lead-management/LeadManagement.tsx:235-254`

- [ ] **Step 1: Update reasonRequiredMissing in LeadInfoModal**

In `LeadInfoModal.tsx`, line 225, replace:

```typescript
  const reasonRequiredMissing = statusChanged && isDestructive && reasonLength === 0;
```

With:

```typescript
  const reasonRequiredMissing = statusChanged && reasonLength === 0;
```

- [ ] **Step 2: Always show the reason textarea when status changes**

In `LeadInfoModal.tsx`, the textarea section (lines 544-583) is currently wrapped in `{isDestructive ? ( ... ) : null}`. Replace that conditional to show for ANY status change, but keep the destructive styling conditional.

Replace the entire block from line 544 (`{isDestructive ? (`) through line 583 (`) : null}`):

```tsx
                {statusChanged ? (
                  <section className='flex flex-col gap-1.5'>
                    <label
                      htmlFor='lead-comment'
                      className='inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'
                    >
                      Reason for {getLeadStatusMeta(selectedStatus).label.toLowerCase()}
                      <span className='rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-customRed'>
                        Required
                      </span>
                    </label>
                    <textarea
                      id='lead-comment'
                      value={comment}
                      onChange={(e) =>
                        setComment(e.target.value.slice(0, REASON_MAX))
                      }
                      placeholder='Explain the reason for this status change. The super admin will see this in the lead history.'
                      disabled={loading}
                      className={cn(
                        'min-h-[96px] w-full resize-y rounded-[10px] border-[1.5px] bg-white px-3.5 py-3 text-[13px] font-medium leading-[1.5] text-slate-900 outline-none transition-colors',
                        'placeholder:font-normal placeholder:text-slate-400',
                        isDestructive
                          ? 'border-rose-200 focus:border-customRed focus:shadow-[0_0_0_3px_rgba(240,68,56,0.10)]'
                          : 'border-slate-200 focus:border-slate-400 focus:shadow-[0_0_0_3px_rgba(11,15,25,0.06)]',
                        'disabled:cursor-not-allowed disabled:opacity-60'
                      )}
                    />
                    <div className='flex items-center justify-between'>
                      {reasonRequiredMissing ? (
                        <span className='text-[10px] font-semibold text-customRed'>
                          A reason is required for this status change.
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className='text-[10px] font-semibold tabular-nums text-slate-400'>
                        {reasonLength} / {REASON_MAX}
                      </span>
                    </div>
                  </section>
                ) : null}
```

Key changes:
- Outer condition: `statusChanged` instead of `isDestructive`
- Label uses `getLeadStatusMeta(selectedStatus).label.toLowerCase()` (from Task 3)
- Textarea border: neutral slate for non-destructive, red for destructive

- [ ] **Step 3: Update handleSaveLead validation in LeadManagement.tsx**

In `LeadManagement.tsx`, the submit handler (lines 249-253) currently only requires reason for destructive statuses. Replace:

```typescript
    const reasonRequired = upper === 'PROBLEMATIC' || upper === 'SEND_BACK' || upper === 'LOST';
    const reason = (comments ?? '').trim();
    if (reasonRequired && reason.length === 0) {
      toast.error('A reason is required for this status change');
      return;
    }
```

With:

```typescript
    const reason = (comments ?? '').trim();
    if (reason.length === 0) {
      toast.error('A reason is required for this status change');
      return;
    }
```

- [ ] **Step 4: Ensure archive endpoint receives the comment**

In `LeadManagement.tsx`, the archive path (lines 236-248) currently calls `api.leads.archive(leadId)` WITHOUT passing a comment. Update:

```typescript
    if (upper === 'ARCHIVED') {
      setLoading(true);
      const archived = await api.leads.archive(selectedLead['lead id'], {
        comment: reason,
      });
      setLoading(false);
      if (!archived.success) {
        toast.error(archived.message || 'Error archiving lead');
        return;
      }
      toast.success('Lead archived');
      setIsOpenLead(false);
      fetchLeads();
      return;
    }
```

**Check:** Verify `api.leads.archive` signature accepts a body with `comment`. If not, we may need to update the API call in `database.ts`.

- [ ] **Step 5: Verify api.leads.archive signature**

In `src/services/database.ts`, check the archive endpoint signature. If it only accepts `(id, token?)`, update it to accept an optional body:

Current (likely):
```typescript
archive: (id: number, token?: string) =>
  apiRequest<...>(`/leads/${id}/archive`, { method: 'PUT' }, token),
```

Update to:
```typescript
archive: (id: number, body?: { comment: string }, token?: string) =>
  apiRequest<...>(
    `/leads/${id}/archive`,
    { method: 'PUT', ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) },
    token
  ),
```

**Note:** Verify the actual signature before editing. The `apiRequest` utility may handle body serialization differently.

- [ ] **Step 6: Verify in browser**

1. Open a lead with status IN PROGRESS
2. Change to "Retained" (non-destructive)
3. Confirm textarea appears with neutral border, "Required" badge, label "Reason for retained"
4. Try to save without text → blocked with error
5. Enter text → save succeeds
6. Change to "Send back" (destructive)
7. Confirm textarea has red border, destructive warning still shows
8. Confirm reason is stored in audit log (check timeline)

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/organisms/LeadInfoModal/LeadInfoModal.tsx src/app/\(dashboard\)/lead-management/LeadManagement.tsx src/services/database.ts
git commit -m "fix(status): require mandatory notes for ALL status changes (ISSUE-04)"
```

---

### Task 5: Filter admin users from lawyer assignment lists

**Context:** When fetching lawyers for lead assignment, the code uses `{ is_active: true }` without filtering by role. If an admin account is active, it appears in the lawyer assignment dropdown. The client explicitly stated: admin should NEVER appear in lawyer lists.

The `LawyerFilters` type already supports `role_id?: number`, and role_id 2 = lawyer.

**Files:**
- Modify: `src/app/(dashboard)/lead-management/LeadManagement.tsx:315`

- [ ] **Step 1: Add role_id filter to lawyer fetch**

In `LeadManagement.tsx`, line 315, replace:

```typescript
      api.lawyers.list({ is_active: true, limit: 1000 }),
```

With:

```typescript
      api.lawyers.list({ is_active: true, role_id: 2, limit: 1000 }),
```

- [ ] **Step 2: Verify in browser**

1. Go to Lead Management
2. Select a NEW lead → open assign picker
3. Confirm no admin users appear in the lawyer list
4. Confirm all active lawyers still appear correctly

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/lead-management/LeadManagement.tsx
git commit -m "fix(lawyers): exclude admin users from lawyer assignment lists (ISSUE-05)"
```

---

### Task 6: Change dashboard default time filter to "All time"

**Context:** The admin dashboard defaults to "This week" period. The client wants "All time" as the default for both dashboards. The lawyer dashboard (`DashboardLawyers.tsx`) does NOT use `PeriodSelect` — it has a hardcoded 14-day sparkline window, so only the admin dashboard needs updating.

**Files:**
- Modify: `src/app/(dashboard)/dashboard/Dashboard.tsx:134-136`

- [ ] **Step 1: Change default period state**

In `Dashboard.tsx`, lines 134-136, replace:

```typescript
  const [period, setPeriod] = useState<{ key: PeriodKey; days: number | null }>(
    { key: 'week', days: 7 }
  );
```

With:

```typescript
  const [period, setPeriod] = useState<{ key: PeriodKey; days: number | null }>(
    { key: 'all', days: null }
  );
```

- [ ] **Step 2: Verify in browser**

1. Navigate to Admin Dashboard
2. Confirm PeriodSelect shows "All time" by default
3. Confirm KPI cards show all-time data
4. Switch to "This week" → confirm it filters correctly
5. Switch back to "All time" → confirm it shows everything

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/Dashboard.tsx
git commit -m "fix(dashboard): default time filter to all time instead of last week (ISSUE-06)"
```

---

## Execution Order

Tasks are independent — they can be executed in any order. Recommended order for minimal merge risk:

1. **Task 6** (trivial, 1-line change)
2. **Task 5** (trivial, 1-line change)
3. **Task 3** (low, 1-line change — absorbed by Task 4)
4. **Task 2** (low, 2 edits)
5. **Task 4** (medium, touches multiple files — absorbs Task 3's label fix)
6. **Task 1** (medium, largest component rewrite)

**Note:** Tasks 3 and 4 overlap on the same code region (the reason textarea). Task 4's code already includes Task 3's fix (using `getLeadStatusMeta` for labels). Execute Task 4 and skip Task 3's standalone commit — or do Task 3 first and Task 4 will supersede it.

## Backend Dependencies

| Item | Status | Fallback |
|------|--------|----------|
| `actor_role` in timeline API response | **Verify** — `AuditEvent` type has it, likely returned | Graceful: role suffix hidden if undefined |
| `api.leads.archive` accepting `{ comment }` body | **Verify** — check `database.ts` signature | May need endpoint update |
| `PUT /leads/:id` accepting status=NEW from ARCHIVED | **Verify** — test the transition | If backend rejects, needs backend fix |
