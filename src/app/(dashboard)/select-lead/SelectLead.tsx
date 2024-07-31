'use client';
import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { useAuth } from '@/store/useAuth.store';
import { useLeadsStore } from '@/store/useLead.store';
import { useEffect, useState } from 'react';

const SelectLead = () => {
  const { user } = useAuth();
  const { columns, dataLeads }: any = useLeadsStore();

  const [selectedRows, setSelectedRows] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [newData, setNewData] = useState<any>([]);

  const statusColors = {
    NEW: '#8280FF',
    ASSIGNED: '#4AD991',
    CLOSED: '#FF9066',
    PROBLEMATIC: '#FEC53D',
  };
  const handleSelectRow = (index: number) => {
    setSelectedRows((prevSelectedRows) => ({
      ...prevSelectedRows,
      [index]: !prevSelectedRows[index],
    }));
  };

  const getSelectedRowsData = () => {
    return Object.keys(selectedRows)
      .filter((index) => selectedRows[Number(index)])
      .map((index) => dataLeads[Number(index)]);
  };
  const filterByService = (data: any[], serviceType: string) => {
    return data.filter(
      (item) => item.service === serviceType && item.status !== 'ASSIGNED'
    );
  };

  console.log('Selected Data:', getSelectedRowsData());

  useEffect(() => {
    const DataFilter = filterByService(dataLeads, user?.service_type?.name);
    setNewData(DataFilter);
    getSelectedRowsData();
  }, [selectedRows, dataLeads]);

  return (
    <div className='flex flex-col gap-5'>
      <header>
        <Tilte name={`${user?.firstName} ${user?.lastName}`} />
        <div className='text-primary capitalize'>
          {user?.service_type?.name}
        </div>
      </header>
      <SortableTable
        columns={columns}
        data={newData}
        onSelectRow={handleSelectRow}
        selectedRows={selectedRows}
        statusColors={statusColors}
      />
    </div>
  );
};

export default SelectLead;
