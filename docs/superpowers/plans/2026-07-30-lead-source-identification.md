# Lead Source Identification (Activity 26 — FE) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface each lead's ingestion origin (Chatbot vs Web Form) in the dashboard: rename the existing channel column, add a new "Source" column backed by `source_label`, and add a Chatbot/Web Form filter — without touching the existing marketing-attribution ("channel") logic.

**Architecture:** Additive + one label rename. The visible "Source" column today actually renders `LeadDTO.channel` (marketing attribution) via the existing `SourceBadge` atom. We (1) rename that column's header `Source → Channel` (label-only; its `accessor`/`render`/`SourceBadge` are untouched), (2) add a **new** `Source` column that reads the Activity-26 `source_label` (with a client-side derive fallback for rows/endpoints that omit it), rendered by a **new** `OriginBadge` atom (new name — `SourceBadge` is already taken by channel), and (3) add a source filter. A pure helper `src/lib/lead-source.ts` mirrors the backend label mapping and owns the filter options.

**Tech Stack:** Next.js 14 (App Router, client components), Zustand (`useLeadsStore`), native `fetch` service layer (`api.leads.list` + `buildQuery` + `unwrapApi`), `class-variance-authority`, Tailwind, `@playwright/test`. Repo has **no unit runner** — fast feedback is `npx tsc --noEmit`; behavior is verified in the browser at `:3002` (and optional Playwright E2E once the Activity-26 backend + auth fixtures are live). This mirrors the established practice from the signup work.

---

## Decisions & scope (locked with product owner)

