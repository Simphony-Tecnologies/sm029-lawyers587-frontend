'use client';
import SortableTable from '@/components/organisms/SortableTable';
import { database } from '@/services/database';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const IdLawyer = ({ params }: { params: { id: string } }) => {
  const [lawyerData, setLawyerData] = useState(null);

  const [columns, setColumns] = useState([]);
  const statusColors = {
    NEW: '#8280FF',
    ASSIGNED: '#4AD991',
    CLOSED: '#FF9066',
    PROBLEMATIC: '#FEC53D',
  };

  const getLawyer = async () => {
    const dataLawyer = await database.getLeadsAssigned();

    if (!dataLawyer.success) {
      return toast.error('Error to get leads assigned');
    }

    const firstItem = dataLawyer.data;
    const filterItems = firstItem.filter(
      (item: any) => item.lawyer_id === parseInt(params.id)
    );

    setLawyerData(filterItems);
    if (filterItems.length > 0) {
      const titles: any = Object.keys(firstItem[0]);
      setColumns(titles);
    }
  };
  useEffect(() => {
    getLawyer();
  }, []);

  return (
    <div>
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
