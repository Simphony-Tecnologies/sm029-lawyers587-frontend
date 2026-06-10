'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  MdAddCircleOutline,
  MdCheckCircleOutline,
  MdHighlightOff,
  MdInfoOutline,
  MdOutbox,
  MdSchedule,
  MdSwapHoriz,
  MdFlag,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import { api, database } from '@/services/database';
import type { LeadDTO, LeadStatus } from '@/types/api.types';
import { useAuth } from '@/store/useAuth.store';
import useLoadingStore from '@/store/useLoadingStore';
import { useSelectStatus } from '@/store/useSelectStatus';
import { getNameServiceLawyer } from '@/utils/getNameServiceLawyer';
import {
  ActivityPanel,
  Avatar,
  KpiCard,
  PageHead,
  PipelineChart,
  StatusPill,
  toneFromString,
  variantFromStatus,
  type KpiTone,
  type PipelineSegment,
} from '@/components/ui';

dayjs.extend(relativeTime);

type KpiDef = {
  key: string;
  label: string;
  sub: string;
  tone: KpiTone;
  icon: JSX.Element;
  statuses: LeadStatus[];
};

// Row 1: primary KPIs (2 cols) — Active + Retained
const KPI_ROW_1: KpiDef[] = [
  {
    key: 'active',
    label: 'Active Leads',
    sub: 'Active right now',
    tone: 'violet',
    icon: <MdOutbox size={14} />,
    statuses: ['ASSIGNED', 'IN PROGRESS'],
  },
  {
    key: 'retained',
    label: 'Retained',
    sub: 'Closed successfully',
    tone: 'emerald',
    icon: <MdCheckCircleOutline size={14} />,
    statuses: ['CLOSED'],
  },
];

// Row 2: secondary KPIs (alongside Pipeline Chart)
const KPI_ROW_2: KpiDef[] = [
  {
    key: 'waiting',
    label: 'Waiting on Client',
    sub: 'Pending response',
    tone: 'amber',
    icon: <MdSchedule size={14} />,
    statuses: ['WAITING_ON_CLIENT'],
  },
  {
    key: 'flagged',
    label: 'Flagged Leads',
    sub: 'Need attention',
    tone: 'coral',
    icon: <MdFlag size={14} />,
    statuses: ['PROBLEMATIC'],
  },
];

const ACTION_TONE_BY_STATUS: Record<string, { bg: string; fg: string; icon: JSX.Element }> = {
  NEW: { bg: 'bg-violet-100', fg: 'text-violet-600', icon: <MdAddCircleOutline size={14} /> },
  ASSIGNED: { bg: 'bg-violet-100', fg: 'text-violet-600', icon: <MdOutbox size={14} /> },
  'IN PROGRESS': { bg: 'bg-sky-100', fg: 'text-sky-700', icon: <MdSwapHoriz size={14} /> },
  PROBLEMATIC: { bg: 'bg-amber-100', fg: 'text-amber-700', icon: <MdInfoOutline size={14} /> },
  CLOSED: { bg: 'bg-emerald-100', fg: 'text-emerald-700', icon: <MdCheckCircleOutline size={14} /> },
  LOST: { bg: 'bg-rose-100', fg: 'text-rose-600', icon: <MdHighlightOff size={14} /> },
  EXPIRED: { bg: 'bg-rose-100', fg: 'text-rose-600', icon: <MdHighlightOff size={14} /> },
  WAITING_ON_CLIENT: { bg: 'bg-orange-100', fg: 'text-orange-700', icon: <MdSchedule size={14} /> },
};

const DashboardLawyers = () => {
  const [leads, setLeads] = useState<LeadDTO[]>([]);
  const [dataServiceType, setDataServiceType] = useState<any[]>([]);
  const [maxLeadsAssigned, setMaxLeadsAssigned] = useState<any>(null);
  const [userId, setUserId] = useState<any>(null);
  const { setSelecArray } = useSelectStatus();
  const { setLoading } = useLoadingStore();
  const { user } = useAuth();
  const router = useRouter();

  const capacityTotal = maxLeadsAssigned
    ? maxLeadsAssigned.reduce(
        (acc: number, curr: any) => acc + (curr.max_leads ?? 0),
        0
      )
    : 0;

  const fetchAssignedLeads = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [leadsRes, lawyerRes] = await Promise.all([
      api.leads.list({ assigned_to: Number(user.id), limit: 1000 }),
      database.getLawyer(user.id),
    ]);
    setLoading(false);
    if (!leadsRes.success || !leadsRes.data) {
      toast.error(leadsRes.message || 'Could not load assigned leads');
      setLeads([]);
      return;
    }
    setLeads(leadsRes.data.data);
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

  const ALL_KPIS = useMemo(() => [...KPI_ROW_1, ...KPI_ROW_2], []);

  // Conteos por KPI desde los leads asignados.
  const counts = useMemo(() => {
    return ALL_KPIS.map(({ statuses }) =>
      leads.filter((l) => (statuses as string[]).includes(l.status)).length
    );
  }, [leads, ALL_KPIS]);

  // Sparkline por KPI: bucket por día en los últimos 14 días.
  const sparks = useMemo(() => {
    const buckets = 14;
    const now = Date.now();
    const bucketSize = 86_400_000; // 1 día
    return ALL_KPIS.map(({ statuses }) => {
      const filtered = leads.filter((l) => (statuses as string[]).includes(l.status));
      const arr = new Array(buckets).fill(0);
      for (const lead of filtered) {
        const ts = new Date(lead.updated_at ?? lead.created_at).getTime();
        const offset = now - ts;
        const idx = buckets - 1 - Math.floor(offset / bucketSize);
        if (idx >= 0 && idx < buckets) arr[idx] += 1;
      }
      return arr;
    });
  }, [leads, ALL_KPIS]);

  const handleClickKpi = (statuses: LeadStatus[]) => {
    setSelecArray(statuses as any);
    router.push('/all-leads');
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
      value: leads.filter((l) => l.status === 'CLOSED').length,
      color: '#4AD991',
      dotClass: 'bg-emerald-400',
    },
  ], [leads]);

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
            ? `${leads.length} active of ${capacityTotal} capacity`
            : `${leads.length} active leads`
        }
      />

      {/* Row 1: Active + Retained (2 cols) */}
      <div className='grid gap-3.5 sm:grid-cols-2'>
        {KPI_ROW_1.map((kpi, idx) => (
          <KpiCard
            key={kpi.key}
            label={kpi.label}
            period={kpi.sub}
            value={counts[idx]}
            tone={kpi.tone}
            icon={kpi.icon}
            spark={sparks[idx]}
            onClick={() => handleClickKpi(kpi.statuses)}
          />
        ))}
      </div>

      {/* Row 2: Waiting + Flagged + Pipeline Chart (3 cols) */}
      <div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3'>
        {KPI_ROW_2.map((kpi) => {
          const i = ALL_KPIS.findIndex((k) => k.key === kpi.key);
          return (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              period={kpi.sub}
              value={counts[i]}
              tone={kpi.tone}
              icon={kpi.icon}
              spark={sparks[i]}
              onClick={() => handleClickKpi(kpi.statuses)}
            />
          );
        })}
        <PipelineChart segments={pipelineSegments} />
      </div>

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