- **Rename, do not repurpose.** The existing "Source" column = `channel` (google_ads, meta_ads, referral…). Its header becomes **"Channel"** (its true meaning). Zero changes to its accessor/render/`SourceBadge`. → honors "no sobreescribir la lógica de channel".
- **New column titled "Source"** reads `source_label` (Activity-26). Primary source = `LeadDTO.source_label` from the LIST DTO; **fallback** = client-derived `sourceLabel(source)` (because `GET /leads/:id` never returns `source_label`, and the Activity-26 backend may not be merged yet). Works whether or not the backend is deployed.
- **New atom `OriginBadge`** (not `SourceBadge` — that name already means channel). Distinct colors from the channel palette where possible.
- **Column key collision:** `DataTable` uses `column.key` as its sort/React identifier, so two columns cannot both be `key: 'source'`. The renamed channel column becomes `key: 'channel'`; the new column takes `key: 'source'`. No table uses `initialSort.key === 'source'` today, so this is safe.
- **Filter** (`chatbot | web_form`) is implemented **server-side via the existing `?source=` param** (`LeadFilters.source` → `buildQuery` → `GET /leads`), placed in **My Leads (`AllLeads`)** as the reference implementation. `web_form` intentionally also returns legacy `web` rows (backend expands `IN ('web','web_form')`). Replicating the same 3 edits in Leads Manage (`LeadManagement`) is an optional follow-up (§ Follow-ups).
- **Out of scope** (per owner's 3-point narrowing): the Lead Info detail panel origin row (playbook §4.4), the `POST /leads` create method (§4.1), and any chatbot/web-form ingestion UI — the chatbot & web forms are separate systems that post to the public endpoint on their own.

**Backend dependency for the filter only:** the display column works today (the `source` field already exists on every lead). The `?source=` filter requires the Activity-26 backend (which honors the param + `web`→`web_form` expansion) to be live on the backend this FE points to (`NEXT_PUBLIC_URL`). If it is not yet merged, the filter degrades gracefully (backend ignores the param → returns all); it starts working the moment the backend lands. No FE change needed then.

---

## File Structure

**Phase 0 — Foundation**
- Modify: `src/types/api.types.ts` — add optional `source_label?: string` to `LeadDTO`.
- Create: `src/lib/lead-source.ts` — `LeadSource` type, `sourceLabel()`, `sourceVariant()`, `SOURCE_FILTER_OPTIONS`.
- Create: `src/components/ui/atoms/OriginBadge/OriginBadge.tsx` + `index.ts`.
- Modify: `src/components/ui/atoms/index.ts` — barrel-export `OriginBadge`.

**Phase 1 — Display column (rename channel→Channel + add Source) across all 6 tables + store**
- Modify: `src/store/useLead.store.ts` — carry `source` / `source_label` in `toRow`.
- Modify: `src/app/(dashboard)/all-leads/AllLeads.tsx`
- Modify: `src/app/(dashboard)/lead-management/LeadManagement.tsx`
- Modify: `src/app/(dashboard)/select-lead/SelectLead.tsx`
- Modify: `src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx`
- Modify: `src/app/(dashboard)/lawyer-management/assigned-leads/AssignedLeads.tsx`
- Modify: `src/app/(dashboard)/lawyer-management/lost-leads/LostLeads.tsx`

**Phase 2 — Source filter (server-side `?source=`) in My Leads**
- Modify: `src/app/(dashboard)/all-leads/AllLeads.tsx`

**Phase 3 — Verification**
- Browser checklist at `:3002` + optional `tests/e2e/leads/source-column.spec.ts`.

---

## Phase 0 — Foundation: type, helper, badge

### Task 0.1: Add `source_label` to the lead DTO

**Files:**
- Modify: `src/types/api.types.ts:112` (inside `LeadDTO`, after the `gclid` line, before the closing `}`)

- [ ] **Step 1: Add the optional field**

In `src/types/api.types.ts`, `LeadDTO` currently ends:
```ts
  referrer_url?: string | null;
  gclid?: string | null;
}
```
Change to:
```ts
  referrer_url?: string | null;
  gclid?: string | null;
  // Activity 26 — origen de ingesta (chatbot vs formulario web). `source` (arriba,
  // requerido) es el valor crudo; `source_label` lo deriva el backend SOLO en el
  // LIST DTO (ausente en GET /leads/:id → derivar client-side con sourceLabel()).
  source_label?: string;
}
```

> `source: string` already exists at line 94 — do not add it again. `LeadFilters.source?: string` already exists at line 119 — the `?source=` filter param is already wired through `buildQuery`; no change needed there.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (only the pre-existing unrelated error in `tests/e2e/specs/10-items-audit.spec.ts:402`, if any, which is a known preexisting issue — ignore it).

- [ ] **Step 3: Commit**

```bash
git add src/types/api.types.ts
git commit -m "feat(types): add source_label to LeadDTO (Activity 26)"
```

---

### Task 0.2: Create the lead-source helper

**Files:**
- Create: `src/lib/lead-source.ts`

- [ ] **Step 1: Write the helper**

Create `src/lib/lead-source.ts`:
```ts
// Espejo client-side del mapeo de labels del backend para el `source` de un lead
// (Activity 26). Se usa como fallback cuando la respuesta no trae `source_label`
// (p. ej. GET /leads/:id) y para las opciones del filtro.

export type LeadSource =
  | 'chatbot'
  | 'web_form'
  | 'web' // legacy WordPress → se muestra/filtra como "Web Form"
  | 'api'
  | 'system'
  | 'bulk';

const SOURCE_LABELS: Record<string, string> = {
  chatbot: 'Chatbot',
  web_form: 'Web Form',
  web: 'Web Form', // legacy → Web Form
  api: 'API',
  system: 'System',
  bulk: 'Bulk Import',
};

/** Mirrors backend sourceLabel(): default "Web Form" para null/desconocido. */
export function sourceLabel(source?: string | null): string {
  return SOURCE_LABELS[(source ?? '').trim().toLowerCase()] ?? 'Web Form';
}

/**
 * Bucket de estilo canónico para el badge — colapsa el legacy `web` dentro de
 * `web_form`. Los valores fuera del set conocido caen en 'unknown'.
 */
export type SourceVariant =
  | 'chatbot'
  | 'web_form'
  | 'api'
  | 'system'
  | 'bulk'
  | 'unknown';

export function sourceVariant(source?: string | null): SourceVariant {
  const s = (source ?? '').trim().toLowerCase();
  if (s === 'chatbot') return 'chatbot';
  if (s === 'web_form' || s === 'web') return 'web_form';
  if (s === 'api') return 'api';
  if (s === 'system') return 'system';
  if (s === 'bulk') return 'bulk';
  return 'unknown';
}

/** Opciones del filtro de origen. `web_form` incluye los legacy `web`. */
export const SOURCE_FILTER_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'chatbot', label: 'Chatbot' },
  { value: 'web_form', label: 'Web Form' },
] as const;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/lead-source.ts
git commit -m "feat(lib): add lead-source label/variant/filter helper (Activity 26)"
```

---

### Task 0.3: Create the `OriginBadge` atom

**Files:**
- Create: `src/components/ui/atoms/OriginBadge/OriginBadge.tsx`
- Create: `src/components/ui/atoms/OriginBadge/index.ts`
- Modify: `src/components/ui/atoms/index.ts:14` (add export next to `SourceBadge`)

- [ ] **Step 1: Write the badge**

Create `src/components/ui/atoms/OriginBadge/OriginBadge.tsx` (models the existing `SourceBadge` styling 1:1 so it visually matches, but keyed on `source`):
```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { sourceLabel, sourceVariant } from '@/lib/lead-source';

// Badge de origen de ingesta del lead (chatbot vs formulario web). Distinto del
// SourceBadge de `channel` (atribución de marketing). Muestra `label` si viene del
// backend (source_label); si no, deriva desde el `source` crudo.
const originBadgeStyles = cva(
  'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide leading-none whitespace-nowrap',
  {
    variants: {
      variant: {
        chatbot: 'bg-indigo-50 text-indigo-700',
        web_form: 'bg-sky-50 text-sky-700',
        api: 'bg-slate-100 text-slate-600',
        system: 'bg-slate-100 text-slate-600',
        bulk: 'bg-stone-100 text-stone-600',
        unknown: 'bg-slate-100 text-slate-400',
      },
    },
    defaultVariants: { variant: 'web_form' },
  }
);

export interface OriginBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  source?: string | null;
  label?: string | null;
}

export const OriginBadge = forwardRef<HTMLSpanElement, OriginBadgeProps>(
  ({ source, label, className, ...rest }, ref) => {
    const variant = sourceVariant(source);
    const text = (label ?? '').trim() || sourceLabel(source);
    return (
      <span
        ref={ref}
        className={cn(originBadgeStyles({ variant }), className)}
        {...rest}
      >
        {text}
      </span>
    );
  }
);
OriginBadge.displayName = 'OriginBadge';
```

- [ ] **Step 2: Barrel exports**

Create `src/components/ui/atoms/OriginBadge/index.ts`:
```ts
export * from './OriginBadge';
```

In `src/components/ui/atoms/index.ts`, the current block is:
```ts
export * from './OnlineDot';
export * from './PillDivider';
export * from './SourceBadge';
```
Change to:
```ts
export * from './OnlineDot';
export * from './OriginBadge';
export * from './PillDivider';
export * from './SourceBadge';
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/atoms/OriginBadge src/components/ui/atoms/index.ts
git commit -m "feat(atoms): add OriginBadge for lead source origin (Activity 26)"
```

---

## Phase 1 — Display column across all lead tables + store

> **Per-table pattern (applies to every table below):**
> 1. Add `source?: string;` and `source_label?: string;` to the file's local row type.
> 2. Map `source` / `source_label` in that file's `toRow` mapper.
> 3. **Rename** the existing channel column: `key: 'source'` → `key: 'channel'`, `label: 'Source'` → `label: 'Channel'` (leave its `accessor`/`render`/`SourceBadge` untouched).
> 4. **Add** a new column immediately after it (see canonical block below).
> 5. Add imports: `OriginBadge` from `@/components/ui`, `sourceLabel` from `@/lib/lead-source`.
>
> **Canonical new column block** (identical everywhere):
> ```tsx
>     {
>       key: 'source',
>       label: 'Source',
>       sortable: true,
>       accessor: (r) => r.source_label || sourceLabel(r.source),
>       render: (r) => <OriginBadge source={r.source} label={r.source_label} />,
>     },
> ```

### Task 1.1: Carry source fields in the leads store

**Files:**
- Modify: `src/store/useLead.store.ts:44` (in `toRow`)

The store feeds the three store-backed tables (LeadManagement main data, AssignedLeads, LostLeads). Its `toRow` must output `source` / `source_label` so those tables' rows carry them.

- [ ] **Step 1: Add the fields to `toRow`**

Current (`src/store/useLead.store.ts:43-45`):
```ts
    status: lead.status,
    channel: lead.channel ?? null,
    assigned_lawyer_id: lead.assigned_lawyer_id ?? null,
```
Change to:
```ts
    status: lead.status,
    channel: lead.channel ?? null,
    source: lead.source ?? null,
    source_label: lead.source_label ?? null,
    assigned_lawyer_id: lead.assigned_lawyer_id ?? null,
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (`dataLeads` is typed `any`, so no cast breaks).

- [ ] **Step 3: Commit**

```bash
git add src/store/useLead.store.ts
git commit -m "feat(store): carry source/source_label on lead rows (Activity 26)"
```

---

### Task 1.2: My Leads table (`AllLeads`)

**Files:**
- Modify: `src/app/(dashboard)/all-leads/AllLeads.tsx` (imports ~23; `LeadRow` 36-48; `toRow` 68-80; channel column 283-289)

- [ ] **Step 1: Extend the imports**

Current (lines 22-30) includes `SourceBadge,` in the `@/components/ui` import. Add `OriginBadge,`:
```tsx
  LeadInfoModal,
  OriginBadge,
  PageHead,
  SearchField,
  SourceBadge,
```
And add a new import after the `@/components/ui` block (after line 30):
```tsx
import { sourceLabel } from '@/lib/lead-source';
```

- [ ] **Step 2: Extend `LeadRow`**

Current (36-48) ends:
```ts
  date: Date;
  channel?: string;
};
```
Change to:
```ts
  date: Date;
  channel?: string;
  source?: string;
  source_label?: string;
};
```

- [ ] **Step 3: Map the fields in `toRow`**

Current (68-80) ends:
```ts
  date: new Date(lead.created_at ?? lead.entry_date),
  channel: lead.channel,
});
```
Change to:
```ts
  date: new Date(lead.created_at ?? lead.entry_date),
  channel: lead.channel,
  source: lead.source,
  source_label: lead.source_label,
});
```

- [ ] **Step 4: Rename the channel column + add the Source column**

Current (283-289):
```tsx
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      accessor: (r) => r.channel ?? 'unknown',
      render: (r) => <SourceBadge channel={r.channel} />,
    },
