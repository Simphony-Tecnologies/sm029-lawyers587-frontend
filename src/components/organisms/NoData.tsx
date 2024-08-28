import React from 'react';
import { MdOutlineCases } from 'react-icons/md';

const NoData = ({ children, text }: any) => {
  return (
    <div>
      <div className='min-h-[70vh] items-center flex flex-col justify-center text-center '>
        {children}

        <p className='text-lg text-primary'>{text}</p>
      </div>
    </div>
  );
};

export default NoData;
