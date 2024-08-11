'use client';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Modal from '@/components/organisms/Modal';
import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { statusColors } from '@/configs/statusColor';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import { useLeadsStore } from '@/store/useLead.store';
import { getNameServiceLawyer } from '@/utils/getNameServiceLawyer';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const AllLeads = () => {
  dayjs.extend(utc);
  const { user } = useAuth();
  const [userId, setUserId] = useState<any>(null);
  const { dataLeads, fetchLeads } = useLeadsStore();
  const [isOpenLead, setIsOpenLead] = useState(false);
  const [lawyerData, setLawyerData] = useState<any>(null);
  const [columns, setColumns] = useState([]);
  const [selectedLead, setSelectedLead] = useState<any>({});
  const [dataServiceType, setDataServiceType] = useState([]);

  const statusSelect = [
    {
      name: 'In progress',
      value: 'IN PROGRESS',
    },
    {
      name: 'Problematic',
      value: 'PROBLEMATIC',
    },
    {
      name: 'Lost',
      value: 'LOST',
    },
    {
      name: 'Closed',
      value: 'CLOSED',
    },
  ];
  const getLawyer = async () => {
    if (Object.keys(user).length > 0) {
      const dataLawyerUser = await database.getLawyer(user.id);
      setUserId(dataLawyerUser.data.data);
    }
    const dataLawyer = await database.getLeadsAssigned();

    if (!dataLawyer.success) {
      return toast.error('Error to get leads assigned');
    }

    const firstItem = dataLawyer.data;
    const filterItems = firstItem.filter(
      (item: any) => item.lawyer_id === parseInt(user.id)
    );
    if (!dataLeads) return [];
    if (dataLeads.length > 0) {
      const filterLeads = dataLeads.filter((item: any) =>
        filterItems
          .map((filterItem: any) => filterItem.lead)
          .includes(item['lead id'])
      );

      setLawyerData(filterLeads);
      if (filterLeads.length > 0) {
        const titles: any = Object.keys(filterLeads[0]);

        setColumns(titles);
      }
    }
  };
  const handleContact = async (index: number) => {
    setIsOpenLead(true);
    if (lawyerData) {
      setSelectedLead(lawyerData[index]);

      if (lawyerData[index].status === 'ASSIGNED') {
        const dataUpdate = {
          status: 'IN PROGRESS',
        };
        await database.updateData(
          `${process.env.NEXT_PUBLIC_URL_LEADS}/${lawyerData[index]['lead id']}`,
          dataUpdate
        );
        fetchLeads();

        setSelectedLead({ ...lawyerData[index], status: 'IN PROGRESS' });
      }
    }
  };
  const getServiceType = async () => {
    const resType = await database.getData(
      process.env.NEXT_PUBLIC_URL_SERVICE_TYPE || ''
    );
    if (!resType.success) {
      return toast.error('Error to get service type');
    }

    setDataServiceType(resType.data);
  };
  const saveLeadContact = async (e: any) => {
    e.preventDefault();

    const dataUpdate = {
      status:
        e.target.checkbox.checked === true ? 'DISABLED' : e.target.status.value,
      comments: e.target.comments.value,
    };

    const responseUpdate = await database.updateData(
      `${process.env.NEXT_PUBLIC_URL_LEADS}/${selectedLead['lead id']}`,
      dataUpdate
    );
    if (!responseUpdate.success) {
      toast.error('Error updating Lead information');
    }
    toast.success('Lead information updated successfully');
    setIsOpenLead(false);
    fetchLeads();
    getLawyer();
  };
  useEffect(() => {
    getLawyer();
    getServiceType();
  }, [user, dataLeads]);

  return (
    <div className='flex flex-col gap-5'>
      <Modal title='Lead info' isOpen={isOpenLead} setIsOpen={setIsOpenLead}>
        <div className='px-8'>
          <p>
            Selection date :{' '}
            {dayjs
              .utc(selectedLead['date'] as string)
              .local()
              .format('MM/DD/YYYY hh:mm a')}
          </p>
          <p className='text-red-500'>
            This lead will be marked as lost and will not be reinstated.
          </p>
          <p className='text-4xl py-6 '>{selectedLead?.['lead name']}</p>
          <form onSubmit={saveLeadContact} className='grid grid-cols-3 gap-2 '>
            <p className=''>Status:</p>

            <Input
              type='select'
              name='status'
              values={statusSelect}
              statusColors={statusColors}
              defaultValue={selectedLead?.status}
            />
            <p></p>
            <p>Email:</p>
            <p className='col-span-2 text-gray-500 '>{selectedLead?.email}</p>
            <p>Phone number:</p>
            <p className='col-span-2 text-gray-500'>
              {selectedLead?.['phone number']}
            </p>
            <p>Service Type:</p>
            <p className='col-span-2 text-gray-500'>{selectedLead?.service}</p>
            <p>Description:</p>
            <p className='col-span-2 text-gray-500'>
              {selectedLead?.['description lead']}
            </p>
            <p>Comment:</p>
            <textarea
              name='comments'
              className='col-span-2 text-gray-500 border-2 bg-gray-100 rounded-md'
              placeholder=' Leave your comment.....'
            >
              {selectedLead?.comments}
            </textarea>
            <p></p>
            <p className='flex gap-1 col-span-2 text-gray-500 '>
              <input
                name='checkbox'
                id={`checkbox-lead`}
                className='peer hidden'
                type='checkbox'
              />
              <label
                htmlFor={`checkbox-lead`}
                className='flex items-center justify-center w-5 h-5 border border-green-500 rounded bg-white cursor-pointer relative  text-white peer-checked:text-green-500'
              >
                <i className='fi fi-rr-check absolute  text-sm  peer-checked:block '></i>
              </label>{' '}
              Not contact this lead again
            </p>
            <div className='col-end-4 text-right'>
              <Button name='Save' type='submit' />
            </div>
          </form>
          <p className='text-red-500 text-sm py-4'>
            The super admin will review this case, leave us a clear comment.
          </p>
        </div>
      </Modal>
      <Tilte
        name={`${userId?.firstName} ${userId?.lastName}`}
        des={getNameServiceLawyer(userId?.lawyersServices, dataServiceType).map(
          (res: any) => (
            <p key={res?.id}>{res?.name.replace(' Lawyer', '')}</p>
          )
        )}
      />

      <SortableTable
        columns={columns}
        data={lawyerData}
        statusColors={statusColors}
        onContact={handleContact}
      />
    </div>
  );
};

export default AllLeads;
