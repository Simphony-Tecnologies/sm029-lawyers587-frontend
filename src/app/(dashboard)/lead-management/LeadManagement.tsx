'use client';

import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';

import { useState } from 'react';
import Modal from '@/components/organisms/Modal';
import { useLeadsStore } from '@/store/useLead.store';
import { statusColors } from '@/configs/statusColor';
const LeadManagement = () => {
  const { columns, dataLeads, error }: any = useLeadsStore();

  return (
    <div className='flex flex-col gap-5'>
      <Tilte name='Lead Management' />

      {error ? (
        <div>{error}</div>
      ) : (
        <SortableTable
          columns={columns}
          data={dataLeads}
          statusColors={statusColors}
        />
      )}
    </div>
  );
};

export default LeadManagement;
