import React from 'react';
import { MdNotifications, MdHelp } from 'react-icons/md';
type typeHeader = {
  name?: string;
  type?: string;
};
const Header = ({ name, type }: typeHeader) => {
  return (
    <header className='bg-white p-4 flex justify-end items-center space-x-4 shadow'>
      <MdHelp size={24} className='text-gray-500 cursor-pointer' />
      <MdNotifications size={24} className='text-gray-500 cursor-pointer' />
      <div className='flex items-center space-x-4'>
        <div className='w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white cursor-pointer'></div>
        <div className='text-gray-800'>
          <div className='font-semibold'>{name ? name : 'name'}</div>
          <div className='text-sm text-gray-500'>{type ? type : 'Admin'}</div>
        </div>
      </div>
    </header>
  );
};

export default Header;
