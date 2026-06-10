'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/assets/Logo.svg';
import { useAuth } from '@/store/useAuth.store';
import { useMobileStatus } from '@/store/useMobileStatus.store';
import { useSelectStatus } from '@/store/useSelectStatus';
import { api, database } from '@/services/database';
import { routesSidebar } from '@/routes/routes';
import type { dataItem, NavGroup, rol } from '@/types/routes.interface';
import { cn } from '@/lib/cn';
import {
  Brand,
  Divider,
  NavGroupLabel,
  NavItem,
  NavSubItem,
  Sidebar as SidebarShell,
  SidebarToggle,
  SignOutItem,
  UserCard,
} from '@/components/ui';
import Modal from '../organisms/Modal';
import Button from '../atoms/Button';

const GROUPS: NavGroup[] = ['Overview', 'Management'];

const buildInitials = (firstName?: string, lastName?: string) => {
  const f = (firstName ?? '').trim().charAt(0);
  const l = (lastName ?? '').trim().charAt(0);
  return (f + l || '·').toUpperCase();
};

const isRouteActive = (current: string, route: string) => {
  if (current === route) return true;
  return current.startsWith(`${route}/`);
};

export default function Sidebar() {
  const router = useRouter();
  const { user } = useAuth();
  const { statusMobile, setStatusMobile, toggleStatus, setToggleStatus } =
    useMobileStatus();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isOpenSignOut, setIsOpenSignOut] = useState(false);

  const open = toggleStatus;

  const role = (user?.role?.name as rol | undefined) ?? undefined;
  const pathName = decodeURIComponent(usePathname() ?? '');

  // Lawyer sidebar: open dropdown by default + fetch pool count
  const [poolCount, setPoolCount] = useState<number | null>(null);
  useEffect(() => {
    if (role !== 'lawyer') return;
    setOpenDropdown('/dash-lawyers');
    api.leads.pool({ limit: 1 }).then((res) => {
      if (res.success && res.data) {
        setPoolCount(res.data.total ?? res.data.data?.length ?? 0);
      }
    });
  }, [role]);

  const grouped = useMemo(() => {
    const map: Record<NavGroup, dataItem[]> = {
      Overview: [],
      Management: [],
    };
    routesSidebar.forEach((item) => {
      if (!role || !item.rol.includes(role)) return;
      const g = item.group ?? 'Management';
      map[g].push(item);
    });
    return map;
  }, [role]);

  const { setSelecArray } = useSelectStatus();

  // Map lawyer sub-item routes → status filters for /all-leads.
  // Empty array [] = clear filter (show all leads).
  // null = disabled item (not clickable).
  const LAWYER_STATUS_MAP: Record<string, string[] | null> = {
    '/all-leads': [],  // show all assigned leads (no filter)
    '/all-leads/flagged': ['PROBLEMATIC'],
    '/all-leads/retained': ['CLOSED'],
    '/all-leads/waiting': ['WAITING_ON_CLIENT'],
    '/all-leads/conversion': null, // TODO: conversion rate view
  };

  const handleParentClick = (item: dataItem) => {
    if (item.children?.length) {
      setOpenDropdown((prev) => (prev === item.route ? null : item.route));
      return;
    }
    setStatusMobile('hidden');
  };

  const handleNavigate = () => setStatusMobile('hidden');

  const handleLawyerSubItem = (child: dataItem) => {
    const statuses = LAWYER_STATUS_MAP[child.route];
    if (statuses === null) return; // disabled item
    setSelecArray(statuses as any);
    router.push('/all-leads');
    setStatusMobile('hidden');
  };

  const signOut = () => {
    database.signout();
    router.push('/');
    location.reload();
  };

  return (
    <>
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

      <div
        className={cn(
          'transition-[width] duration-300 ease-in-out',
          open ? 'lg:w-[252px]' : 'lg:w-0'
        )}
      >
        <SidebarShell
          className={cn(
            'transition-transform duration-300 ease-in-out',
            'fixed right-0 top-0 z-50',
            statusMobile === 'hidden' ? 'translate-x-full' : 'translate-x-0',
            'lg:static',
            open ? 'lg:translate-x-0' : 'lg:-translate-x-full'
          )}
        brand={
          <Brand
            logo={
              <Image
                src={Logo}
                alt='587 Lawyers'
                priority
                className='h-9 w-auto'
              />
            }
            role={role ?? undefined}
          />
        }
        nav={GROUPS.map((groupName) => {
          const items = grouped[groupName];
          if (!items.length) return null;
          return (
            <Fragment key={groupName}>
              <NavGroupLabel>{groupName}</NavGroupLabel>
              {items.map((item, idx) => {
                const active = isRouteActive(pathName, item.route);
                const expandable = !!item.children?.length;
                const expanded =
                  expandable &&
                  (openDropdown === item.route || active);
                const Icon = item.icon;
                const showDividerBefore =
                  groupName === 'Management' && idx === items.length - 1 && !item.children;
                return (
                  <Fragment key={item.route}>
                    {showDividerBefore ? <Divider /> : null}
                    {expandable ? (
                      <NavItem
                        icon={Icon ? <Icon size={14} /> : null}
                        label={item.name}
                        active={active}
                        expandable
                        expanded={expanded}
                        onClick={() => handleParentClick(item)}
                      />
                    ) : (
                      <NavItem
                        icon={Icon ? <Icon size={14} /> : null}
                        label={item.name}
                        active={active}
                        href={item.route}
                        onClick={handleNavigate}
                        badge={
                          item.route === '/select-lead' && poolCount != null ? (
                            <span className='inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-customRed px-1.5 text-[10px] font-bold tabular-nums text-white'>
                              {poolCount}
                            </span>
                          ) : undefined
                        }
                      />
                    )}
                    {expandable && expanded
                      ? item.children!.map((child) => {
                          if (role && !child.rol.includes(role)) return null;

                          // Lawyer sub-items: status-filtered views of /all-leads.
                          // They use the store instead of actual routes.
                          const isLawyerFilter = child.route in LAWYER_STATUS_MAP;
                          if (isLawyerFilter) {
                            const disabled = LAWYER_STATUS_MAP[child.route] === null;
                            const childActive = pathName === '/all-leads' && child.route === '/all-leads';
                            return (
                              <button
                                key={child.route}
                                type='button'
                                disabled={disabled}
                                onClick={() => handleLawyerSubItem(child)}
                                className={cn(
                                  'flex items-center gap-2.5 rounded-lg py-1.5 pl-10 pr-2.5 text-xs font-medium tracking-[-0.005em] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900',
                                  childActive && 'font-semibold text-slate-900',
                                  disabled && 'cursor-not-allowed opacity-40'
                                )}
                              >
                                <span
                                  aria-hidden
                                  className={cn(
                                    'h-1 w-1 shrink-0 rounded-full',
                                    childActive ? 'bg-customRed' : 'bg-slate-300'
                                  )}
                                />
                                <span className='truncate'>{child.name}</span>
                                {disabled ? (
                                  <span className='ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-400'>
                                    Soon
                                  </span>
                                ) : null}
                              </button>
                            );
                          }

                          // Admin sub-items: regular route links.
                          const childActive = pathName === child.route;
                          return (
                            <NavSubItem
                              key={child.route}
                              href={child.route}
                              label={child.name}
                              active={childActive}
                              onClick={handleNavigate}
                            />
                          );
                        })
                      : null}
                  </Fragment>
                );
              })}
            </Fragment>
          );
        })}
        foot={
          <>
            <UserCard
              name={
                user?.firstName
                  ? `${user.firstName} ${user.lastName ?? ''}`.trim()
                  : 'User'
              }
              role={role ?? '—'}
              initials={buildInitials(user?.firstName, user?.lastName)}
              avatarSrc={user?.profile_image_url ?? null}
              online
            />
            <SignOutItem onClick={() => setIsOpenSignOut(true)} />
          </>
        }
        />
      </div>

      <SidebarToggle
        open={open}
        onClick={() => setToggleStatus(!toggleStatus)}
        className={cn(
          'fixed top-5 z-[60] hidden transition-[left] duration-300 ease-in-out lg:flex',
          open ? 'left-[238px]' : 'left-3'
        )}
      />
    </>
  );
}
