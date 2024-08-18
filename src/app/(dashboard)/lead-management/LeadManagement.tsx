'use client';

import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { useState } from 'react';
import { useLeadsStore } from '@/store/useLead.store';
import { statusColors } from '@/configs/statusColor';
const LeadManagement = () => {
  const { columns, dataLeads, error }: any = useLeadsStore();
  const [filterData, setFilterData] = useState(dataLeads);
  const filterSearch = (text: string) => {
    if (text) {
      if (dataLeads) {
        const dataFilter = dataLeads.filter(
          (item: any) =>
            item?.['lead name'].toLowerCase().includes(text.toLowerCase()) ||
            item?.email.toLowerCase().includes(text.toLowerCase()) ||
            item?.['phone number'].toLowerCase().includes(text.toLowerCase())
        );
        setFilterData(dataFilter);
        return dataFilter;
      }
      return [];
    }
    setFilterData(dataLeads);
    return [];
  };
  return (
    <div className='flex flex-col gap-5'>
      <Tilte name='Lead Management' search={true} filterSearch={filterSearch} />

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
