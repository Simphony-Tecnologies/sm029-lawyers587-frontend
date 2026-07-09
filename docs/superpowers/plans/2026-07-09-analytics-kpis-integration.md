# Analytics / KPIs Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the two backend analytics endpoints (`GET /leads/metrics/widgets` and `GET /lawyers/metrics/performance`) into the frontend contract + business-logic layer, and surface them with real data as 4 new advanced KPI cards plus a lawyer-performance ranking table on the Dashboard.

**Architecture:** Types go in the single `src/types/api.types.ts` barrel (snake_case, faithful to the wire contract — **no `GenericResponse<T>` wrapper type needed** because the existing `apiRequest<T>` helper already unwraps `{ success, data }` into `ApiResult<T>`). Two service methods are added under the existing `api.leads` / `api.lawyers` objects reusing `apiRequest` + `buildQuery`. Pure, null-safe presentation helpers live in a new `src/lib/metrics.ts`. UI is additive: two route-local client components (`AdvancedWidgets.tsx`, `PerformancePanel.tsx`) composed into the existing `Dashboard.tsx`, driven by the existing `PeriodSelect` (relative `days` → absolute `date_from/date_to` via a helper). The current 8 status KPIs are **kept untouched**.

**Tech Stack:** Next.js 14 (App Router, CSR dashboard), React 18, TypeScript, Tailwind, existing design-system components (`KpiCard`, `DataTable`, `TrendPill`), `react-icons/md`. No new dependencies. Repo has **no unit-test runner** (only Playwright e2e under `tests/e2e`); pure helpers are verified with a throwaway `node` ESM scratch script + `tsc`, and the durable acceptance check is real-data rendering in the browser.

---

## Extrapolation notes (spec → our codebase)

These decisions are already resolved; do not re-derive them:

