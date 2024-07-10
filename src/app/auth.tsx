'use client';

import Image from 'next/image';
import Logo from '@/assets/logo.png';
import Background from '@/assets/background.png';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
//import {auth} from '@/services/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const Page = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // const singIn = async () => {
  //   setLoading(true);
  //   if (!email || !password) {
  //     setLoading(false)
  //     return toast.error('Upsss, tienes campos vacios, por favor intentalo de nuevo');
  //   }
  //   const emailRol = await auth.validateEmailRol(email);

  //   if (emailRol.code === 400 || !emailRol.data) {
  //     setLoading(false)
  //     return toast.error('Upsss, tenemos un problema, por favor intentalo nuevamente');
  //   }
  //   if (emailRol.data.rol.name === 'user' || !emailRol.data.status) {
  //     setLoading(false)
  //     return toast.error('Upsss, Este usuario no tiene permisos para ingresar');
  //   }

  //   const response = await auth.loginWithPassword(email, password);

  //   if (response.code === 400) {
  //     setLoading(false)
  //     return toast.error(
  //       'Upsss, tenemos un problema o tus credenciales son inválidad, por favor intentalo nuevamente'
  //     );
  //   }
  //   router.push('/aseguradora');
  // };

  return (
    <div className='w-full h-screen  grid lg:grid-cols-2 gap-10'>
      <Toaster />
      <Image
        src={Background}
        alt='Logo'
        className='hidden lg:block w-full h-full object-cover object-center '
        width={1920}
        height={1920}
      />
      <div className='mx-auto w-full max-w-md h-full flex flex-col justify-center items-center gap-2  lg:p-10'>
        <p className='text-4xl text-primary mr-auto  font-extrabold'>
          Hello Admin!
        </p>
        <p className='text-2xl text-primary mr-auto  font-light mb-12'>
          Welcome
        </p>

        <div className='flex flex-col w-full '>
          <form action=''></form>
          <label
            htmlFor='email'
            className='w-max text-sm relative top-2.5 left-2.5 bg-white px-5'
          ></label>
          <input
            onChange={(e) => setEmail(e.target.value)}
            type='text'
            name='email'
            id='email'
            placeholder='Email Address'
            className='w-full  border border-text border-opacity-50 px-5 py-6 rounded-full placeholder:font-light text-text'
          />
        </div>
        <div className='flex flex-col w-full '>
          <label
            htmlFor='email'
            className='w-max text-sm relative top-2.5 left-2.5 bg-white px-5'
          ></label>
          <input
            onChange={(e) => setPassword(e.target.value)}
            type='password'
            name='password'
            id='password'
            placeholder='Password'
            className='w-full  border border-text border-opacity-50 px-5 py-6 rounded-full placeholder:font-light text-text'
          />
        </div>

        <button
          disabled={loading}
          // onClick={singIn}
          className={`${
            loading && 'animate-pulse'
          } w-full  bg-primary text-white py-1.5 rounded-lg max-w-36 mt-7`}
        >
          Login
        </button>
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
          className=' absolute right-10 bottom-10 w-28 ml-auto'
        />
      </div>
    </div>
  );
};

export default Page;
