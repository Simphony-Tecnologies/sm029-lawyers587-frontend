'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  MdBlock,
  MdCheckCircleOutline,
  MdFlag,
  MdMoveToInbox,
  MdOutbox,
  MdSchedule,
  MdTrendingUp,
} from 'react-icons/md';
import { api } from '@/services/database';
import { apiText } from '@/lib/apiText';
import {
  KpiCard,
  PageHead,
  PeriodSelect,
  type KpiTone,
  type PeriodKey,
  type PeriodOption,
} from '@/components/ui';
import {
  PERIOD_PHRASE,
  PERIOD_QUEUES,
  periodStart,
  type LeadQueueKey,
} from '@/constants/leadQueues';
import { ADMIN_LEAD_FILTERS, LAWYER_LEAD_FILTERS } from '@/constants/leadFilters';
import {
  PerformancePanel,
  type PerformancePanelSource,
} from '@/app/(dashboard)/dashboard/PerformancePanel';
import type { FirmReportsResponse, LeadStatus } from '@/types/api.types';

// Fase 4 — Reports de la firma: las métricas del dashboard admin acotadas a la
// firma (GET /firms/me/reports), con los mismos componentes y textos.

// "All time": sin fechas el backend usa los últimos 30 días; se manda un inicio
// anterior a cualquier lead.
const ALL_TIME_FROM = new Date('2000-01-01T00:00:00.000Z');

// Mismo inicio de período que las cards "Results for this period" del
// dashboard (calendario local del navegador) hasta ahora.
const rangeFor = (key: PeriodKey) => ({
  date_from: (periodStart(key) ?? ALL_TIME_FROM).toISOString(),
  date_to: new Date().toISOString(),
});

// Mismos tonos e íconos que las cards de período del dashboard admin.
const PERIOD_VISUAL: Partial<Record<LeadQueueKey, { tone: KpiTone; icon: JSX.Element }>> = {
  received: { tone: 'violet', icon: <MdMoveToInbox size={14} /> },
  retained: { tone: 'emerald', icon: <MdCheckCircleOutline size={14} /> },
};

// Conteo por status con los nombres y el orden de My Leads; tonos e íconos de
// las cards del dashboard del abogado.
const STATUS_VISUAL: Partial<Record<LeadStatus, { tone: KpiTone; icon: JSX.Element }>> = {
  ASSIGNED: { tone: 'violet', icon: <MdOutbox size={14} /> },
  'IN PROGRESS': { tone: 'emerald', icon: <MdTrendingUp size={14} /> },
  WAITING_ON_CLIENT: { tone: 'amber', icon: <MdSchedule size={14} /> },
  PROBLEMATIC: { tone: 'coral', icon: <MdFlag size={14} /> },
  CLOSED: { tone: 'emerald', icon: <MdCheckCircleOutline size={14} /> },
  DISABLED: { tone: 'slate', icon: <MdBlock size={14} /> },
};

const MY_LEADS_STATUSES = LAWYER_LEAD_FILTERS.flatMap((f) =>
  f.status ? [{ status: f.status, label: f.label }] : []
);

// Status fuera de My Leads: solo si tienen leads, con el mismo nombre que en
// Firm Leads. Spam en revisión, archivados y papelera no se muestran.
const HIDDEN_STATUSES = new Set<string>(['REVIEW', 'ARCHIVED', 'TRASHED']);
const extraStatusLabel = (st: string): string =>
  ADMIN_LEAD_FILTERS.find((f) => f.status === st)?.label ?? st;

const FirmReports = () => {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [data, setData] = useState<FirmReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.firms
      .reports(rangeFor(period))
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setData(res.data);
        else {
          setData(null);
          setError(apiText(res.message, 'Unable to load performance'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period]);

  const counts: Partial<Record<string, number>> = data?.status_counts ?? {};
  // Los status de My Leads siempre (con 0, como las cards de los dashboards).
  const statusCards = [
    ...MY_LEADS_STATUSES,
    ...Object.keys(counts)
      .filter(
        (st) =>
          (counts[st] ?? 0) > 0 &&
          !HIDDEN_STATUSES.has(st) &&
          !MY_LEADS_STATUSES.some((s) => s.status === st)
      )
      .map((st) => ({ status: st as LeadStatus, label: extraStatusLabel(st) })),
  ];

  const periodValue = (key: LeadQueueKey): number | string => {
    if (!data) return '—';
    const value = key === 'received' ? data.received : data.retained;
    return typeof value === 'number' ? value : '—';
  };

  const performance = useMemo<PerformancePanelSource>(
    () => ({
      data: data
        ? {
            lawyers: Array.isArray(data.lawyers) ? data.lawyers : [],
            from: data.from,
            to: data.to,
          }
        : null,
      loading,
      error,
    }),
    [data, loading, error]
  );

  return (
    <div className='flex flex-col gap-6'>
      <PageHead
        eyebrow='Firm'
        title='Reports'
        action={
          <PeriodSelect
            ariaLabel='Results period'
            value={period}
            onChange={(opt: PeriodOption) => setPeriod(opt.key)}
          />
        }
      />

      <div className='grid gap-3.5 sm:grid-cols-2'>
        {PERIOD_QUEUES.map((queue) => (
          <KpiCard
            key={queue.key}
            label={queue.label}
            hint={`${queue.hint} ${PERIOD_PHRASE[period]}`}
            info={queue.info}
            value={periodValue(queue.key)}
            tone={PERIOD_VISUAL[queue.key]?.tone ?? 'slate'}
            icon={PERIOD_VISUAL[queue.key]?.icon}
          />
        ))}
      </div>

      <div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3'>
        {statusCards.map(({ status, label }) => (
          <KpiCard
            key={status}
            label={label}
            value={data ? counts[status] ?? 0 : '—'}
            tone={STATUS_VISUAL[status]?.tone ?? 'slate'}
            icon={STATUS_VISUAL[status]?.icon ?? <MdBlock size={14} />}
          />
        ))}
      </div>

      <PerformancePanel source={performance} />
    </div>
  );
};

export default FirmReports;