- Spec's standalone `fetch` service functions with `authHeaders(token)` → **replaced** by the existing `apiRequest<T>(path, init, token)` (resolves token from the `currentUser` cookie, sets `cache: 'no-store'`, and unwraps `GenericResponse` via `unwrapApi`).
- Spec's `URLSearchParams` null-filtering → the existing `buildQuery()` already filters `null | undefined | ''` and stringifies.
- Spec's `NEXT_PUBLIC_API_URL` → our env var is `NEXT_PUBLIC_URL`, consumed inside `apiRequest` via `baseUrl()`. **We never touch it.**
- No Zod (repo doesn't use it). No Server Actions / route handlers / error boundaries (dashboard is `'use client'`, loading handled with `useState`).
- Backend `Trend` union is `'up' | 'down' | 'flat'`; our `TrendPill` atom uses `'up' | 'down' | 'neutral'` → mapped by `trendToDirection` (`flat → neutral`).
- RBAC is enforced **server-side** (admin → all rows, lawyer → own row). The frontend renders whatever `data.lawyers` contains; no client-side role gating in this plan.

## File Structure

- Create: `src/lib/metrics.ts` — pure presentation/business-logic helpers (period→date range, trend mapping, null-safe formatters).
- Create: `src/app/(dashboard)/dashboard/AdvancedWidgets.tsx` — client component: fetches `/leads/metrics/widgets`, renders 4 `KpiCard`s with delta/trend.
- Create: `src/app/(dashboard)/dashboard/PerformancePanel.tsx` — client component: fetches `/lawyers/metrics/performance`, renders a `DataTable` ranking.
- Modify: `src/types/api.types.ts` — append the analytics type block.
- Modify: `src/services/database.ts` — add `api.leads.metrics.widgets` and `api.lawyers.metrics.performance` (+ imports).
- Modify: `src/app/(dashboard)/dashboard/Dashboard.tsx` — compose the two new sections, feeding them `period.days`.

---

## Task 1: Analytics types

**Files:**
- Modify: `src/types/api.types.ts` (append at end of file)

- [ ] **Step 1: Append the analytics type block**

Add at the end of `src/types/api.types.ts`:

```ts
// ─── Analytics / Metrics ─────────────────────────────────────────────────────
// Contrato fiel al backend. El sobre GenericResponse<T> lo desenvuelve
// apiRequest() → ApiResult<T>, por eso NO se tipa aquí.

export interface MetricRange {
  from: string; // ISO UTC
  to: string; // ISO UTC
  previous_from: string; // ISO UTC
  previous_to: string; // ISO UTC
}

export type Trend = 'up' | 'down' | 'flat';

// GET /leads/metrics/widgets
export type WidgetKey = 'nuevos' | 'en_proceso' | 'contactados' | 'conversiones';

export interface WidgetMetric {
  count: number;
  previous: number;
  delta: number;
  delta_pct: number | null; // null si previous=0 y count>0 (N/A)
  trend: Trend;
}

export interface WidgetMetricsResponse {
  range: MetricRange;
  widgets: Record<WidgetKey, WidgetMetric>;
}

export interface MetricsDateFilters {
  date_from?: string;
  date_to?: string;
}

// GET /lawyers/metrics/performance
export type PerformanceSortBy =
  | 'conversion_rate'
  | 'closed'
  | 'taken'
  | 'lost'
  | 'active_assigned';

export interface PerformanceDelta {
  taken: number;
  closed: number;
  lost: number;
  conversion_rate: number | null; // Δ en puntos %, null si algún período tenía taken=0
  trend: Trend;
}

export interface LawyerPerformanceRow {
  lawyer_id: number;
  name: string;
  email: string;
  taken: number;
  closed: number;
  lost: number;
  conversion_rate: number | null; // closed/taken %, null si taken=0
  avg_response_hours: number | null; // asignación → 1ª acción; null si N/A
  active_assigned: number; // snapshot ACTUAL (no depende del rango)
  delta: PerformanceDelta;
}

export interface PerformanceTotals {
  taken: number;
  closed: number;
  lost: number;
  conversion_rate: number | null;
  avg_response_hours: number | null;
  active_assigned: number;
}

export interface LawyerPerformanceResponse {
  range: MetricRange;
  totals: PerformanceTotals;
  lawyers: LawyerPerformanceRow[]; // ya ordenado por sort_by (desc)
  total: number; // # de abogados antes de limit/offset
}

export interface PerformanceFilters extends MetricsDateFilters {
  sort_by?: PerformanceSortBy;
  lawyer_id?: number; // solo admin; backend lo ignora para lawyers
  limit?: number;
  offset?: number;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors). Pre-existing test-only error `tests/e2e/specs/10-items-audit.spec.ts(402,...)` is unrelated and may remain — no NEW errors from `api.types.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/types/api.types.ts
git commit -m "feat(analytics): add widgets & lawyer-performance metric types"
```

---

## Task 2: Pure metrics helpers

**Files:**
- Create: `src/lib/metrics.ts`
- Verify (scratch): `/tmp/metrics-check.mjs` (throwaway, deleted in Step 4)

> **Testing note:** repo has no unit runner (`package.json` only defines Playwright `e2e`). Adding one is out of scope (YAGNI + "follow established patterns"). We verify the pure logic with a `node` ESM scratch script that mirrors the edge-case table below, then delete it. The durable check is real-data rendering (Task 7).

- [ ] **Step 1: Write the scratch verification (must fail first)**

Create `/tmp/metrics-check.mjs`:

```js
import assert from 'node:assert/strict';
import {
  periodToRange,
  trendToDirection,
  formatDeltaPct,
  formatPercent,
  formatHours,
  formatSignedInt,
  formatComparisonLabel,
} from './metrics.mjs';

// periodToRange: null → {} (backend usa default 30d)
assert.deepEqual(periodToRange(null), {});
// periodToRange: 7 días con `now` fijo → rango ISO correcto
const now = new Date('2026-07-09T12:00:00.000Z');
const r = periodToRange(7, now);
assert.equal(r.date_to, '2026-07-09T12:00:00.000Z');
assert.equal(r.date_from, '2026-07-02T12:00:00.000Z');

// trendToDirection: flat → neutral (mapeo clave)
assert.equal(trendToDirection('up'), 'up');
assert.equal(trendToDirection('down'), 'down');
assert.equal(trendToDirection('flat'), 'neutral');

// Formatters null-safe (regla de oro del spec)
assert.equal(formatDeltaPct(null), '—');
assert.equal(formatDeltaPct(22.4), '+22.4%');
assert.equal(formatDeltaPct(-10), '-10.0%');
assert.equal(formatDeltaPct(0), '0.0%');
assert.equal(formatPercent(null), '—');
assert.equal(formatPercent(35), '35.0%');
assert.equal(formatHours(null), '—');
assert.equal(formatHours(5.8), '5.8h');
assert.equal(formatSignedInt(5), '+5');
assert.equal(formatSignedInt(-3), '-3');
assert.equal(formatSignedInt(0), '0');

// formatComparisonLabel deriva el span en días desde el range
assert.equal(
  formatComparisonLabel({
    from: '2026-06-09T00:00:00.000Z',
    to: '2026-07-09T00:00:00.000Z',
    previous_from: '2026-05-10T00:00:00.000Z',
    previous_to: '2026-06-09T00:00:00.000Z',
  }),
  'vs prev 30d'
);

console.log('ALL METRICS ASSERTIONS PASSED');
```

- [ ] **Step 2: Run scratch — verify it FAILS (module missing)**

Run: `node /tmp/metrics-check.mjs`
Expected: FAIL — `Cannot find module './metrics.mjs'` (the code under test does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/metrics.ts`:

```ts
import type { MetricRange, Trend } from '@/types/api.types';

const DAY_MS = 86_400_000;

/**
 * Convierte la ventana relativa del PeriodSelect (días hacia atrás) al rango
 * absoluto date_from/date_to que espera el backend. `null` (all time) → sin
 * fechas; el backend usa su default de 30 días.
 */
export function periodToRange(
  days: number | null,
  now: Date = new Date()
): { date_from?: string; date_to?: string } {
  if (days == null) return {};
  const from = new Date(now.getTime() - days * DAY_MS);
  return { date_from: from.toISOString(), date_to: now.toISOString() };
}

/** Trend del backend → dirección del TrendPill (flat = neutral). */
export function trendToDirection(trend: Trend): 'up' | 'down' | 'neutral' {
  if (trend === 'up') return 'up';
  if (trend === 'down') return 'down';
  return 'neutral';
}

/** Variación % con signo. `null` (base 0 → N/A) → '—'. Nunca NaN/∞. */
export function formatDeltaPct(pct: number | null): string {
  if (pct == null) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/** Porcentaje simple (conversion_rate). `null` → '—'. */
export function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(1)}%`;
}

