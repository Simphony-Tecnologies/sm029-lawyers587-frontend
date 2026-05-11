'use client';
import Cards from '@/components/atoms/Cards';
import Tilte from '@/components/organisms/Tilte';
import { statistics as initialStatistics } from '@/configs/statisticsLawyers.confing';
import { api, database } from '@/services/database';
import type { LeadDTO, LeadStatus } from '@/types/api.types';
import { useAuth } from '@/store/useAuth.store';
import useLoadingStore from '@/store/useLoadingStore';
import { useSelectStatus } from '@/store/useSelectStatus';
import { getNameServiceLawyer } from '@/utils/getNameServiceLawyer';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type KpiSlot = { value: LeadStatus; index: number };

const KPI_SLOTS: KpiSlot[] = [
  { value: 'ASSIGNED', index: 1 },
  { value: 'IN PROGRESS', index: 2 },
  { value: 'PROBLEMATIC', index: 3 },
  { value: 'CLOSED', index: 4 },
  { value: 'EXPIRED', index: 5 },
];

const DashboardLawyers = () => {
  const [statistics, setStatistics] = useState(initialStatistics);
  const [leads, setLeads] = useState<LeadDTO[]>([]);
  const [dataServiceType, setDataServiceType] = useState<any[]>([]);
  const [maxLeadsAssigned, setMaxLeadsAssigned] = useState<any>(null);
  const [userId, setUserId] = useState<any>(null);
  const { setSelecArray } = useSelectStatus();
  const { setLoading } = useLoadingStore();
  const { user } = useAuth();
  const router = useRouter();

  const availableLeads = maxLeadsAssigned
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
    if (!resType.success) {
      toast.error('Could not load service types');
      return;
    }
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

  useEffect(() => {
    // KPIs derived from the assigned leads list.
    const next = [...initialStatistics];
    next[0] = {
      ...initialStatistics[0],
      value: `${leads.length} of ${availableLeads}` as any,
    };
    KPI_SLOTS.forEach(({ value, index }) => {
      const matches = leads.filter((l) => l.status === value);
      if (matches.length === 0) return;
      const latest = matches.reduce((acc, cur) => {
        const accTs = new Date(acc.updated_at ?? acc.created_at).getTime();
        const curTs = new Date(cur.updated_at ?? cur.created_at).getTime();
        return curTs > accTs ? cur : acc;
      });
      next[index] = {
        ...initialStatistics[index],
        value: matches.length as any,
        date: new Date(latest.updated_at ?? latest.created_at) as any,
      };
    });
    setStatistics(next);
  }, [leads, availableLeads]);

  const handleClickCard = (index: number) => {
    const match = KPI_SLOTS.find((it) => it.index === index);
    if (match) setSelecArray([match.value as any]);
    router.push('/all-leads');
  };

  return (
    <div className='flex flex-col gap-5'>
      <Tilte name='Dashboard' />
      <div className='grid lg:grid-cols-3 md:grid-cols-2 lg:gap-10 gap-5'>
        {statistics.map((statistic: any, index: any) => (
          <Cards
            key={index}
            title={statistic?.title}
            value={statistic?.value}
            date={statistic?.date}
            color={statistic?.color}
            icon={statistic?.icon}
            onClick={() => handleClickCard(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardLawyers;
