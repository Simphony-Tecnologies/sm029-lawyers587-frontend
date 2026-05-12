'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  MenuButton,
  MenuItem as HuiMenuItem,
  MenuItems,
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import { MdLogout, MdHelpOutline, MdChevronRight } from 'react-icons/md';
import toast from 'react-hot-toast';
import { useAuth } from '@/store/useAuth.store';
import { database } from '@/services/database';
import { formatDate } from '@/utils/formatDate';
import { cn } from '@/lib/cn';
import {
  FaqDialog,
  MenuDivider,
  MenuIdentity,
  MenuItem,
  MenuPanel,
  PillBell,
  PillDivider,
  PillHeader,
  PillProfile,
} from '@/components/ui';
import SkeletonText from '../atoms/SkeletonText';
import Modal from '../organisms/Modal';
import Button from '../atoms/Button';

const buildInitials = (firstName?: string, lastName?: string) => {
  const f = (firstName ?? '').trim().charAt(0);
  const l = (lastName ?? '').trim().charAt(0);
  return (f + l || '·').toUpperCase();
};

const Header = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [dataNotification, setdataNotification] = useState<[] | null>(null);
  const [count, setCount] = useState(0);
  const [locasUser, setLocasUser] = useState<any>(null);
  const [isOpenSignOut, setIsOpenSignOut] = useState(false);
  const [isOpenFaq, setIsOpenFaq] = useState(false);

  const getNotifications = async () => {
    if (Object.keys(user).length > 0) {
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
    const updateData = { is_active: true };
    await database.updateData(
      `${process.env.NEXT_PUBLIC_URL}/notifications/${id}`,
      updateData
    );
    getNotifications();
    router.push(
      user.role.name === 'admin' ? '/lead-management' : '/select-lead'
    );
  };

  const markAllAsRead = async () => {
    if (!dataNotification || dataNotification.length === 0) return;
    const targets = dataNotification as any[];
    setCount(0);
    await Promise.all(
      targets.map((n) =>
        database.updateData(
          `${process.env.NEXT_PUBLIC_URL}/notifications/${n.id}`,
          { is_active: true }
        )
      )
    );
  };

  const handleBellClick = () => {
    if (count > 0) markAllAsRead();
  };

  const signOut = () => {
    database.signout();
    router.push('/');
    location.reload();
  };

  useEffect(() => {
    getNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const displayName = locasUser?.firstName
    ? `${locasUser.firstName} ${locasUser.lastName ?? ''}`.trim()
    : 'User';
  const displayRole = locasUser?.role?.name ?? '—';
  const displayEmail = locasUser?.email ?? '';
  const displayAvatar = locasUser?.profile_image_url ?? null;
  const initials = buildInitials(locasUser?.firstName, locasUser?.lastName);

  return (
    <header className='hidden bg-transparent px-6 py-4 lg:flex justify-end'>
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

      <PillHeader>
        <Popover className='relative'>
          <PopoverButton
            as={PillBell}
            hasNotifications={count > 0}
            onClick={handleBellClick}
          />
          <PopoverPanel
            anchor={{ to: 'bottom end', gap: 10 }}
            transition
            className={cn(
              'z-[80] origin-top-right transition duration-150 ease-out',
              'data-[closed]:scale-95 data-[closed]:opacity-0',
              'focus:outline-none'
            )}
          >
            <MenuPanel width='lg' className='max-h-[420px] overflow-y-auto p-1.5'>
              <div className='flex items-center justify-between px-2 pb-2 pt-1'>
                <span className='text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400'>
                  Notifications
                </span>
                {count > 0 ? (
                  <span className='inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-full bg-red-50 px-1.5 text-[10px] font-bold text-customRed'>
                    {count}
                  </span>
                ) : null}
              </div>

              {dataNotification ? (
                dataNotification.length > 0 ? (
                  <div className='flex flex-col gap-px'>
                    {dataNotification.map((res: any) => (
                      <button
                        key={res.id}
                        type='button'
                        onClick={() => handleTrueNotification(res.id)}
                        className='flex w-full flex-col gap-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-50'
                      >
                        <div className='flex items-center justify-between'>
                          <span className='text-[10px] font-medium text-slate-400'>
                            {formatDate(res.created_at)}
                          </span>
                          {!res.seen ? (
                            <span
                              aria-hidden
                              className='h-1.5 w-1.5 rounded-full bg-customRed'
                            />
                          ) : null}
                        </div>
                        <p
                          title={res.text}
                          className='truncate text-[13px] font-medium text-slate-800'
                        >
                          {res.text}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center gap-1 py-6 text-center'>
                    <span className='text-[13px] font-semibold text-slate-700'>
                      You&apos;re all caught up
                    </span>
                    <span className='text-[11px] font-medium text-slate-400'>
                      No notifications yet
                    </span>
                  </div>
                )
              ) : (
                <div className='px-2 py-3'>
                  <SkeletonText lines={3} />
                </div>
              )}
            </MenuPanel>
          </PopoverPanel>
        </Popover>

        <PillDivider />

        <Menu>
          {({ open }) => (
            <>
              <MenuButton
                as={PillProfile}
                name={displayName}
                role={displayRole}
                initials={initials}
                avatarSrc={displayAvatar}
                online
                data-open={open ? 'true' : undefined}
              />
              <MenuItems
                anchor={{ to: 'bottom end', gap: 10 }}
                transition
                className={cn(
                  'z-[80] origin-top-right transition duration-150 ease-out',
                  'data-[closed]:scale-95 data-[closed]:opacity-0',
                  'focus:outline-none'
                )}
              >
                <MenuPanel width='md'>
                  <MenuIdentity
                    name={displayName}
                    email={displayEmail}
                    initials={initials}
                    avatarSrc={displayAvatar}
                  />
                  <HuiMenuItem>
                    {({ active }) => (
                      <MenuItem
                        icon={<MdHelpOutline size={14} />}
                        meta={<MdChevronRight size={12} />}
                        active={active}
                        onClick={() => setIsOpenFaq(true)}
                      >
                        Help &amp; FAQs
                      </MenuItem>
                    )}
                  </HuiMenuItem>
                  <MenuDivider />
                  <HuiMenuItem>
                    {({ active }) => (
                      <MenuItem
                        variant='destructive'
                        icon={<MdLogout size={14} />}
                        active={active}
                        onClick={() => setIsOpenSignOut(true)}
                      >
                        Sign out
                      </MenuItem>
                    )}
                  </HuiMenuItem>
                </MenuPanel>
              </MenuItems>
            </>
          )}
        </Menu>
      </PillHeader>
      <FaqDialog open={isOpenFaq} onClose={() => setIsOpenFaq(false)} />
    </header>
  );
};

export default Header;
