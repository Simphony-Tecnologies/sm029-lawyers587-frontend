'use client';
import { useAuth } from '@/store/useAuth.store';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import Image from 'next/image';
import React from 'react';
import { MdNotifications, MdHelp } from 'react-icons/md';
type typeHeader = {
  name?: string;
  type?: string;
};
const Header = ({ name, type }: typeHeader) => {
  const { user } = useAuth();
  return (
    <header className='hidden bg-white p-4 lg:flex justify-end items-center space-x-4 shadow '>
      <MdHelp size={24} className='text-gray-500 cursor-pointer' />
      <MdNotifications size={24} className='text-gray-500 cursor-pointer' />
      {/* <div className='flex items-center space-x-4'>
        <div className='w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white cursor-pointer'></div>
        <div className='text-gray-800'>
          <div className='font-semibold'>{user?.firstName}</div>
          <div className='text-sm text-gray-500 capitalize'>
            {user?.role?.name}
          </div>
        </div>
      </div> */}

      <Menu>
        <MenuButton>
          <div className='flex items-center space-x-4  '>
            <div className='w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white cursor-pointer'></div>
            <div className='text-gray-800'>
              <div className='font-semibold'>{user?.firstName}</div>
              <div className='text-sm text-gray-500 capitalize'>
                {user?.role?.name}
              </div>
            </div>
          </div>
        </MenuButton>
        <MenuItems
          transition
          anchor='bottom end'
          className='flex flex-col bg-white w-52 origin-top-right rounded-xl border shadow-sm p-4 text-sm/6  transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 justify-center text-center items-center '
        >
          <div className='w-10 h-10 rounded-full bg-primary text-white cursor-pointer'></div>

          <div className='font-bold text-lg'>{user?.firstName}</div>
          <div className='text-lg'>{user?.role?.name}</div>

          <MenuItem>
            <div className='text-sm text-start'>{user?.email}</div>
          </MenuItem>
          <MenuItem>
            <div className='text-sm text-start'>{user?.phone}</div>
          </MenuItem>
        </MenuItems>
      </Menu>
    </header>
  );
};

export default Header;
