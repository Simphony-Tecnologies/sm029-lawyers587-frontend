'use client';
import Cards from '@/components/atoms/Cards';
import Tilte from '@/components/organisms/Tilte';
import { statistics as initialStatistics } from '@/configs/statisticsLawyers.confing';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import { useLeadsStore } from '@/store/useLead.store';
import useLoadingStore from '@/store/useLoadingStore';
import { useSelectStatus } from '@/store/useSelectStatus';
import { getNameServiceLawyer } from '@/utils/getNameServiceLawyer';
import { error } from 'console';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const DashboardLawyers = () => {
  const { dataLeads, fetchLeads } = useLeadsStore();
  const [statistics, setStatistics] = useState(initialStatistics);
  const { setSelecArray } = useSelectStatus();
  const [lawyerData, setLawyerData] = useState<any>(null);
  const { setLoading, isLoading } = useLoadingStore();
  const [dataServiceType, setDataServiceType] = useState([]);
  const [maxLeadsAssigned, setMaxLeadsAssigned] = useState<any>(null);
  const [userId, setUserId] = useState<any>(null);
  const { user } = useAuth();
  const router = useRouter();
  const getLastElement = (arr: any) => arr[0];
  const setData = [
    { value: 'ASSIGNED', index: 1 },
    { value: 'IN PROGRESS', index: 2 },
    { value: 'PROBLEMATIC', index: 3 },
    { value: 'LOST', index: 4 },
    { value: 'CLOSED', index: 5 },
    { value: 'EXPIRED', index: 6 },
  ];
  const availableLeads = maxLeadsAssigned
    ? maxLeadsAssigned.reduce(
        (acc: number, curr: any) => acc + curr.max_leads,
        0
      )
    : 0;
  const getLawyer = async () => {
    setLoading(true);
    try {
      // Verifica si el usuario tiene datos
      if (Object.keys(user).length > 0) {
        const dataLawyerUser = await database.getLawyer(user.id);
        setUserId(dataLawyerUser.data.data);
      }

      const dataLawyer = await database.getLeadsAssigned();

      if (!dataLawyer.success) {
        throw new Error('Error to get leads assigned');
      }

      const firstItem = dataLawyer.data;
      const filterItems = firstItem.filter(
        (item: any) => item.lawyer_id === parseInt(user.id)
      );

      if (!dataLeads || dataLeads.length === 0) {
        throw new Error('No leads data found');
      }
      const filterLeads = dataLeads.filter((item: any) =>
        filterItems
          .map((filterItem: any) => filterItem.lead)
          .includes(item['lead id'])
      );
      statistics[0].value = `${filterLeads.length} of  ${availableLeads}`;
      setLawyerData(filterLeads);
    } catch (error: any) {
      // Manejo centralizado de errores
      toast.error(error.message || 'An error occurred while fetching data.');
      console.error('Error fetching lawyer data:', error);
    } finally {
      setLoading(false); // Finaliza la carga
    }
  };
  const getServiceType = async () => {
    const resType = await database.getData(
      process.env.NEXT_PUBLIC_URL_SERVICE_TYPE || ''
    );
    if (!resType.success) {
      return toast.error('Error to get service type');
    }

    setDataServiceType(resType.data);
  };
  const filterLeads = async (value: string, index: number) => {
    if (lawyerData) {
      const leads = lawyerData.filter((res: any) => res.status === value);
      const lastNewLead = getLastElement(leads);

      if (leads.length > 0) {
        setStatistics((prevStatistics) => {
          const updatedStatistics = [...prevStatistics];
          updatedStatistics[index] = {
            ...initialStatistics[index],
            value: (updatedStatistics[index]?.value || 0) + leads.length,
            date: lastNewLead.date,
          };

          return updatedStatistics;
        });
      }
    }
  };
  const handleClickCard = (index: any) => {
    const valuesCards = setData.filter((item: any) => item.index === index);
    setSelecArray(valuesCards.map((res: any) => res.value));

    router.push('/all-leads');
  };
  useEffect(() => {
    setStatistics(initialStatistics);
    if (dataLeads) {
      setData.forEach((res) => filterLeads(res.value, res.index));
    }
    if (dataLeads) getLawyer();
    if (userId) {
      setMaxLeadsAssigned(
        getNameServiceLawyer(userId?.lawyersServices, dataServiceType)
      );
    }
  }, [dataLeads, !userId]);
  useEffect(() => {
    fetchLeads();
    getServiceType();
  }, []);

  return (
    <div className='flex flex-col gap-5'>
      <Tilte name='Dashboard' />
      <div className='grid lg:grid-cols-3 md:grid-cols-2 lg:gap-10 gap-5'>
        {statistics.map((statistic: any, index: any) => (
          <Cards
            key={index}
            title={statistic?.title}
            value={statistic?.value}
            date={statistic?.date}
            color={statistic?.color}
            icon={statistic?.icon}
            onClick={() => handleClickCard(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardLawyers;
