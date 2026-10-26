'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  MdAddCircleOutline,
  MdCheckCircleOutline,
  MdFlag,
  MdHighlightOff,
  MdMoveToInbox,
  MdOutbox,
  MdPersonAddAlt1,
  MdPersonRemove,
  MdReplay,
  MdSchedule,
  MdSwapHoriz,
  MdTrendingUp,
  MdLogin as MdLoginIcon,
  MdEdit,
  MdBlock,
} from 'react-icons/md';
import { useLeadsStore } from '@/store/useLead.store';
import { api } from '@/services/database';
import type {
  ActionType,
  AuditEvent,
  MetricsPeriod,
} from '@/types/api.types';
import {
  ActivityPanel,
  KpiCard,
  PageHead,
  PeriodSelect,
  SectionHead,
  statusLabel,
  type KpiTone,
  type PeriodKey,
  type PeriodOption,
} from '@/components/ui';
import {
  PERIOD_PHRASE,
  PERIOD_QUEUES,
  WORK_QUEUES,
  periodStart,
  rowMatchesQueue,
  type LeadQueueDef,
  type LeadQueueKey,
} from '@/constants/leadQueues';
import { PerformancePanel } from './PerformancePanel';
import { SourceAnalysisPanel } from './SourceAnalysisPanel';
import { AgingPanel } from './AgingPanel';

dayjs.extend(relativeTime);

// Fase 3 — tarjetas de análisis: mes, trimestre o año de calendario en curso.
const ANALYSIS_PERIODS: PeriodOption<MetricsPeriod>[] = [
  { key: 'month', label: 'This month', days: null },
  { key: 'quarter', label: 'This quarter', days: null },
  { key: 'year', label: 'This year', days: null },
];

// Tonos distintos en cards vecinas del grid (3 columnas).
const QUEUE_VISUAL: Record<LeadQueueKey, { tone: KpiTone; icon: JSX.Element }> = {
  new: { tone: 'sky', icon: <MdAddCircleOutline size={14} /> },
  assigned: { tone: 'violet', icon: <MdOutbox size={14} /> },
  'in-progress': { tone: 'emerald', icon: <MdTrendingUp size={14} /> },
  waiting: { tone: 'amber', icon: <MdSchedule size={14} /> },
  returned: { tone: 'slate', icon: <MdReplay size={14} /> },
  flagged: { tone: 'coral', icon: <MdFlag size={14} /> },
  received: { tone: 'violet', icon: <MdMoveToInbox size={14} /> },
  retained: { tone: 'emerald', icon: <MdCheckCircleOutline size={14} /> },
};