/** Horas promedio de respuesta. `null` → '—'. */
export function formatHours(hours: number | null): string {
  if (hours == null) return '—';
  return `${hours.toFixed(1)}h`;
}

/** Entero con signo para deltas absolutos: +5 / -3 / 0. */
export function formatSignedInt(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Etiqueta de comparación legible derivada del range (span en días). */
export function formatComparisonLabel(range: MetricRange): string {
  const spanDays = Math.round(
    (new Date(range.to).getTime() - new Date(range.from).getTime()) / DAY_MS
  );
  return `vs prev ${spanDays}d`;
}
```

- [ ] **Step 4: Make the scratch importable, run it, verify PASS, then delete**

The scratch imports `./metrics.mjs`. Produce a runtime-JS twin next to it (strip the type-only import), run, then clean up both scratch files:

Run:
```bash
sed 's/^import type.*$//' src/lib/metrics.ts > /tmp/metrics.mjs \
  && node /tmp/metrics-check.mjs \
  && rm -f /tmp/metrics.mjs /tmp/metrics-check.mjs
```
Expected: prints `ALL METRICS ASSERTIONS PASSED`, exit 0, scratch files removed.

- [ ] **Step 5: Typecheck the real module**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 6: Commit**

```bash
git add src/lib/metrics.ts
git commit -m "feat(analytics): add null-safe metric formatters + period→range helper"
```

---

## Task 3: Service methods

**Files:**
- Modify: `src/services/database.ts` (type imports near top; `api.leads` closes ~line 888; `api.lawyers` closes ~line 944)

- [ ] **Step 1: Add the new type imports**

In the big `import type { ... } from '@/types/api.types';` block at the top of `src/services/database.ts`, add these names (keep alphabetical-ish ordering consistent with the file):

```ts
  LawyerPerformanceResponse,
  MetricsDateFilters,
  PerformanceFilters,
  WidgetMetricsResponse,
```

- [ ] **Step 2: Add `metrics.widgets` to `api.leads`**

Insert immediately before the closing `},` of the `leads:` object (currently line 888, right after the `restore:` method):

```ts
    metrics: {
      widgets: (filters?: MetricsDateFilters, token?: string) =>
        apiRequest<WidgetMetricsResponse>(
          `/leads/metrics/widgets${buildQuery(filters as Record<string, unknown>)}`,
          { method: 'GET' },
          token
        ),
    },
