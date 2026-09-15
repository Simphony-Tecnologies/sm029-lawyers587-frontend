'use client';
import Header from '@/components/Layout/Header';
import HeaderMobile from '@/components/Layout/HeaderMobile';
import Sidebar from '@/components/Layout/Sidebar';
import { useLeadsStore } from '@/store/useLead.store';
import { ReactNode, Suspense, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { OnboardingModal } from '@/components/ui/organisms/OnboardingModal';
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
      <OnboardingModal />
      <div className='flex '>
        <div className='flex h-screen justify-start sticky '>
          {/* Suspense: Sidebar usa useSearchParams (L587-01/10). Sin este
              límite, todas las páginas del dashboard deoptan a CSR y fallan
              el prerender del build (regresión introducida en 6098a31). */}
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
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