const Dashboard = () => {
  const { dataLeads, fetchLeads } = useLeadsStore();
  const router = useRouter();
  const pathname = usePathname();

  // Solo afecta a las dos cards de "Results for this period".
  const [resultsPeriod, setResultsPeriod] = useState<PeriodKey>('today');
  // El ranking de abogados conserva su propio período.
  const [perfPeriod, setPerfPeriod] = useState<{
    key: PeriodKey;
    days: number | null;
  }>({ key: 'all', days: null });
  // Cada tarjeta de análisis (Fase 3) conserva su propio período.
  const [sourcesPeriod, setSourcesPeriod] = useState<MetricsPeriod>('month');
  const [agingPeriod, setAgingPeriod] = useState<MetricsPeriod>('month');

  // Mismo dataset y mismo predicado que Lead Management (?queue=), así cada
  // card abre exactamente los registros que cuenta.
  const workCounts = useMemo(() => {
    if (!Array.isArray(dataLeads)) return WORK_QUEUES.map(() => null);
    return WORK_QUEUES.map(
      (queue) =>
        (dataLeads as any[]).filter((row) => rowMatchesQueue(queue, row, null))
          .length
    );
  }, [dataLeads]);

  // Inicio del período usado por el conteo; viaja en la URL al abrir la lista
  // para que ambos usen el mismo instante aunque el dashboard lleve horas abierto.
  const resultsSince = useMemo(
    () => periodStart(resultsPeriod),
    // dataLeads: recalcula al refrescar los datos (p. ej. al volver al dashboard).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resultsPeriod, dataLeads]
  );

  const periodCounts = useMemo(() => {
    if (!Array.isArray(dataLeads)) return PERIOD_QUEUES.map(() => null);
    const since = resultsSince;
    return PERIOD_QUEUES.map(
      (queue) =>
        (dataLeads as any[]).filter((row) => rowMatchesQueue(queue, row, since))
          .length
    );
  }, [dataLeads, resultsSince]);

  const openQueue = (queue: LeadQueueDef) => {
    let params = `queue=${queue.key}`;
    if (queue.periodField) {
      params += `&period=${resultsPeriod}`;
      if (resultsSince) params += `&since=${encodeURIComponent(resultsSince.toISOString())}`;
    }
    router.push(`/lead-management?${params}`);
  };

  // Obs 33/35 — feed global real: una sola llamada a GET /audit (solo admin).
  // Antes se reconstruía con el historial de los 10 abogados de id más alto y
  // la actividad de los demás (p. ej. Lawyer Demo, id 3) nunca aparecía.
  // Sin los "Edit denied", que solo ensucian el feed (siguen en el log completo).
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const fetchRecentActivity = async () => {
    setRecentLoading(true);
    const res = await api.audit.list({
      limit: 8,
      exclude_actions: 'edit_denied',
    });
    setRecentLoading(false);
    setRecentEvents(res.success && res.data ? res.data.data ?? [] : []);
  };

  useEffect(() => {
    void fetchRecentActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleActivityClick = () => {
    router.push('/lead-management?status=all');
  };

  // Obs 35 — "View all" abre el log completo de auditoría, no la lista de leads.
  const handleViewAllActivity = () => {
    router.push('/audit-log');
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className='flex flex-col gap-6'>
      <PageHead eyebrow='Overview' title='Dashboard' />

      <section className='flex flex-col gap-3'>
        <SectionHead
          title='Work right now'
          subtitle='All open leads, including older leads that still need attention.'
        />
        <div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3'>
          {WORK_QUEUES.map((queue, idx) => (
            <KpiCard
              key={queue.key}
              label={queue.label}
              hint={queue.hint}
              info={queue.info}
              value={workCounts[idx] ?? '—'}
              tone={QUEUE_VISUAL[queue.key].tone}
              icon={QUEUE_VISUAL[queue.key].icon}
              onClick={() => openQueue(queue)}
            />
          ))}
        </div>
      </section>

      <section className='flex flex-col gap-3'>
        <SectionHead
          title='Results for this period'
          subtitle='The date selection changes only the two cards below.'
          action={
            <PeriodSelect
              ariaLabel='Results period'
              value={resultsPeriod}
              onChange={(opt: PeriodOption) => setResultsPeriod(opt.key)}
            />
          }
        />
        <div className='grid gap-3.5 sm:grid-cols-2'>
          {PERIOD_QUEUES.map((queue, idx) => (
            <KpiCard
              key={queue.key}
              label={queue.label}
              hint={`${queue.hint} ${PERIOD_PHRASE[resultsPeriod]}`}
              info={queue.info}
              value={periodCounts[idx] ?? '—'}
              tone={QUEUE_VISUAL[queue.key].tone}
              icon={QUEUE_VISUAL[queue.key].icon}
              onClick={() => openQueue(queue)}
            />
          ))}
        </div>
      </section>

      <ActivityPanel
        eyebrow='Audit log'
        title='Recent activity'
        empty={recentEvents.length === 0}
        emptyText={
          recentLoading
            ? 'Loading recent activity…'
            : 'No recent activity yet'
        }
        onViewAll={
          recentEvents.length > 0 ? handleViewAllActivity : undefined
        }
      >
        <ul className='flex flex-col divide-y divide-slate-100'>
          {recentEvents.map((ev) => (
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
                    {actorRoleLabel(ev)}{' '}
                    · <strong className='font-semibold text-slate-700'>{actorName(ev)}</strong>
                    {/* Cuenta borrada: el nombre viene del registro de borrados. */}
                    {ev.actor?.deleted ? (
                      <span className='font-normal text-slate-400'> (deleted account)</span>
                    ) : null}
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

      <PerformancePanel
        days={perfPeriod.days}
        action={
          <PeriodSelect
            ariaLabel='Performance period'
            value={perfPeriod.key}
            onChange={(opt: PeriodOption) =>
              setPerfPeriod({ key: opt.key, days: opt.days })
            }
          />
        }
      />

      <SourceAnalysisPanel
        period={sourcesPeriod}
        action={
          <PeriodSelect
            ariaLabel='Lead Source Analysis'
            options={ANALYSIS_PERIODS}
            value={sourcesPeriod}
            onChange={(opt) => setSourcesPeriod(opt.key)}
          />
        }
      />

      <AgingPanel
        period={agingPeriod}
        action={
          <PeriodSelect
            ariaLabel='Aging Report'
            options={ANALYSIS_PERIODS}
            value={agingPeriod}
            onChange={(opt) => setAgingPeriod(opt.key)}
          />
        }
      />
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

// Obs 33/35 — el actor viene en el propio evento de GET /audit (id, nombre,
// email). Mismo texto que antes: rol capitalizado (o System) · nombre.
export const actorRoleLabel = (ev: AuditEvent): string =>
  ev.actor_role
    ? ev.actor_role.charAt(0).toUpperCase() + ev.actor_role.slice(1)
    : 'System';

export const actorName = (ev: AuditEvent): string =>
  `${ev.actor?.firstName ?? ''} ${ev.actor?.lastName ?? ''}`.trim() ||
  (ev.actor_id != null ? `Lawyer #${ev.actor_id}` : '—');

// Exportados: la página Audit log (/audit-log) pinta cada fila igual que el feed.
export const ActionDot = ({ type }: { type: ActionType }) => {
  const meta = ACTION_TONE[type] ?? ACTION_TONE.update;
  return (
    <span
      className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.fg}`}
    >
      {meta.icon}
    </span>
  );
};

export const describeEvent = (ev: AuditEvent): JSX.Element => {
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
      // Obs 23 — nombre visible del status (el de las pills), no el código.
      const from = ev.old_value?.status;
      const to = ev.new_value?.status;
      // Sin el status nuevo (eventos cuyo detalle se perdió en el backend) no se
      // muestra "changed to —": solo "status changed".
      if (!to) {
        return (
          <>
            <strong className='font-bold text-slate-900'>{idLabel}</strong>{' '}
            status changed
          </>
        );
      }
      return (
        <>
          <strong className='font-bold text-slate-900'>{idLabel}</strong>{' '}
          status changed to{' '}
          <strong className='font-bold text-slate-900'>{statusLabel(to)}</strong>
          {from ? (
            <span className='text-slate-400'> (from {statusLabel(from)})</span>
          ) : null}
        </>
      );
    }
    case 'edit_denied':
      // entity_id 0 = intento sin abogado válido (el viejo PUT /lawyers/undefined
      // del login): no se muestra "Lawyer #0".
      if (!Number(ev.entity_id)) return <>Edit denied</>;
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
