'use client';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';
import Modal from '@/components/organisms/Modal';
import NoData from '@/components/organisms/NoData';
import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { statusColors } from '@/configs/statusColor';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import { useLeadsStore } from '@/store/useLead.store';
import { getNameServiceLawyer } from '@/utils/getNameServiceLawyer';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdOutlineCases } from 'react-icons/md';
import useLoadingStore from '@/store/useLoadingStore';
import SkeletonText from '@/components/atoms/SkeletonText';
import Loading from '../loading';
import CountdownTimer from '@/components/organisms/CountdownTimer';
import { useSelectStatus } from '@/store/useSelectStatus';

const AllLeads = () => {
  dayjs.extend(utc);
  const { user } = useAuth();
  const [userId, setUserId] = useState<any>(null);
  const { dataLeads, fetchLeads } = useLeadsStore();
  const [isOpenLead, setIsOpenLead] = useState(false);
  const [lawyerData, setLawyerData] = useState<any>(null);
  const [columns, setColumns] = useState([]);
  const [selectedLead, setSelectedLead] = useState<any>({});
  const [dataServiceType, setDataServiceType] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectStatus, setSelectStatus] = useState();
  const { selecArray, setSelecArray } = useSelectStatus();
  const { setLoading, isLoading } = useLoadingStore();

  const statusSelect = [
    {
      name: 'In progress',
      value: 'IN PROGRESS',
    },
    {
      name: 'Problematic',
      value: 'PROBLEMATIC',
    },
    {
      name: 'Send back',
      value: 'LOST',
    },
    {
      name: 'Retained',
      value: 'CLOSED',
    },
  ];
  const getLawyer = async () => {
    setLoading(true); // Inicia la carga
    try {
      // Verifica si el usuario tiene datos
      if (Object.keys(user).length > 0) {
        const dataLawyerUser = await database.getLawyer(user.id);
        setUserId(dataLawyerUser.data.data);
      }

      // Obtén los leads asignados
      const dataLawyer = await database.getLeadsAssigned();

      // Lanza un error si la petición falla
      if (!dataLawyer.success) {
        throw new Error('Error to get leads assigned');
      }

      const firstItem = dataLawyer.data;
      const filterItems = firstItem.filter(
        (item: any) => item.lawyer_id === parseInt(user.id)
      );

      // Verifica si dataLeads es undefined o vacío y lanza un error
      if (!dataLeads || dataLeads.length === 0) {
        throw new Error('No leads data found');
      }
      const datafilter = dataLeads.map(({ lawyer, ...rest }: any) => rest);
      const filterLeads = datafilter.filter((item: any) =>
        filterItems
          .map((filterItem: any) => filterItem.lead)
          .includes(item['lead id'])
      );

      // Establece los datos filtrados en los estados correspondientes
      setOriginalData(filterLeads);
      setLawyerData(filterLeads);
      filterArray(filterLeads);
      if (filterLeads.length > 0) {
        const titles: any = Object.keys(filterLeads[0]);
        setColumns(titles);
      }
    } catch (error: any) {
      // Manejo centralizado de errores
      toast.error(error.message || 'An error occurred while fetching data.');
      console.error('Error fetching lawyer data:', error);
    } finally {
      setLoading(false); // Finaliza la carga
    }
  };
  const esMenorA48Horas = (fecha: any) => {
    const fechaIngresada: any = new Date(fecha);
    const fechaActual: any = new Date();
    const diferenciaEnHoras = (fechaActual - fechaIngresada) / (1000 * 60 * 60);
    return diferenciaEnHoras < 48;
  };
  const handleContact = async (index: number) => {
    const res = esMenorA48Horas(lawyerData[index].date_updated);

    if (!res && lawyerData[index].status === 'ASSIGNED') {
      toast.error('This lead has expired');
      return;
    }
    setIsOpenLead(true);
    if (lawyerData) {
      setSelectedLead(lawyerData[index]);
    }
  };

  const filterArray = (lawyerData: any) => {
    let accumulatedResults: any[] = [];
    if (lawyerData && selecArray.length > 0) {
      handleStatusClick('');
      selecArray.forEach((keyword: string) => {
        const dataFilter = lawyerData.filter((item: any) =>
          item?.status.toLowerCase().includes(keyword.toLowerCase())
        );

        dataFilter.forEach((lead: any) => {
          if (
            !accumulatedResults.some(
              (accItem) => accItem['lead id'] === lead['lead id']
            )
          ) {
            accumulatedResults.push(lead);
          }
        });
      });

      // Actualiza el estado con los datos acumulados

      setLawyerData(accumulatedResults);
      return accumulatedResults;
    }

    // Si no hay texto o keywords, se restablecen los leads originales
    setSelecArray([]);
    setLawyerData(lawyerData);
    return lawyerData;
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
  const saveLeadContact = async (e: any) => {
    e.preventDefault();
    if (selectStatus === 'LOST') {
      const deleteAssined = await database.deleteData(
        `${process.env.NEXT_PUBLIC_URL_LEADS_ASSIGNED}/lead/${selectedLead['lead id']}`
      );
      if (!deleteAssined.success) {
        return toast.error('Error to delete lawyer');
      }
    }
    const dataUpdate = {
      status:
        e.target.checkbox.checked === true ? 'DISABLED' : e.target.status.value,
      comments: e.target.comments.value,
    };

    const responseUpdate = await database.updateData(
      `${process.env.NEXT_PUBLIC_URL_LEADS}/${selectedLead['lead id']}`,
      dataUpdate
    );
    if (!responseUpdate.success) {
      toast.error('Error updating Lead information');
    }
    toast.success('Lead information updated successfully');
    setIsOpenLead(false);
    fetchLeads();
    getLawyer();
  };
  const filterSearch = (text: string | null) => {
    if (text) {
      if (lawyerData) {
        const filterData = originalData.filter((item) =>
          Object.values(item)
            .toString()
            .replaceAll(',', '')
            .toLowerCase()
            .includes(text.toLowerCase())
        );

        setLawyerData(filterData);
        return filterData;
      }
      return [];
    }
    setSelectedStatus(null);
    setLawyerData(originalData);
  };
  const uniqueStatuses = Array.from(
    new Set(originalData.map((item: any) => item.status))
  );

  const handleStatusClick = (status: string | null) => {
    setSelecArray([]);
    setSelectedStatus(status);
    filterSearch(status);
  };
  useEffect(() => {
    getLawyer();
    getServiceType();
  }, [user, dataLeads]);

  if (isLoading) {
    return <Loading />;
  }
  if (lawyerData && originalData.length <= 0) {
    return (
      <NoData
        text={`Here you will see your selected leads. Go to the 'Select Lead' section to get started.`}
      >
        <MdOutlineCases size={70} color="#00234D" />
      </NoData>
    );
  }
  if (!lawyerData) {
    return (
      <NoData
        text={`Here you will see your selected leads. Go to the 'Select Lead' section to get started.`}
      >
        <MdOutlineCases size={70} color="#00234D" />
      </NoData>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Modal title="Lead info" isOpen={isOpenLead} setIsOpen={setIsOpenLead}>
        <div className="px-8">
          <p>
            Selection date :{' '}
            {dayjs
              .utc(selectedLead['date'] as string)
              .local()
              .format('MM/DD/YYYY hh:mm a')}
          </p>
          <p className="text-red-500">
            This lead will be marked as lost and will not be reinstated.
          </p>
          {selectedLead.status === 'ASSIGNED' && (
            <CountdownTimer targetDate={selectedLead['date_updated']} />
          )}
          <p className="text-4xl py-6 ">{selectedLead?.['lead name']}</p>
          <form onSubmit={saveLeadContact} className="grid grid-cols-3 gap-2 ">
            <p className="">Status:</p>

            <Input
              type="select"
              name="status"
              values={statusSelect}
              statusColors={statusColors}
              defaultValue={
                selectedLead.status === 'ASSIGNED' ? '' : selectedLead?.status
              }
              setOnChange={setSelectStatus}
            />
            <p></p>
            <p>Email:</p>
            <p
              className={`col-span-2 text-gray-500 ${
                selectedLead.status === 'ASSIGNED' && 'blur select-none'
              }  `}
            >
              {selectedLead.status === 'ASSIGNED'
                ? 'xxx@587lawyers.com'
                : selectedLead?.email}
            </p>
            <p>Phone number:</p>
            <p
              className={`col-span-2 text-gray-500 ${
                selectedLead.status === 'ASSIGNED' && 'blur select-none'
              }  `}
            >
              {selectedLead.status === 'ASSIGNED'
                ? '0000000000'
                : selectedLead?.['phone number']}
            </p>
            <p>Service Type:</p>
            <p
              className={`col-span-2 text-gray-500 ${
                selectedLead.status === 'ASSIGNED' && 'blur select-none'
              }  `}
            >
              {selectedLead.status === 'ASSIGNED'
                ? 'lawyers'
                : selectedLead?.service}
            </p>
            <p>Description:</p>
            <p
              className={`col-span-2 text-gray-500 ${
                selectedLead.status === 'ASSIGNED' && 'blur select-none'
              }  `}
            >
              {selectedLead.status === 'ASSIGNED'
                ? 'Description'
                : selectedLead?.['description lead']}
            </p>
            <p>Comment:</p>
            <textarea
              name="comments"
              className="col-span-2 text-gray-500 border-2 bg-gray-100 rounded-md"
              placeholder=" Leave your comment....."
              required={selectStatus === 'LOST' ? true : false}
            >
              {selectedLead?.comments}
            </textarea>
            <p></p>
            <p className="flex gap-1 col-span-2 text-gray-500 ">
              <input
                name="checkbox"
                id={`checkbox-lead`}
                className="peer hidden"
                type="checkbox"
              />
              <label
                htmlFor={`checkbox-lead`}
                className="flex items-center justify-center w-5 h-5 border border-green-500 rounded bg-white cursor-pointer relative  text-white peer-checked:text-green-500"
              >
                <i className="fi fi-rr-check absolute  text-sm  peer-checked:block "></i>
              </label>{' '}
              Do not contact this lead again
            </p>
            <div className="col-end-4 text-right">
              <Button name="Save" type="submit" />
            </div>
          </form>
          <p className="text-red-500 text-sm py-4">
            The super admin will review this case, leave us a clear comment.
          </p>
        </div>
      </Modal>
      <Tilte
        name={`${userId?.firstName} ${userId?.lastName}`}
        des={getNameServiceLawyer(userId?.lawyersServices, dataServiceType).map(
          (res: any) => (
            <p key={res?.id}>{res?.name.replace(' Lawyer', '')}</p>
          )
        )}
        search={true}
        filterSearch={filterSearch}
      />
      {!isLoading ? (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleStatusClick(null)}
            className={`px-4 p-1 rounded text-sm ${
              selectedStatus === null
                ? 'bg-primary bg-opacity-80 text-white'
                : 'bg-gray-200'
            }`}
          >
            All
          </button>
          {uniqueStatuses.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusClick(status)}
              className={`px-4 p-1 rounded text-sm ${
                selectedStatus === status
                  ? 'bg-primary bg-opacity-80 text-white'
                  : 'bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      ) : (
        <SkeletonText />
      )}
      <SortableTable
        columns={columns}
        data={lawyerData}
        statusColors={statusColors}
        onContact={handleContact}
      />
    </div>
  );
};

export default AllLeads;
