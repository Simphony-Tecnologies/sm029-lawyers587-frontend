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
import Modal from '@/components/organisms/Modal';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';

const Page = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

    if (!login.data.lawyer.is_active) {
      database.signout();
      setLoading(false);
      return toast.error('This user is not authorized');
    }
    setUser(login.data.lawyer);

    const lastLogin: any = { last_login: new Date() };

    router.push('/dashboard');
    await database.UpdateLawyer(lastLogin, user.id);
    setLoading(false);
  };
  const handleOpenForgotPassword = () => {
    setOpenModal(true);
  };
  const handleSendForgotPassword = async (e: any) => {
    e.preventDefault();

    await database.requestPassword(e.target.forgot.value);
    toast.success('Review your email address for restart your password');
    setOpenModal(false);
  };

  return (
    <div className='w-full h-screen  flex flex-col md:grid md:grid-cols-2 gap-10'>
      <Toaster />
      <Modal
        isOpen={openModal}
        setIsOpen={setOpenModal}
        title='Recovery password'
        className='max-w-sm'
      >
        <div className='p-5 border-2 border-t-none border-solid rounded-lg border-gray-200  '>
          <div>Please enter your email address </div>

          <form
            onSubmit={handleSendForgotPassword}
            className='flex flex-col gap-2'
          >
            <Input
              name='forgot'
              type='email'
              placeholder='Email address'
              required
            />
            <div className=' text-right'>
              <Button name='Send' type='submit' />
            </div>
          </form>
        </div>
      </Modal>
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
          Hello Lawyer!
        </p>
        <p className='text-2xl text-primary mr-auto  font-light mb-12'>
          Welcome
        </p>
        <form
          onSubmit={singIn}
          className=' flex flex-col w-full gap-2 items-center'
        >
          <div className='relative rounded-full flex items-center w-full border border-text border-opacity-50 py-2 px-4'>
            <i className='fi fi-rr-envelope absolute left-3 text-gray-400'></i>

            <input
              onChange={(e) => setEmail(e.target.value)}
              type='email'
              name='email'
              id='email'
              placeholder='Email Address'
              className='w-full px-5 py-3 rounded-full text-text outline-none placeholder:font-light focus:outline-none'
              style={{ backgroundColor: 'transparent' }}
            />
          </div>

          <div className='relative rounded-full flex items-center w-full border border-text border-opacity-50 py-2 px-4'>
            <i className='fi fi-rr-lock text-gray-400 absolute left-3'></i>

            <input
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              name='password'
              id='password'
              placeholder='Password'
              className='w-full px-5 py-3 rounded-full placeholder:font-light text-text outline-none'
            />

            <i
              className={`fi ${
                showPassword ? 'fi-rr-eye-crossed' : 'fi-rr-eye'
              } text-gray-400 absolute right-5 cursor-pointer text-lg`}
              onClick={() => setShowPassword(!showPassword)}
            ></i>
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

        <p
          onClick={handleOpenForgotPassword}
          className='text-gray-500 hover:underline cursor-pointer'
        >
          Forgot password
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
