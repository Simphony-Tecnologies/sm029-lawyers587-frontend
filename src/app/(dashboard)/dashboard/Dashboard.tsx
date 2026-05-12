'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  MdAddCircleOutline,
  MdCheckCircleOutline,
  MdChatBubbleOutline,
  MdHighlightOff,
  MdHourglassEmpty,
  MdInfoOutline,
  MdOutbox,
  MdPersonAddAlt1,
  MdPersonRemove,
  MdReplay,
  MdSwapHoriz,
  MdLogin as MdLoginIcon,
  MdEdit,
  MdBlock,
} from 'react-icons/md';
import { useLeadsStore } from '@/store/useLead.store';
import { useSelectStatus } from '@/store/useSelectStatus';
import { api } from '@/services/database';
import type { ActionType, AuditEvent, LawyerListItem } from '@/types/api.types';
import {
  ActivityPanel,
  KpiCard,
  PageHead,
  PeriodSelect,
  type KpiTone,
  type PeriodKey,
  type PeriodOption,
} from '@/components/ui';

dayjs.extend(relativeTime);

type LeadStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN PROGRESS'
  | 'PROBLEMATIC'
  | 'LOST'
  | 'SEND_BACK'
  | 'CLOSED'
  | 'EXPIRED'
  | 'DISABLED';

type KpiDef = {
  key: string;
  label: string;
  period: string;
  tone: KpiTone;
  icon: JSX.Element;
  statuses: LeadStatus[];
};

// 8 KPIs alineados con el dashboard legacy (cliente lo pidió explícitamente).
// Cada uno mapea a un status concreto del backend → click filtra esa cohorte
// en /lead-management.
const KPI_DEFS: KpiDef[] = [
  {
    key: 'new',
    label: 'New Leads',
    period: 'Last 24 hours',
    tone: 'violet',
    icon: <MdAddCircleOutline size={16} />,
    statuses: ['NEW'],
  },
  {
    key: 'pulled',
    label: 'Pulled Leads',
    period: 'Active',
    tone: 'violet',
    icon: <MdOutbox size={16} />,
    statuses: ['ASSIGNED'],
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    period: 'Active',
    tone: 'emerald',
    icon: <MdCheckCircleOutline size={16} />,
    statuses: ['IN PROGRESS'],
  },
  {
    key: 'problematic',
    label: 'Problematic',
    period: 'Pending review',
    tone: 'amber',
    icon: <MdInfoOutline size={16} />,
    statuses: ['PROBLEMATIC'],
  },
  {
    key: 'sent_back',
    label: 'Sent Back Leads (REVIEW)',
    period: 'Pending review',
    tone: 'coral',
    icon: <MdReplay size={16} />,
    statuses: ['LOST', 'SEND_BACK'],
  },
  {
    key: 'retained',
    label: 'Retained',
    period: 'Total',
    tone: 'emerald',
    icon: <MdCheckCircleOutline size={16} />,
    statuses: ['CLOSED'],
  },
  {
    key: 'expired',
    label: 'Expired',
    period: 'Total',
    tone: 'coral',
    icon: <MdHourglassEmpty size={16} />,
    statuses: ['EXPIRED'],
  },
  {
    key: 'disabled',
    label: 'Disabled',
    period: 'Total',
    tone: 'slate',
    icon: <MdBlock size={16} />,
    statuses: ['DISABLED'],
  },
];

