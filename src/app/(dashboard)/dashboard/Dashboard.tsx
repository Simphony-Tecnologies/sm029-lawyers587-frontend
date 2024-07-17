import Cards from '@/components/atoms/Cards';
import Tilte from '@/components/organisms/Tilte';
import { statistics } from '@/configs/statistics.confing';
import React from 'react';

const Dashboard = () => {
  return (
    <div className='flex flex-col'>
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