```

- [ ] **Step 3: Add `metrics.performance` to `api.lawyers`**

Insert immediately before the closing `},` of the `lawyers:` object (currently line 944, right after the `history:` method):

```ts
    metrics: {
      performance: (filters?: PerformanceFilters, token?: string) =>
        apiRequest<LawyerPerformanceResponse>(
          `/lawyers/metrics/performance${buildQuery(filters as Record<string, unknown>)}`,
          { method: 'GET' },
          token
        ),
    },
```

- [ ] **Step 4: Verify compile**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors). Confirms `api.leads.metrics.widgets` and `api.lawyers.metrics.performance` are well-typed.

- [ ] **Step 5: Commit**

```bash
git add src/services/database.ts
git commit -m "feat(analytics): add widgets & lawyer-performance api service methods"
```

---

## Task 4: AdvancedWidgets component

**Files:**
- Create: `src/app/(dashboard)/dashboard/AdvancedWidgets.tsx`

- [ ] **Step 1: Write the component**

Create `src/app/(dashboard)/dashboard/AdvancedWidgets.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import {
  MdAddCircleOutline,
  MdTrendingUp,
  MdChatBubbleOutline,
  MdEmojiEvents,
} from 'react-icons/md';
import { api } from '@/services/database';
import type { WidgetKey, WidgetMetricsResponse } from '@/types/api.types';
import {
  formatComparisonLabel,
  formatDeltaPct,
  formatSignedInt,
  periodToRange,
  trendToDirection,
} from '@/lib/metrics';
import { KpiCard, type KpiTone } from '@/components/ui';

type WidgetDef = {
  key: WidgetKey;
  label: string;
  tone: KpiTone;
  icon: JSX.Element;
};

// Los 4 widgets avanzados del backend (transiciones period-bounded + deltas).
// Conviven con los 8 KPIs por status legacy — NO los reemplazan.
const WIDGET_DEFS: WidgetDef[] = [
  { key: 'nuevos', label: 'Nuevos', tone: 'violet', icon: <MdAddCircleOutline size={16} /> },
  { key: 'en_proceso', label: 'En proceso', tone: 'amber', icon: <MdTrendingUp size={16} /> },
  { key: 'contactados', label: 'Contactados', tone: 'emerald', icon: <MdChatBubbleOutline size={16} /> },
  { key: 'conversiones', label: 'Conversiones', tone: 'emerald', icon: <MdEmojiEvents size={16} /> },
];

interface AdvancedWidgetsProps {
  /** Ventana relativa del PeriodSelect. `null` = all time → backend default 30d. */
  days: number | null;
}

