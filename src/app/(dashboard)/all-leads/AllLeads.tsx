'use client';
import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { useAuth } from '@/store/useAuth.store';
import React from 'react';

const AllLeads = () => {
  const { user } = useAuth();
  const columns = [
    'Date',
    'Code',
    'Lead Name',
    'Service Type',
    'Description',
    ' Time Left to action',
    'Status',
    'Contact',
  ];
  const data: any = [];
  return (
    <div className='flex flex-col gap-5'>
      <header>
        <Tilte name={`${user?.firstName} ${user?.lastName}`} />
        <div className='text-primary capitalize'>
          {user?.service_type?.name}
        </div>
      </header>
      <SortableTable columns={columns} data={data} />
    </div>
  );
};

export default AllLeads;
