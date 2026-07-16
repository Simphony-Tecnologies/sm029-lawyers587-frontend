# Dashboard Advanced Widgets — Interactivity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 4 top "Advanced Widgets" KPI cards on the admin Dashboard interactive — "New" deep-links into Lead Management preset to the newest leads; "In Progress", "Contacted" and "Conversions" open a detail modal with the widget's full metric breakdown plus a deep-link.

**Architecture:** Pure client-side UI enhancement. No new endpoints and no new components — reuse the existing `KpiCard` (already a `<button>` accepting `onClick`), the existing `ConfirmationDialog` organism (Headless UI shell with `title`/`subtitle`/`fields[]`/`confirmLabel`/`onConfirm`) as the detail modal, and the existing `useSelectStatus` Zustand store + `router.push('/lead-management')` pattern already used by the 8 legacy KPIs (`Dashboard.handleClickKpi`). Only two files change: `AdvancedWidgets.tsx` (owns card clicks + modal state) and `Dashboard.tsx` (passes the navigation callback).

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Zustand, `@headlessui/react`, dayjs, Tailwind.

---

## Constraints & Assumptions

- **Hard constraint (client):** zero new endpoints. Data sources are only the already-fetched `WidgetMetricsResponse` (per-widget `count`/`previous`/`delta`/`delta_pct`/`trend` + `range`) and, for navigation, the `useSelectStatus` store consumed by Lead Management.
- **Modal body is exact metric data** (decided): current vs previous, absolute delta, delta %, trend, compared date range. No lead-list filtering of `dataLeads` in the modal → **no count-mismatch risk** (widgets are period-transition counts; `dataLeads` is a current-status snapshot).
- **Cohort → status mapping** for the deep-links (best-fit; backend does not expose the exact composition, so this is an editable assumption — mirrors the legacy KPI mapping in `Dashboard.tsx`):
  | Widget key | Card label | Deep-link statuses |
  |---|---|---|
  | `nuevos` | New | `['NEW']` |
  | `en_proceso` | In Progress | `['IN PROGRESS']` |
  | `contactados` | Contacted | `['ASSIGNED', 'IN PROGRESS']` |
  | `conversiones` | Conversions | `['CLOSED']` |

  `'CLOSED'` filtering already works in Lead Management (the legacy "Retained" KPI uses `['CLOSED']`). `useSelectStatus`'s status union is narrower than these values, so navigation casts `as any` / `as LeadStatus[]` — exactly as the existing `handleClickKpi` already does.

## Acceptance Criteria

- **AC-1:** Given the Dashboard is loaded, when I click the **New** card, then I navigate to `/lead-management` with the status filter preset to `NEW` (table already sorts `date desc`, so newest first).
- **AC-2:** Given widget data is loaded, when I click **In Progress**, **Contacted**, or **Conversions**, then a modal opens titled with that card's label showing: Current, Previous period, Change (signed), Change %, Trend pill, and the compared date range.
- **AC-3:** Given the modal is open, when I click **"View in Lead Management"**, then the modal closes and I navigate to `/lead-management` filtered to that widget's cohort statuses.
- **AC-4:** Given the modal is open, when I click **"Close"** or the backdrop, then the modal closes and no navigation occurs.
- **AC-5:** Given widget data has not loaded yet (cards show `—`), when I click a modal card, then nothing opens (guarded); the **New** card still navigates.
- **AC-6:** `npx tsc --noEmit` and `npm run build` pass with 0 errors.

## File Structure

- **Modify** `src/app/(dashboard)/dashboard/AdvancedWidgets.tsx` — add `statuses` to each widget def, add `onOpenLeads` prop, add `selectedKey` modal state, wire per-card `onClick`, render `ConfirmationDialog`.
- **Modify** `src/app/(dashboard)/dashboard/Dashboard.tsx` — pass `onOpenLeads` to `<AdvancedWidgets>` (wraps existing `handleClickKpi`).

No files created. No tests created (repo has no unit runner — Playwright e2e only; per SESSION.md verification is `tsc` + `build` + browser). Verification steps below use those gates.

---

## Decision Log

