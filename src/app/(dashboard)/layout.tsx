import Header from '@/components/Layout/Header';
import Sidebar from '@/components/Layout/Sidebar';
import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
export default async function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>
        <div className='flex items-start w-full'>
          <Toaster />
          <div className='w-full lg:h-screen flex flex-col lg:grid lg:grid-cols-[auto_1fr] overflow-x-hidden'>
            <Sidebar />
            <div className='w-full lg:h-screen bg-gray-50 '>
              <Header />
              <div className='p-5 lg:p-10'>{children}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