```
Change to:
```tsx
    {
      key: 'channel',
      label: 'Channel',
      sortable: true,
      accessor: (r) => r.channel ?? 'unknown',
      render: (r) => <SourceBadge channel={r.channel} />,
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      accessor: (r) => r.source_label || sourceLabel(r.source),
      render: (r) => <OriginBadge source={r.source} label={r.source_label} />,
    },
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/all-leads/AllLeads.tsx
git commit -m "feat(leads): My Leads — rename Source→Channel, add Source column (Activity 26)"
```

---

### Task 1.3: Leads Manage table (`LeadManagement`)

**Files:**
- Modify: `src/app/(dashboard)/lead-management/LeadManagement.tsx` (imports; `LeadRow` 40-65; local `toRowLocal` ~186-209; channel column 945-951)

- [ ] **Step 1: Extend the imports**

In the `@/components/ui` import block add `OriginBadge,` (next to the existing `SourceBadge,`), and after that import block add:
```tsx
import { sourceLabel } from '@/lib/lead-source';
```

- [ ] **Step 2: Extend `LeadRow`**

Current (57-59):
```ts
  status: string;
  channel?: string;
  assigned_lawyer_id: number | null;
```
Change to:
```ts
  status: string;
  channel?: string;
  source?: string;
  source_label?: string;
  assigned_lawyer_id: number | null;