```
DECISION: Reuse ConfirmationDialog instead of building a WidgetDetailModal organism
CONTEXT: The 3 cards need a detail modal.
OPTIONS CONSIDERED:
  A) New WidgetDetailModal organism — rejected: ConfirmationDialog already provides a
     Headless-UI shell with title/subtitle/fields[]/confirmLabel/onConfirm — an exact fit.
  B) Reuse ConfirmationDialog — selected: zero new files, consistent look, deep-link maps
     cleanly to its onConfirm/confirmLabel.
TRADE-OFF: ConfirmationDialog is confirm-shaped; we repurpose "confirm" as "View in Lead
  Management". Acceptable and readable.
REVERSIBILITY: Easy — swap the shell later without touching the data wiring.

DECISION: Navigation via useSelectStatus store, not URL query params
CONTEXT: "New" and modal deep-links must preset the Lead Management filter.
OPTIONS CONSIDERED:
  A) URL query param (?status=NEW) — rejected (user choice): duplicates the store mechanism,
     touches LeadManagement, more code.
  B) Reuse store (setSelecArray + router.push) — selected: identical to the 8 legacy KPIs;
     table already sorts date desc so "newest" is implicit.
TRADE-OFF: URL is not shareable/bookmarkable. Matches existing app behavior.
REVERSIBILITY: Easy.

DECISION: Modal shows exact widget metrics, not a filtered lead list
CONTEXT: "detail with data we already have, no new endpoints".
OPTIONS CONSIDERED:
  A) Filter dataLeads into a list — rejected (user choice): counts can diverge from the card
     (transition vs snapshot).
  B) Exact WidgetMetric breakdown — selected: always consistent with the card number.
TRADE-OFF: Less "drill-into-rows" from the modal itself; mitigated by the deep-link button.
REVERSIBILITY: Medium.
```

---

## Task 1: Widget defs + props wiring (no behavior change yet)

**Files:**
- Modify: `src/app/(dashboard)/dashboard/AdvancedWidgets.tsx`
- Modify: `src/app/(dashboard)/dashboard/Dashboard.tsx`

- [ ] **Step 1: Add `statuses` to `WidgetDef` and each entry, and add the `onOpenLeads` prop**

In `AdvancedWidgets.tsx`, replace the `WidgetDef` type, the `WIDGET_DEFS` array, the `AdvancedWidgetsProps` interface, and the component signature line with:

```tsx
type WidgetDef = {
  key: WidgetKey;
  label: string;
  tone: KpiTone;
  icon: JSX.Element;
  /** Cohorte→status para el deep-link a Lead Management (mejor ajuste, editable). */
  statuses: string[];
};

// The 4 advanced backend widgets (period-bounded transitions + deltas).
// They coexist with the 8 legacy status KPIs — they do NOT replace them.
const WIDGET_DEFS: WidgetDef[] = [
  { key: 'nuevos', label: 'New', tone: 'violet', icon: <MdAddCircleOutline size={16} />, statuses: ['NEW'] },
  { key: 'en_proceso', label: 'In Progress', tone: 'amber', icon: <MdTrendingUp size={16} />, statuses: ['IN PROGRESS'] },
  { key: 'contactados', label: 'Contacted', tone: 'emerald', icon: <MdChatBubbleOutline size={16} />, statuses: ['ASSIGNED', 'IN PROGRESS'] },
  { key: 'conversiones', label: 'Conversions', tone: 'emerald', icon: <MdEmojiEvents size={16} />, statuses: ['CLOSED'] },
];

interface AdvancedWidgetsProps {
  /** Ventana relativa del PeriodSelect. `null` = all time → backend default 30d. */
  days: number | null;
  /** Navega a Lead Management preseteando el filtro de status (reusa el store). */
  onOpenLeads: (statuses: string[]) => void;
}

export const AdvancedWidgets = ({ days, onOpenLeads }: AdvancedWidgetsProps) => {
```

- [ ] **Step 2: Pass `onOpenLeads` from `Dashboard.tsx`**

In `Dashboard.tsx`, find the render `<AdvancedWidgets days={period.days} />` (currently near line 275) and replace it with:

```tsx
<AdvancedWidgets
  days={period.days}
  onOpenLeads={(statuses) => handleClickKpi(statuses as LeadStatus[])}
/>
```

