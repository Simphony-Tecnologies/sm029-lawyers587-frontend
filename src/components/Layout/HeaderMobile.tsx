'use client';
import Image from 'next/image';
import Logo from '@/assets/Logo.svg';
import { MdNotifications, MdOutlineMenu } from 'react-icons/md';
import { useMobileStatus } from '@/store/useMobileStatus.store';
import SkeletonText from '../atoms/SkeletonText';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { database } from '@/services/database';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useAuth } from '@/store/useAuth.store';
import { formatDate } from '@/utils/formatDate';
import { useRouter } from 'next/navigation';
function HeaderMobile() {
  const { setStatusMobile, setToggleStatus } = useMobileStatus();
  const [dataNotification, setdataNotification] = useState<[] | null>(null);
  const [count, setCount] = useState(0);
  const [locasUser, setLocasUser] = useState<any>(null);
  const { user } = useAuth();
  const isUser = Object.keys(user).length > 0;
  const router = useRouter();
  const getNotifications = async () => {
    if (Object.keys(user).length > 0) {
      // if (user.role.name === 'admin') {
      //   const resData = await database.fetchData(
      //     `${process.env.NEXT_PUBLIC_URL}/notifications`
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
        `${process.env.NEXT_PUBLIC_URL}/notifications/lawyer/${user.id}`
      );
      if (!resData.success) {
        toast.error('Error getting notifications');
      }
      const dataLawyerUser = await database.getLawyer(user.id);
      setLocasUser(dataLawyerUser.data.data);

      const countFalse = resData.data
        .filter((item: any) => item.is_active === false)
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
      `${process.env.NEXT_PUBLIC_URL}/notifications/${id}`,
      updateData
    );

    getNotifications();
    router.push(
      user.role.name === 'admin' ? '/lead-management' : '/select-lead'
    );
  };
  const toggleSidebarMobile = () => {
    setStatusMobile('fixed right-0 grid');
    setToggleStatus(true);
  };
  useEffect(() => {
    getNotifications();
  }, [user]);

  return (
    <header className='lg:hidden bg-white p-4 items-center space-x-4 shadow flex justify-between z-0 '>
      <Image
        priority
        src={Logo}
        alt='Logo'
        className={`w-auto max-h-10 duration-500 `}
      />
      <div className='flex gap-4'>
        <Menu>
          <MenuButton>
            <div className=' flex items-center text-center justify-center '>
              <MdNotifications
                size={24}
                className='text-gray-500 cursor-pointer hover:text-primary'
              />
              {count > 0 && (
                <span className='  inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-secondary rounded-full'>
                  {count}
                </span>
              )}
            </div>
          </MenuButton>
          <MenuItems
            transition
            anchor='bottom end'
            className='flex flex-col bg-white w-72 rounded-xl border border-gray-200 shadow-lg transition duration-200 items-start divide-y py-2'
          >
            {dataNotification ? (
              dataNotification.length > 0 ? (
                dataNotification.map((res: any) => (
                  <div
                    onClick={() => handleTrueNotification(res.id)}
                    key={res.id}
                    className='w-full px-4 py-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors duration-200 flex flex-col gap-1'
                  >
                    <div className='flex items-center justify-between'>
                      <p className='text-xs text-gray-500'>
                        {formatDate(res.created_at)}
                      </p>
                      {!res.seen && (
                        <span className='h-2 w-2 bg-blue-500 rounded-full'></span>
                      )}
                    </div>
                    <p className='text-sm font-medium text-gray-800'>
                      {res.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className='w-full text-center text-gray-500 py-4'>
                  No notifications yet
                </div>
              )
            ) : (
              <div className='w-full p-4'>
                <SkeletonText lines={3} />
              </div>
            )}
          </MenuItems>
        </Menu>
        <MdOutlineMenu
          size={24}
          onClick={toggleSidebarMobile}
          className={`  text-xl text-secondary cursor-pointer duration-300 `}
        />
      </div>
    </header>
  );
}

export default HeaderMobile;
