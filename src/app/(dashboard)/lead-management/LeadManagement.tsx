'use client';

import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { useEffect, useState } from 'react';
import { useLeadsStore } from '@/store/useLead.store';
import { statusColors } from '@/configs/statusColor';
import { useSelectStatus } from '@/store/useSelectStatus';
const LeadManagement = () => {
  const { columns, dataLeads, error }: any = useLeadsStore();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [filterData, setFilterData] = useState(dataLeads);
  //const [selecArray, setselecArray] = useState([]);
  const [uniqueStatuses, setUniqueStatuses] = useState([]);
  const { selecArray, setSelecArray } = useSelectStatus();

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
  useEffect(() => {
    filterArray();
    if (dataLeads) {
      const uniqueStatus: any = Array.from(
        new Set(dataLeads.map((item: any) => item.status))
      );
      setUniqueStatuses(uniqueStatus);
    }
  }, [dataLeads]);

  return (
    <div className='flex flex-col gap-5'>
      <Tilte name='Lead Management' search={true} filterSearch={filterSearch} />
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
        />
      )}
    </div>
  );
};

export default LeadManagement;
