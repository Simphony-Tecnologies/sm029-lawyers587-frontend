'use client';
import Header from '@/components/Layout/Header';
import HeaderMobile from '@/components/Layout/HeaderMobile';
import Sidebar from '@/components/Layout/Sidebar';
import { useLeadsStore } from '@/store/useLead.store';
import { ReactNode, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
export default function Layout({ children }: { children: ReactNode }) {
  const { fetchLeads, dataLeads } = useLeadsStore();
  const review = !dataLeads;

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review]);

  return (
    <div>
      <Toaster />
      <div className='flex '>
        <div className='flex h-screen justify-start sticky '>
          <Sidebar />
        </div>
        <div className=' w-full h-screen bg-gray-50 overflow-y-auto '>
          <Header />
          <HeaderMobile />
          <div className='p-5 lg:p-10'>{children}</div>
        </div>
      </div>
    </div>
  );
}