`handleClickKpi` already exists (`setSelecArray(statuses as any); router.push('/lead-management')`) and `LeadStatus` is already declared at the top of `Dashboard.tsx`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors). `onOpenLeads` is now required and provided; unused for now (no runtime change yet). If tsc flags `onOpenLeads` as unused it will not — it's a prop, not a local.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/AdvancedWidgets.tsx src/app/\(dashboard\)/dashboard/Dashboard.tsx
git commit -m "feat(dashboard): add cohort mapping + onOpenLeads prop to AdvancedWidgets"
```

---

## Task 2: Card clicks — New navigates, others select a widget

**Files:**
- Modify: `src/app/(dashboard)/dashboard/AdvancedWidgets.tsx`

- [ ] **Step 1: Add modal state**

In `AdvancedWidgets.tsx`, add a state hook next to the existing `useState` calls (after the `error` state):

```tsx
  const [selectedKey, setSelectedKey] = useState<WidgetKey | null>(null);
```

- [ ] **Step 2: Wire per-card `onClick` in the map**

Replace the `WIDGET_DEFS.map(...)` card render so each card computes a click handler: "New" navigates, the others open the modal (guarded until data is loaded):

```tsx
      {WIDGET_DEFS.map((def) => {
        const w = data?.widgets[def.key];
        const handleClick =
          def.key === 'nuevos'
            ? () => onOpenLeads(def.statuses)
            : w
              ? () => setSelectedKey(def.key)
              : undefined;
        return (
          <KpiCard
            key={def.key}
            label={def.label}
            period={comparison}
            value={loading || !w ? '—' : w.count}
            tone={def.tone}
            icon={def.icon}
            onClick={handleClick}
            trend={
              w
                ? {
                    direction: trendToDirection(w.trend),
                    value: formatDeltaPct(w.delta_pct),
                    meta: `Δ ${formatSignedInt(w.delta)}`,
                  }
                : undefined
            }
          />
        );
      })}
```

`KpiCard` forwards `onClick` to its underlying `<button>` via `...rest`; when `handleClick` is `undefined` the card is inert (no visual change needed — it already renders as a card).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. `selectedKey`/`setSelectedKey` are now referenced; the modal render lands in Task 3.

- [ ] **Step 4: Browser smoke — New card navigates**

Run: `npm run dev` (port 3002). Log in as admin, open Dashboard. Click the **New** card.
Expected: navigates to `/lead-management` with the status filter chip preset to `NEW`. (Modal cards do nothing yet — added next task.)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/AdvancedWidgets.tsx
git commit -m "feat(dashboard): New card deep-links to Lead Management; others select widget"
```

---

## Task 3: Detail modal (ConfirmationDialog) with metric breakdown + deep-link

**Files:**
- Modify: `src/app/(dashboard)/dashboard/AdvancedWidgets.tsx`

- [ ] **Step 1: Add imports (dayjs, ConfirmationDialog, TrendPill, ConfirmationField)**

At the top of `AdvancedWidgets.tsx`, add the `dayjs` import after the React import:

```tsx
import dayjs from 'dayjs';
```

And replace the existing `import { KpiCard, type KpiTone } from '@/components/ui';` line with:

```tsx
import {
  ConfirmationDialog,
  KpiCard,
  TrendPill,
  type ConfirmationField,
  type KpiTone,
} from '@/components/ui';
```

(`ConfirmationDialog` + `ConfirmationField` come from the organisms barrel, `TrendPill` from the atoms barrel, both re-exported by `@/components/ui`.)

- [ ] **Step 2: Compute the selected widget + detail fields (before `return`)**

Immediately after the existing `const comparison = data ? formatComparisonLabel(data.range) : 'Loading…';` line, add:

```tsx
  const selectedDef = WIDGET_DEFS.find((d) => d.key === selectedKey);
  const selected = selectedKey && data ? data.widgets[selectedKey] : null;

  const detailFields: ConfirmationField[] =
    selected && data
      ? [
          { label: 'Current', value: selected.count, highlight: true },
          { label: 'Previous period', value: selected.previous },
          { label: 'Change', value: formatSignedInt(selected.delta) },
          { label: 'Change %', value: formatDeltaPct(selected.delta_pct) },
          {
            label: 'Trend',
            value: (
              <TrendPill
                direction={trendToDirection(selected.trend)}
                value={formatDeltaPct(selected.delta_pct)}
              />
            ),
          },
          {
            label: 'Date range',
            value: `${dayjs(data.range.from).format('MMM D')} – ${dayjs(
              data.range.to
            ).format('MMM D, YYYY')}`,
          },
        ]
      : [];
```

