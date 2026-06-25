# Notification System Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend UI for the notification system: types, API service, Notification Settings page (global settings + history tabs), lawyer-level notification preferences, and route/sidebar integration.

**Architecture:** Single admin-only page `/notification-settings` following the SpamSettings.tsx pattern (tabs, DataTable, DialogOverlay). Lawyer preferences added as a collapsible section in the existing IdLawyer.tsx. API layer extends the existing `api` namespace in `database.ts`.

**Tech Stack:** Next.js 14, React 18, Zustand, Tailwind CSS, dayjs, react-hot-toast, react-icons/md. Reuses existing components: DataTable, FilterButton, PageHead, Pagination.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/types/api.types.ts` | Add notification types/DTOs |
| Modify | `src/services/database.ts` | Add `api.notifications.*` methods |
| Create | `src/app/(dashboard)/notification-settings/NotificationSettings.tsx` | Main page component (2 tabs) |
| Create | `src/app/(dashboard)/notification-settings/page.tsx` | Next.js page wrapper |
| Modify | `src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx` | Add preferences section |
| Modify | `src/routes/routes.ts` | Add notification-settings route |
| Modify | `src/middleware.ts` | Add route to protectedRoutesAdmin |

---

### Task 1: Add Notification Types

**Files:**
- Modify: `src/types/api.types.ts` (append after line 342)

- [ ] **Step 1: Add notification type definitions**

Append these types at the end of `src/types/api.types.ts`, after the `LawyerHistoryResponse` interface:

```typescript
// ─── Notifications ──────────────────────────────────────────────────────────

export type NotificationType =
  | 'IMMEDIATE'
  | 'SCHEDULED'
  | 'DAILY_SUMMARY'
  | 'WEEKLY_SUMMARY'
  | 'CALENDAR_REMINDER';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'BOTH';

export type NotificationStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENT'
  | 'FAILED'
  | 'DEDUPLICATED'
  | 'SKIPPED_QUIET_HOURS'
  | 'SKIPPED_PREFERENCE';

export type NotificationEventType =
  | 'LEAD_ASSIGNED'
  | 'LEAD_UNASSIGNED'
  | 'LEAD_EXPIRED'
  | 'LEAD_EXPIRING_SOON'
  | 'LEAD_STATUS_PROBLEMATIC'
  | 'LEAD_POOL_NEW'
  | 'LEAD_SPAM_FLAGGED'
  | 'LEAD_PULLED'
  | 'LEAD_RESTORED'
  | 'LEAD_CLOSED'
  | 'LEAD_DISABLED'
  | 'BULK_COMPLETED'
  | 'FOLLOW_UP_REMINDER'
  | 'CALENDAR_REMINDER'
  | 'DAILY_SUMMARY'
  | 'WEEKLY_SUMMARY'
  | 'TEST';

export interface NotificationDTO {
  id: number;
  text: string;
  is_active: boolean;
  type: NotificationType;
  event_type: NotificationEventType | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  entity_type: string | null;
  entity_id: number | null;
  scheduled_at: string | null;
  sent_at: string | null;
  retry_count: number;
  error_message: string | null;
  dedup_key: string | null;
  lawyer_id: number;
  created_at: string;
  updated_at: string;
  lawyer?: LawyerRef;
}

