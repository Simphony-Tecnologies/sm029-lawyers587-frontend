import Header from '@/components/Layout/Header';
import HeaderMobile from '@/components/Layout/HeaderMobile';
import Sidebar from '@/components/Layout/Sidebar';
import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>
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
      </body>
    </html>
  );
}
