'use client';
import SortableTable from '@/components/organisms/SortableTable';
import { database } from '@/services/database';
import { useEffect, useState } from 'react';

const IdLawyer = ({ params }: { params: { id: string } }) => {
  const [lawyerData, setLawyerData] = useState([]);
  console.log(lawyerData);

  const [columns, setColumns] = useState([]);
  const statusColors = {
    NEW: '#8280FF',
    ASSIGNED: '#4AD991',
    CLOSED: '#FF9066',
    PROBLEMATIC: '#FEC53D',
  };

  const getLawyer = async () => {
    console.log(params.id);
    const url = process.env.NEXT_PUBLIC_URL_LEADS_ASSIGNED || '';
    const dataLawyer = await database.getData(url);
    console.log(dataLawyer);

    if (dataLawyer.success) {
      console.log('entro');

      const firstItem = dataLawyer.data;
      setLawyerData(firstItem);
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
