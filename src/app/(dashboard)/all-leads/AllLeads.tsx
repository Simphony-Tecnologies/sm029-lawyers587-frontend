'use client';
import Button from '@/components/atoms/Button';
import Modal from '@/components/organisms/Modal';
import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import { useLeadsStore } from '@/store/useLead.store';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const AllLeads = () => {
  dayjs.extend(utc);
  const { user } = useAuth();
  const [userId, setUserId] = useState<any>(null);
  const { dataLeads } = useLeadsStore();
  const [isOpenLead, setIsOpenLead] = useState(false);
  const [lawyerData, setLawyerData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selectedLead, setSelectedLead] = useState<any>({});

  const statusColors: any = {
    NEW: '#8280FF',
    ASSIGNED: '#4AD991',
    EXPIRED: '#FF0300',
    PROBLEMATIC: '#FEC53D',
  };
  const columndemo = [
    'Date',
    'Code',
    'Lead Name',
    'Service Type',
    'Description',
    ' Time Left to action',
    'Status',
    'Contact',
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
  const handleContact = (index: number) => {
    setIsOpenLead(true);
    if (lawyerData) setSelectedLead(lawyerData[index]);
  };
  useEffect(() => {
    getLawyer();
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
          <div className='grid grid-cols-3 gap-2 '>
            <p className=''>Status:</p>
            <p
              className=' text-gray-500 capitalize-first rounded-md text-center font-semibold'
              style={{
                color: statusColors[selectedLead?.status],
                backgroundColor: statusColors[selectedLead?.status] + 20,
              }}
            >
              {selectedLead?.status}
            </p>
            <p></p>
            <p>Email:</p>
            <p className='col-span-2 text-gray-500 '>{selectedLead?.email}</p>
            <p>User Role:</p>
            <p className='col-span-2 text-gray-500'>{selectedLead?.service}</p>
            <p>Description:</p>
            <p className='col-span-2 text-gray-500'>
              {selectedLead?.['description lead']}
            </p>
            <p>Comment:</p>
            <textarea
              className='col-span-2 text-gray-500 border-2 bg-gray-100 rounded-md'
              placeholder=' Leave your comment.....'
            ></textarea>
            <p></p>
            <p className='flex gap-1 col-span-2 text-gray-500 '>
              <input
                id={`checkbox-lead`} // Usa un id único
                className='peer hidden'
                type='checkbox'
              />
              <label
                htmlFor={`checkbox-lead`} // Asegúrate de que el label apunte al id único
                className='flex items-center justify-center w-5 h-5 border border-green-500 rounded bg-white cursor-pointer relative  text-white peer-checked:text-green-500'
              >
                <i className='fi fi-rr-check absolute  text-sm  peer-checked:block '></i>
              </label>{' '}
              Not contact this lead again
            </p>
            <div className='col-end-4 text-right'>
              <Button name='Save' type='button' />
            </div>
          </div>
          <p className='text-red-500 text-sm py-4'>
            The super admin will review this case, leave us a clear comment.
          </p>
        </div>
      </Modal>
      <Tilte
        name={`${userId?.firstName} ${userId?.lastName}`}
        des={userId?.service_type?.name}
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
