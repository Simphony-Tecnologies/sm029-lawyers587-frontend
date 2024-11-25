'use client';
import Cards from '@/components/atoms/Cards';
import Tilte from '@/components/organisms/Tilte';
import { statistics as initialStatistics } from '@/configs/statistics.confing';
import { useLeadsStore } from '@/store/useLead.store';
import { useSelectStatus } from '@/store/useSelectStatus';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const Dashboard = () => {
  const { dataLeads, fetchLeads } = useLeadsStore();
  const [statistics, setStatistics] = useState(initialStatistics);
  const { setSelecArray } = useSelectStatus();
  const router = useRouter();
  const pathname = usePathname();
  const getLastElement = (arr: any) => arr[0];
  const setData = [
    { value: 'NEW', index: 0 },
    { value: 'ASSIGNED', index: 1 },
    { value: 'IN PROGRESS', index: 2 },
    { value: 'PROBLEMATIC', index: 3 },
    { value: 'LOST', index: 4 },
    { value: 'CLOSED', index: 5 },
    { value: 'EXPIRED', index: 6 },
    { value: 'DISABLED', index: 7 },
  ];

  const filterLeads = (value: string, index: number) => {
    if (dataLeads) {
      const leads = dataLeads.filter((res: any) => res.status === value);
      const lastNewLead = getLastElement(leads);

      if (leads.length > 0) {
        setStatistics((prevStatistics) => {
          const updatedStatistics = [...prevStatistics];
          updatedStatistics[index] = {
            ...initialStatistics[index],
            value: (updatedStatistics[index]?.value || 0) + leads.length,
            date:
              lastNewLead.status === 'NEW'
                ? lastNewLead.date
                : lastNewLead.date_updated,
          };

          return updatedStatistics;
        });
      }
    }
  };
  const handleClickCard = (index: any) => {
    const valuesCards = setData.filter((item: any) => item.index === index);
    setSelecArray(valuesCards.map((res: any) => res.value));

    router.push('/lead-management');
  };
  useEffect(() => {
    setStatistics(initialStatistics);
    if (dataLeads) setData.forEach((res) => filterLeads(res.value, res.index));
  }, [dataLeads]);
  useEffect(() => {
    fetchLeads();
  }, []);
  useEffect(() => {
    fetchLeads();
  }, [pathname]);

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

export default Dashboard;
