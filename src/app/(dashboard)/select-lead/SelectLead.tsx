'use client';
import Button from '@/components/atoms/Button';
import NoData from '@/components/organisms/NoData';
import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { statusColors } from '@/configs/statusColor';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import { useLeadsStore } from '@/store/useLead.store';
import { getNameServiceLawyer } from '@/utils/getNameServiceLawyer';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdInfoOutline } from 'react-icons/md';
import Loading from '../loading';
import useLoadingStore from '@/store/useLoadingStore';
import SkeletonText from '@/components/atoms/SkeletonText';
const SelectLead = () => {
  const { user } = useAuth();
  const [userId, setUserId] = useState<any>(null);

  const { dataLeads, fetchLeads } = useLeadsStore();

  const [selectedRows, setSelectedRows] = useState<{ [key: number]: boolean }>(
    {}
  );

  const [newData, setNewData] = useState<any>(null);
  const [leadsAssigned, setLeadsAssigned] = useState([]);

  const [selectRowLeads, setSelectRowLeads] = useState([]);
  const [columns, setColumns] = useState([]);
  const [dataServiceType, setDataServiceType] = useState([]);
  const [maxLeadsAssigned, setMaxLeadsAssigned] = useState<any>(null);

  const [selectedValue, setSelectedValue] = useState<any>({});
  const [leadsAssignedWithData, setLeadsAssignedWithData] = useState([]);
  const [differenceLeads, setDifferenceLeads] = useState<any>([]);

  const [resultLeads, setResultLeads] = useState<any>(0);

  const { setLoading, isLoading } = useLoadingStore();
  const availableLeads =
    leadsAssigned.length >= 0 && maxLeadsAssigned
      ? maxLeadsAssigned.reduce(
          (acc: number, curr: any) => acc + curr.max_leads,
          0
        ) - leadsAssigned.length
      : 0;

  const handleSelectRow = (index: any) => {
    setSelectedRows((prevSelectedRows) => ({
      ...prevSelectedRows,
      [index.originalIndex]: !prevSelectedRows[index.originalIndex],
    }));
    setSelectedValue(index);
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
  function validateLeads(leads: any[], services: any[]) {
    // Contar los leads por servicio solo si hay leads
    const leadCounts = leads.reduce((acc: Record<string, number>, lead) => {
      const serviceName = lead.service;
      acc[serviceName] = (acc[serviceName] || 0) + 1;
      return acc;
    }, {});

    // Generar el resultado con serviceName, diferencia, y isValid
    const result = services.map((service) => {
      const leadCount = leadCounts[service.name] || 0;
      const difference = service.max_leads - leadCount;

      return {
        serviceName: service.name,
        difference,
        isValid: difference >= 0,
      };
    });

    return result;
  }

  function checkLeadDifference(selectRow: any, differenceLeads: any) {
    // Crear un objeto para almacenar el conteo de servicios en selectRow
    const serviceCount: any = {};

    // Contar cuántos leads hay por cada servicio en selectRow
    selectRow.forEach((row: any) => {
      if (serviceCount[row.service]) {
        serviceCount[row.service]++;
      } else {
        serviceCount[row.service] = 1;
      }
    });

    // Revisar cada servicio en serviceCount contra differenceLeads
    const results = Object.keys(serviceCount).map((serviceName) => {
      const matchedService = differenceLeads.find(
        (lead: any) => lead.serviceName === serviceName
      );

      if (matchedService) {
        // Actualizar la diferencia para reflejar la selección actual
        const updatedDifference =
          matchedService.difference - serviceCount[serviceName];
        const isValid = updatedDifference >= 0;

        // Actualizar la diferencia en differenceLeads para las siguientes comparaciones
        //matchedService.difference = updatedDifference;

        return {
          serviceName: serviceName,
          difference: updatedDifference,
          isValid: isValid,
        };
      } else {
        // Si no se encuentra el servicio, lo marcamos como no válido
        return {
          serviceName: serviceName,
          difference: -serviceCount[serviceName],
          isValid: false,
        };
      }
    });

    return results;
  }
  const getSelectedRowsData = () => {
    const selectRow: any = Object.keys(selectedRows)
      .filter((index) => selectedRows[Number(index)])
      .map((index) => newData[Number(index)]);

    setSelectRowLeads(selectRow);

    const reviewLeads: any = checkLeadDifference(selectRow, differenceLeads);
    const maxResult =
      maxLeadsAssigned.reduce(
        (acc: number, curr: any) => acc + curr.max_leads,
        0
      ) - leadsAssignedWithData.length;

    const resut = maxResult - selectRow.length;

    setResultLeads(resut);
    const resValidate = reviewLeads.filter(
      (item: any) => item.serviceName === selectedValue.service
    );
    //const resValidate = checkLeadDifference(selectRow, differenceLeads);

    if (resValidate.length > 0) {
      if (!resValidate[0].isValid) {
        toast.error(
          `You have exceeded the available leads for ${selectedValue.service}`
        );

        const updatedSelectedRows: any = { ...selectedRows };
        const indexToRemove = newData.findIndex(
          (item: any) => item['lead id'] === selectedValue['lead id']
        );

        if (indexToRemove >= 0) {
          updatedSelectedRows[Object.keys(selectedRows)[indexToRemove]] = false;
          setSelectedRows(updatedSelectedRows);

          setSelectRowLeads(
            selectRow.filter((_: any, i: number) => i !== indexToRemove)
          );
        }

        return;
      }
    }
  };
  const filterByServiceGetLeads = (data: any[], serviceType: any[]) => {
    if (!data || !serviceType) return [];

    const filterLeads = serviceType
      .map((res) =>
        data.filter(
          (item) =>
            item.service === res.name &&
            (item.status == 'NEW' || item.status == 'EXPIRED')
        )
      )
      .flat();

    return filterLeads;
  };

  const getLawyer = async () => {
    setLoading(true);
    if (Object.keys(user).length > 0) {
      const dataLawyer = await database.getLawyer(user.id);
      setUserId(dataLawyer.data.data);
    }

    const dataLeadsLawyer: any = await database.getLeadsAssigned();

    if (!dataLeadsLawyer.data) {
      return toast.error('error getting Leads Assigned');
    }

    const filterLedas = dataLeadsLawyer.data.filter(
      (item: any) => item.lawyer_id === parseInt(user.id)
    );

    const filterItems = filterLedas.filter((item: any) => {
      return item.lawyer_id === user.id;
    });

    if (!dataLeads) return [];
    if (dataLeads.length <= 0) {
      setLeadsAssignedWithData([]);
      return;
    }

    const filterLeads = dataLeads.filter((item: any) =>
      filterItems
        .map((filterItem: any) => filterItem.lead)
        .includes(item['lead id'])
    );

    const totalMaxleads = maxLeadsAssigned
      ? maxLeadsAssigned.reduce(
          (acc: number, curr: any) => acc + curr.max_leads,
          0
        )
      : 0;
    setResultLeads(totalMaxleads - filterLeads.length);

    setLeadsAssignedWithData(filterLeads);

    setLoading(false);
  };

  const postAssignLeads = async () => {
    setLoading(true);
    if (selectRowLeads.length <= 0) {
      setLoading(false);
      return toast.error('You need to select a lead');
    }
    if (resultLeads < 0) {
      setLoading(false);
      return toast.error(
        'You have exceeded the available leads. Please remove some leads to continue'
      );
    }

    const promises = selectRowLeads.map(async (lead) => {
      const leadId = lead['lead id'];

      if (!leadId) {
        setLoading(false);
        toast.error('Lead id is missing for lead:', lead);
        return null;
      }

      const response = await database.insertData(
        process.env.NEXT_PUBLIC_URL_LEADS_ASSIGNED || '',
        {
          lead: leadId,
          lawyer_id: user.id,
        }
      );

      return response;
    });

    const respond: any = await Promise.all(promises);

    if (respond.some((item: any) => item.code === 404 || item.code === 500)) {
      setLoading(false);
      return toast.error(`Error ${respond[0].code}: ${respond[0].messages}`);
    }
    fetchLeads();

    const DataFilter = filterByServiceGetLeads(
      dataLeads,
      getNameServiceLawyer(userId?.lawyersServices, dataServiceType)
    );

    const filteredDataLeads = DataFilter.map(
      ({
        email,
        'phone number': phoneNumber,
        'description lead': descriptionLead,
        'lead name': leadName,
        comments,
        status,
        ...rest
      }) => {
        const modifiedStatus = status === 'EXPIRED' ? 'REASSIGNED' : status;

        return {
          ...rest,
          status: modifiedStatus,
        };
      }
    );

    setNewData(filteredDataLeads);

    setSelectRowLeads([]);
    setSelectedRows([]);
    toast.success('Leads successfully added');
    setLoading(false);
  };

  useEffect(() => {
    getLawyer();
    getServiceType();
  }, [user, dataLeads]);
  useEffect(() => {
    fetchLeads();
  }, [user]);

  useEffect(() => {
    setMaxLeadsAssigned(
      getNameServiceLawyer(userId?.lawyersServices, dataServiceType)
    );

    const DataFilter = filterByServiceGetLeads(
      dataLeads,
      getNameServiceLawyer(userId?.lawyersServices, dataServiceType)
    );

    const filteredDataLeads = DataFilter.map(
      ({
        email,
        'phone number': phoneNumber,
        'description lead': descriptionLead,
        'lead name': leadName,
        comments,
        status,
        ...rest
      }) => {
        const modifiedStatus = status === 'EXPIRED' ? 'REASSIGNED' : status;

        return {
          ...rest,
          status: modifiedStatus,
        };
      }
    );

    setNewData(filteredDataLeads);

    if (filteredDataLeads.length > 0) {
      const titles: any = Object.keys(filteredDataLeads[0]);
      setColumns(titles);
    }
  }, [dataLeads, availableLeads, !userId]);
  useEffect(() => {
    if (Object.keys(selectedRows).length > 0) {
      getSelectedRowsData();
    }
  }, [selectedRows]);

  useEffect(() => {
    const callValidateLeads = validateLeads(
      leadsAssignedWithData,
      getNameServiceLawyer(userId?.lawyersServices, dataServiceType)
    );

    setDifferenceLeads(callValidateLeads);
  }, [leadsAssignedWithData, maxLeadsAssigned]);

  if (isLoading || !newData) {
    return <Loading />;
  }
  if (newData.length <= 0) {
    return (
      <NoData
        text={`There are no leads to assign to your service type lawyer yet. Please wait; they will be available soon.`}
      >
        <MdInfoOutline size={70} color='#00234D' />
      </NoData>
    );
  }
  return (
    <div className='flex flex-col gap-5'>
      <Tilte
        name={`${userId?.firstName} ${userId?.lastName}`}
        des={getNameServiceLawyer(userId?.lawyersServices, dataServiceType).map(
          (res: any) => (
            <p key={res?.id}>
              {res?.name.replace(' Lawyer', '')}:
              {res?.max_leads -
                differenceLeads
                  .map((service: any) => {
                    if (service.serviceName === res.name) {
                      return service.difference;
                    }
                    return null; // Si no coincide, devuelve null
                  })
                  .filter((difference: any) => difference !== null)}
              /{res?.max_leads}
            </p>
          )
        )}
      >
        <div className='flex justify-center items-center gap-5'>
          {maxLeadsAssigned ? (
            <div className='bg-gray-200 px-4 py-1 rounded-md'>
              Available leads{' '}
              <span className='text-red-500'>{resultLeads}</span> out of{' '}
              {maxLeadsAssigned &&
                maxLeadsAssigned.reduce(
                  (acc: number, curr: any) => acc + curr.max_leads,
                  0
                )}
            </div>
          ) : (
            <SkeletonText />
          )}
          {/* <Button
            disabled={isLoading}
            type='button'
            name='Pull leads'
            onClick={postAssignLeads}
            color={`${isLoading ? 'animate-pulse bg-gray-400' : 'bg-primary'} `}
          /> */}
        </div>
      </Tilte>

      <SortableTable
        columns={columns}
        data={newData}
        onSelectRow={handleSelectRow}
        selectedRows={selectedRows}
        statusColors={statusColors}
        pullButton={
          <Button
            disabled={isLoading}
            type='button'
            name='Pull leads'
            onClick={postAssignLeads}
            color={`${isLoading ? 'animate-pulse bg-gray-400' : 'bg-primary'} `}
          />
        }
      />
    </div>
  );
};

export default SelectLead;