export interface NotificationPreferenceDTO {
  id?: number;
  lawyer_id: number;
  notification_type: NotificationType;
  enabled: boolean;
  channel: NotificationChannel;
  is_paused: boolean;
  paused_until: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GlobalNotifSettingsDTO {
  quiet_hours_start: string;
  quiet_hours_end: string;
  retries: number;
  backoff_ms: number;
  dedup_minutes: number;
  default_reminder_policy: string;
  daily_summary_time: string;
  weekly_summary_day: number;
}

export interface NotificationHistoryFilters {
  lawyer_id?: number;
  type?: NotificationType;
  status?: NotificationStatus;
  event_type?: NotificationEventType;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface ScheduleNotificationDTO {
  lawyer_id: number;
  lead_id?: number;
  type: 'SCHEDULED' | 'CALENDAR_REMINDER';
  scheduled_at: string;
  message: string;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep api.types`
Expected: No errors in `api.types.ts`

- [ ] **Step 3: Commit**

```bash
git add src/types/api.types.ts
git commit -m "feat(notif): add notification types and DTOs"
```

---

### Task 2: Add API Service Methods

**Files:**
- Modify: `src/services/database.ts` (add imports at line 1-38, add namespace after line 988)

- [ ] **Step 1: Add new type imports**

In `src/services/database.ts`, add these to the existing import block (line 1-38):

```typescript
import type {
  // ... existing imports ...
  GlobalNotifSettingsDTO,
  NotificationDTO,
  NotificationHistoryFilters,
  NotificationPreferenceDTO,
  ScheduleNotificationDTO,
} from '@/types/api.types';
```

- [ ] **Step 2: Add notifications namespace to `api` object**

Insert after the closing `},` of `api.spam` (after line 988), before the `};` that closes the `api` object:

```typescript
  notifications: {
    settings: {
      global: {
        get: (token?: string) =>
          apiRequest<GlobalNotifSettingsDTO>(
            '/notifications/settings/global',
            { method: 'GET' },
            token
          ),
        update: (body: Partial<GlobalNotifSettingsDTO>, token?: string) =>
          apiRequest<GlobalNotifSettingsDTO>(
            '/notifications/settings/global',
            { method: 'PUT', body: JSON.stringify(body) },
            token
          ),
      },
    },
    preferences: {
      get: (lawyerId: number, token?: string) =>
        apiRequest<NotificationPreferenceDTO[]>(
          `/notifications/preferences/${lawyerId}`,
          { method: 'GET' },
          token
        ),
      update: (
        lawyerId: number,
        prefs: Array<Partial<NotificationPreferenceDTO> & { notification_type: string }>,
        token?: string
      ) =>
        apiRequest<NotificationPreferenceDTO[]>(
          `/notifications/preferences/${lawyerId}`,
          { method: 'PUT', body: JSON.stringify({ preferences: prefs }) },
          token
        ),
    },
    history: (filters?: NotificationHistoryFilters, token?: string) =>
      apiRequest<Paginated<NotificationDTO>>(
        `/notifications/history/all${buildQuery(filters as Record<string, unknown>)}`,
        { method: 'GET' },
        token
      ),
    schedule: (body: ScheduleNotificationDTO, token?: string) =>
      apiRequest<NotificationDTO>(
        '/notifications/schedule',
        { method: 'POST', body: JSON.stringify(body) },
        token
      ),
    test: (body?: { lawyer_id?: number }, token?: string) =>
      apiRequest<NotificationDTO>(
        '/notifications/test',
        { method: 'POST', body: JSON.stringify(body || {}) },
        token
      ),
  },
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | grep database`
Expected: No errors in `database.ts`

- [ ] **Step 4: Commit**

```bash
git add src/services/database.ts
git commit -m "feat(notif): add api.notifications service methods"
```

---

### Task 3: Add Route, Middleware, and Sidebar Entry

**Files:**
- Modify: `src/routes/routes.ts` (add after spam-settings entry, ~line 65)
- Modify: `src/middleware.ts` (add to protectedRoutesAdmin array, ~line 26)

- [ ] **Step 1: Add sidebar route**

In `src/routes/routes.ts`, add a new entry after the Spam Settings entry (after line 65, before the `My Workflow` entry):

```typescript
  {
    name: 'Notifications',
    route: '/notification-settings',
    icon: MdNotifications,
    rol: ['admin'],
    group: 'Management',
  },
```

Note: `MdNotifications` is already imported on line 5. No new import needed.

- [ ] **Step 2: Add route protection**

In `src/middleware.ts`, add `'/notification-settings'` to the `protectedRoutesAdmin` array:

```typescript
  const protectedRoutesAdmin = [
    '/lawyer-management',
    '/lawyer-management/assigned-leads',
    '/lawyer-management/lost-leads',
    '/lawyer-management/reassigned-leads',
    '/lead-management',
    '/dashboard',
    '/spam-settings',
    '/notification-settings',
  ];
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add src/routes/routes.ts src/middleware.ts
git commit -m "feat(notif): add notification-settings route and middleware protection"
```

---

### Task 4: Create Notification Settings Page — Global Settings Tab

**Files:**
- Create: `src/app/(dashboard)/notification-settings/NotificationSettings.tsx`
- Create: `src/app/(dashboard)/notification-settings/page.tsx`

- [ ] **Step 1: Create page wrapper**

Create `src/app/(dashboard)/notification-settings/page.tsx`:

```typescript
import NotificationSettings from './NotificationSettings';

export default function NotificationSettingsPage() {
  return <NotificationSettings />;
}
```

- [ ] **Step 2: Create the main component with Global Settings tab**

Create `src/app/(dashboard)/notification-settings/NotificationSettings.tsx`:

```typescript
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import toast from 'react-hot-toast';
import { MdClose, MdSend } from 'react-icons/md';
import { api } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import type {
  GlobalNotifSettingsDTO,
  NotificationDTO,
  NotificationHistoryFilters,
  NotificationStatus,
  NotificationType,
} from '@/types/api.types';
import {
  DataTable,
  FilterButton,
  PageHead,
  type DataTableColumn,
} from '@/components/ui';

dayjs.extend(relativeTime);

// ─── Constants ─────────────────────────────────────────────────────────────

type Tab = 'settings' | 'history';

const NOTIF_TYPE_LABELS: Record<string, string> = {
  IMMEDIATE: 'Immediate',
  SCHEDULED: 'Scheduled',
  DAILY_SUMMARY: 'Daily Summary',
  WEEKLY_SUMMARY: 'Weekly Summary',
  CALENDAR_REMINDER: 'Calendar Reminder',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  LEAD_ASSIGNED: 'Lead Assigned',
  LEAD_UNASSIGNED: 'Lead Unassigned',
  LEAD_EXPIRED: 'Lead Expired',
  LEAD_EXPIRING_SOON: 'Expiring Soon',
  LEAD_STATUS_PROBLEMATIC: 'Lead Problematic',
  LEAD_POOL_NEW: 'New in Pool',
  LEAD_SPAM_FLAGGED: 'Spam Flagged',
  LEAD_PULLED: 'Lead Pulled',
  LEAD_RESTORED: 'Lead Restored',
  LEAD_CLOSED: 'Lead Closed',
  LEAD_DISABLED: 'Lead Disabled',
  BULK_COMPLETED: 'Bulk Operation',
  FOLLOW_UP_REMINDER: 'Follow-up',
  CALENDAR_REMINDER: 'Calendar',
  DAILY_SUMMARY: 'Daily Summary',
  WEEKLY_SUMMARY: 'Weekly Summary',
  TEST: 'Test',
};

const STATUS_STYLES: Record<NotificationStatus, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  QUEUED: 'bg-blue-50 text-blue-700',
  SENT: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-700',
  DEDUPLICATED: 'bg-slate-100 text-slate-600',
  SKIPPED_QUIET_HOURS: 'bg-orange-50 text-orange-700',
  SKIPPED_PREFERENCE: 'bg-purple-50 text-purple-700',
};

const STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDING: 'Pending',
  QUEUED: 'Queued',
  SENT: 'Sent',
  FAILED: 'Failed',
  DEDUPLICATED: 'Dedup',
  SKIPPED_QUIET_HOURS: 'Quiet Hours',
  SKIPPED_PREFERENCE: 'Skipped',
};

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Reusable form atoms (same as SpamSettings) ───────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className='text-[11px] font-bold uppercase tracking-wide text-slate-500'>
      {children}
    </label>
  );
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-5'>
      <h3 className='mb-4 text-[13px] font-bold text-slate-900'>{title}</h3>
      {children}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function NotificationSettings() {
  const [tab, setTab] = useState<Tab>('settings');
  const user = useAuth((s) => s.user);

  // ── Global Settings state ──────────────────────────────────────────────
  const [settings, setSettings] = useState<GlobalNotifSettingsDTO | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);

  // Settings form fields (local state for editing)
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [retries, setRetries] = useState(3);
  const [backoffMs, setBackoffMs] = useState(60000);
  const [dedupMinutes, setDedupMinutes] = useState(30);
  const [dailyTime, setDailyTime] = useState('08:00');
  const [weeklyDay, setWeeklyDay] = useState(1);

  // ── History state ──────────────────────────────────────────────────────
  const [history, setHistory] = useState<NotificationDTO[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyFilters, setHistoryFilters] = useState<NotificationHistoryFilters>({
    limit: 20,
    offset: 0,
  });
  const [filterType, setFilterType] = useState<NotificationType | ''>('');
  const [filterStatus, setFilterStatus] = useState<NotificationStatus | ''>('');

  // ── Fetchers ───────────────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await api.notifications.settings.global.get();
      if (res.success && res.data) {
        const d = res.data;
        setSettings(d);
        setQuietStart(d.quiet_hours_start);
        setQuietEnd(d.quiet_hours_end);
        setRetries(d.retries);
        setBackoffMs(d.backoff_ms);
        setDedupMinutes(d.dedup_minutes);
        setDailyTime(d.daily_summary_time);
        setWeeklyDay(d.weekly_summary_day);
      }
    } catch {
      toast.error('Failed to load notification settings');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (filters: NotificationHistoryFilters) => {
    setHistoryLoading(true);
    try {
      const res = await api.notifications.history(filters);
      if (res.success && res.data) {
        setHistory(res.data.data);
        setHistoryTotal(res.data.total);
      }
    } catch {
      toast.error('Failed to load notification history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (tab === 'history') {
      const merged: NotificationHistoryFilters = { ...historyFilters };
      if (filterType) merged.type = filterType as NotificationType;
      if (filterStatus) merged.status = filterStatus as NotificationStatus;
      fetchHistory(merged);
    }
  }, [tab, historyFilters, filterType, filterStatus, fetchHistory]);

  // ── Settings actions ───────────────────────────────────────────────────

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const body: Partial<GlobalNotifSettingsDTO> = {
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        retries,
        backoff_ms: backoffMs,
        dedup_minutes: dedupMinutes,
        daily_summary_time: dailyTime,
        weekly_summary_day: weeklyDay,
      };
      const res = await api.notifications.settings.global.update(body);
      if (res.success) {
        toast.success('Settings saved');
        if (res.data) setSettings(res.data);
      } else {
        toast.error(res.message ?? 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setTestSending(true);
    try {
      const res = await api.notifications.test({ lawyer_id: user?.id });
      if (res.success) {
        toast.success('Test notification sent — check your email');
      } else {
        toast.error(res.message ?? 'Failed to send test');
      }
    } catch {
      toast.error('Failed to send test notification');
    } finally {
      setTestSending(false);
    }
  };

  // ── History columns ────────────────────────────────────────────────────

  const historyColumns = useMemo<DataTableColumn<NotificationDTO>[]>(
    () => [
      {
        key: 'created_at',
        label: 'Date',
        width: '140px',
        sortable: true,
        accessor: (row) => new Date(row.created_at),
        render: (row) => (
          <span className='text-[12px] text-slate-500' title={dayjs(row.created_at).format('YYYY-MM-DD HH:mm:ss')}>
            {dayjs(row.created_at).fromNow()}
          </span>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        width: '130px',
        sortable: true,
        render: (row) => (
          <span className='inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600'>
            {NOTIF_TYPE_LABELS[row.type] ?? row.type}
          </span>
        ),
      },
      {
        key: 'event_type',
        label: 'Event',
        width: '150px',
        sortable: true,
        render: (row) => (
          <span className='text-[12px] font-medium text-slate-700'>
            {EVENT_TYPE_LABELS[row.event_type ?? ''] ?? row.event_type ?? '—'}
          </span>
        ),
      },
      {
        key: 'lawyer',
        label: 'Lawyer',
        width: '150px',
        render: (row) => (
          <span className='truncate text-[12px] text-slate-600'>
            {row.lawyer ? `${row.lawyer.firstName} ${row.lawyer.lastName}` : `ID ${row.lawyer_id}`}
          </span>
        ),
      },
      {
        key: 'text',
        label: 'Message',
        width: 'minmax(180px, 1fr)',
        render: (row) => (
          <span className='truncate text-[12px] text-slate-500' title={row.text}>
            {row.text}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: '110px',
        sortable: true,
        render: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              STATUS_STYLES[row.status] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {STATUS_LABELS[row.status] ?? row.status}
          </span>
        ),
      },
      {
        key: 'retry_count',
        label: 'Retries',
        width: '70px',
        align: 'center' as const,
        render: (row) => (
          <span className='text-[12px] tabular-nums text-slate-400'>
            {row.retry_count}
          </span>
        ),
      },
    ],
    []
  );

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className='flex flex-1 flex-col gap-5 overflow-hidden p-6'>
      <PageHead title='Notification Settings' />

      {/* Tabs */}
      <div className='flex items-center gap-2'>
        <FilterButton
          label='Global Settings'
          active={tab === 'settings'}
          onClick={() => setTab('settings')}
        />
        <FilterButton
          label='Notification History'
          active={tab === 'history'}
          count={historyTotal || undefined}
          onClick={() => setTab('history')}
        />
      </div>

      {/* ── Global Settings tab ───────────────────────────────────────── */}
      {tab === 'settings' && (
        settingsLoading ? (
          <div className='flex flex-1 items-center justify-center text-[13px] text-slate-400'>
            Loading settings...
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            {/* Quiet Hours */}
            <SettingsCard title='Quiet Hours'>
              <p className='mb-3 text-[12px] text-slate-500'>
                Notifications will be held and delivered after quiet hours end.
              </p>
              <div className='flex items-end gap-4'>
                <div className='flex flex-col gap-1'>
                  <FieldLabel>Start</FieldLabel>
                  <input
                    type='time'
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    className='h-9 w-32 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-400'
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <FieldLabel>End</FieldLabel>
                  <input
                    type='time'
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    className='h-9 w-32 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-400'
                  />
                </div>
              </div>
            </SettingsCard>

            {/* Retry Policy */}
            <SettingsCard title='Retry Policy'>
              <p className='mb-3 text-[12px] text-slate-500'>
                How many times to retry a failed notification and the delay between attempts.
              </p>
              <div className='flex items-end gap-4'>
                <div className='flex flex-col gap-1'>
                  <FieldLabel>Max retries</FieldLabel>
                  <input
                    type='number'
                    min={0}
                    max={10}
                    value={retries}
                    onChange={(e) => setRetries(Number(e.target.value))}
                    className='h-9 w-24 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-400'
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <FieldLabel>Backoff (seconds)</FieldLabel>
                  <input
                    type='number'
                    min={1}
                    value={Math.round(backoffMs / 1000)}
                    onChange={(e) => setBackoffMs(Number(e.target.value) * 1000)}
                    className='h-9 w-24 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-400'
                  />
                </div>
              </div>
            </SettingsCard>

            {/* Deduplication */}
            <SettingsCard title='Deduplication'>
              <p className='mb-3 text-[12px] text-slate-500'>
                Duplicate notifications within this window will be suppressed.
              </p>
              <div className='flex flex-col gap-1'>
                <FieldLabel>Window (minutes)</FieldLabel>
                <input
                  type='number'
                  min={1}
                  max={1440}
                  value={dedupMinutes}
                  onChange={(e) => setDedupMinutes(Number(e.target.value))}
                  className='h-9 w-32 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-400'
                />
              </div>
            </SettingsCard>

            {/* Summary Schedule */}
            <SettingsCard title='Summary Schedule'>
              <p className='mb-3 text-[12px] text-slate-500'>
                When daily and weekly summary emails are sent to subscribed users.
              </p>
              <div className='flex items-end gap-4'>
                <div className='flex flex-col gap-1'>
                  <FieldLabel>Daily summary time</FieldLabel>
                  <input
                    type='time'
                    value={dailyTime}
                    onChange={(e) => setDailyTime(e.target.value)}
                    className='h-9 w-32 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-400'
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <FieldLabel>Weekly summary day</FieldLabel>
                  <select
                    value={weeklyDay}
                    onChange={(e) => setWeeklyDay(Number(e.target.value))}
                    className='h-9 w-36 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-400'
                  >
                    {WEEKDAY_LABELS.map((label, i) => (
                      <option key={i} value={i}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </SettingsCard>

            {/* Action buttons */}
            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={handleSaveSettings}
                disabled={saving}
                className='inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-slate-900 px-4 text-[12px] font-bold text-white hover:bg-slate-800 disabled:opacity-50'
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type='button'
                onClick={handleSendTest}
                disabled={testSending}
                className='inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-slate-200 px-4 text-[12px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50'
              >
                <MdSend size={14} />
                {testSending ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        )
      )}

      {/* ── History tab ───────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className='flex flex-col gap-4'>
          {/* Filters */}
          <div className='flex flex-wrap items-center gap-3'>
            <div className='flex flex-col gap-1'>
              <FieldLabel>Type</FieldLabel>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as NotificationType | '');
                  setHistoryFilters((f) => ({ ...f, offset: 0 }));
                }}
                className='h-9 w-40 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-400'
              >
                <option value=''>All types</option>
                {Object.entries(NOTIF_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className='flex flex-col gap-1'>
              <FieldLabel>Status</FieldLabel>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as NotificationStatus | '');
                  setHistoryFilters((f) => ({ ...f, offset: 0 }));
                }}
                className='h-9 w-36 rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-400'
              >
                <option value=''>All statuses</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {(filterType || filterStatus) && (
              <button
                type='button'
                onClick={() => {
                  setFilterType('');
                  setFilterStatus('');
                  setHistoryFilters((f) => ({ ...f, offset: 0 }));
                }}
                className='mt-4 inline-flex h-9 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              >
                <MdClose size={14} />
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          {historyLoading ? (
            <div className='flex flex-1 items-center justify-center text-[13px] text-slate-400'>
              Loading history...
            </div>
          ) : (
            <DataTable<NotificationDTO>
              columns={historyColumns}
              data={history}
              rowKey={(row) => row.id}
              totalLabel='notifications'
              pagination={{ enabled: true, initialPageSize: 20 }}
              initialSort={{ key: 'created_at', direction: 'desc' }}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep -i "notification"`
Expected: No errors related to NotificationSettings

- [ ] **Step 4: Visual smoke test**

Run: `npm run dev`
Navigate to `http://localhost:3002/notification-settings` (logged in as admin).
Verify: page loads, tabs switch, global settings form renders, history table loads.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/notification-settings/
git commit -m "feat(notif): add Notification Settings page with global settings and history tabs"
```

---

### Task 5: Add Lawyer Notification Preferences Section to IdLawyer

**Files:**
- Modify: `src/app/(dashboard)/lawyer-management/[id]/IdLawyer.tsx`

This task adds a collapsible "Notification Preferences" section between the KPI grid and the Leads table in the lawyer detail page.

- [ ] **Step 1: Add imports**

At the top of `IdLawyer.tsx`, add to the existing imports:

```typescript
import type {
  // ... existing imports ...
  NotificationPreferenceDTO,
  NotificationType,
  NotificationChannel,
} from '@/types/api.types';
```

Also add `MdNotifications` to the `react-icons/md` import.

- [ ] **Step 2: Add preference constants and state**

After the existing constants (around line 122, after `LEAD_STATUS_LABEL`), add:

```typescript
const NOTIF_TYPES: { value: NotificationType; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'DAILY_SUMMARY', label: 'Daily Summary' },
  { value: 'WEEKLY_SUMMARY', label: 'Weekly Summary' },
  { value: 'CALENDAR_REMINDER', label: 'Calendar Reminder' },
];

const CHANNEL_OPTIONS: { value: NotificationChannel; label: string; disabled: boolean }[] = [
  { value: 'EMAIL', label: 'Email', disabled: false },
  { value: 'SMS', label: 'SMS', disabled: true },
  { value: 'BOTH', label: 'Both', disabled: true },
];
```

- [ ] **Step 3: Add preference state and fetch logic inside the component**

Inside the `IdLawyer` component, after the existing state declarations (around line 400), add:

```typescript
  // ── Notification preferences ───────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferenceDTO[]>([]);
  const [notifPrefsLoading, setNotifPrefsLoading] = useState(false);
  const [notifPrefsSaving, setNotifPrefsSaving] = useState(false);
  const [notifPrefsOpen, setNotifPrefsOpen] = useState(false);

  const fetchNotifPrefs = useCallback(async (lawyerId: number) => {
    setNotifPrefsLoading(true);
    try {
      const res = await api.notifications.preferences.get(lawyerId);
      if (res.success && res.data) {
        setNotifPrefs(
          Array.isArray(res.data) ? res.data : []
        );
      }
    } catch {
      // silent — section is non-critical
    } finally {
      setNotifPrefsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (lawyer?.id) fetchNotifPrefs(lawyer.id);
  }, [lawyer?.id, fetchNotifPrefs]);

  const getPref = (type: NotificationType): NotificationPreferenceDTO => {
    return (
      notifPrefs.find((p) => p.notification_type === type) ?? {
        lawyer_id: lawyer?.id ?? 0,
        notification_type: type,
        enabled: true,
        channel: 'EMAIL' as NotificationChannel,
        is_paused: false,
        paused_until: null,
      }
    );
  };

  const togglePrefEnabled = (type: NotificationType) => {
    setNotifPrefs((prev) => {
      const existing = prev.find((p) => p.notification_type === type);
      if (existing) {
        return prev.map((p) =>
          p.notification_type === type ? { ...p, enabled: !p.enabled } : p
        );
      }
      return [
        ...prev,
        {
          lawyer_id: lawyer?.id ?? 0,
          notification_type: type,
          enabled: false,
          channel: 'EMAIL' as NotificationChannel,
          is_paused: false,
          paused_until: null,
        },
      ];
    });
  };

  const togglePrefPaused = (type: NotificationType) => {
    setNotifPrefs((prev) => {
      const existing = prev.find((p) => p.notification_type === type);
      if (existing) {
        return prev.map((p) =>
          p.notification_type === type ? { ...p, is_paused: !p.is_paused } : p
        );
      }
      return [
        ...prev,
        {
          lawyer_id: lawyer?.id ?? 0,
          notification_type: type,
          enabled: true,
          channel: 'EMAIL' as NotificationChannel,
          is_paused: true,
          paused_until: null,
        },
      ];
    });
  };

  const handleSaveNotifPrefs = async () => {
    if (!lawyer?.id) return;
    setNotifPrefsSaving(true);
    try {
      const prefs = NOTIF_TYPES.map(({ value }) => {
        const p = getPref(value);
        return {
          notification_type: p.notification_type,
          enabled: p.enabled,
          channel: p.channel,
          is_paused: p.is_paused,
          paused_until: p.paused_until,
        };
      });
      const res = await api.notifications.preferences.update(lawyer.id, prefs);
      if (res.success) {
        toast.success('Notification preferences saved');
        if (res.data && Array.isArray(res.data)) setNotifPrefs(res.data);
      } else {
        toast.error(res.message ?? 'Failed to save preferences');
      }
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setNotifPrefsSaving(false);
    }
  };
```

- [ ] **Step 4: Add the preferences section to the JSX**

In the return statement, after the KPI grid section (`</div>` around line 810 that closes the `grid gap-3.5` div) and before the `{/* Leads table */}` section, insert:

```tsx
      {/* ── Notification Preferences ────────────────────────────────── */}
      <section className='flex flex-col gap-3'>
        <button
          type='button'
          onClick={() => setNotifPrefsOpen(!notifPrefsOpen)}
          className='inline-flex w-fit items-center gap-2 text-[15px] font-extrabold tracking-[-0.015em] text-slate-900'
        >
          <MdNotifications size={18} />
          Notification Preferences
          <span className='text-[12px] font-medium text-slate-400'>
            {notifPrefsOpen ? '▾' : '▸'}
          </span>
        </button>

        {notifPrefsOpen && (
          notifPrefsLoading ? (
            <div className='py-4 text-center text-[13px] text-slate-400'>
              Loading preferences...
            </div>
          ) : (
            <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white'>
              <div className='grid grid-cols-[1fr_80px_100px_80px] border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500'>
                <div>Type</div>
                <div className='text-center'>Active</div>
                <div className='text-center'>Channel</div>
                <div className='text-center'>Paused</div>
              </div>
              {NOTIF_TYPES.map(({ value, label }) => {
                const pref = getPref(value);
                return (
                  <div
                    key={value}
                    className='grid grid-cols-[1fr_80px_100px_80px] items-center border-b border-slate-100 px-5 py-3 last:border-b-0'
                  >
                    <span className='text-[13px] font-medium text-slate-700'>
                      {label}
                    </span>
                    <div className='flex justify-center'>
                      <button
                        type='button'
                        onClick={() => togglePrefEnabled(value)}
                        className={`h-6 w-10 rounded-full transition-colors ${
                          pref.enabled ? 'bg-green-500' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            pref.enabled ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    <div className='flex justify-center'>
                      <select
                        value={pref.channel}
                        disabled
                        className='h-7 w-20 rounded-md border border-slate-200 px-1.5 text-[11px] text-slate-600 outline-none disabled:bg-slate-50 disabled:text-slate-400'
                      >
                        {CHANNEL_OPTIONS.map((ch) => (
                          <option key={ch.value} value={ch.value} disabled={ch.disabled}>
                            {ch.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className='flex justify-center'>
                      <button
                        type='button'
                        onClick={() => togglePrefPaused(value)}
                        className={`h-6 w-10 rounded-full transition-colors ${
                          pref.is_paused ? 'bg-orange-400' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            pref.is_paused ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className='flex items-center justify-end border-t border-slate-200 px-5 py-3'>
                <button
                  type='button'
                  onClick={handleSaveNotifPrefs}
                  disabled={notifPrefsSaving}
                  className='inline-flex h-[30px] items-center rounded-[9px] bg-slate-900 px-3.5 text-[12px] font-bold text-white hover:bg-slate-800 disabled:opacity-50'
                >
                  {notifPrefsSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )
        )}
      </section>
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep -i "IdLawyer"`
Expected: No errors

- [ ] **Step 6: Visual smoke test**

Navigate to `/lawyer-management/[any-lawyer-id]`. Verify:
- "Notification Preferences" section appears between KPI cards and Leads table
- Clicking expands/collapses
- 5 rows render with toggle switches
- Channel dropdown shows EMAIL (disabled — SMS not implemented)

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/lawyer-management/\[id\]/IdLawyer.tsx
git commit -m "feat(notif): add notification preferences section to lawyer detail page"
```

---

### Task 6: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: No new errors (existing e2e test error is pre-existing)

- [ ] **Step 2: Lint check**

Run: `npx next lint`
Expected: No new warnings or errors

- [ ] **Step 3: Full feature smoke test**

1. Login as admin → `/notification-settings` appears in sidebar under Management
2. Navigate to Notification Settings → Global Settings tab loads with form fields
3. Edit quiet hours → Save → toast "Settings saved"
4. Click "Send Test Email" → toast "Test notification sent"
5. Switch to History tab → table loads with notification records
6. Filter by type → table updates
7. Filter by status → table updates
8. Navigate to `/lawyer-management/[id]` → "Notification Preferences" section visible
9. Expand → 5 rows with toggles
10. Toggle a preference → Save → toast "Notification preferences saved"

- [ ] **Step 4: Commit final verification**

If any lint/type fixes were needed:

```bash
git add -A
git commit -m "fix(notif): lint and type fixes from final verification"
```
