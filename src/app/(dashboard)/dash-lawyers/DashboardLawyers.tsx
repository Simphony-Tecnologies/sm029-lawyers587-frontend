'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  MdAddCircleOutline,
  MdCheckCircleOutline,
  MdDoneAll,
  MdHighlightOff,
  MdInfoOutline,
  MdOutbox,
  MdSchedule,
  MdSwapHoriz,
  MdFlag,
  MdTrendingUp,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import { api, database } from '@/services/database';
import type { LeadDTO } from '@/types/api.types';
import { useAuth } from '@/store/useAuth.store';
import useLoadingStore from '@/store/useLoadingStore';
import { statusFromSlug } from '@/constants/leadFilters';
import { getNameServiceLawyer } from '@/utils/getNameServiceLawyer';
import {
  ActivityPanel,
  Avatar,
  KpiCard,
  PageHead,
  PipelineChart,
  SectionHead,
  StatusPill,
  toneFromString,
  variantFromStatus,
  type KpiTone,
  type PipelineSegment,
} from '@/components/ui';

dayjs.extend(relativeTime);

type LawyerCardDef = {
  /** Slug de LAWYER_LEAD_FILTERS: la card cuenta ese status y abre /all-leads?status=<slug>. */
  slug: string;
  label: string;
  hint: string;
  info: string;
  tone: KpiTone;
  icon: JSX.Element;
};

// Mismas definiciones que "Work right now" del dashboard admin, vistas desde el
// abogado. Cada card abre My Leads filtrado exactamente por lo que cuenta.
const WORK_CARDS: LawyerCardDef[] = [
  {
    slug: 'assigned',
    label: 'Assigned',
    hint: 'Not started yet',
    info: 'Leads assigned to you that you have not started. The assignment expires 48h after it was made.',
    tone: 'violet',
    icon: <MdOutbox size={14} />,
  },
  {
    slug: 'in-progress',
    label: 'In Progress',
    hint: 'You have started',
    info: 'Leads you are working on. Waiting on Client is counted separately.',
    tone: 'emerald',
    icon: <MdTrendingUp size={14} />,
  },
  {
    slug: 'waiting',
    label: 'Waiting on Client',
    hint: 'Reply or documents needed',
    info: 'Leads waiting for a client response or information.',
    tone: 'amber',
    icon: <MdSchedule size={14} />,
  },
  {
    slug: 'flagged',
    label: 'Flagged',
    hint: 'Problem needs review',
    info: 'Leads with an unresolved issue.',
    tone: 'coral',
    icon: <MdFlag size={14} />,
  },
];

const RETAINED_CARD: LawyerCardDef = {
  slug: 'retained',
  label: 'Retained',
  hint: 'Closed successfully',
  info: 'All leads you have retained as clients.',
  tone: 'emerald',
  icon: <MdCheckCircleOutline size={14} />,
};

// Leads que ocupan capacidad (mismo criterio que el desglose por área).
const ACTIVE_STATUSES = new Set(['ASSIGNED', 'IN PROGRESS', 'WAITING_ON_CLIENT']);

// "Your results": Completed sale de Retained y sigue contando como conversión,
// así que suma en Retained (la card abre ambos filtros: lista = conteo).
const RETAINED_STATUSES = new Set(['CLOSED', 'COMPLETED']);
const RETAINED_SLUGS = ['retained', 'completed'];

const ACTION_TONE_BY_STATUS: Record<string, { bg: string; fg: string; icon: JSX.Element }> = {
  NEW: { bg: 'bg-violet-100', fg: 'text-violet-600', icon: <MdAddCircleOutline size={14} /> },
  ASSIGNED: { bg: 'bg-violet-100', fg: 'text-violet-600', icon: <MdOutbox size={14} /> },
  'IN PROGRESS': { bg: 'bg-sky-100', fg: 'text-sky-700', icon: <MdSwapHoriz size={14} /> },
  PROBLEMATIC: { bg: 'bg-amber-100', fg: 'text-amber-700', icon: <MdInfoOutline size={14} /> },
  CLOSED: { bg: 'bg-emerald-100', fg: 'text-emerald-700', icon: <MdCheckCircleOutline size={14} /> },
  COMPLETED: { bg: 'bg-indigo-100', fg: 'text-indigo-700', icon: <MdDoneAll size={14} /> },
  LOST: { bg: 'bg-rose-100', fg: 'text-rose-600', icon: <MdHighlightOff size={14} /> },
  EXPIRED: { bg: 'bg-rose-100', fg: 'text-rose-600', icon: <MdHighlightOff size={14} /> },
  WAITING_ON_CLIENT: { bg: 'bg-orange-100', fg: 'text-orange-700', icon: <MdSchedule size={14} /> },
};

