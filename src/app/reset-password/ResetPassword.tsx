'use client';

import Image from 'next/image';
import Logo from '@/assets/logo.png';
import LogoMobile from '@/assets/Logo-mobile.png';
import Background from '@/assets/background.png';
import MobileAuth from '@/assets/mobile-auth.png';
import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import Modal from '@/components/organisms/Modal';
import Input from '@/components/atoms/Input';

const ResetPassword = () => {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [validToken, setValidToken] = useState<any>('');
  const { setUser, user } = useAuth();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      toast.error('Invalid or missing token');

      setLoading(false);
    }
    setValidToken(token);
  }, []);
  const handleForgotPassword = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setLoading(false);
      return toast.error('You must provide all fields');
    }

    setLoading(true);
    if (!validToken) {
      setLoading(false);
      return toast.error('Token is invalid');
    }
    const reset = await database.resetPassword(validToken, newPassword);

    if (reset.code === 500 || !reset.success) {
      setLoading(false);
      return toast.error('error with reset password');
    }

    setUser(reset.data.lawyer);

    const lastLogin: any = { last_login: new Date() };

    router.push('/dashboard');
    await database.UpdateLawyer(lastLogin, user.id);
    setLoading(false);
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
        <div className='p-5 border-2 border-t-none border-solid rounded-lg border-gray-200'>
          <div>Please enter your email address </div>

          <form>
            <Input name='forgot' type='text' placeholder='Email address' />
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
          Reset Password
        </p>
        <p className='text-2xl text-primary mr-auto  font-light mb-12'>
          Write the new password
        </p>
        <form
          onSubmit={handleForgotPassword}
          className=' flex flex-col w-full gap-2 items-center'
        >
          <div className='relative flex items-center w-full'>
            <input
              onChange={(e) => setNewPassword(e.target.value)}
              type='password'
              name='password'
              id='newPassword'
              placeholder='Password'
              className='w-full  border border-text border-opacity-50 px-5 lg:py-6 py-3 rounded-full placeholder:font-light text-text'
            />
          </div>

          <div className='relative flex items-center w-full'>
            <input
              onChange={(e) => setConfirmPassword(e.target.value)}
              type='password'
              name='confirmPassword'
              id='password'
              placeholder='Confirm Password'
              className='w-full  border border-text border-opacity-50 px-5 lg:py-6 py-3 rounded-full placeholder:font-light text-text'
            />
          </div>

          <button
            disabled={loading}
            className={`${
              loading && 'animate-pulse bg-gray-400'
            } w-full  bg-primary text-white py-1.5 rounded-lg max-w-36 mt-7`}
          >
            Save Password
          </button>
        </form>

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

export default ResetPassword;