```

- [ ] **Step 3: Map the fields in the local `toRowLocal`**

Current (202-204):
```ts
      status: lead.status,
      channel: lead.channel,
      assigned_lawyer_id: lead.assigned_lawyer_id ?? null,
```
Change to:
```ts
      status: lead.status,
      channel: lead.channel,
      source: lead.source,
      source_label: lead.source_label,
      assigned_lawyer_id: lead.assigned_lawyer_id ?? null,
```

> The main dataset comes from the store (`dataLeads`), already carrying `source`/`source_label` after Task 1.1. `toRowLocal` only feeds the dedicated Review/Trash/Archived tabs.

- [ ] **Step 4: Rename the channel column + add the Source column**

Current (945-951):
```tsx
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      accessor: (r) => r.channel ?? 'unknown',
      render: (r) => <SourceBadge channel={r.channel} />,
    },
  ];
```
Change to:
```tsx
    {
      key: 'channel',
      label: 'Channel',
      sortable: true,
      accessor: (r) => r.channel ?? 'unknown',
      render: (r) => <SourceBadge channel={r.channel} />,
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      accessor: (r) => r.source_label || sourceLabel(r.source),
      render: (r) => <OriginBadge source={r.source} label={r.source_label} />,
    },
  ];
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/lead-management/LeadManagement.tsx
git commit -m "feat(leads): Leads Manage — rename Source→Channel, add Source column (Activity 26)"
```

---

### Task 1.4: Lead Pool table (`SelectLead`)

**Files:**
- Modify: `src/app/(dashboard)/select-lead/SelectLead.tsx` (imports; `PoolRow` 36-42; `toRow` 44-51; channel column 264-270)

- [ ] **Step 1: Extend the imports**

Add `OriginBadge,` to the `@/components/ui` import block (next to `SourceBadge,`), and after it add:
```tsx
import { sourceLabel } from '@/lib/lead-source';
```

- [ ] **Step 2: Extend `PoolRow`**

Current (39-42):
```ts
  status: LeadDTO['status'];
  entry_date: Date;
  channel?: string;
};
```
Change to:
```ts
  status: LeadDTO['status'];
  entry_date: Date;
  channel?: string;
  source?: string;
  source_label?: string;
};
```

- [ ] **Step 3: Map the fields in `toRow`**

Current (48-51):
```ts
  entry_date: new Date(lead.entry_date ?? lead.created_at),
  channel: lead.channel,
});
```
Change to:
```ts
  entry_date: new Date(lead.entry_date ?? lead.created_at),
  channel: lead.channel,
  source: lead.source,
  source_label: lead.source_label,
});
```

- [ ] **Step 4: Rename the channel column + add the Source column**

Current (264-270):
```tsx
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      accessor: (r) => r.channel ?? 'unknown',
      render: (r) => <SourceBadge channel={r.channel} />,
    },
