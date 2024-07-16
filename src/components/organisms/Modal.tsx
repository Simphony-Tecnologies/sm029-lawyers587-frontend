import { Button, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useState } from 'react';
import { MdClose } from 'react-icons/md';
type modal = {
  children: React.ReactNode;
  title?: string;
  setIsOpen: any;
  isOpen: any;
};
export default function MyModal({ children, title, setIsOpen, isOpen }: modal) {
  function close() {
    setIsOpen(false);
  }

  return (
    <>
      <Dialog open={isOpen} as='div' className='relative z-10 ' onClose={close}>
        <div className='fixed inset-0 z-10 w-screen overflow-y-auto'>
          <div className='flex min-h-full items-center justify-center p-4'>
            <DialogPanel
              transition
              className='w-full max-w-lg rounded-xl bg-white  backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0  '
            >
              <DialogTitle
                as='h3'
                className='font-medium bg-primary text-white p-4 rounded-t-xl flex justify-between'
              >
                <p>{title}</p>
                <div className='cursor-pointer' onClick={close}>
                  <MdClose size={20} />
                </div>
              </DialogTitle>
              <div className='p-5 border border-solid rounded-xl border-gray-200 rounded-t-none shadow-2xl'>
                {children}
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}
