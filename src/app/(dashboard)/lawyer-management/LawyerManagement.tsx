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
import Image from 'next/image';
import { modalUpdatePassword } from '@/configs/modalUpdatePassword.confing';
import { useRouter } from 'next/navigation';
const LawyerManagement = () => {
  const [data, setData] = useState<LawyerData[]>([]);

  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenNew, setIsOpenNew] = useState(false);
  const [dataIndex, setDataIndex] = useState<any>();

  const [searchText, setSearchText] = useState<string>('');
  const [searchedResults, setSearchedResults] = useState<LawyerData[]>([]);
  const [dataServiceType, setDataServiceType] = useState([]);
  const [withOutFormat, setWithOutFormat] = useState<LawyerData[]>([]);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [file, setFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isOpenPassword, setIsopenPassword] = useState(false);
  const router = useRouter();
  const formatResponse = (data: any) => {
    return {
      code: data.id,
      'lawyer name': `${data.firstName} ${data.lastName}`,
      email: data.email,
      'phone number': data.phone,
      'service type': data.service_type,
      'leads pulled': `0/${data.max_leads}`,
      'active leads': 0,
      'no leads lost': 0,
      'last active': data.last_login,
      status: data.is_active ? 'Assignable' : 'Unassignable',
    };
  };
  const fetchData = async () => {
    try {
      const response = await database.getData(
        process.env.NEXT_PUBLIC_URL_LAWYER_MANAGMENT || ''
      );

      if (!response.success) {
        throw new Error('Network response was not ok');
      }
      const data = response.data;
      setWithOutFormat(data);
      const dataFormat = data.map(formatResponse);
      setData(dataFormat);

      if (data.length > 0) {
        const firstItem = dataFormat[0];
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
  const handleEdit = async (index: number) => {
    setIsOpen(true);
    setImagePreview(null);
    modalLawyerInput[0].defaultValue = withOutFormat[index].firstName;
    modalLawyerInput[1].defaultValue = withOutFormat[index].lastName;
    modalLawyerInput[2].values = formaterSelect(dataServiceType);
    modalLawyerInput[2].defaultValue = withOutFormat[index].service_type.id;
    modalLawyerInput[3].defaultValue = withOutFormat[index].phone;
    modalLawyerInput[4].defaultValue = withOutFormat[index].email;
    modalLawyerInput[6].defaultValue = withOutFormat[index].max_leads;
    modalLawyerInput[8].defaultValue = withOutFormat[index].role.id;
    modalLawyerInput[9].defaultValue = withOutFormat[index].is_active;
    modalLawyerInput[7].defaultValue = withOutFormat[index].law_firm;
    const dataId = await database.getLawyer(withOutFormat[index].id);

    if (!dataId.success) {
      return toast.error('Error to get lawyer');
    }

    setDataIndex(dataId.data.data);
  };

  const handleDelete = async (index: number) => {
    setIsOpenDelete(true);
    const dataId = await database.getLawyer(withOutFormat[index].id);

    if (!dataId.success) {
      return toast.error('Error to get lawyer');
    }
    setDataIndex(dataId.data.data);
  };
  const DeleteLawyer = async () => {
    const dataDelete = await database.DeleteLawyer(dataIndex.id);
    if (!dataDelete.success) {
      return toast.error('Error to delete lawyer');
    }
    toast.success('Success to delete');
    setIsOpenDelete(false);
    fetchData();
  };
  const createlawyer = async (e: any) => {
    e.preventDefault();

    const data = {
      firstName: e.target.firstName.value,
      lastName: e.target.lastname.value,
      email: e.target.email.value,
      phone: e.target.phone.value,
      //code: 'ABCD1234',
      service_type_id: e.target.service_type_id.value,
      role_id: e.target.role_id.value,
      password: e.target.password.value,
      max_leads: e.target.max_leads.value,
      law_firm: e.target.name_of_law_firm.value,
      notes: e.target.notes.value,
      is_active: true,
    };

    await database.CreateLawyer(data);
    fetchData();
    setIsOpenNew(false);
  };
  const UpdateLawyer = async (e: any) => {
    e.preventDefault();

    const data = {
      firstName: e.target.firstName.value,
      lastName: e.target.lastname.value,
      email: e.target.email.value,
      phone: e.target.phone.value,
      service_type_id: parseInt(e.target.service_type_id.value),
      role_id: parseInt(e.target.role_id.value),
      max_leads: e.target.max_leads.value,
      is_active: e.target.is_active.value === 'true',
    };

    const updateData = await database.UpdateLawyer(data as any, dataIndex.id);
    if (updateData.code === 401) {
      return toast.error(updateData.messages);
    }
    fetchData();
    toast.success('Lawyer updated successfully');
    setIsOpen(false);
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
  const getRole = async () => {
    const roles = await database.getData(
      process.env.NEXT_PUBLIC_URL_ROLES || ''
    );

    if (!roles.success) {
      return toast.error('Error to get role');
    }
    //setDataServiceType(resType.data);
    modalLawyerInput[8].values = formaterSelect(roles.data);
    //modalLawyerInput[7].defaultValue = 2;
  };
  const updateImage = (e: any) => {
    e.preventDefault();
    const input = e.target;

    if (input.files && input.files[0]) {
      const maxFileSize = 10485760;
      if (input.files[0].size > maxFileSize) {
        toast.error('Error to update image size');
        return null;
      }
      setFile(input.files[0]);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(input.files[0]);
      input.value = '';
    }
  };
  const updatePassword = async (e: any) => {
    e.preventDefault();
    const newPassword = e.target.new.value;
    const confirmPassword = e.target.confirm.value;
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match');
    }
    const data = {
      password: newPassword,
    };
    const updateData = await database.UpdateLawyer(data as any, dataIndex.id);
    if (updateData.code === 401) {
      return toast.error(updateData.messages);
    }
    fetchData();
    toast.success("Lawyers' password updated successfully");
    setIsopenPassword(false);
  };
  const handleRoute = async (index: number) => {
    const dataId = await database.getLawyer(withOutFormat[index].id);

    router.push(`lawyer-management/${dataId.data.data.id}`);
  };
  useEffect(() => {
    getServiceType();
    getRole();
    fetchData();
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
            <div className='text-gray-500 text-sm'>Code: {dataIndex?.id}</div>
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
                  defaultValue={dataIndex?.notes}
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
            <form onSubmit={createlawyer} className='grid grid-cols-2 gap-5'>
              {modalLawyerInput.map((res: any, index: number) => (
                <Input
                  key={index}
                  name={res.name}
                  label={res.label}
                  required={res.required}
                  type={res.type}
                  values={res.values}
                  defaultValue={res.defaultValue}
                />
              ))}

              <div className='col-span-2'>
                <label className='font-bold' htmlFor='notes'>
                  Notes
                </label>
                <textarea
                  name='notes'
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
      <Modal title='Delete' isOpen={isOpenDelete} setIsOpen={setIsOpenDelete}>
        <div className='flex flex-col gap-4'>
          <div className='flex justify-center text-center'>
            <p>
              Are you sure you want to delete the user{' '}
              <span className='font-medium'>{dataIndex?.firstName}</span>
            </p>
          </div>

          <div className='flex justify-around'>
            <Button
              name='Cancel'
              type='button'
              onClick={() => setIsOpenDelete(false)}
            />
            <Button
              name='Delete'
              type='button'
              color='bg-red-500'
              onClick={DeleteLawyer}
            />
          </div>
        </div>
      </Modal>
      <Modal
        title='Update password'
        isOpen={isOpenPassword}
        setIsOpen={setIsopenPassword}
        className='max-w-sm'
      >
        <div className='p-5 border-2 border-t-none border-solid rounded-lg border-gray-200 '>
          <form className='flex flex-col gap-5' onSubmit={updatePassword}>
            {modalUpdatePassword.map((res: any, index: number) => (
              <Input
                key={index}
                name={res.name}
                label={res.label}
                type={res.type}
                required={res.required}
              />
            ))}
            <div className='flex justify-end'>
              <Button name='Save' type='submit' />
            </div>
          </form>
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
          onClick={() => {
            setIsOpenNew(true);
            setImagePreview(null);
          }}
        />
      </div>

      <SortableTable
        columns={columns}
        data={data as any}
        statusColors={statusColors}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRoute={handleRoute}
      />
    </div>
  );
};

export default LawyerManagement;