- [ ] **Step 3: Wrap the grid in a fragment and render the dialog**

Change the component `return (` so the existing `<div className='grid …'>…</div>` grid is wrapped in a fragment with the dialog appended after it:

```tsx
  return (
    <>
      <div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4'>
        {/* …existing WIDGET_DEFS.map(...) card render stays unchanged… */}
      </div>

      <ConfirmationDialog
        open={selectedKey !== null && selected !== null}
        onClose={() => setSelectedKey(null)}
        title={selectedDef?.label ?? ''}
        subtitle={data ? formatComparisonLabel(data.range) : undefined}
        fields={detailFields}
        cancelLabel='Close'
        confirmLabel='View in Lead Management'
        onConfirm={() => {
          if (selectedDef) onOpenLeads(selectedDef.statuses);
          setSelectedKey(null);
        }}
      />
    </>
  );
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both PASS (0 errors). `ConfirmationField.value` is `ReactNode`, so numeric `count`/`previous` and the `<TrendPill>` element are all valid.

- [ ] **Step 5: Browser verification — full flow**

Run: `npm run dev`. On the Dashboard:
1. Click **In Progress** → modal opens titled "In Progress" with Current/Previous period/Change/Change %/Trend/Date range rows; the Current value equals the card number.
2. Click **Close** → modal closes, no navigation (AC-4).
3. Reopen, click **View in Lead Management** → modal closes and navigates to `/lead-management` filtered to `IN PROGRESS` (AC-3).
4. Repeat for **Contacted** (filters `ASSIGNED` + `IN PROGRESS`) and **Conversions** (filters `CLOSED`).
5. Hard-refresh and click a modal card before data loads (cards show `—`) → nothing opens (AC-5).

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/AdvancedWidgets.tsx
git commit -m "feat(dashboard): add widget detail modal with metric breakdown + deep-link"
```

---

## Task 4: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Clean typecheck, lint, build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 0 errors. (Note: a preexisting, unrelated e2e type error may live in `tests/e2e/specs/10-items-audit.spec.ts` — `tsc --noEmit` on app code should be clean; if `tsc` picks up the e2e file and it was already failing before this change, confirm it is pre-existing via `git stash` comparison, do not "fix" it in this feature.)

- [ ] **Step 2: Responsive check**

At 375px / 768px / 1440px: the 4-card grid reflows (`sm:grid-cols-2 lg:grid-cols-4`) with no horizontal scroll; the modal is centered and readable on mobile.

- [ ] **Step 3: Update SESSION.md**

Append a short entry recording the feature (files touched, cohort-mapping assumption) so the next `/sess-start` has it.

---

## Self-Review

**Spec coverage:** AC-1 → Task 2 (New onClick). AC-2 → Task 3 (modal + fields). AC-3 → Task 3 Step 3 (`onConfirm` deep-link). AC-4 → Task 3 (`onClose`). AC-5 → Task 2 (`w ? … : undefined` guard + `open` requires `selected !== null`). AC-6 → Tasks 1–4 typecheck/build gates. ✅ No gaps.

**Placeholder scan:** No TBD/TODO; all steps show concrete code. ✅

**Type consistency:** `onOpenLeads: (statuses: string[]) => void` is defined in Task 1 and consumed in Tasks 2–3. `selectedKey: WidgetKey | null` defined Task 2, used Task 3. `WidgetDef.statuses` defined Task 1, read in Tasks 2–3. `ConfirmationField` matches the exported shape (`label`, `value: ReactNode`, `highlight?`). Dashboard casts to `LeadStatus[]` (declared in `Dashboard.tsx`). ✅

**Known limitations:**
- Cohort→status deep-link mapping is a best-fit assumption (esp. `contactados`); trivially editable in `WIDGET_DEFS` if the client wants a different cohort.
- Modal is metric-only by design; drilling into individual rows happens via the deep-link, not inside the modal.
