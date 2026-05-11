'use client';
import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  KpiCard,
  PageHead,
  PeriodSelect,
  type KpiTone,
} from '@/components/ui';

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
        empty
      />
    </div>
  );
};

export default Dashboard;
