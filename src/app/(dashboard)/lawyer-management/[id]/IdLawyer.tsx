'use client';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import CountdownTimer from '@/components/organisms/CountdownTimer';
import Modal from '@/components/organisms/Modal';
import NoData from '@/components/organisms/NoData';
import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { statusColors } from '@/configs/statusColor';
import { statusSelectAll } from '@/constants/status';
import { database } from '@/services/database';
import { useLeadsStore } from '@/store/useLead.store';
import { useSelectStatus } from '@/store/useSelectStatus';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdOutlineCases } from 'react-icons/md';

const IdLawyer = ({ params }: { params: { id: string } }) => {
  const [lawyerData, setLawyerData] = useState<any>(null);

  const { dataLeads, fetchLeads } = useLeadsStore();
  const [userId, setUserId] = useState<any>(null);
  const [columns, setColumns] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const { selecArray, setSelecArray } = useSelectStatus();
  const [isOpenLead, setIsOpenLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>({});
  const [selectedChange, setSelectedChange] = useState('');
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
      name: 'Retained',
      value: 'CLOSED',
    },
    {
      name: 'Disabled',
      value: 'DISABLED',
    },
  ];
  const statusNew = [
    {
      name: 'New',
      value: 'NEW',
    },
  ];
  const statusDisable = [
    {
      name: 'New',
      value: 'IN PROGRESS',
    },

    {
      name: 'Send Back',
      value: 'LOST',
    },
    {
      name: 'Expired',
      value: 'EXPIRED',
    },
  ];
  const getLawyer = async () => {
    const dataLawyerUser = await database.getLawyer(params.id);
    setUserId(dataLawyerUser.data.data);
    const dataLawyer = await database.getLeadsAssigned();

    if (!dataLawyer.success) {
      return toast.error('Error to get leads assigned');
    }

    const firstItem = dataLawyer.data;
    const filterItems = firstItem.filter(
      (item: any) => item.lawyer_id === parseInt(params.id)
    );

    if (!dataLeads) return [];
    if (dataLeads.length > 0) {
      const filterLeads = dataLeads.filter((item: any) =>
        filterItems
          .map((filterItem: any) => filterItem.lead)
          .includes(item['lead id'])
      );

      setLawyerData(filterLeads);
      setOriginalData(filterLeads);
      if (selecArray.length > 0) {
        filterArray();
      }
      if (filterLeads.length > 0) {
        const titles: any = Object.keys(filterLeads[0]);

        setColumns(titles);
      }
    }
  };
  const filterSearch = (text: string | null) => {
    if (text) {
      if (lawyerData) {
        const filterData = originalData.filter(
          (item: any) =>
            item?.['lead name'].toLowerCase().includes(text.toLowerCase()) ||
            item?.email.toLowerCase().includes(text.toLowerCase()) ||
            item?.['phone number'].toLowerCase().includes(text.toLowerCase()) ||
            item?.status.toLowerCase().includes(text.toLowerCase())
        );
        setLawyerData(filterData);
        return filterData;
      }
      return [];
    }
    setLawyerData(originalData);
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
      setLawyerData(accumulatedResults);

      return accumulatedResults;
    }

    // Si no hay texto o keywords, se restablecen los leads originales
    setLawyerData(dataLeads);
    return dataLeads;
  };
  const uniqueStatuses = Array.from(
    new Set(originalData.map((item: any) => item.status))
  );

  const handleStatusClick = (status: string | null) => {
    setSelectedStatus(status);
    filterSearch(status);
  };
  useEffect(() => {
    getLawyer();
  }, [dataLeads]);
  if (lawyerData && originalData.length <= 0) {
    return (
      <NoData
        text={`${userId?.firstName} ${userId?.lastName} hasn't been assigned any leads yet`}
      >
        <MdOutlineCases size={70} color="#00234D" />
      </NoData>
    );
  }

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
    if (selectedChange === 'LOST') {
      const deleteAssined = await database.deleteData(
        `${process.env.NEXT_PUBLIC_URL_LEADS_ASSIGNED}/lead/${selectedLead['lead id']}`
      );
      if (!deleteAssined.success) {
        return toast.error('Error to delete lawyer');
      }
    }
    if (!responseUpdate.success) {
      toast.error('Error updating Lead information');
    }
    toast.success('Lead information updated successfully');
    setIsOpenLead(false);
    fetchLeads();
    getLawyer();
  };
  const handleContact = async (index: number) => {
    setIsOpenLead(true);
    if (lawyerData) {
      setSelectedLead(lawyerData[index]);
    }
  };
  return (
    <div className="flex flex-col gap-5">
      <Modal title="Lead info" isOpen={isOpenLead} setIsOpen={setIsOpenLead}>
        <div className="px-8">
          <p>
            Selection date :{' '}
            {dayjs
              .utc(selectedLead['date'] as string)
              .local()
              .format('MM/DD/YYYY hh:mm a')}
          </p>
          <p className="text-red-500">
            This lead will be marked as lost and will not be reinstated.
          </p>
          {selectedLead.status === 'ASSIGNED' && (
            <CountdownTimer targetDate={selectedLead['date_updated']} />
          )}
          <p className="text-4xl py-6 ">{selectedLead?.['lead name']}</p>
          <form onSubmit={saveLeadContact} className="grid grid-cols-3 gap-2 ">
            <p className="">Status:</p>

            <Input
              type="select"
              name="status"
              values={statusSelect}
              statusColors={statusColors}
              defaultValue={selectedLead?.status}
              setOnChange={setSelectedChange}
            />
            <p></p>
            <p>Email:</p>
            <p className="col-span-2 text-gray-500 ">{selectedLead?.email}</p>
            <p>Phone number:</p>
            <p className="col-span-2 text-gray-500">
              {selectedLead?.['phone number']}
            </p>
            <p>Service Type:</p>
            <p className="col-span-2 text-gray-500">{selectedLead?.service}</p>
            <p>Description:</p>
            <p className="col-span-2 text-gray-500">
              {selectedLead?.['description lead']}
            </p>
            <p>Comment:</p>
            <textarea
              name="comments"
              className="col-span-2 text-gray-500 border-2 bg-gray-100 rounded-md"
              placeholder=" Leave your comment....."
              required={selectedChange === 'LOST' ? true : false}
            >
              {selectedLead?.comments}
            </textarea>
            <p></p>
            <p className="flex gap-1 col-span-2 text-gray-500 ">
              <input
                name="checkbox"
                id={`checkbox-lead`}
                className="peer hidden"
                type="checkbox"
              />
              <label
                htmlFor={`checkbox-lead`}
                className="flex items-center justify-center w-5 h-5 border border-green-500 rounded bg-white cursor-pointer relative  text-white peer-checked:text-green-500"
              >
                <i className="fi fi-rr-check absolute  text-sm  peer-checked:block "></i>
              </label>{' '}
              Do not contact this lead again
            </p>
            <div className="col-end-4 text-right">
              <Button name="Save" type="submit" />
            </div>
          </form>
          <p className="text-red-500 text-sm py-4">
            The super admin will review this case, leave us a clear comment.
          </p>
        </div>
      </Modal>
      <Tilte
        name={`${userId?.firstName} ${userId?.lastName}`}
        search={true}
        filterSearch={filterSearch}
      />
      <div className="flex flex-wrap  gap-2">
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
        {uniqueStatuses.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusClick(status)}
            className={`px-4 p-1 rounded text-sm ${
              selectedStatus === status
                ? 'bg-primary bg-opacity-80 text-white'
                : 'bg-gray-200'
            }`}
          >
            {statusSelectAll.find((item) => item.value === status)?.name ||
              status}
          </button>
        ))}
      </div>
      <SortableTable
        columns={columns}
        data={lawyerData}
        statusColors={statusColors}
        onEdit={handleContact}
      />
    </div>
  );
};

export default IdLawyer;