const DashboardLawyers = () => {
  const [leads, setLeads] = useState<LeadDTO[]>([]);
  const [dataServiceType, setDataServiceType] = useState<any[]>([]);
  const [maxLeadsAssigned, setMaxLeadsAssigned] = useState<any>(null);
  const [userId, setUserId] = useState<any>(null);
  const [leadsLoaded, setLeadsLoaded] = useState(false);
  const { setLoading } = useLoadingStore();
  const { user } = useAuth();
  const router = useRouter();

  const capacityTotal = maxLeadsAssigned
    ? maxLeadsAssigned.reduce(
        (acc: number, curr: any) => acc + (curr.max_leads ?? 0),
        0
      )
    : 0;

  // L587-12 — desglose por área para el propio abogado: capacidad (max_leads)
  // vs leads activos asignados. Mismo criterio que el perfil admin (IdLawyer)
  // para que ambas vistas muestren el mismo número. Match por nombre de área
  // (el lead trae `service` como string, no service_type_id).
  const capacityByArea = useMemo(() => {
    const svcs = Array.isArray(maxLeadsAssigned)
      ? maxLeadsAssigned.filter(Boolean)
      : [];
    return svcs.map((s: any) => {
      const name = s?.name ?? `Area ${s?.id}`;
      const assigned = leads.filter(
        (l) =>
          ACTIVE_STATUSES.has(l.status) &&
          String(l.service ?? '').trim().toLowerCase() ===
            String(name).trim().toLowerCase()
      ).length;
      return { id: s?.id, name, capacity: s?.max_leads ?? 0, assigned };
    });
  }, [maxLeadsAssigned, leads]);

  const fetchAssignedLeads = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [leadsRes, lawyerRes] = await Promise.all([
      api.leads.list({ assigned_to: Number(user.id), limit: 1000 }),
      database.getLawyer(user.id),
    ]);
    setLoading(false);
    if (!leadsRes.success || !leadsRes.data) {
      // Sin datos, las cards quedan en '—' (no 0, que parecería "sin trabajo").
      toast.error(leadsRes.message || 'Could not load assigned leads');
      setLeads([]);
      return;
    }
    setLeads(leadsRes.data.data);
    setLeadsLoaded(true);
    const dto = lawyerRes?.data?.data ?? lawyerRes?.data ?? null;
    setUserId(dto);
  };

  const fetchServiceTypes = async () => {
    const resType = await database.getData(
      `${process.env.NEXT_PUBLIC_URL}/service_types`
    );
    if (!resType.success) return;
    setDataServiceType(resType.data);
  };

  useEffect(() => {
    void fetchAssignedLeads();
    void fetchServiceTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!userId) return;
    setMaxLeadsAssigned(
      getNameServiceLawyer(userId?.lawyersServices, dataServiceType)
    );
  }, [userId, dataServiceType]);

  const countFor = (slug: string): number | string => {
    if (!leadsLoaded) return '—';
    const status = statusFromSlug(slug);
    return leads.filter((l) => l.status === status).length;
  };

  const activeCount = useMemo(
    () => leads.filter((l) => ACTIVE_STATUSES.has(l.status)).length,
    [leads]
  );

  const retainedCount = useMemo(
    () => leads.filter((l) => RETAINED_STATUSES.has(l.status)).length,
    [leads]
  );

  const openFilter = (slug: string) => {
    router.push(`/all-leads?status=${slug}`);
  };

  // UX-L02: actividad reciente — 8 leads más recientes del lawyer.
  const recentLeads = useMemo(() => {
    return [...leads]
      .sort(
        (a, b) =>
          new Date(b.updated_at ?? b.created_at).getTime() -
          new Date(a.updated_at ?? a.created_at).getTime()
      )
      .slice(0, 8);
  }, [leads]);

  const pipelineSegments: PipelineSegment[] = useMemo(() => [
    {
      key: 'active',
      label: 'Active',
      value: leads.filter((l) => l.status === 'ASSIGNED' || l.status === 'IN PROGRESS').length,
      color: '#8280FF',
      dotClass: 'bg-violet-500',
    },
    {
      key: 'waiting',
      label: 'Waiting',
      value: leads.filter((l) => l.status === 'WAITING_ON_CLIENT').length,
      color: '#FF9066',
      dotClass: 'bg-orange-400',
    },
    {
      key: 'flagged',
      label: 'Flagged',
      value: leads.filter((l) => l.status === 'PROBLEMATIC').length,
      color: '#FEC53D',
      dotClass: 'bg-amber-400',
    },
    {
      key: 'retained',
      label: 'Retained',
      value: retainedCount,
      color: '#4AD991',
      dotClass: 'bg-emerald-400',
    },
  ], [leads, retainedCount]);

  const displayName =
    userId && (userId.firstName || userId.lastName)
      ? `${userId.firstName ?? ''} ${userId.lastName ?? ''}`.trim()
      : 'My dashboard';

  return (
    <div className='flex flex-col gap-5'>
      <PageHead
        eyebrow='My workflow'
        title={displayName}
        subtitle={
          capacityTotal > 0
            ? `${activeCount} active of ${capacityTotal} capacity`
            : `${activeCount} active leads`
        }
      />

      <section className='flex flex-col gap-3'>
        <SectionHead
          title='Work right now'
          subtitle='Your open leads, including older ones that still need attention.'
        />
        <div className='grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4'>
          {WORK_CARDS.map((card) => (
            <KpiCard
              key={card.slug}
              label={card.label}
              hint={card.hint}
              info={card.info}
              value={countFor(card.slug)}
              tone={card.tone}
              icon={card.icon}
              onClick={() => openFilter(card.slug)}
            />
          ))}
        </div>
      </section>

      <section className='flex flex-col gap-3'>
        <SectionHead title='Your results' subtitle='All time.' />
        <div className='grid gap-3.5 sm:grid-cols-2'>
          <KpiCard
            label={RETAINED_CARD.label}
            hint={RETAINED_CARD.hint}
            info={RETAINED_CARD.info}
            value={leadsLoaded ? retainedCount : '—'}
            tone={RETAINED_CARD.tone}
            icon={RETAINED_CARD.icon}
            onClick={() =>
              router.push(`/all-leads?${RETAINED_SLUGS.map((s) => `status=${s}`).join('&')}`)
            }
          />
          <PipelineChart segments={pipelineSegments} />
        </div>
      </section>

      {/* L587-12 — capacidad por área vs leads activos, visible para el abogado. */}
      {capacityByArea.length > 0 ? (
        <section className='flex flex-col gap-2'>
          <span className='text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'>
            Capacity by area
          </span>
          <div className='flex flex-col overflow-hidden rounded-[11px] border border-slate-200 bg-white'>
            {capacityByArea.map((a: any, i: number) => {
              const full = a.capacity > 0 && a.assigned >= a.capacity;
              return (
                <div
                  key={`${a.id}-${i}`}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                    i < capacityByArea.length - 1
                      ? 'border-b border-slate-100'
                      : ''
                  }`}
                >
                  <span className='min-w-0 truncate text-[13px] font-semibold text-slate-800'>
                    {a.name}
                  </span>
                  <span
                    className={`text-[12px] font-bold tabular-nums ${
                      full ? 'text-customRed' : 'text-slate-500'
                    }`}
                  >
                    {a.assigned} / {a.capacity || '—'}
                    <span className='ml-1 font-medium text-slate-400'>
                      {full ? 'at capacity' : 'assigned'}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <ActivityPanel
        eyebrow='Your work'
        title='Recent leads'
        empty={recentLeads.length === 0}
        emptyText='No leads assigned yet'
        onViewAll={
          recentLeads.length > 0
            ? () => router.push('/all-leads')
            : undefined
        }
      >
        <ul className='flex flex-col divide-y divide-slate-100'>
          {recentLeads.map((lead) => {
            const meta = ACTION_TONE_BY_STATUS[lead.status] ?? {
              bg: 'bg-slate-100',
              fg: 'text-slate-600',
              icon: <MdSwapHoriz size={14} />,
            };
            const name = lead.fullName || '—';
            return (
              <li key={lead.id}>
                <button
                  type='button'
                  onClick={() => router.push('/all-leads')}
                  className='flex w-full items-center gap-3 bg-transparent py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none'
                >
                  <span
                    className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.fg}`}
                  >
                    {meta.icon}
                  </span>
                  <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                    <div className='flex items-center gap-2'>
                      <Avatar
                        initials={name.slice(0, 2).toUpperCase() || '·'}
                        tone={toneFromString(name) as any}
                        size='sm'
                      />
                      <span className='truncate text-[13px] font-bold text-slate-900'>
                        {name}
                      </span>
                      <span className='font-mono text-[10px] font-semibold text-slate-400'>
                        #{String(lead.id).padStart(5, '0')}
                      </span>
                    </div>
                    <span className='truncate text-[11px] text-slate-500'>
                      {lead.service || '—'} ·{' '}
                      {dayjs(lead.updated_at ?? lead.created_at).fromNow()}
                    </span>
                  </div>
                  <StatusPill variant={variantFromStatus(lead.status) as any} />
                </button>
              </li>
            );
          })}
        </ul>
      </ActivityPanel>
    </div>
  );
};

export default DashboardLawyers;