```
Change to:
```tsx
    {
      key: 'channel',
      label: 'Channel',
      sortable: true,
      accessor: (r) => r.channel ?? 'unknown',
      render: (r) => <SourceBadge channel={r.channel} />,
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      accessor: (r) => r.source_label || sourceLabel(r.source),
      render: (r) => <OriginBadge source={r.source} label={r.source_label} />,
    },
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/select-lead/SelectLead.tsx
git commit -m "feat(leads): Lead Pool — rename Source→Channel, add Source column (Activity 26)"
```

---

### Task 1.5: Lawyer-detail leads table (`IdLawyer`)

**Files:**
- Modify: `src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx` (imports; row type 62-71; mapper ~548-550; channel column 205-211)

- [ ] **Step 1: Extend the imports**

Add `OriginBadge,` to the `@/components/ui` import block (next to `SourceBadge,`), and after it add:
```tsx
import { sourceLabel } from '@/lib/lead-source';
```

- [ ] **Step 2: Extend the row type**

Current (68-71):
```ts
  status: string;
  channel?: string;
};
```
Change to:
```ts
  status: string;
  channel?: string;
  source?: string;
  source_label?: string;
};
```

- [ ] **Step 3: Map the fields in the `lawyerLeads` mapper**

Current (548-550):
```ts
      status: lead.status,
      channel: lead.channel,
    }));
```
Change to:
```ts
      status: lead.status,
      channel: lead.channel,
      source: lead.source,
      source_label: lead.source_label,
    }));
```

- [ ] **Step 4: Rename the channel column + add the Source column**

Current (205-211):
```tsx
  {
    key: 'source',
    label: 'Source',
    sortable: true,
    accessor: (r) => r.channel ?? 'unknown',
    render: (r) => <SourceBadge channel={r.channel} />,
  },
