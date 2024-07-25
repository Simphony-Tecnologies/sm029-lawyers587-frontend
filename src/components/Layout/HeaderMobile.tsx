'use client';
import Image from 'next/image';
import Logo from '@/assets/Logo.svg';
import { MdNotifications, MdOutlineMenu } from 'react-icons/md';
import { useMobileStatus } from '@/store/useMobileStatus.store';
function HeaderMobile() {
  const { setStatusMobile, setToggleStatus } = useMobileStatus();
  const toggleSidebarMobile = () => {
    setStatusMobile('fixed right-0 grid');
    setToggleStatus(true);
  };
  return (
    <header className='lg:hidden bg-white p-4 items-center space-x-4 shadow flex justify-between'>
      <Image
        priority
        src={Logo}
        alt='Logo'
        className={`w-auto max-h-10 duration-500 `}
      />
      <div className='flex '>
        <MdNotifications size={24} className='text-gray-500 cursor-pointer' />
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
