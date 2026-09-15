'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/assets/Logo.svg';
import { useAuth } from '@/store/useAuth.store';
import { useMobileStatus } from '@/store/useMobileStatus.store';
import { useAssignedLeads } from '@/store/useAssignedLeads.store';
import { api, database } from '@/services/database';
import { routesSidebar } from '@/routes/routes';
import type { dataItem, NavGate, NavGroup, rol } from '@/types/routes.interface';
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
  const searchParams = useSearchParams();
  const activeStatusSlug = searchParams.get('status') ?? 'all';
  const { count: assignedCount, fetchCount } = useAssignedLeads();

  // Gating fino de A25 sobre el rol: los flags vienen del lawyer del login.
  const passesGate = (gate?: NavGate): boolean => {
    if (!gate) return true;
    if (gate === 'firm') return user?.firm_id != null;
    if (gate === 'firm_admin') return user?.is_firm_admin === true;
    if (gate === 'global_admin')
      return String(user?.role?.name ?? '').toLowerCase() === 'admin';
    return true;
  };

  // Lawyer sidebar: open dropdown by default + fetch pool count
  const [poolCount, setPoolCount] = useState<number | null>(null);
  useEffect(() => {
    if (role !== 'lawyer') return;
    setOpenDropdown('/all-leads');
    api.leads.pool({ limit: 1 }).then((res) => {
      if (res.success && res.data) {
        setPoolCount(res.data.total ?? res.data.data?.length ?? 0);
      }
    });
    // L587-02: sembrar el conteo de ASSIGNED para el badge del submenú "My Leads".
    if (user?.id) void fetchCount(Number(user.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.id]);

  const grouped = useMemo(() => {
    const map: Record<NavGroup, dataItem[]> = {
      Overview: [],
      Management: [],
    };
    routesSidebar.forEach((item) => {
      if (!role || !item.rol.includes(role)) return;
      if (!passesGate(item.gate)) return;
      const g = item.group ?? 'Management';
      map[g].push(item);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.firm_id, user?.is_firm_admin]);

  const handleParentClick = (item: dataItem) => {
    if (item.children?.length) {
      setOpenDropdown((prev) => (prev === item.route ? null : item.route));
      return;
    }
    setStatusMobile('hidden');
  };

  const handleNavigate = () => setStatusMobile('hidden');

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
                          if (!passesGate(child.gate)) return null;

                          // Los hijos con ?status=<slug> en su route (L587-01
                          // abogado, L587-10 admin): activo = base path + slug
                          // coinciden con la URL. El resto (submenús admin/firma)
                          // son links normales: activo = coincide el pathname.
                          const qIdx = child.route.indexOf('?status=');
                          const childSlug =
                            qIdx >= 0 ? child.route.slice(qIdx + 8) : null;
                          const childBasePath =
                            qIdx >= 0 ? child.route.slice(0, qIdx) : child.route;
                          const childActive =
                            childSlug !== null
                              ? pathName === childBasePath &&
                                activeStatusSlug === childSlug
                              : pathName === child.route;

                          // L587-02: badge de conteo en el filtro "Assigned (New)"
                          // del abogado (no aplica al submenú admin).
                          const badge =
                            childBasePath === '/all-leads' &&
                            childSlug === 'assigned' &&
                            assignedCount > 0 ? (
                              <span className='inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-customRed px-1.5 text-[10px] font-bold tabular-nums text-white'>
                                {assignedCount}
                              </span>
                            ) : undefined;

                          return (
                            <NavSubItem
                              key={child.route}
                              href={child.route}
                              label={child.name}
                              active={childActive}
                              badge={badge}
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
