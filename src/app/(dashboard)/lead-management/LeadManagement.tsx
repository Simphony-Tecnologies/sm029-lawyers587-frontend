'use client';

import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { useEffect, useState } from 'react';
import { useLeadsStore } from '@/store/useLead.store';
import { statusColors } from '@/configs/statusColor';
import { useSelectStatus } from '@/store/useSelectStatus';
import Modal from '@/components/organisms/Modal';
import dayjs from 'dayjs';
import { database } from '@/services/database';
import toast from 'react-hot-toast';
import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';
import CountdownTimer from '@/components/organisms/CountdownTimer';
const LeadManagement = () => {
  const { columns, dataLeads, error, fetchLeads }: any = useLeadsStore();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [filterData, setFilterData] = useState(dataLeads);
  //const [selecArray, setselecArray] = useState([]);
  const [uniqueStatuses, setUniqueStatuses] = useState([]);
  const { selecArray, setSelecArray } = useSelectStatus();
  const [isOpenLead, setIsOpenLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>({});

  const [loading, setloading] = useState(false);

  const statusSelect = [
    {
      name: 'Assigned',
      value: 'ASSIGNED',
    },
    {
      name: 'In progress',
      value: 'IN PROGRESS',
    },
    {
      name: 'New',
      value: 'NEW',
    },
    {
      name: 'Problematic',
      value: 'PROBLEMATIC',
    },
    {
      name: 'Send back',
      value: 'LOST',
    },
    {
      name: 'Closed',
      value: 'CLOSED',
    },
    {
      name: 'Disabled',
      value: 'DISABLED',
    },
    {
      name: 'Dead',
      value: 'EXPIRED',
    },
  ];
  const lawyerAssigned = async () => {
    const res = await database.fetchData(
      process.env.NEXT_PUBLIC_URL_LEADS_ASSIGNED || ''
    );

    if (!res.success) {
      toast.error('Error conecting with database');
    }
    const updatedDataLeads = filterData.map((items: any) => {
      const lawyer = res.data.find(
        (lawyer: any) => lawyer.lead === items['lead id']
      );
      return {
        ...items,
        lawyer: lawyer
          ? `${lawyer.lawyer.firstName} ${lawyer.lawyer.lastName} `
          : 'No assigned',
      };
    });
    setFilterData(updatedDataLeads);
  };
  const filterSearch = (text: string | null) => {
    if (text) {
      if (dataLeads) {
        const dataFilter = dataLeads.filter(
          (item: any) =>
            item?.['lead name'].toLowerCase().includes(text.toLowerCase()) ||
            item?.email.toLowerCase().includes(text.toLowerCase()) ||
            item?.['phone number'].toLowerCase().includes(text.toLowerCase()) ||
            item?.status.toLowerCase().includes(text.toLowerCase())
        );
        setFilterData(dataFilter);
        return dataFilter;
      }
      return [];
    }
    setFilterData(dataLeads);
    return [];
  };
  const filterArray = () => {
    let accumulatedResults: any[] = [];

    if (dataLeads && selecArray.length > 0) {
      handleStatusClick('');
      selecArray.forEach((keyword: string) => {
        const dataFilter = dataLeads.filter((item: any) =>
          item?.status.toLowerCase().includes(keyword.toLowerCase())
        );

        dataFilter.forEach((lead: any) => {
          if (
            !accumulatedResults.some(
              (accItem) => accItem['lead id'] === lead['lead id']
            )
          ) {
            accumulatedResults.push(lead);
          }
        });
      });

      // Actualiza el estado con los datos acumulados
      setFilterData(accumulatedResults);
      return accumulatedResults;
    }

    // Si no hay texto o keywords, se restablecen los leads originales
    setFilterData(dataLeads);
    return dataLeads;
  };
  const handleStatusClick = (status: string | null) => {
    setSelecArray([]);
    setSelectedStatus(status);
    filterSearch(status);
  };
  const handleContact = async (index: number) => {
    setIsOpenLead(true);
    if (filterData) {
      setSelectedLead(filterData[index]);

      // if (filterData[index].status === 'ASSIGNED') {
      //   const dataUpdate = {
      //     status: 'IN PROGRESS',
      //   };
      //   await database.updateData(
      //     `${process.env.NEXT_PUBLIC_URL_LEADS}/${filterData[index]['lead id']}`,
      //     dataUpdate
      //   );
      //   fetchLeads();

      //   setSelectedLead({ ...filterData[index], status: 'IN PROGRESS' });
      // }
    }
  };
  const saveLeadContact = async (e: any) => {
    setloading(true);
    e.preventDefault();

    const dataUpdate = {
      status:
        e.target.checkbox.checked === true ? 'DISABLED' : e.target.status.value,
      comments: e.target.comments.value,
      description: e.target.description.value,
    };

    const responseUpdate = await database.updateData(
      `${process.env.NEXT_PUBLIC_URL_LEADS}/${selectedLead['lead id']}`,
      dataUpdate
    );
    if (!responseUpdate.success) {
      setloading(false);
      toast.error('Error updating Lead information');
    }
    toast.success('Lead information updated successfully');
    setIsOpenLead(false);
    fetchLeads();
    setloading(false);
  };

  useEffect(() => {
    filterArray();
    if (dataLeads) {
      const uniqueStatus: any = Array.from(
        new Set(dataLeads.map((item: any) => item.status))
      );
      setUniqueStatuses(uniqueStatus);
    }
  }, [dataLeads]);
  useEffect(() => {
    if (filterData) {
      lawyerAssigned();
    }
  }, [dataLeads]);

  useEffect(() => {
    if (selecArray.length <= 0) {
      fetchLeads();
    }
  }, []);

  return (
    <div className='flex flex-col gap-5'>
      <Modal title='Lead info' isOpen={isOpenLead} setIsOpen={setIsOpenLead}>
        <div className='px-8'>
          <p>
            Selection date :{' '}
            {Object.keys(selectedLead).length > 0 &&
              dayjs
                .utc(selectedLead['date'] as string)
                .local()
                .format('MM/DD/YYYY hh:mm a')}
          </p>
          {selectedLead.status === 'ASSIGNED' && (
            <CountdownTimer targetDate={selectedLead['date_updated']} />
          )}

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
            <textarea
              name='description'
              className='col-span-2 text-gray-500 border-2 bg-gray-100 rounded-md'
              placeholder=' Leave your comment.....'
            >
              {selectedLead?.['description lead']}
            </textarea>

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
              <Button
                name='Save'
                type='submit'
                disabled={loading}
                color={`${
                  loading ? 'bg-gray-500 animate-pulse' : 'bg-primary'
                }`}
              />
            </div>
          </form>
          <p className='text-red-500 text-sm py-4'>
            The super admin will review this case, leave us a clear comment.
          </p>
        </div>
      </Modal>
      <Tilte name='Lead Management' search={true} filterSearch={filterSearch} />
      <div className='flex gap-2 flex-wrap'>
        <button
          onClick={() => handleStatusClick(null)}
          className={`px-4 p-1 rounded text-sm ${
            selectedStatus === null
              ? 'bg-primary bg-opacity-80 text-white'
              : 'bg-gray-200'
          }`}
        >
          All
        </button>
        {uniqueStatuses.map((status: any, index) => (
          <button
            key={index}
            onClick={() => handleStatusClick(status)}
            className={`px-4 p-1 rounded text-sm ${
              selectedStatus === status
                ? 'bg-primary bg-opacity-80 text-white'
                : 'bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>
      {error ? (
        <div>{error}</div>
      ) : (
        <SortableTable
          columns={columns}
          data={filterData}
          statusColors={statusColors}
          onEdit={handleContact}
        />
      )}
    </div>
  );
};

export default LeadManagement;
