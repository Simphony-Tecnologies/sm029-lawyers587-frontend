'use client';

import Image from 'next/image';
import Logo from '@/assets/logo.png';
import LogoMobile from '@/assets/Logo-mobile.png';
import Background from '@/assets/background.png';
import MobileAuth from '@/assets/mobile-auth.png';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';

const Page = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, user } = useAuth();
  const singIn = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      setLoading(false);
      return toast.error('You must provide all fields');
    }

    const login = await database.auth(email, password);

    if (login.code === 401) {
      setLoading(false);
      return toast.error('error password');
    }
    if (login.code === 404) {
      setLoading(false);
      return toast.error('The email is not existing');
    }
    if (!login.success) {
      setLoading(false);
      return toast.error('Error in authenticating');
    }
    setUser(login.data.lawyer);

    const lastLogin: any = { last_login: new Date() };

    router.push('/dashboard');
    await database.UpdateLawyer(lastLogin, user.id);
    setLoading(false);
  };

  return (
    <div className='w-full h-screen  flex flex-col md:grid md:grid-cols-2 gap-10'>
      <Toaster />
      <Image
        src={Background}
        alt='Logo'
        className='hidden md:block md:w-full md:h-full h-1/2 object-cover object-center '
        width={1920}
        height={1920}
      />
      <Image
        src={MobileAuth}
        alt='Logo'
        className='md:hidden w-full md:h-full h-1/2 object-cover object-center '
        width={1920}
        height={1920}
      />
      <div className='mx-auto w-full max-w-md h-full flex flex-col md:justify-center items-center gap-2  md:p-10 px-10'>
        <p className='text-4xl text-primary mr-auto  font-extrabold'>
          Hello Admin!
        </p>
        <p className='text-2xl text-primary mr-auto  font-light mb-12'>
          Welcome
        </p>
        <form
          onSubmit={singIn}
          className=' flex flex-col w-full gap-2 items-center'
        >
          <div className='relative flex items-center w-full'>
            {email === '' && (
              <i className='fi fi-rr-envelope absolute left-8 text-gray-400'></i>
            )}

            <input
              onChange={(e) => setEmail(e.target.value)}
              type='email'
              name='email'
              id='email'
              placeholder='          Email Address'
              className='w-full  border border-text border-opacity-50 px-5 lg:py-6 py-3 rounded-full placeholder:font-light text-text'
            />
          </div>

          <div className='relative flex items-center w-full'>
            {password === '' && (
              <i className='fi fi-rr-lock absolute left-8 text-gray-400  '></i>
            )}
            <input
              onChange={(e) => setPassword(e.target.value)}
              type='password'
              name='password'
              id='password'
              placeholder='          Password'
              className='w-full  border border-text border-opacity-50 px-5 lg:py-6 py-3 rounded-full placeholder:font-light text-text'
            />
          </div>

          <button
            disabled={loading}
            className={`${
              loading && 'animate-pulse bg-gray-400'
            } w-full  bg-primary text-white py-1.5 rounded-lg max-w-36 mt-7`}
          >
            Login
          </button>
        </form>
        <p>
          <Link
            href='/recovery'
            className='text-gray-500 hover:underline cursor-pointer'
          >
            Forgot password
          </Link>
        </p>
        <Image
          src={Logo}
          alt='Logo'
          className='hidden lg:block absolute right-10 bottom-10 w-28 ml-auto'
        />
        <Image
          src={LogoMobile}
          alt='Logo mobile'
          className='lg:hidden absolute  bottom-10 w-28 ml-auto'
        />
      </div>
    </div>
  );
};

export default Page;