```
Change to:
```tsx
  {
    key: 'channel',
    label: 'Channel',
    sortable: true,
    accessor: (r) => r.channel ?? 'unknown',
    render: (r) => <SourceBadge channel={r.channel} />,
  },
  {
    key: 'source',
    label: 'Source',
    sortable: true,
    accessor: (r) => r.source_label || sourceLabel(r.source),
    render: (r) => <OriginBadge source={r.source} label={r.source_label} />,
  },
```

> Note: `LEAD_TABLE_COLUMNS` here is a module-level const (indentation is 2 spaces, not 4 — match the surrounding code exactly as shown).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx"
git commit -m "feat(leads): Lawyer detail — rename Source→Channel, add Source column (Activity 26)"
```

---

### Task 1.6: Assigned Leads table (`AssignedLeads`)

**Files:**
- Modify: `src/app/(dashboard)/lawyer-management/assigned-leads/AssignedLeads.tsx` (imports; `LeadRow` ~15-30; channel column 172-178)

> This table reads rows from the store (`dataLeads`), so no local `toRow` change — Task 1.1 already added the fields. Only the type + column + imports change.

- [ ] **Step 1: Extend the imports**

Add `OriginBadge,` to the `@/components/ui` import block (next to `SourceBadge,`), and after it add:
```tsx
import { sourceLabel } from '@/lib/lead-source';
```

- [ ] **Step 2: Extend `LeadRow`**

Current (27-30):
```ts
  lawyer: string;
  status: string;
  channel?: string;
};
```
Change to:
```ts
  lawyer: string;
  status: string;
  channel?: string;
  source?: string;
  source_label?: string;
};
```

- [ ] **Step 3: Rename the channel column + add the Source column**

Current (172-178):
```tsx
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      accessor: (r) => r.channel ?? 'unknown',
      render: (r) => <SourceBadge channel={r.channel} />,
    },
  ];
```
Change to:
```tsx
    {
      key: 'channel',
      label: 'Channel',
      sortable: true,
      accessor: (r) => r.channel ?? 'unknown',
      render: (r) => <SourceBadge channel={r.channel} />,
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      accessor: (r) => r.source_label || sourceLabel(r.source),
      render: (r) => <OriginBadge source={r.source} label={r.source_label} />,
    },
  ];
```

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` → PASS.
```bash
git add src/app/(dashboard)/lawyer-management/assigned-leads/AssignedLeads.tsx
git commit -m "feat(leads): Assigned Leads — rename Source→Channel, add Source column (Activity 26)"
```

---

### Task 1.7: Lost Leads table (`LostLeads`)

**Files:**
- Modify: `src/app/(dashboard)/lawyer-management/lost-leads/LostLeads.tsx` (imports; `LeadRow` ~15-30; channel column 186-192)

> Store-backed like AssignedLeads — no local `toRow` change.

- [ ] **Step 1: Extend the imports**

Add `OriginBadge,` to the `@/components/ui` import block (next to `SourceBadge,`), and after it add:
```tsx
import { sourceLabel } from '@/lib/lead-source';
```

- [ ] **Step 2: Extend `LeadRow`**

Current (27-30):
```ts
  lawyer: string;
  status: string;
  channel?: string;
};
```
Change to:
```ts
  lawyer: string;
  status: string;
  channel?: string;
  source?: string;
  source_label?: string;
};
```

- [ ] **Step 3: Rename the channel column + add the Source column**

Current (186-192):
```tsx
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      accessor: (r) => r.channel ?? 'unknown',
      render: (r) => <SourceBadge channel={r.channel} />,
    },
  ];
```
Change to:
```tsx
    {
      key: 'channel',
      label: 'Channel',
      sortable: true,
      accessor: (r) => r.channel ?? 'unknown',
      render: (r) => <SourceBadge channel={r.channel} />,
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      accessor: (r) => r.source_label || sourceLabel(r.source),
      render: (r) => <OriginBadge source={r.source} label={r.source_label} />,
    },
  ];
