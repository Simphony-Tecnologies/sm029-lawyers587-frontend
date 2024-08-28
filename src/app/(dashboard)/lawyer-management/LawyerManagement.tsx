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
import { modalNewLawyerInput } from '@/configs/modalNewLawyer.config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useLeadsStore } from '@/store/useLead.store';
import SkeletonText from '@/components/atoms/SkeletonText';
import { useSelectStatus } from '@/store/useSelectStatus';

const LawyerManagement = () => {
  const [data, setData] = useState<any>(null);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenNew, setIsOpenNew] = useState(false);
  const [dataIndex, setDataIndex] = useState<any>();
  const [searchText, setSearchText] = useState<string>('');
  const [searchedResults, setSearchedResults] = useState<LawyerData[]>([]);
  const [dataServiceType, setDataServiceType] = useState([]);
  const [withOutFormat, setWithOutFormat] = useState<any>([]);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [file, setFile] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isOpenPassword, setIsopenPassword] = useState(false);
  const [lawyerStatistic, setLawyerStatistic] = useState(modalLawyerStatistics);
  const [assignable, setAssignable] = useState<any>(null);
  const { dataLeads } = useLeadsStore();
  const [dataLawyerLeads, setDataLawyerLeads] = useState<any>(null);
  const [dataLawyerServices, setDataLawyerServices] = useState<any>(null);
  const [labelService, setLabelService] = useState<any>(null);

  const [dataProject, setDataProject] = useState(null);
  const [selectedOptionsService, setSelectedOptionsService] = useState<any[]>(
    []
  );
  const [originalData, setOriginalData] = useState([]);

  const [formValues, setFormValues] = useState(() => {});
  const { setSelecArray } = useSelectStatus();

  const router = useRouter();
  dayjs.extend(utc);
  const formatResponse = (data: any) => {
    return {
      code: data.id,
      'lawyer name': `${data.firstName} ${data.lastName}`,
      email: data.email,
      role: data.role.name,
      'phone number': data.phone,
      'service type': data.service_type ? data.service_type : null,
      'leads pulled': `${data.totalLeads ? data.totalLeads : 0}/${
        data.max_leads
      }`,
      'active leads': `${data.activeLeads ? data.activeLeads : 0}`,
      'no leads lost': `${data.lost ? data.lost : 0}`,
      'last active': data.last_login,
      status:
        data.status === undefined
          ? null
          : data.status
          ? 'Assignable'
          : 'Unassignable',
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
      getTotalLeads(data);
      const dataFormat = data.map(formatResponse);
      setOriginalData(dataFormat);
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
  const getExtraData = async () => {
    const dataLawyer = await database.getLeadsAssigned();

    if (!dataLawyer.success) {
      return toast.error('Error to get leads assigned');
    }
    setDataLawyerLeads(dataLawyer.data);
    const dataServiceTypeLawyer = await database.getSelectTypeLawyer();
    if (!dataServiceTypeLawyer.success) {
      return toast.error('Error to get leads assigned');
    }
    setDataLawyerServices(dataServiceTypeLawyer.data);
  };

  const getTotalLeads = (data: any) => {
    data.map(async (res: any) => {
      if (!!res.lawyersServices && labelService) {
        // const filterItemsServices = dataLawyerServices.filter(
        //   (item: any) => item['lawyer_id'] === parseInt(res.id)
        // );

        const filtertypes = res.lawyersServices.map((item: any) => {
          const matchingLabel = labelService.find(
            (label: any) => label.value === item.service_type_id
          );
          return matchingLabel ? { ...matchingLabel } : null;
        });
        res.service_type = filtertypes;
      }

      if (
        !!dataLeads &&
        dataLeads.length > 0 &&
        Array.isArray(dataLawyerLeads)
      ) {
        const filterItems = dataLawyerLeads.filter(
          (item: any) => item['lawyer_id'] === parseInt(res.id)
        );
        const filterLeads = dataLeads.filter((item: any) =>
          filterItems
            .map((filterItem: any) => filterItem.lead)
            .includes(item['lead id'])
        );

        res.totalLeads = filterLeads.length;
        res.activeLeads = filterLeads.filter(
          (item: any) =>
            item.status === 'ASSIGNED' ||
            item.status === 'IN PROGRESS' ||
            item.status === 'CLOSED' ||
            item.status === 'PROBLEMATIC'
        ).length;
        res.lost = filterLeads.filter(
          (item: any) => item.status === 'LOST'
        ).length;
        res.status =
          parseInt(res.max_leads) - parseInt(filterLeads.length) > 0
            ? true
            : false;
        setDataProject(res);
        dataProject;
      }
    });
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
  const selectLabel = (data: { name: string; id: string }[]) =>
    data.map((item) => ({
      label: item.name,
      value: item.id,
    }));
  const handleChangenewLawyer = (selected: any) => {
    setSelectedOptionsService(selected);
    getExtraData();
  };
  const handleChangeService = async (selected: any) => {
    const removedOptions = selectedOptionsService.filter(
      (option) => !selected.includes(option)
    );
    const addedOptions = selected.filter(
      (option: any) => !selectedOptionsService.includes(option)
    );

    if (addedOptions.length > 0) {
      const updateData = {
        lawyer_id: dataIndex.id,
        service_type_id: addedOptions[0].value,
      };
      const updatingData = await database.insertData(
        process.env.NEXT_PUBLIC_URL_LAWYERS_SERVICE || '',
        updateData
      );
      if (updatingData.success) {
        toast.success('Area of law add correctly');
      }
    }
    if (removedOptions.length > 0) {
      const matchingService = dataLawyerServices.find(
        (service: any) =>
          service.lawyer_id === dataIndex.id &&
          service.service_type_id === removedOptions[0].value
      );

      const deletingData = await database.deleteData(
        `${process.env.NEXT_PUBLIC_URL_LAWYERS_SERVICE}/${matchingService.id}`
      );

      if (deletingData.success) {
        toast.success('Area of law remove correctly');
      }
    }
    setSelectedOptionsService(selected);
    fetchData();
    getExtraData();
  };
  const handleEdit = (index: number) => {
    setIsOpen(true);
    setImagePreview(null);
    setDataIndex(withOutFormat[index]);
    modalLawyerInput[0].defaultValue = withOutFormat[index].firstName;
    modalLawyerInput[1].defaultValue = withOutFormat[index].lastName;
    modalLawyerInput[3].defaultValue = withOutFormat[index].phone;
    modalLawyerInput[4].defaultValue = withOutFormat[index].email;
    modalLawyerInput[6].defaultValue = withOutFormat[index].max_leads;
    modalLawyerInput[8].defaultValue = withOutFormat[index].role.id;
    modalLawyerInput[9].defaultValue = withOutFormat[index].is_active;
    modalLawyerInput[7].defaultValue = withOutFormat[index].law_firm;

    const filterItems = dataLawyerLeads.filter(
      (item: any) => item.lawyer_id === parseInt(withOutFormat[index].id)
    );

    // const filterService = dataLawyerServices.filter(
    //   (item: any) => item.lawyer_id === parseInt(withOutFormat[index].id)
    // );

    if (!!withOutFormat[index].lawyersServices && labelService) {
      const filtertypes = withOutFormat[index].lawyersServices.map(
        (item: any) => {
          const matchingLabel = labelService.find(
            (label: any) => label.value === item.service_type_id
          );
          return matchingLabel ? { ...matchingLabel } : null;
        }
      );

      modalLawyerInput[2].defaultValue = filtertypes;
      setSelectedOptionsService(filtertypes);
    }

    if (!!dataLeads && dataLeads.length > 0) {
      const filterLeads = dataLeads.filter((item: any) =>
        filterItems
          .map((filterItem: any) => filterItem.lead)
          .includes(item['lead id'])
      );
      const updatedStatistics = [...lawyerStatistic];

      updatedStatistics[0].value = filterLeads.length;
      updatedStatistics[1].value =
        parseInt(withOutFormat[index].max_leads) - parseInt(filterLeads.length);
      updatedStatistics[2].value = filterLeads.filter(
        (item: any) =>
          item.status === 'ASSIGNED' ||
          item.status === 'IN PROGRESS' ||
          item.status === 'CLOSED'
      ).length;
      updatedStatistics[3].value = filterLeads.filter(
        (item: any) => item.status === 'LOST'
      ).length;
      updatedStatistics[4].value = filterLeads.filter(
        (item: any) => item.status === 'REASSIGNED'
      ).length;

      setLawyerStatistic(updatedStatistics);
      const isAssignable =
        parseInt(withOutFormat[index].max_leads) -
          parseInt(filterLeads.length) >
        0
          ? true
          : false;
      const toBeAssigned =
        parseInt(withOutFormat[index].max_leads) - parseInt(filterLeads.length);
      setAssignable({
        isAssignable: isAssignable,
        toBeAssigned: toBeAssigned,
      });
    }
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
    // if (!file) {
    //   toast.error('No picture selected');
    //   return;
    // }
    const data = {
      firstName: e.target.firstName.value,
      lastName: e.target.lastname.value,
      email: e.target.email.value,
      phone: e.target.phone.value,
      role_id: e.target.role_id.value,
      password: e.target.password.value,
      max_leads: e.target.max_leads.value,
      law_firm: e.target.name_of_law_firm.value,
      notes: e.target.notes.value,
      is_active: e.target.is_active.value === 'true',
    };

    const creatingLawyer = await database.CreateLawyer(data);

    if (!creatingLawyer.success) {
      return toast.error('Email exists or error to create lawyer');
    }

    const insertService = selectedOptionsService.map(async (item) => {
      const dataAssignedServide = {
        lawyer_id: creatingLawyer.data.data.id,
        service_type_id: item.value,
      };
      await database.insertData(
        `${process.env.NEXT_PUBLIC_URL_LAWYERS_SERVICE}`,
        dataAssignedServide
      );
      // if (!insertServicesLawyer.success) {
      //   toast.error('Error assigning Area of lawyer ');
      // }
    });
    await Promise.all(insertService);
    const formData = new FormData();
    formData.append('id', creatingLawyer.data.data.id.toString());
    formData.append('file', file);
    await database.uploadProfile(formData);
    setFile(null);
    setFormValues(() => {});
    fetchData();
    getExtraData();
    setIsOpenNew(false);
  };
  const UpdateLawyer = async (e: any) => {
    e.preventDefault();

    const data = {
      firstName: e.target.firstName.value,
      lastName: e.target.lastname.value,
      email: e.target.email.value,
      phone: e.target.phone.value,
      role_id: parseInt(e.target.role_id.value),
      max_leads: e.target.max_leads.value,
      is_active: e.target.is_active.value === 'true',
      law_firm: e.target.name_of_law_firm.value,
      notes: e.target.notes.value,
      updated_at: new Date(),
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
    setLabelService(selectLabel(resType.data));
    modalLawyerInput[2].values = selectLabel(resType.data);
    modalNewLawyerInput[2].values = selectLabel(resType.data);
  };
  const getRole = async () => {
    const roles = await database.getData(
      process.env.NEXT_PUBLIC_URL_ROLES || ''
    );

    if (!roles.success) {
      return toast.error('Error to get role');
    }
    modalLawyerInput[8].values = formaterSelect(roles.data);
    modalNewLawyerInput[8].values = formaterSelect(roles.data);
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
  const newLawyer = () => {
    setIsOpenNew(true);
    setImagePreview(null);
  };
  const filterSearch = (text: string) => {
    if (text) {
      const filterData = originalData.filter(
        (item: any) =>
          item?.['lawyer name'].toLowerCase().includes(text.toLowerCase()) ||
          item?.email.toLowerCase().includes(text.toLowerCase()) ||
          item?.['phone number'].toLowerCase().includes(text.toLowerCase())
      );
      setData(filterData);
      return filterData;
    }
    setData(originalData);
  };
  const handleFormNewLawyerPersist = (e: any) => {
    const { name, value } = e.target;
    setFormValues((prevValues: any) => ({
      ...prevValues,
      [name]: value,
    }));
  };

  const handleClickCard = (index: any) => {
    const setData = [
      { value: 'NEW', index: 0 },
      { value: 'ASSIGNED', index: 1 },
      { value: 'PROBLEMATIC', index: 2 },
      { value: 'IN PROGRESS', index: 2 },
      { value: 'LOST', index: 3 },
      { value: 'EXPIRED', index: 3 },
      { value: 'DISABLE', index: 3 },
    ];
    const valuesCards = setData.filter((item: any) => item.index === index);
    setSelecArray(valuesCards.map((res: any) => res.value));
    router.push(`/lawyer-management/${dataIndex.id}`);
  };
  useEffect(() => {
    getServiceType();
    getRole();
  }, []);
  useEffect(() => {
    fetchData();
    getExtraData();
  }, [dataLeads, dataProject === null, dataLawyerLeads === null]);

  return (
    <div className='mx-auto flex flex-col gap-5'>
      <Modal title='Lawyer Details' isOpen={isOpen} setIsOpen={setIsOpen}>
        <div className='p-5 border-2 border-t-none border-solid rounded-lg border-gray-200'>
          <div className='flex flex-col gap-5'>
            <div className='text-gray-500 text-sm'>Code: {dataIndex?.id}</div>
            <div className='flex items-center gap-2'>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt='Preview'
                  width={300}
                  height={300}
                  className='object-cover rounded-full w-20 h-20  '
                />
              ) : dataIndex?.profile_image_url ? (
                <img
                  src={dataIndex.profile_image_url}
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

              <MdOutlineImage size={24} />
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
                      handleChangeService={handleChangeService}
                      //onChange={handleChangeService}
                    />
                  )
              )}
              <div className='col-span-2'>
                <label className='font-bold' htmlFor='Notes'>
                  Notes
                </label>
                <textarea
                  defaultValue={dataIndex?.notes}
                  name='notes'
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
              Since{' '}
              {dayjs
                .utc(dataIndex?.created_at)
                .local()
                .format('MM/DD/YYYY hh:mm:ss a')}{' '}
              to present Last active{' '}
              {dayjs
                .utc(dataIndex?.last_login)
                .local()
                .format('MM/DD/YYYY hh:mm:ss a')}
            </span>
          </p>
          <div className='flex  gap-2 flex-wrap'>
            {lawyerStatistic.map((res: any, index) => (
              <div
                onClick={
                  parseInt(res?.value) <= 0
                    ? () => toast.error('That value is 0')
                    : handleClickCard
                }
                key={index}
                className='flex gap-4 px-4 py-1.5 rounded-lg hover:scale-105 cursor-pointer'
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
            {assignable === null ? (
              <div className='w-full'>
                <SkeletonText />
              </div>
            ) : (
              <>
                <p
                  className='px-4 py-1 rounded-lg '
                  style={{
                    backgroundColor: `${
                      !!assignable.isAssignable
                        ? statusColors.Assignable + 20
                        : statusColors.Unassignable + 20
                    }`,
                    color: `${
                      !!assignable.isAssignable
                        ? statusColors.Assignable
                        : statusColors.Unassignable
                    }`,
                  }}
                >
                  {!!assignable.isAssignable ? 'Assignable' : 'Unassignable'}
                </p>
                <p
                  style={
                    !!assignable.isAssignable
                      ? { color: '#4AD991' }
                      : { color: statusColors.Unassignable }
                  }
                >
                  {!!assignable.isAssignable
                    ? `${assignable.toBeAssigned} leads to be assigned`
                    : 'This lawyer is at the limit of assigned leads'}
                </p>
              </>
            )}
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

              <MdOutlineImage size={24} />
            </div>
            <form onSubmit={createlawyer} className='grid grid-cols-2 gap-5'>
              {modalNewLawyerInput.map((res: any, index: number) => (
                <Input
                  key={index}
                  name={res.name}
                  label={res.label}
                  required={res.required}
                  type={res.type}
                  values={res.values}
                  defaultValue={formValues?.[res.name]}
                  onChange={handleFormNewLawyerPersist}
                />
              ))}

              <div className='col-span-2'>
                <label className='font-bold' htmlFor='notes'>
                  Notes
                </label>
                <textarea
                  defaultValue={formValues?.['notes']}
                  onChange={handleFormNewLawyerPersist}
                  name='notes'
                  id='notes'
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
      <Modal
        title='Delete'
        isOpen={isOpenDelete}
        setIsOpen={setIsOpenDelete}
        className='max-w-sm'
      >
        <div className='flex flex-col gap-4'>
          <div className='flex justify-center text-center'>
            <p>
              Are you sure you want to delete the user{' '}
              <span className='font-medium'>{dataIndex?.firstName}?</span>
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
        filterSearch={filterSearch}
      />
      <div className='flex justify-end '>
        <Button name='+ New Lawyer' type='button' onClick={newLawyer} />
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