export const AdvancedWidgets = ({ days }: AdvancedWidgetsProps) => {
  const [data, setData] = useState<WidgetMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.leads.metrics
      .widgets(periodToRange(days))
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setData(res.data);
        else setError(res.message || 'No se pudieron cargar los widgets');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days]);

  if (error) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500'>
        {error}
      </div>
    );
  }

  const comparison = data ? formatComparisonLabel(data.range) : 'Cargando…';

  return (
    <div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4'>
      {WIDGET_DEFS.map((def) => {
        const w = data?.widgets[def.key];
        return (
          <KpiCard
            key={def.key}
            label={def.label}
            period={comparison}
            value={loading || !w ? '—' : w.count}
            tone={def.tone}
            icon={def.icon}
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
    </div>
  );
};
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/dashboard/AdvancedWidgets.tsx"
git commit -m "feat(analytics): add AdvancedWidgets KPI cards backed by real metrics"
```

---

## Task 5: PerformancePanel component

**Files:**
- Create: `src/app/(dashboard)/dashboard/PerformancePanel.tsx`

- [ ] **Step 1: Write the component**

Create `src/app/(dashboard)/dashboard/PerformancePanel.tsx`:

```tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/services/database';
import type {
  LawyerPerformanceResponse,
  LawyerPerformanceRow,
  PerformanceSortBy,
} from '@/types/api.types';
import {
  formatHours,
  formatPercent,
  formatSignedInt,
  periodToRange,
  trendToDirection,
} from '@/lib/metrics';
import { DataTable, TrendPill, type DataTableColumn } from '@/components/ui';

interface PerformancePanelProps {
  /** Ventana relativa del PeriodSelect. `null` = all time → backend default 30d. */
  days: number | null;
  sortBy?: PerformanceSortBy;
}

export const PerformancePanel = ({
  days,
  sortBy = 'conversion_rate',
}: PerformancePanelProps) => {
  const [data, setData] = useState<LawyerPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.lawyers.metrics
      .performance({ ...periodToRange(days), sort_by: sortBy })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setData(res.data);
        else setError(res.message || 'No se pudo cargar el desempeño');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days, sortBy]);

  const columns = useMemo<DataTableColumn<LawyerPerformanceRow>[]>(
    () => [
      {
        key: 'name',
        label: 'Abogado',
        sortable: true,
        accessor: (r) => r.name,
        render: (r) => (
          <div className='flex flex-col'>
            <span className='text-[13px] font-semibold text-slate-800'>{r.name}</span>
            <span className='text-[11px] text-slate-400'>{r.email}</span>
          </div>
        ),
      },
      {
        key: 'taken',
        label: 'Tomados',
        align: 'right',
        sortable: true,
        accessor: (r) => r.taken,
        render: (r) => <span className='tabular-nums'>{r.taken}</span>,
      },
      {
        key: 'closed',
        label: 'Cerrados',
        align: 'right',
        sortable: true,
        accessor: (r) => r.closed,
        render: (r) => <span className='tabular-nums'>{r.closed}</span>,
      },
      {
        key: 'lost',
        label: 'Perdidos',
        align: 'right',
        sortable: true,
        accessor: (r) => r.lost,
        render: (r) => <span className='tabular-nums'>{r.lost}</span>,
      },
      {
        key: 'conversion_rate',
        label: 'Conversión',
        align: 'right',
        sortable: true,
        // null ordena al fondo (accessor -1); render sigue mostrando '—'.
        accessor: (r) => r.conversion_rate ?? -1,
        render: (r) => (
          <div className='flex items-center justify-end gap-1.5'>
            <span className='tabular-nums'>{formatPercent(r.conversion_rate)}</span>
            <TrendPill
              direction={trendToDirection(r.delta.trend)}
              value={formatSignedInt(r.delta.closed)}
            />
          </div>
        ),
      },
      {
        key: 'avg_response_hours',
        label: 'Resp. prom.',
        align: 'right',
        sortable: true,
        accessor: (r) => r.avg_response_hours ?? -1,
        render: (r) => <span className='tabular-nums'>{formatHours(r.avg_response_hours)}</span>,
      },
      {
        key: 'active_assigned',
        label: 'Activos ahora',
        align: 'right',
        sortable: true,
        accessor: (r) => r.active_assigned,
        render: (r) => <span className='tabular-nums'>{r.active_assigned}</span>,
      },
    ],
    []
  );

  if (error) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500'>
        {error}
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5'>
      <div className='flex items-baseline justify-between'>
        <h2 className='text-sm font-bold text-slate-800'>Desempeño por abogado</h2>
        {data ? (
          <span className='text-[11px] font-semibold text-slate-400'>
            {data.total} abogado{data.total === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>
      <DataTable<LawyerPerformanceRow>
        columns={columns}
        data={data?.lawyers ?? []}
        rowKey={(r) => r.lawyer_id}
        emptyState={
          loading ? 'Cargando desempeño…' : 'Sin datos de desempeño en el período'
        }
        pagination={{ enabled: true, initialPageSize: 10 }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/dashboard/PerformancePanel.tsx"
git commit -m "feat(analytics): add lawyer PerformancePanel ranking table"
```

---

## Task 6: Wire into Dashboard

**Files:**
- Modify: `src/app/(dashboard)/dashboard/Dashboard.tsx`

- [ ] **Step 1: Add imports**

At the top of `Dashboard.tsx`, after the existing `@/components/ui` import block, add:

```tsx
import { AdvancedWidgets } from './AdvancedWidgets';
import { PerformancePanel } from './PerformancePanel';
```

- [ ] **Step 2: Render the advanced widgets above the legacy KPI grid**

In the returned JSX, immediately after the closing `</PageHead>`... — specifically, insert **between** the `<PageHead ... />` block and the existing `<div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4'>` that renders the 8 KPIs:

```tsx
      <section className='flex flex-col gap-2.5'>
        <span className='text-[11px] font-bold uppercase tracking-wider text-slate-400'>
          Analytics · período seleccionado
        </span>
        <AdvancedWidgets days={period.days} />
      </section>
```

- [ ] **Step 3: Render the performance panel after the activity panel**

Immediately after the closing `</ActivityPanel>` tag (the last block before the container `</div>`), insert:

```tsx
      <PerformancePanel days={period.days} />
```

- [ ] **Step 4: Verify build (catches SSR/client-boundary issues tsc misses)**

Run: `npx tsc --noEmit && npm run build`
Expected: both PASS. `npm run build` compiles the dashboard route with the two new client components.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/Dashboard.tsx"
git commit -m "feat(analytics): wire AdvancedWidgets + PerformancePanel into Dashboard"
```

---

## Task 7: Real-data verification & cleanup

**Files:** none (verification only)

- [ ] **Step 1: Lint clean**

Run: `npm run lint`
Expected: no new warnings/errors in the created/modified files.

- [ ] **Step 2: Backend contract smoke test (curl)**

With the backend running and an admin token exported as `$TOKEN` and `API=$NEXT_PUBLIC_URL`:

```bash
curl -s "$API/leads/metrics/widgets" -H "Authorization: Bearer $TOKEN" | jq '.data.widgets'
curl -s "$API/lawyers/metrics/performance?sort_by=conversion_rate" -H "Authorization: Bearer $TOKEN" | jq '.data.total, (.data.lawyers[0] // "no rows")'
```
Expected: `widgets` has the 4 keys (`nuevos/en_proceso/contactados/conversiones`) each with `count/previous/delta/delta_pct/trend`; performance returns `total` + at least one row with `conversion_rate` and `delta`.

- [ ] **Step 3: Browser E2E — real data on the Dashboard**

Run `npm run dev` (port 3002), log in as admin, open `/dashboard`. Confirm:
  - 4 new "Analytics" cards render **real counts** with trend pills (↑/↓/— and a signed `%` or `—` when `delta_pct` is null).
  - Changing the `PeriodSelect` (Today / This week / This month / All time) re-fetches and the comparison label + numbers update.
  - The "Desempeño por abogado" table shows real rows, sortable, with `—` shown wherever `conversion_rate` / `avg_response_hours` are null (never `NaN`/`∞`).
  - The original 8 status KPIs are still present and unchanged.

- [ ] **Step 4: Ensure no scratch artifacts remain**

Run: `git status --short && ls /tmp/metrics*.mjs 2>/dev/null || echo "no scratch files"`
Expected: only the intended source files tracked; no `/tmp/metrics*.mjs`.

---

## Self-Review

**Spec coverage:**
- §1 TypeScript types → Task 1 (all interfaces, faithful, snake_case; `GenericResponse<T>` intentionally omitted — handled by `apiRequest`).
- §2 API service functions → Task 3 (`api.leads.metrics.widgets`, `api.lawyers.metrics.performance`).
- §0 date convention (relative→absolute, null→default) → `periodToRange` (Task 2) + widget/panel wiring.
- §3 business semantics (widget mapping, attribution, RBAC) → surfaced as backend contract; frontend renders faithfully (RBAC server-enforced).
- §4 edge cases (null `delta_pct`/`conversion_rate`/`avg_response_hours` → `—`; trend arrows; negative deltas valid) → `formatDeltaPct`/`formatPercent`/`formatHours`/`trendToDirection` (Task 2), asserted in Step 1 scratch and verified in browser (Task 7).
- §6 example responses → drive the curl smoke test (Task 7 Step 2).

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `WidgetMetricsResponse`, `LawyerPerformanceResponse`, `MetricsDateFilters`, `PerformanceFilters`, `WidgetKey`, `Trend`, `LawyerPerformanceRow` are defined in Task 1 and consumed verbatim in Tasks 3–5. Helper names (`periodToRange`, `trendToDirection`, `formatDeltaPct`, `formatPercent`, `formatHours`, `formatSignedInt`, `formatComparisonLabel`) are identical across the scratch test, the module, and the two components.

## Known limitations & future work

- **`PeriodSelect` "All time" is not truly unbounded** — the widget endpoint is inherently period-bounded (30d default). `periodToRange(null)` omits dates → backend returns last 30 days; the comparison label ("vs prev 30d") makes this explicit. If a true all-time view is needed, the backend must add an unbounded mode.
- **Advanced widgets are non-interactive** — unlike the 8 legacy KPIs (which filter `/lead-management` on click), the 4 backend widgets don't map 1:1 to a single status filter, so they're display-only. Wiring a drill-down is a follow-up.
- **Performance panel placement** — currently on `/dashboard`. Trivially movable to `/dash-lawyers` or a dedicated route by relocating the `<PerformancePanel />` render; component is self-contained.
- **No client-side RBAC** — the panel trusts server-enforced scoping. An admin-only `lawyer_id` filter control could be added later.
