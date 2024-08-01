'use client';
import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import { useLeadsStore } from '@/store/useLead.store';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const AllLeads = () => {
  const { user } = useAuth();
  const { dataLeads, fetchLeads } = useLeadsStore();

  const [lawyerData, setLawyerData] = useState([]);
  const [columns, setColumns] = useState([]);
  const statusColors = {
    NEW: '#8280FF',
    ASSIGNED: '#4AD991',
    EXPIRED: '#FF9066',
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
    const dataLawyer = await database.getLeadsAssigned();

    if (!dataLawyer.success) {
      return toast.error('Error to get leads assigned');
    }

    const firstItem = dataLawyer.data;
    const filterItems = firstItem.filter(
      (item: any) => item.lawyer_id === parseInt(user.id)
    );
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
  useEffect(() => {
    getLawyer();
  }, [user, dataLeads]);
  return (
    <div className='flex flex-col gap-5'>
      <Tilte
        name={`${user?.firstName} ${user?.lastName}`}
        des={user?.service_type?.name}
      />

      <SortableTable
        columns={columns}
        data={lawyerData}
        statusColors={statusColors}
      />
    </div>
  );
};

export default AllLeads;
