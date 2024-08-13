'use client';
import Image from 'next/image';
import Logo from '@/assets/Logo.svg';
import Link from 'next/link';
import { routesSidebar } from '@/routes/routes';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  MdHelp,
  MdLogin,
  MdOutlineCancel,
  MdOutlineMenu,
} from 'react-icons/md';
import { useMobileStatus } from '@/store/useMobileStatus.store';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import FAQAccordion from './FAQAccordion';
type siderbar = {
  name?: string;
  type?: string;
};
export default function Sidebar({ name, type }: siderbar) {
  const router = useRouter();
  const { statusMobile, setStatusMobile, toggleStatus, setToggleStatus } =
    useMobileStatus();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { user } = useAuth();
  const rol = user?.role?.name;

  const pathName = decodeURIComponent(usePathname());

  const toggleSidebar = () => {
    setToggleStatus(!toggleStatus);
  };
  const handleDropdownClick = (route: string) => {
    openDropdown !== route && setStatusMobile('hidden');
    route === route && setStatusMobile('hidden');
    setOpenDropdown(openDropdown === route ? null : route);
  };

  const signOut = () => {
    database.signout();
    router.push('/');
    location.reload();
  };

  return (
    <aside
      className={` py-5 h-screen  items-center lg:grid grid-rows-[auto_1fr_auto] gap-20 bg-white  border-t shadow-none  duration-300  z-10 border border-solid border-gray-200 transition-all ease-in-out  ${
        toggleStatus ? 'w-72 ' : 'w-20'
      } ${statusMobile} `}
    >
      <header
        className={`flex flex-col pl-5 gap-10 duration-300 ${
          toggleStatus ? 'w-72' : 'w-20 pr-4'
        }`}
      >
        <div
          className={`w-full h-10 flex lg:px-3 items-center gap-2 duration-300 justify-between lg:justify-start ${
            toggleStatus ? 'flex-row' : 'flex-col'
          }`}
        >
          <MdOutlineMenu
            size={24}
            onClick={toggleSidebar}
            className={` hidden lg:flex text-xl  text-secondary cursor-pointer duration-300 `}
          />

          {toggleStatus && (
            <div className='flex flex-col '>
              <Image
                priority
                src={Logo}
                alt='Logo'
                className={`w-auto max-h-10 duration-500 mt-5 `}
              />
              <div className='text-sm text-gray-500 capitalize'>
                {user?.role?.name}
              </div>
            </div>
          )}

          <MdOutlineCancel
            onClick={() => setStatusMobile('hidden')}
            className={`lg:hidden text-xl mr-5 text-secondary cursor-pointer duration-300  `}
          />
        </div>
        <div className='flex justify-between'>
          <div className='lg:hidden flex items-center space-x-4'>
            <div className='w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white cursor-pointer'></div>
            <div className='text-gray-800'>
              <div className='font-semibold '>{user?.firstName}</div>
            </div>
          </div>
          <Menu>
            <MenuButton className='lg:hidden'>
              <MdHelp
                size={24}
                className='text-gray-500 cursor-pointer hover:text-primary mr-4'
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
        </div>
      </header>

      <main
        className={` h-full flex flex-col justify-start gap-5 duration-300 ${
          toggleStatus ? 'w-72 ' : 'w-20 '
        }`}
      >
        {
          <>
            {routesSidebar.map((menu, index) => (
              <div
                key={index}
                className={`pl-5 w-full duration-300 ${
                  toggleStatus ? 'w-72 ' : 'w-20 pr-4'
                }`}
              >
                {menu.rol.includes(rol) && (
                  <Link
                    onClick={() => handleDropdownClick(menu.route)}
                    key={index}
                    href={menu.route}
                    className={`${
                      menu.route === pathName
                        ? 'bg-primary bg-opacity-10 text-primary'
                        : ''
                    } flex items-center gap-5 py-2 transition-all duration-300 ease-in-out hover:bg-primary hover:bg-opacity-20 rounded-l-lg  w-full ${
                      toggleStatus
                        ? 'px-3 lg:px-5 '
                        : 'px-3 lg:px-2.5 rounded-lg'
                    }`}
                  >
                    <div
                      className={`${
                        menu.route === pathName
                          ? 'text-secondary '
                          : 'text-red-400 '
                      }`}
                    >
                      {menu.icon && <menu.icon size={24} />}
                    </div>
                    <span
                      className={`duration-300  ${!toggleStatus && 'hidden'}`}
                    >
                      {menu.name}
                    </span>
                  </Link>
                )}
                {menu.children &&
                  openDropdown === menu.route &&
                  menu.children.map((child, childIndex) => (
                    <div
                      key={childIndex}
                      className={`w-full duration-300 ${
                        toggleStatus ? 'w-full pl-8' : ' pl-1'
                      }`}
                    >
                      {child.rol.includes(rol) && (
                        <Link
                          href={`${menu.route}${child.route}`}
                          className={`${
                            child.route === pathName
                              ? 'bg-primary bg-opacity-10 text-primary'
                              : ''
                          } flex items-center gap-5 py-2 transition-all duration-300 ease-in-out hover:bg-primary hover:bg-opacity-20 rounded-l-lg w-full ${
                            toggleStatus ? 'px-5' : 'px-2.5 rounded-lg gap-2'
                          }`}
                          onClick={() => setStatusMobile('hidden')}
                        >
                          <div
                            className={`${
                              `${menu.route}${child.route}` === pathName
                                ? 'text-secondary '
                                : 'text-red-400 '
                            }`}
                          >
                            {!toggleStatus && child.icon && (
                              <child.icon size={20} />
                            )}
                          </div>
                          <span
                            className={`duration-300  ${
                              !toggleStatus && 'hidden'
                            }`}
                          >
                            {child.name}
                          </span>
                        </Link>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </>
        }
      </main>

      <footer
        className={`pl-5 w-full  flex justify-center items-center rounded-lg transform duration-300 cursor-pointer ${
          toggleStatus ? 'w-full' : 'w-20 pr-4'
        }`}
      >
        <button
          onClick={signOut}
          className={`flex items-center gap-5 py-2 transition-all duration-300 ease-in-out hover:bg-primary hover:bg-opacity-20 rounded-l-lg w-full ${
            toggleStatus
              ? 'px-3 lg:px-5 '
              : 'px-3 lg:px-2.5 lg:pr-4 rounded-r-lg '
          }duration-300 cursor-pointer`}
        >
          <MdLogin size={24} className='text-secondary' />

          <span
            className={`duration-300  block  ${
              !toggleStatus && 'hidden text-[0px]'
            }`}
          >
            Sign out
          </span>
        </button>
      </footer>
    </aside>
  );
}
