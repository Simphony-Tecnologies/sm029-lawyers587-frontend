'use client';
import Cards from '@/components/atoms/Cards';
import Tilte from '@/components/organisms/Tilte';
import { statistics } from '@/configs/statistics.confing';
import { useLeadsStore } from '@/store/useLead.store';
import React from 'react';

const Dashboard = () => {
  const { dataLeads }: any = useLeadsStore();
  const getLastElement = (arr: any) => arr[arr.length - 1];
  const lastElement = getLastElement(dataLeads);

  if (lastElement) {
    statistics[0].value = dataLeads.length;
    statistics[0].date = lastElement.date;
  }

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