const Dashboard = () => {
  const { dataLeads, fetchLeads } = useLeadsStore();
  const { setSelecArray } = useSelectStatus();
  const router = useRouter();
  const pathname = usePathname();

  const [period, setPeriod] = useState<{ key: PeriodKey; days: number | null }>(
    { key: 'week', days: 7 }
  );

  // Leads filtrados por la ventana temporal seleccionada en PeriodSelect.
  const leadsInPeriod = useMemo(() => {
    if (!Array.isArray(dataLeads)) return [];
    if (period.days == null) return dataLeads as any[];
    const cutoff = Date.now() - period.days * 86_400_000;
    return (dataLeads as any[]).filter((lead: any) => {
      const ts = new Date(lead.date_updated ?? lead.date).getTime();
      return ts >= cutoff;
    });
  }, [dataLeads, period.days]);

  const counts = useMemo(() => {
    return KPI_DEFS.map(({ statuses }) =>
      leadsInPeriod.filter((lead: any) =>
        statuses.includes(lead.status)
      ).length
    );
  }, [leadsInPeriod]);

  // Sparkline por KPI: cuenta de leads agrupados por día dentro de la
  // ventana del PeriodSelect. Backend NO expone series temporales, lo
  // derivamos desde dataLeads.date_updated. Reemplazable cuando exista
  // /leads/stats?bucket=day o similar.
  const sparks = useMemo(() => {
    const days = period.days ?? 14;
    const buckets = Math.min(Math.max(days, 5), 30);
    const now = Date.now();
    const bucketSize = Math.max(1, Math.round((days * 86_400_000) / buckets));
    return KPI_DEFS.map(({ statuses }) => {
      const filtered = leadsInPeriod.filter((lead: any) =>
        statuses.includes(lead.status)
      );
      const arr = new Array(buckets).fill(0);
      for (const lead of filtered) {
        const ts = new Date(lead.date_updated ?? lead.date).getTime();
        const offset = now - ts;
        const idx = buckets - 1 - Math.floor(offset / bucketSize);
        if (idx >= 0 && idx < buckets) arr[idx] += 1;
      }
      return arr;
    });
  }, [leadsInPeriod, period.days]);

  const handleClickKpi = (statuses: LeadStatus[]) => {
    // useSelectStatus tiene un union legacy más estrecho; cast hasta migrar.
    setSelecArray(statuses as any);
    router.push('/lead-management');
  };

  // Audit log real combinado de los top lawyers activos.
  // Backend NO expone /audit/recent global → hacemos N fetches a
  // /lawyers/:id/history y mergeamos por timestamp. Aceptable porque
  // solo ocurre en mount del dashboard.
  type ActivityEvent = AuditEvent & {
    _actorName: string;
  };
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const fetchRecentActivity = async () => {
    setRecentLoading(true);
    const lawyersRes = await api.lawyers.list({ is_active: true, limit: 10 });
    if (!lawyersRes.success || !lawyersRes.data) {
      setRecentLoading(false);
      setRecentEvents([]);
      return;
    }
    const lawyers: LawyerListItem[] = lawyersRes.data.data;
    const histories = await Promise.all(
      lawyers.map((l) => api.lawyers.history(l.id, { limit: 5 }))
    );
    setRecentLoading(false);

    const merged: ActivityEvent[] = histories
      .flatMap((h, i) => {
        if (!h.success || !h.data) return [];
        const lawyer = lawyers[i];
        const fullName =
          `${lawyer.firstName ?? ''} ${lawyer.lastName ?? ''}`.trim() ||
          `Lawyer #${lawyer.id}`;
        return h.data.events.data.map((ev) => ({
          ...ev,
          _actorName: fullName,
        }));
      })
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 8);
    setRecentEvents(merged);
  };

  useEffect(() => {
    void fetchRecentActivity();
  }, []);

  // Filtrar por período seleccionado.
  const recentInPeriod = useMemo(() => {
    if (period.days == null) return recentEvents;
    const cutoff = Date.now() - period.days * 86_400_000;
    return recentEvents.filter(
      (ev) => new Date(ev.timestamp).getTime() >= cutoff
    );
  }, [recentEvents, period.days]);

  const handleActivityClick = () => {
    setSelecArray([]);
    router.push('/lead-management');
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className='flex flex-col gap-5'>
      <PageHead
        eyebrow='Overview'
        title='Dashboard'
        action={
          <PeriodSelect
            value={period.key}
            onChange={(opt: PeriodOption) =>
              setPeriod({ key: opt.key, days: opt.days })
            }
          />
        }
      />

      <div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4'>
        {KPI_DEFS.map((kpi, idx) => (
          <KpiCard
            key={kpi.key}
            label={kpi.label}
            period={kpi.period}
            value={counts[idx]}
            tone={kpi.tone}
            icon={kpi.icon}
            spark={sparks[idx]}
            onClick={() => handleClickKpi(kpi.statuses)}
          />
        ))}
      </div>

      <ActivityPanel
        eyebrow='Audit log'
        title='Recent activity'
        empty={recentInPeriod.length === 0}
        emptyText={
          recentLoading
            ? 'Loading recent activity…'
            : 'No recent activity yet'
        }
        onViewAll={
          recentInPeriod.length > 0 ? handleActivityClick : undefined
        }
      >
        <ul className='flex flex-col divide-y divide-slate-100'>
          {recentInPeriod.map((ev) => (
            <li key={`${ev.entity_type}-${ev.entity_id}-${ev.id}`}>
              <button
                type='button'
                onClick={handleActivityClick}
                className='flex w-full items-center gap-3 bg-transparent py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none'
              >
                <ActionDot type={ev.action_type} />
                <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <span className='truncate text-[12px] font-semibold text-slate-700'>
                    {describeEvent(ev)}
                  </span>
                  <span className='truncate text-[11px] text-slate-500'>
                    {ev.actor_role
                      ? ev.actor_role.charAt(0).toUpperCase() +
                        ev.actor_role.slice(1)
                      : 'System'}{' '}
                    · <strong className='font-semibold text-slate-700'>{ev._actorName}</strong>
                  </span>
                </div>
                <span className='flex-shrink-0 text-[10px] font-medium text-slate-400'>
                  {dayjs(ev.timestamp).fromNow()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </ActivityPanel>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers para Recent activity (HTML 23)
// ────────────────────────────────────────────────────────────────────────────

const ACTION_TONE: Record<
  ActionType,
  { bg: string; fg: string; icon: JSX.Element }
> = {
  assign: {
    bg: 'bg-violet-100',
    fg: 'text-violet-600',
    icon: <MdPersonAddAlt1 size={14} />,
  },
  unassign: {
    bg: 'bg-rose-100',
    fg: 'text-rose-600',
    icon: <MdPersonRemove size={14} />,
  },
  status_change: {
    bg: 'bg-amber-100',
    fg: 'text-amber-700',
    icon: <MdSwapHoriz size={14} />,
  },
  update: {
    bg: 'bg-sky-100',
    fg: 'text-sky-700',
    icon: <MdEdit size={14} />,
  },
  edit_denied: {
    bg: 'bg-rose-100',
    fg: 'text-rose-600',
    icon: <MdBlock size={14} />,
  },
  create: {
    bg: 'bg-emerald-100',
    fg: 'text-emerald-600',
    icon: <MdAddCircleOutline size={14} />,
  },
  delete: {
    bg: 'bg-rose-100',
    fg: 'text-rose-600',
    icon: <MdHighlightOff size={14} />,
  },
  login: {
    bg: 'bg-slate-100',
    fg: 'text-slate-600',
    icon: <MdLoginIcon size={14} />,
  },
};

const ActionDot = ({ type }: { type: ActionType }) => {
  const meta = ACTION_TONE[type] ?? ACTION_TONE.update;
  return (
    <span
      className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.fg}`}
    >
      {meta.icon}
    </span>
  );
};

const describeEvent = (ev: AuditEvent): JSX.Element => {
  const idLabel =
    ev.entity_type === 'lead'
      ? `#${String(ev.entity_id).padStart(5, '0')}`
      : ev.entity_type === 'lawyer'
      ? `Lawyer #${ev.entity_id}`
      : '';
  switch (ev.action_type) {
    case 'assign':
      return (
        <>
          Lead <strong className='font-bold text-slate-900'>{idLabel}</strong>{' '}
          assigned
        </>
      );
    case 'unassign':
      return (
        <>
          Lead <strong className='font-bold text-slate-900'>{idLabel}</strong>{' '}
          unassigned
        </>
      );
    case 'status_change': {
      const from = ev.old_value?.status;
      const to = ev.new_value?.status;
      return (
        <>
          <strong className='font-bold text-slate-900'>{idLabel}</strong>{' '}
          status changed to{' '}
          <strong className='font-bold text-slate-900'>{to ?? '—'}</strong>
          {from ? (
            <span className='text-slate-400'> (from {from})</span>
          ) : null}
        </>
      );
    }
    case 'edit_denied':
      return (
        <>
          Edit denied on{' '}
          <strong className='font-bold text-slate-900'>{idLabel}</strong>
        </>
      );
    case 'login':
      return <>Logged in</>;
    case 'create':
      return (
        <>
          Created{' '}
          <strong className='font-bold text-slate-900'>{idLabel}</strong>
        </>
      );
    case 'delete':
      return (
        <>
          Deleted{' '}
          <strong className='font-bold text-slate-900'>{idLabel}</strong>
        </>
      );
    case 'update':
    default:
      return (
        <>
          Updated{' '}
          <strong className='font-bold text-slate-900'>{idLabel}</strong>
        </>
      );
  }
};

export default Dashboard;
