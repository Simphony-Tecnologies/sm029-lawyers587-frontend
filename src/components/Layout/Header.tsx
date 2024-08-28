'use client';
import { useAuth } from '@/store/useAuth.store';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import {
  MdNotifications,
  MdHelp,
  MdMailOutline,
  MdOutlineLocalPhone,
} from 'react-icons/md';
import SkeletonText from '../atoms/SkeletonText';
import FAQAccordion from './FAQAccordion';
import { database } from '@/services/database';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/formatDate';
import Button from '../atoms/Button';
import { useRouter } from 'next/navigation';
import Modal from '../organisms/Modal';

const Header = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [dataNotification, setdataNotification] = useState<[] | null>(null);
  const [count, setCount] = useState(0);
  const [locasUser, setLocasUser] = useState<any>(null);
  const [isOpenSignOut, setIsOpenSignOut] = useState(false);
  const isUser = Object.keys(user).length > 0;

  const getNotifications = async () => {
    if (Object.keys(user).length > 0) {
      // if (user.role.name === 'admin') {
      //   const resData = await database.fetchData(
      //     `${process.env.NEXT_PUBLIC_URL_NOTIFICATIONS}`
      //   );
      //   if (!resData.success) {
      //     toast.error('Error getting notifications');
      //   }
      //   const countFalse = resData.data.filter(
      //     (item: any) => item.is_active === false
      //   );
      //   setdataNotification(countFalse);
      //   setCount(countFalse.length);
      // }

      const resData = await database.fetchData(
        `${process.env.NEXT_PUBLIC_URL_NOTIFICATIONS}/lawyer/${user.id}`
      );
      if (!resData.success) {
        toast.error('Error getting notifications');
      }
      const dataLawyerUser = await database.getLawyer(user.id);
      setLocasUser(dataLawyerUser.data.data);

      const countFalse = resData.data.filter(
        (item: any) => item.is_active === false
      );
      setdataNotification(countFalse);
      setCount(countFalse.length);
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
  const signOut = () => {
    database.signout();
    router.push('/');
    location.reload();
  };

  useEffect(() => {
    getNotifications();
  }, [user]);

  return (
    <header className='hidden bg-white p-4 lg:flex justify-end items-center text-center space-x-4 shadow '>
      <Modal
        title='Sign Out'
        isOpen={isOpenSignOut}
        setIsOpen={setIsOpenSignOut}
        className='max-w-sm'
      >
        <div className='flex flex-col gap-4'>
          <div className='flex justify-center text-center'>
            <p>Are you sure you want to sign out?</p>
          </div>

          <div className='flex justify-around'>
            <Button
              name='Cancel'
              type='button'
              onClick={() => setIsOpenSignOut(false)}
            />
            <Button
              name='Sign Out'
              type='button'
              color='bg-red-500'
              onClick={signOut}
            />
          </div>
        </div>
      </Modal>
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
              <div>There are not notifications yet</div>
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
            {locasUser && locasUser.profile_image_url ? (
              <img
                src={locasUser?.profile_image_url || ''}
                alt='profie image'
                width={40}
                height={40}
              />
            ) : (
              <div className='w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white cursor-pointer'></div>
            )}

            <div className='text-gray-800 '>
              <div className='font-semibold'>
                {!locasUser ? (
                  <div className='w-full'>
                    <SkeletonText />
                  </div>
                ) : (
                  locasUser?.firstName
                )}
              </div>
              <div className='text-sm text-gray-500 capitalize'>
                {!locasUser ? <SkeletonText /> : locasUser?.role?.name}
              </div>
            </div>
          </div>
        </MenuButton>
        <MenuItems
          transition
          anchor='bottom end'
          className='flex flex-col bg-white w-52 origin-top-right rounded-xl border shadow-sm p-4 text-sm/6  transition duration-100 ease-out [--anchor-gap:var(--spacing-1)] focus:outline-none data-[closed]:scale-95 justify-center text-center items-center '
        >
          {locasUser && locasUser.profile_image_url ? (
            <img
              src={locasUser?.profile_image_url || ''}
              alt='profie image'
              width={40}
              height={40}
            />
          ) : (
            <div className='w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white cursor-pointer'></div>
          )}

          {!!isUser ? (
            <>
              <div className='font-bold text-lg'>{locasUser?.firstName}</div>
              <div className='text-lg'>{locasUser?.role?.name}</div>
            </>
          ) : (
            <div className='w-full'>
              <SkeletonText lines={2} />
            </div>
          )}

          <MenuItem>
            <div className=' w-full text-sm text-start justify-start flex items-center gap-2'>
              <MdMailOutline />
              {locasUser?.email}
            </div>
          </MenuItem>
          <MenuItem>
            <div className=' w-full text-sm text-start justify-start flex items-center gap-2'>
              <MdOutlineLocalPhone />
              {locasUser?.phone}
            </div>
          </MenuItem>
          <Button
            name='Sign Out'
            type='button'
            color='w-full bg-primary mt-2'
            onClick={() => setIsOpenSignOut(true)}
          />
        </MenuItems>
      </Menu>
    </header>
  );
};

export default Header;