```

- [ ] **Step 4: Typecheck + build + commit**

Run: `npx tsc --noEmit` → PASS.
Run: `npm run build` → PASS (catches SSR/route issues across all modified pages).
```bash
git add src/app/(dashboard)/lawyer-management/lost-leads/LostLeads.tsx
git commit -m "feat(leads): Lost Leads — rename Source→Channel, add Source column (Activity 26)"
```

---

## Phase 2 — Source filter (server-side `?source=`) in My Leads

The `?source=` param is already forwarded by `buildQuery` and typed on `LeadFilters.source`. We add UI that sets it and refetches. `web_form` also returns legacy `web` rows (backend-side expansion). Reference implementation in `AllLeads`; replicating in `LeadManagement` is a follow-up (§ Follow-ups).

### Task 2.1: Add the source filter to `AllLeads`

**Files:**
- Modify: `src/app/(dashboard)/all-leads/AllLeads.tsx` (imports; state ~89; `fetchAssigned` 99-118; `useEffect` 120-124; filter bar 408-432)

- [ ] **Step 1: Import the filter options**

Extend the existing `import { sourceLabel } from '@/lib/lead-source';` (added in Task 1.2) to also import the options:
```tsx
import { sourceLabel, SOURCE_FILTER_OPTIONS } from '@/lib/lead-source';
```

- [ ] **Step 2: Add filter state**

After the existing `const [statusFilter, setStatusFilter] = useState<string | null>(null);` (line 89) add:
```tsx
  const [sourceFilter, setSourceFilter] = useState<string>('');
```

- [ ] **Step 3: Send `source` in the fetch**

Current `fetchAssigned` request (102-105):
```tsx
    const res = await api.leads.list({
      assigned_to: Number(user.id),
      limit: 1000,
    });
```
Change to:
```tsx
    const res = await api.leads.list({
      assigned_to: Number(user.id),
      limit: 1000,
      source: sourceFilter || undefined,
    });
