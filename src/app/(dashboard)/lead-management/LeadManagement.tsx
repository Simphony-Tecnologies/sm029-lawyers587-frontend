'use client';

import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';

import { useState } from 'react';
import Modal from '@/components/organisms/Modal';
import { useLeadsStore } from '@/store/useLead.store';
const LeadManagement = () => {
  const [isOpenAssign, setIsOpenAssign] = useState(false);
  const { columns, dataLeads, error } = useLeadsStore();

  const statusColors = {
    NEW: '#8280FF',
    ASSIGNED: '#4AD991',
    CLOSED: '#FF9066',
    PROBLEMATIC: '#FEC53D',
  };

  return (
    <div>
      <Tilte name='Lead Management' />
      <Modal
        title='Assing Lead'
        isOpen={isOpenAssign}
        setIsOpen={setIsOpenAssign}
      >
        <div className='p-5 border-2 border-t-none border-solid rounded-lg border-gray-200'>
          <div className='flex flex-col gap-5'>
            {/* <div className='text-gray-500 text-sm'>Code: {dataLeads?.id}</div>
            <div className='flex items-center gap-2'>
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt='Preview'
                  width={300}
                  height={300}
                  className='object-cover rounded-full w-20 h-20  '
                />
              ) : (
                <div className='w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 cursor-pointer'>
                  <MdOutlineImage size={32} />
                </div>
              )}
              <div className='relative'>
                <input
                  type='file'
                  accept='image/*'
                  className='absolute inset-0  cursor-pointer opacity-0'
                  name='Change image'
                  onChange={updateImage}
                />
                <p className='underline cursor-pointer '>Change image</p>
              </div>

              <MdSaveAlt size={24} />
            </div>
            <form onSubmit={UpdateLawyer} className='grid grid-cols-2 gap-5'>
              {modalLawyerInput.map(
                (res: any, index: number) =>
                  res.mode !== 'edit' && (
                    <Input
                      key={index}
                      name={res.name}
                      label={res.label}
                      required={res.required}
                      type={res.type}
                      values={res.values}
                      defaultValue={res.defaultValue}
                    />
                  )
              )}
              <div className='col-span-2'>
                <label className='font-bold' htmlFor='Notes'>
                  Notes
                </label>
                <textarea
                  name='Notes'
                  className='border border-gray-300 rounded-md w-full p-1 text-sm text-gray-500 '
                />
              </div>
              <div className=''>
                <p className='text-primary font-bold'>Password</p>
                <p
                  onClick={() => setIsopenPassword(true)}
                  className='hover:underline cursor-pointer '
                >
                  Update password
                </p>
              </div>

              <button className='relative'>
                <p className='rounded-md bg-primary text-white inline-block bottom-0 absolute right-0 px-4'>
                  save
                </p>
              </button>
            </form> */}
          </div>
        </div>
        {/* <footer className='flex flex-col gap-6 mt-6'>
          <p>
            Info about the leads assigned to this lawyer{' '}
            <span className='text-gray-500'>
              Since May 1st to present Last active 12:56pm
            </span>
          </p>
          <div className='flex  gap-2 flex-wrap'>
            {modalLawyerStatistics.map((res, index) => (
              <div
                key={index}
                className='flex gap-4 px-4 py-1.5 rounded-lg'
                style={{
                  background: `${res.color}20`,
                  color: res.color,
                }}
              >
                <p className=' '>{res.name}</p>
                <p>: {res.value}</p>
              </div>
            ))}
          </div>
          <div className='flex gap-4 items-center'>
            <p>Status:</p>
            <p
              className='px-4 py-1 rounded-lg'
              style={{
                backgroundColor: `${
                  dataIndex?.status === 'Assignable'
                    ? statusColors.Assignable + 20
                    : statusColors.Unassignable + 20
                }`,
                color: `${
                  dataIndex?.status === 'Assignable'
                    ? statusColors.Assignable
                    : statusColors.Unassignable
                }`,
              }}
            >
              {dataIndex?.status}
            </p>
            <p
              style={
                dataIndex?.status === 'Assignable'
                  ? { color: '#4AD991' }
                  : { color: statusColors.Unassignable }
              }
            >
              {dataIndex?.status === 'Assignable'
                ? ' +10 leads to be assigned '
                : 'This lawyer is at the limit of assigned leads'}
            </p>
          </div>
        </footer> */}
      </Modal>
      {error ? (
        <div>{error}</div>
      ) : (
        <SortableTable
          columns={columns}
          data={dataLeads}
          statusColors={statusColors}
        />
      )}
    </div>
  );
};

export default LeadManagement;
