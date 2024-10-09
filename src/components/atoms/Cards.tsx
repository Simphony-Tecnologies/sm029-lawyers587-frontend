import { typeStatistis } from '@/types/typeStatistis.type';
import { formatLastUpdate } from '@/utils/typeDate';
import Image from 'next/image';
import React from 'react';

const Cards = ({ title, value, date, icon, color, onClick }: typeStatistis) => {
  return (
    <div>
      <div
        onClick={onClick}
        className='grid grid-cols-3 bg-white w-full border-t border-main-color-50 rounded-xl shadow-md shadow-main-color-100 transition-all  lg:p-10 p-5 hover:scale-105 hover:cursor-pointer flex-wrap lg:min-h-56'
      >
        <div className='flex flex-col col-span-2'>
          <h1 className='lg:text-3xl text-2xl text-primary text-opacity-70 font-semibold'>
            {title}
          </h1>
          <p
            className={`${
              title === 'Avalible Leads' ? 'lg:text-5xl' : 'lg:text-6xl'
            }  text-5xl font-bold`}
            style={{ color: `${color}` }}
          >
            {value}
          </p>
          <p className='text-primary text-opacity-70 font-normal lg:text-lg text-xl '>
            {formatLastUpdate(date)}
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
