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
import Button from '@/components/atoms/Button';
import toast from 'react-hot-toast';
const LawyerManagement = () => {
  const [data, setData] = useState<LawyerData[]>([]);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenNew, setIsOpenNew] = useState(false);
  const [dataIndex, setDataIndex] = useState<LawyerData>();
  const [searchText, setSearchText] = useState<string>('');
  const [searchedResults, setSearchedResults] = useState<LawyerData[]>([]);
  const [dataServiceType, setDataServiceType] = useState([]);
  const fetchData = async () => {
    try {
      const response = await database.getData(
        process.env.NEXT_PUBLIC_URL_LAWYER_MANAGMENT || ''
      );

      if (!response.success) {
        throw new Error('Network response was not ok');
      }

      const data = response.data;

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

  const statusColors = {
    Assignable: '#00B69B',
    Unassignable: '#FF4240',
  };
  const formaterSelect = (data: { name: string; id: string }[]) =>
    data.map((item) => ({
      name: item.name,
      value: item.id,
    }));
  const handleEdit = (index: number) => {
    setIsOpen(true);

    if (data) {
      setDataIndex(data[index]);
      modalLawyerInput[0].defaultValue = data[index].firstName;
      modalLawyerInput[1].defaultValue = data[index].lastName;
      modalLawyerInput[2].values = formaterSelect(dataServiceType);
    }
  };
  console.log(dataServiceType);

  const handleDelete = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
  };
  const createlawyer = async (e: any) => {
    e.preventDefault();

    const data = {
      firstName: e.target.name.value,
      lastName: e.target.lastname.value,
      email: e.target.email.value,
      phone: e.target.phone.value,
      code: 'ABCD1234',
      service_type_id: e.target.service_type_id.value,
      role_id: e.target.role_id.value,
      password: e.target.password.value,
      max_leads: e.target.password.value,
      is_active: true,
    };
    await database.CreateLawyer(data);
    fetchData();
    setIsOpenNew(false);
  };
  const getServiceType = async () => {
    const resType = await database.getData(
      process.env.NEXT_PUBLIC_URL_SERVICE_TYPE || ''
    );
    if (!resType.success) {
      return toast.error('Error to get service type');
    }
    setDataServiceType(resType.data);
    modalLawyerInput[2].values = formaterSelect(resType.data);
  };
  useEffect(() => {
    fetchData();
    getServiceType();
  }, []);
  useEffect(() => {
    if (searchText) {
      return setData(searchedResults);
    }
    fetchData();
  }, [searchText]);
  return (
    <div className='container mx-auto p-4 flex flex-col gap-5'>
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
              {modalLawyerInput.map((res: any, index) => (
                <Input
                  key={index}
                  name={res.name}
                  label={res.label}
                  required={res.required}
                  type={res.type}
                  defaultValue={res.defaultValue}
                  values={res.values}
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
      <Modal title='New Lawyer ' isOpen={isOpenNew} setIsOpen={setIsOpenNew}>
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
            <form onSubmit={createlawyer} className='grid grid-cols-2 gap-5'>
              {modalLawyerInput.map((res: any, index) => (
                <Input
                  key={index}
                  name={res.name}
                  label={res.label}
                  required={res.required}
                  type={res.type}
                  values={res.values}
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
              <div className='col-span-2 flex justify-end'>
                <Button name='Save' type='submit' />
              </div>
            </form>
          </div>
        </div>
      </Modal>
      <Tilte
        name='Lawyer Management'
        search={true}
        setSearchText={setSearchText}
        setSearchedResults={setSearchedResults}
        dataFilter={data}
      />
      <div className='flex justify-end '>
        <Button
          name='+ New Lawyer'
          type='button'
          onClick={() => setIsOpenNew(true)}
        />
      </div>

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
