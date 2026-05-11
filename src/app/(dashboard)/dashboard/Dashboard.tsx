'use client';
import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  MdAddCircleOutline,
  MdCheckCircleOutline,
  MdHighlightOff,
  MdInfoOutline,
} from 'react-icons/md';
import { useLeadsStore } from '@/store/useLead.store';
import { useSelectStatus } from '@/store/useSelectStatus';
import {
  ActivityPanel,
  Avatar,
  KpiCard,
  PageHead,
  PeriodSelect,
  StatusPill,
  toneFromString,
  variantFromStatus,
  type KpiTone,
} from '@/components/ui';

dayjs.extend(relativeTime);

type LeadStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN PROGRESS'
  | 'PROBLEMATIC'
  | 'LOST'
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
    key: 'assigned',
    label: 'Assigned Leads',
    period: 'Active',
    tone: 'emerald',
    icon: <MdCheckCircleOutline size={16} />,
    statuses: ['ASSIGNED', 'IN PROGRESS'],
  },
  {
    key: 'review',
    label: 'Leads for Review',
    period: 'Pending',
    tone: 'amber',
    icon: <MdInfoOutline size={16} />,
    statuses: ['PROBLEMATIC'],
  },
  {
    key: 'dead',
    label: 'Dead Leads',
    period: 'Total',
    tone: 'coral',
    icon: <MdHighlightOff size={16} />,
    statuses: ['LOST', 'EXPIRED', 'DISABLED'],
  },
];

const Dashboard = () => {
  const { dataLeads, fetchLeads } = useLeadsStore();
  const { setSelecArray } = useSelectStatus();
  const router = useRouter();
  const pathname = usePathname();

  const counts = useMemo(() => {
    if (!dataLeads) return KPI_DEFS.map(() => 0);
    return KPI_DEFS.map(({ statuses }) =>
      (dataLeads as any[]).filter((lead: any) =>
        statuses.includes(lead.status)
      ).length
    );
  }, [dataLeads]);

  const handleClickKpi = (statuses: LeadStatus[]) => {
    setSelecArray(statuses);
    router.push('/lead-management');
  };

  // Síntesis client-side de actividad reciente: backend aún no expone
  // /audit/recent global. Tomamos los N leads con date_updated más reciente
  // como proxy de "Recent activity". Cuando exista el endpoint, reemplazar.
  const recentActivity = useMemo(() => {
    if (!Array.isArray(dataLeads) || dataLeads.length === 0) return [];
    return [...(dataLeads as any[])]
      .filter((l) => l?.date_updated || l?.date)
      .sort(
        (a, b) =>
          +new Date(b.date_updated ?? b.date) -
          +new Date(a.date_updated ?? a.date)
      )
      .slice(0, 8);
  }, [dataLeads]);

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
        action={<PeriodSelect label='This week' />}
      />

      <div className='grid gap-3.5 md:grid-cols-2'>
        {KPI_DEFS.map((kpi, idx) => (
          <KpiCard
            key={kpi.key}
            label={kpi.label}
            period={kpi.period}
            value={counts[idx]}
            tone={kpi.tone}
            icon={kpi.icon}
            onClick={() => handleClickKpi(kpi.statuses)}
          />
        ))}
      </div>

      <ActivityPanel
        eyebrow='Audit log'
        title='Recent activity'
        empty={recentActivity.length === 0}
        emptyText='No recent leads yet'
        onViewAll={
          recentActivity.length > 0 ? handleActivityClick : undefined
        }
      >
        <ul className='flex flex-col divide-y divide-slate-100'>
          {recentActivity.map((lead: any) => {
            const name = lead['lead name'] || '—';
            const idLabel = `#${String(lead['lead id'] ?? '').padStart(5, '0')}`;
            const ts = lead.date_updated ?? lead.date;
            return (
              <li key={lead['lead id']}>
                <button
                  type='button'
                  onClick={handleActivityClick}
                  className='flex w-full items-center gap-3 bg-transparent py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none'
                >
                  <Avatar
                    initials={name.slice(0, 2).toUpperCase() || '·'}
                    tone={toneFromString(name) as any}
                    size='sm'
                  />
                  <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                    <div className='flex items-center gap-2'>
                      <span className='truncate text-[13px] font-bold text-slate-900'>
                        {name}
                      </span>
                      <span className='font-mono text-[10px] font-semibold text-slate-400'>
                        {idLabel}
                      </span>
                    </div>
                    <span className='truncate text-[11px] text-slate-500'>
                      {lead.lawyer && lead.lawyer !== 'No assigned'
                        ? `${lead.lawyer} · ${lead.service || '—'}`
                        : `Unassigned · ${lead.service || '—'}`}
                    </span>
                  </div>
                  <div className='flex flex-col items-end gap-1'>
                    <StatusPill variant={variantFromStatus(lead.status) as any} />
                    <span className='text-[10px] font-medium text-slate-400'>
                      {ts ? dayjs(ts).fromNow() : '—'}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </ActivityPanel>
    </div>
  );
};

export default Dashboard;
