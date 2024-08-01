'use client';
import Cards from '@/components/atoms/Cards';
import Tilte from '@/components/organisms/Tilte';
import { statistics } from '@/configs/statistics.confing';
import { useLeadsStore } from '@/store/useLead.store';
import React, { useEffect } from 'react';

const Dashboard = () => {
  const { dataLeads }: any = useLeadsStore();
  const getLastElement = (arr: any) => arr[arr.length - 1];
  const setData = [
    { value: 'NEW', index: 0 },
    { value: 'ASSIGNED', index: 1 },
    { value: 'REASSIGNED', index: 2 },
    { value: 'EXPIRED', index: 3 },
  ];

  const filterLeads = (value: string, index: number) => {
    if (dataLeads) {
      const leads = dataLeads.filter((res: any) => res.status === value);
      if (leads) {
        const lastNewLead = getLastElement(leads);
        statistics[index].value = leads.length;
        statistics[index].date = lastNewLead?.date;
      }
    }
  };

  useEffect(() => {
    if (dataLeads) {
      setData.forEach((res) => filterLeads(res.value, res.index));
    }
  }, [dataLeads]);

  return (
    <div className='flex flex-col gap-5'>
      <Tilte name='Dashboard' />
      <div className='grid lg:grid-cols-2 lg:gap-10 gap-5'>
        {statistics.map((statistic: any, index: any) => (
          <Cards
            key={index}
            title={statistic?.title}
            value={statistic?.value}
            date={statistic?.date}
            color={statistic?.color}
            icon={statistic?.icon}
          />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
