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

// ─── Reusable form atoms ───────────────────────────────────────────────────

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
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);

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