```

- [ ] **Step 4: Refetch when the source filter changes**

Current `useEffect` (120-124):
```tsx
  useEffect(() => {
    void fetchAssigned();
    return () => setSelecArray([]); // clean up filter on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
```
Change the dependency array to also react to `sourceFilter`:
```tsx
  useEffect(() => {
    void fetchAssigned();
    return () => setSelecArray([]); // clean up filter on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, sourceFilter]);
```

- [ ] **Step 5: Render the source filter buttons**

The filter bar currently ends (after the status `.map`, lines 420-431) with the closing `</div>`. Insert a divider + source buttons right before that closing `</div>` (i.e. after the status `.map(...)` block at line 431):
```tsx
        <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
        {SOURCE_FILTER_OPTIONS.map((opt) => (
          <FilterButton
            key={opt.value || 'all-sources'}
            label={opt.label}
            active={sourceFilter === opt.value}
            onClick={() => setSourceFilter(opt.value)}
          />
        ))}
```

> `FilterButton` is already imported. The `''` option ("All sources") sets `sourceFilter=''` → `source: undefined` → `buildQuery` drops it → unfiltered.

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit` → PASS.
Run: `npm run build` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/all-leads/AllLeads.tsx
git commit -m "feat(leads): add source filter (?source=chatbot|web_form) to My Leads (Activity 26)"
```

---

## Phase 3 — Verification

### Task 3.1: Browser verification at `:3002`

**Prereq:** dev server running (`npm run dev` → `:3002`), logged in, backend reachable on `NEXT_PUBLIC_URL`.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open: `http://localhost:3002`

- [ ] **Step 2: Verify the display column (AC-1, AC-2, AC-6)**

On **My Leads** (`/all-leads`) and **Leads Manage** (`/lead-management`), confirm in the table header:
- A **"Channel"** column (renamed) still shows the marketing badge (e.g. "Google Ads", "Direct", "Unknown") for each row — unchanged behavior.
- A **new "Source"** column shows an `OriginBadge`: "Chatbot" for chatbot leads, "Web Form" for `web_form`/legacy `web`/unknown.
- Both columns render side by side without layout break at 1440px and 768px.

- [ ] **Step 3: Verify the filter (AC-3, AC-4)**

On **My Leads**, click the **Chatbot** filter → the list narrows to chatbot leads (a network request to `/leads?...&source=chatbot` fires — check DevTools Network). Click **Web Form** → shows web-form **and** legacy `web` leads (`&source=web_form`). Click **All sources** → param dropped, full list returns.

> If the backend `?source=` filter is not yet merged, the request still fires but returns all rows (graceful no-op). Note this in the checkpoint; the display column (Steps 2) still verifies fully.

- [ ] **Step 4: Verify no regression on the other tables**

Open Lead Pool (`/select-lead`) and a lawyer detail (`/lawyer-management/[id]`): both show Channel + Source columns, existing status/search filters and row-click Lead Info still work.

### Task 3.2 (optional, backend-gated): Playwright E2E

Only meaningful once the Activity-26 backend + an authenticated `storageState` fixture are available (the repo's main `playwright.config.ts` provides auth via `globalSetup`). If both are present:

**Files:**
- Create: `tests/e2e/leads/source-column.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

// Requiere: storageState autenticado (globalSetup del config principal) +
// backend Activity-26 sirviendo /leads con source/source_label y ?source=.
test.describe('Lead source column + filter', () => {
  test('renders Channel + Source columns', async ({ page }) => {
    await page.goto('/all-leads');
    await expect(
      page.getByRole('columnheader', { name: 'Channel' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Source' })
    ).toBeVisible();
  });

  test('filters by Chatbot then Web Form', async ({ page }) => {
    await page.goto('/all-leads');
    const req1 = page.waitForRequest((r) => r.url().includes('source=chatbot'));
    await page.getByRole('button', { name: 'Chatbot', exact: true }).click();
    await req1;
    const req2 = page.waitForRequest((r) => r.url().includes('source=web_form'));
    await page.getByRole('button', { name: 'Web Form', exact: true }).click();
    await req2;
  });
});
```

- [ ] **Step 2: Run**

Run: `npx playwright test tests/e2e/leads/source-column.spec.ts`
Expected: PASS (with backend + auth up). If the leads-list column headers are not exposed as `columnheader` roles by `DataTable`, switch the assertions to `page.getByText('Channel')` / `page.getByText('Source')` scoped to the table header.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/leads/source-column.spec.ts
git commit -m "test(e2e): lead source column + filter (Activity 26)"
```

---

## Follow-ups (explicitly out of the current scope)

- **Source filter in Leads Manage (`LeadManagement`):** replicate Task 2.1's 3 edits — add `sourceFilter` state, pass `source` to `fetchLeads({ source: sourceFilter || undefined })`, add the `SOURCE_FILTER_OPTIONS` button group. Deferred to keep to "1 filtro".
- **Lead Info detail panel origin row** (playbook §4.4): the modal is fed from the row object; when it later reads `GET /leads/:id`, use `sourceLabel(lead.source)` (no `source_label` on that endpoint).
- **`POST /leads` create method** (playbook §4.1): chatbot/web-form ingestion is a separate system.
- **Naming wart:** the "Channel" column is now backed by an atom still named `SourceBadge`. Left as-is per "don't touch channel logic"; an optional future rename `SourceBadge → ChannelBadge` would remove the last confusion (touches 6 imports + the atom).

---

## Self-Review

**Spec coverage (owner's 3 points + screenshot):**
- "Rename header Source→Channel" → Tasks 1.2-1.7 Step 4 (all 6 tables). ✓
- "Add Source column ← source_label" → Tasks 0.1 (type), 0.3 (badge), 1.1 (store), 1.2-1.7 (columns). ✓ (with derive fallback for robustness.)
- "Add filter ?source=chatbot|web_form" → Task 2.1. ✓
- "Source visible in Lead Info and history" (screenshot) → Lead Info deferred to Follow-ups (owner narrowed scope); history needs no FE change (playbook §4.5). Noted.

**Placeholder scan:** every code step shows complete before/after code and exact paths. No TBD/TODO. ✓

**Type consistency:** row types gain `source?: string; source_label?: string;` in all 6 tables + store; column accessor uses `r.source_label`/`r.source`; `OriginBadge` props are `source`/`label`; `sourceLabel(source)` / `sourceVariant(source)` / `SOURCE_FILTER_OPTIONS` names match across Tasks 0.2, 0.3, 1.x, 2.1. Column `key` values are unique per table (`channel` vs `source`). ✓

**Risk:** all changes are additive except the label/key rename on the channel column (display-only; no logic change; verified no `initialSort.key === 'source'` in any table). The filter depends on the backend honoring `?source=` (degrades gracefully otherwise). ✓
