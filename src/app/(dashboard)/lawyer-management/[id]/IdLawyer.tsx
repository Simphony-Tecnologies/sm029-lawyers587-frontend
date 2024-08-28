'use client';
import NoData from '@/components/organisms/NoData';
import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { statusColors } from '@/configs/statusColor';
import { database } from '@/services/database';
import { useLeadsStore } from '@/store/useLead.store';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdOutlineCases } from 'react-icons/md';

const IdLawyer = ({ params }: { params: { id: string } }) => {
  const [lawyerData, setLawyerData] = useState<any>(null);
  const { dataLeads } = useLeadsStore();
  const [userId, setUserId] = useState<any>(null);
  const [columns, setColumns] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
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
  if (lawyerData && lawyerData.length <= 0) {
    return (
      <NoData
        text={`${userId?.firstName} ${userId?.lastName} hasn't been assigned any leads yet`}
      >
        <MdOutlineCases size={70} color='#00234D' />
      </NoData>
    );
  }

  return (
    <div className='flex flex-col gap-5'>
      <Tilte
        name={`${userId?.firstName} ${userId?.lastName}`}
        search={true}
        filterSearch={filterSearch}
      />
      <div className='flex space-x-2'>
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
            {status}
          </button>
        ))}
      </div>
      <SortableTable
        columns={columns}
        data={lawyerData}
        statusColors={statusColors}
      />
    </div>
  );
};

export default IdLawyer;
