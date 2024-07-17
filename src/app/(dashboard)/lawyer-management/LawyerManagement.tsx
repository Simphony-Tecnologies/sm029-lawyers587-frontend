'use client';
import Input from '@/components/atoms/Input';
import Tilte from '@/components/organisms/Tilte';
import Modal from '@/components/organisms/Modal';
import SortableTable from '@/components/organisms/SortableTable';
import {
  modalLawyerInput,
  modalLawyerStatistics,
} from '@/configs/modalLawyer.config';
import { database } from '@/services/database';
import { useState, useEffect } from 'react';
import { MdOutlineImage, MdSaveAlt } from 'react-icons/md';
import SearchInput from '@/components/atoms/SearchInput';

const LawyerManagement = () => {
  const [data, setData] = useState<LawyerData[]>([]);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);
  let [isOpen, setIsOpen] = useState(false);
  const [dataIndex, setDataIndex] = useState<LawyerData>();
  const [searchText, setSearchText] = useState<string>('');
  const [searchedResults, setSearchedResults] = useState<LawyerData[]>([]);
  const fetchData = async () => {
    try {
      const response = await database.getData(
        process.env.NEXT_PUBLIC_URL_LAWYER_MANAGMENT || ''
      );

      if (!response.success) {
        throw new Error('Network response was not ok');
      }

      const data = response.data;
      // if (searchText) {
      //   return setData(searchedResults);
      // }
      setData(data);

      if (data.length > 0) {
        const firstItem = data[0];
        const titles: any = Object.keys(firstItem);
        setColumns(titles);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    if (searchText) {
      return setData(searchedResults);
    }
    fetchData();
  }, [searchText]);

  const statusColors = {
    Assignable: '#00B69B',
    Unassignable: '#FF4240',
  };

  const handleEdit = (index: number) => {
    setIsOpen(true);
    if (data) {
      setDataIndex(data[index]);
      modalLawyerInput[0].defaultValue = data[index].firstName;
      modalLawyerInput[1].defaultValue = data[index].service_type.name;
      modalLawyerInput[2].defaultValue = data[index].email;
      modalLawyerInput[3].defaultValue = data[index].phone;
      modalLawyerInput[4].defaultValue = data[index].max_leads;
      //modalLawyerInput[5].defaultValue = data[index].active_leads;
    }
  };

  const handleDelete = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
  };

  return (
    <div className='container mx-auto p-4'>
      <Modal title='Lawyer Details' isOpen={isOpen} setIsOpen={setIsOpen}>
        <div className='p-5 border-2 border-t-none border-solid rounded-lg border-gray-200'>
          <div className='flex flex-col gap-5'>
            <div className='text-gray-500 text-sm'>Code: {dataIndex?.code}</div>
            <div className='flex items-center gap-2'>
              <div className='w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 cursor-pointer'>
                <MdOutlineImage size={32} />
              </div>
              <p className='hover:underline cursor-pointer'>Change image</p>
              <MdSaveAlt size={24} />
            </div>
            <form className='grid grid-cols-2 gap-5'>
              {modalLawyerInput.map((res, index) => (
                <Input
                  key={index}
                  name={res.name}
                  defaultValue={res.defaultValue}
                />
              ))}
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
                <p className='hover:underline cursor-pointer '>
                  Update password
                </p>
              </div>

              <button className='relative'>
                <p className='rounded-md bg-primary text-white inline-block bottom-0 absolute right-0 px-4'>
                  save
                </p>
              </button>
            </form>
          </div>
        </div>
        <footer className='flex flex-col gap-6 mt-6'>
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
        </footer>
      </Modal>
      <Tilte
        name='Lawyer Management'
        search={true}
        setSearchText={setSearchText}
        setSearchedResults={setSearchedResults}
        dataFilter={data}
      />
      <SortableTable
        columns={columns}
        data={data as any}
        statusColors={statusColors}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default LawyerManagement;
