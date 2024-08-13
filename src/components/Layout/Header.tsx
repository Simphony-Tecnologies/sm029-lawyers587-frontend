'use client';
import { useAuth } from '@/store/useAuth.store';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { MdNotifications, MdHelp } from 'react-icons/md';
import SkeletonText from '../atoms/SkeletonText';
import FAQAccordion from './FAQAccordion';
import { database } from '@/services/database';
import toast from 'react-hot-toast';
import { formatLastUpdate } from '@/utils/typeDate';
import { formatDate } from '@/utils/formatDate';

const Header = () => {
  const { user } = useAuth();

  const [dataNotification, setdataNotification] = useState<[] | null>(null);
  const [count, setCount] = useState(0);
  const isUser = Object.keys(user).length > 0;

  const getNotifications = async () => {
    if (Object.keys(user).length > 0) {
      if (user.role.name === 'admin') {
        const resData = await database.fetchData(
          `${process.env.NEXT_PUBLIC_URL_NOTIFICATIONS}`
        );
        if (!resData.success) {
          toast.error('Error getting notifications');
        }
        const countFalse = resData.data.filter(
          (item: any) => item.is_active === false
        );
        setdataNotification(countFalse);
        setCount(countFalse.length);
      }
      if (user.role.name === 'lawyer') {
        const resData = await database.fetchData(
          `${process.env.NEXT_PUBLIC_URL_NOTIFICATIONS}/lawyer/${user.id}`
        );
        if (!resData.success) {
          toast.error('Error getting notifications');
        }
        const countFalse = resData.data.filter(
          (item: any) => item.is_active === false
        );
        setdataNotification(countFalse);
        setCount(countFalse.length);
      }
    }
  };
  const handleTrueNotification = async (id: number) => {
    const updateData = {
      is_active: true,
    };
    await database.updateData(
      `${process.env.NEXT_PUBLIC_URL_NOTIFICATIONS}/${id}`,
      updateData
    );

    getNotifications();
  };
  useEffect(() => {
    getNotifications();
  }, []);

  return (
    <header className='hidden bg-white p-4 lg:flex justify-end items-center text-center space-x-4 shadow '>
      <Menu>
        <MenuButton>
          <MdHelp
            size={24}
            className='text-gray-500 cursor-pointer hover:text-primary'
          />
        </MenuButton>
        <MenuItems
          transition
          anchor='bottom end'
          className='flex flex-col bg-white w-60 origin-top-right rounded-xl border shadow-sm p-4 text-sm/6  transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 justify-center text-center items-center '
        >
          <MenuItem>
            <FAQAccordion />
          </MenuItem>
        </MenuItems>
      </Menu>
      <Menu>
        <MenuButton>
          <div className='relative  items-center text-center justify-center'>
            <MdNotifications
              size={24}
              className='text-gray-500 cursor-pointer hover:text-primary'
            />
            {count > 0 && (
              <span className='absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-secondary rounded-full'>
                {count}
              </span>
            )}
          </div>
        </MenuButton>
        <MenuItems
          transition
          anchor='bottom end'
          className='flex flex-col bg-white w-72  rounded-xl border shadow-sm   transition duration-100 items-center divide-y py-2'
        >
          {dataNotification ? (
            dataNotification.length > 0 ? (
              dataNotification.map((res: any) => (
                <div
                  onClick={() => handleTrueNotification(res.id)}
                  key={res.id}
                  className='hover:bg-gray-200 px-2 rounded-md cursor-pointer '
                >
                  <p className='text-sm'>{formatDate(res.created_at)}</p>
                  <p className='text-primary'>{res.text}</p>
                </div>
              ))
            ) : (
              <div>There are not notification yet</div>
            )
          ) : (
            <div className='w-full p-2'>
              <SkeletonText lines={3} />
            </div>
          )}
        </MenuItems>
      </Menu>
      <Menu>
        <MenuButton>
          <div className='flex items-center space-x-4  '>
            <div className='w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white cursor-pointer'></div>
            <div className='text-gray-800 '>
              <div className='font-semibold'>
                {!isUser ? <SkeletonText /> : user.firstName}
              </div>
              <div className='text-sm text-gray-500 capitalize'>
                {!isUser ? <SkeletonText /> : user?.role?.name}
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

          {!!isUser ? (
            <>
              <div className='font-bold text-lg'>{user?.firstName}</div>
              <div className='text-lg'>{user?.role?.name}</div>
            </>
          ) : (
            <div className='w-full'>
              <SkeletonText lines={2} />
            </div>
          )}

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
