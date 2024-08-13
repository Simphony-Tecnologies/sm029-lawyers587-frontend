'use client';
import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { statusColors } from '@/configs/statusColor';
import { database } from '@/services/database';
import { useLeadsStore } from '@/store/useLead.store';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const IdLawyer = ({ params }: { params: { id: string } }) => {
  const [lawyerData, setLawyerData] = useState(null);
  const { dataLeads } = useLeadsStore();
  const [userId, setUserId] = useState<any>(null);
  const [columns, setColumns] = useState([]);

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
      if (filterLeads.length > 0) {
        const titles: any = Object.keys(filterLeads[0]);

        setColumns(titles);
      }
    }
  };
  useEffect(() => {
    getLawyer();
  }, [dataLeads]);

  return (
    <div className='flex flex-col gap-5'>
      <Tilte
        name={`${userId?.firstName} ${userId?.lastName}`}
        des={userId?.service_type?.name}
      />
      {/* <Tilte name={`${user?.firstName} ${user?.lastName}`} /> */}
      <SortableTable
        columns={columns}
        data={lawyerData}
        statusColors={statusColors}
      />
    </div>
  );
};

export default IdLawyer;
