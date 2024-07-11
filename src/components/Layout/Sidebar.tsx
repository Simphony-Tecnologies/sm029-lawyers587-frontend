'use client';
import Image from 'next/image';
import Logo from '@/assets/Logo.svg';
import Link from 'next/link';
import { routesSidebar } from '@/routes/routes';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MdLogin, MdOutlineMenu } from 'react-icons/md';
export default function Sidebar({ data }: { data?: any }) {
  const router = useRouter();
  const [toggleStatus, setToggleStatus] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const rol = 'admin';
  const pathName = decodeURIComponent(usePathname());

  const toggleSidebar = () => {
    setToggleStatus(!toggleStatus);
  };
  const handleDropdownClick = (route: string) => {
    setOpenDropdown(openDropdown === route ? null : route);
  };

  const signOut = async () => {
    router.push('/');
  };

  return (
    <aside
      className={`py-5 lg:h-screen flex justify-center items-center lg:grid lg:grid-rows-[auto_1fr_auto] gap-5 lg:gap-20 bg-white lg:bg-main-color-50  border-t shadow-[0_0_50px_#d9d9d9;] lg:shadow-none rounded-t-2xl lg:rounded-none duration-300 fixed bottom-0 lg:relative z-50 lg:z-10 border border-solid border-gray-200 ${
        toggleStatus ? 'w-full lg:w-72' : 'w-full lg:w-20'
      }`}
    >
      <header
        className={`pl-5 hidden lg:block duration-300 ${
          toggleStatus ? 'w-full lg:w-72' : 'w-full lg:w-20 lg:pr-4'
        }`}
      >
        <div
          className={`w-full h-10 flex px-3 items-center gap-2 duration-300 ${
            toggleStatus ? 'flex-row' : 'flex-col'
          }`}
        >
          <MdOutlineMenu
            size={24}
            onClick={toggleSidebar}
            className={` hidden lg:flex text-xl text-secondary cursor-pointer duration-300 `}
          />
          {toggleStatus && (
            <Image
              priority
              src={Logo}
              alt='Logo'
              className={`w-auto max-h-10 duration-500 `}
            />
          )}
        </div>
      </header>

      <main
        className={`pl-5 lg:px-0 w-screen h-full flex flex-row lg:flex-col justify-between lg:justify-start gap-2.5 lg:gap-5 duration-300 ${
          toggleStatus ? 'w-max lg:w-full ' : 'w-max lg:w-20 '
        }`}
      >
        {rol === 'admin' && (
          <>
            {routesSidebar.map((menu, index) => (
              <div
                key={index}
                className={`lg:pl-5 w-full duration-300 ${
                  toggleStatus ? 'w-max lg:w-full ' : 'w-max lg:w-20 lg:pr-4'
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
                    } flex items-center gap-5 py-2 transition-all duration-300 ease-in-out hover:bg-primary hover:bg-opacity-20 rounded-l-lg w-max lg:w-full ${
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
                      className={`duration-300 hidden lg:block ${
                        !toggleStatus && 'lg:hidden'
                      }`}
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
                      className={`pl-5 lg:pl-8 w-full duration-300 ${
                        toggleStatus ? 'w-max lg:w-full' : 'w-max lg:w-20'
                      }`}
                    >
                      {child.rol.includes(rol) && (
                        <Link
                          href={`${menu.route}${child.route}`}
                          className={`${
                            child.route === pathName
                              ? 'bg-primary bg-opacity-10 text-primary'
                              : ''
                          } flex items-center gap-5 py-2 transition-all duration-300 ease-in-out hover:bg-primary hover:bg-opacity-20 rounded-l-lg w-max lg:w-full ${
                            toggleStatus ? 'px-3 lg:px-5' : 'px-3 lg:px-2.5'
                          }`}
                        >
                          <div
                            className={`${
                              menu.route === pathName
                                ? 'text-secondary '
                                : 'text-red-400 '
                            }`}
                          >
                            {child.icon && <child.icon size={24} />}
                          </div>
                          <span
                            className={`duration-300 hidden lg:block ${
                              !toggleStatus && 'lg:hidden'
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
        )}
      </main>

      <footer
        className={`pl-5 w-max lg:w-full hidden lg:flex justify-center items-center rounded-lg transform duration-300 cursor-pointer ${
          toggleStatus ? 'w-max lg:w-full' : 'w-max lg:w-20 pr-4'
        }`}
      >
        <button
          onClick={signOut}
          className={`flex items-center gap-5 py-2 transition-all duration-300 ease-in-out hover:bg-primary hover:bg-opacity-20 rounded-l-lg w-max lg:w-full ${
            toggleStatus
              ? 'px-3 lg:px-5 '
              : 'px-3 lg:px-2.5 lg:pr-4 rounded-r-lg '
          }duration-300 cursor-pointer`}
        >
          <MdLogin size={24} className='text-secondary' />

          <span
            className={`duration-300 hidden lg:block  ${
              !toggleStatus && 'lg:hidden lg:text-[0px]'
            }`}
          >
            Sign out
          </span>
        </button>
      </footer>
    </aside>
  );
}
