'use client';
import { MdHistoryEdu } from 'react-icons/md';
import { EmptyStateBox, PageHead } from '@/components/ui';

const ReassignedLeads = () => {
  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <PageHead title='Reassigned Leads' />
      <EmptyStateBox
        icon={<MdHistoryEdu size={18} />}
        title='Reassignment tracking pending'
        description='When a lead is moved from one lawyer to another, the history will appear here. The audit endpoint that powers this view is being implemented on the backend.'
      />
    </div>
  );
};

export default ReassignedLeads;
