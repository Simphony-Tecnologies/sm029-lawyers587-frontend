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
  const availableLeads =
    leadsAssigned.length >= 0 && userId
      ? parseInt(userId?.max_leads) - leadsAssigned.length
      : 0;

  const [resultLeads, setResultLeads] = useState(0);

  const handleSelectRow = (index: number) => {
    setSelectedRows((prevSelectedRows) => ({
      ...prevSelectedRows,
      [index]: !prevSelectedRows[index],
    }));
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
  const getSelectedRowsData = () => {
    const selectRow: any = Object.keys(selectedRows)
      .filter((index) => selectedRows[Number(index)])
      .map((index) => newData[Number(index)]);

    setSelectRowLeads(selectRow);

    const resut = availableLeads - selectRow.length;
    setResultLeads(resut);
    if (resut < 0) {
      return toast.error('You have exceeded the available leads');
    }
  };
  const filterByService = (data: any[], serviceType: any[]) => {
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
    if (Object.keys(user).length > 0) {
      const dataLawyer = await database.getLawyer(user.id);
      setUserId(dataLawyer.data.data);
    }

    const dataLeadsLawyer: any = await database.getLeadsAssigned();

    if (!dataLeadsLawyer.data) {
      return toast.error('error getting Leads Assigned');
    }

    const filterLedas = dataLeadsLawyer.data.filter(
      (item: any) => item.lawyer_id === user.id
    );

    setLeadsAssigned(filterLedas);
  };

  const postAssignLeads = async () => {
    if (selectRowLeads.length <= 0) {
      return toast.error('You need to select a lead');
    }
    if (resultLeads < 0) {
      return toast.error(
        'You have exceeded the available leads. Please remove some leads to continue'
      );
    }

    const promises = selectRowLeads.map(async (lead) => {
      const leadId = lead['lead id'];

      if (!leadId) {
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
      return toast.error(`Error ${respond[0].code}: ${respond[0].messages}`);
    }
    fetchLeads();
    const DataFilter = filterByService(
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
  };

  useEffect(() => {
    getLawyer();
    getServiceType();
    fetchLeads();
  }, [user]);

  useEffect(() => {
    const DataFilter = filterByService(
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
    getSelectedRowsData();
    //fetchLeads();
  }, [selectedRows, dataLeads, availableLeads]);

  return (
    <div className='flex flex-col gap-5'>
      <Tilte
        name={`${userId?.firstName} ${userId?.lastName}`}
        des={getNameServiceLawyer(userId?.lawyersServices, dataServiceType).map(
          (res: any) => (
            <p key={res?.id}>{res?.name.replace(' Lawyer', '')}</p>
          )
        )}
      >
        <div className='flex justify-center items-center gap-5'>
          <div className='bg-gray-200 px-4 py-1 rounded-md'>
            Available leads <span className='text-red-500'>{resultLeads}</span>{' '}
            out of {userId?.max_leads}
          </div>
          <Button type='button' name='Pull leads' onClick={postAssignLeads} />
        </div>
      </Tilte>

      {newData &&
        (newData.dataLeads > 0 ? (
          <SortableTable
            columns={columns}
            data={newData}
            onSelectRow={handleSelectRow}
            selectedRows={selectedRows}
            statusColors={statusColors}
          />
        ) : (
          <NoData
            text={`There are no leads to assign to your service type lawyer yet. Please wait; they will be available soon.`}
          >
            <MdInfoOutline size={70} color='#00234D' />
          </NoData>
        ))}
    </div>
  );
};

export default SelectLead;
