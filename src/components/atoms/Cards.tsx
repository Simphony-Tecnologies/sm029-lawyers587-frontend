import { typeStatistis } from '@/types/typeStatistis.type';
import Image from 'next/image';
import React from 'react';

const Cards = ({ title, value, date, icon, color }: typeStatistis) => {
  return (
    <div>
      <div className='grid grid-cols-3 bg-white w-full border-t border-main-color-50 rounded-xl shadow-md shadow-main-color-100 transition-all  lg:p-10 p-5  '>
        <div className='flex flex-col col-span-2'>
          <h1 className='lg:text-4xl text-2xl text-primary text-opacity-70 font-semibold'>
            {title}
          </h1>
          <p
            className='lg:text-7xl text-5xl font-bold'
            style={{ color: `${color}` }}
          >
            {value}
          </p>
          <p className='text-primary text-opacity-70 font-normal lg:text-2xl text-xl whitespace-nowrap'>
            {date}
          </p>
        </div>
        <div>
          <Image
            src={icon}
            alt='Logo'
            className='lg:w-auto max-w-50  mx-auto rounded-3xl'
            style={{ backgroundColor: `${color}50`, padding: 20 }}
          />
        </div>
      </div>
    </div>
  );
};

export default Cards;
