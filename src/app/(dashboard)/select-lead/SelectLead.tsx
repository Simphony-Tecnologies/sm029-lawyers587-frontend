'use client';
import Button from '@/components/atoms/Button';
import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import { useLeadsStore } from '@/store/useLead.store';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
const SelectLead = () => {
  const { user } = useAuth();
  const { dataLeads, fetchLeads } = useLeadsStore();

  const [selectedRows, setSelectedRows] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [newData, setNewData] = useState<any>([]);
  const [leadsAssigned, setLeadsAssigned] = useState([]);
  const [selectRowLeads, setSelectRowLeads] = useState([]);
  const [columns, setColumns] = useState([]);

  const availableLeads =
    leadsAssigned.length >= 0
      ? parseInt(user?.max_leads) - leadsAssigned.length
      : 0;

  const [resultLeads, setResultLeads] = useState(0);

  const statusColors = {
    NEW: '#8280FF',
    ASSIGNED: '#4AD991',
    CLOSED: '#FF9066',
    PROBLEMATIC: '#FEC53D',
  };
  const handleSelectRow = (index: number) => {
    setSelectedRows((prevSelectedRows) => ({
      ...prevSelectedRows,
      [index]: !prevSelectedRows[index],
    }));
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
  const filterByService = (data: any[], serviceType: string) => {
    return data.filter(
      (item) => item.service === serviceType && item.status == 'NEW'
    );
  };
  const getLawyer = async () => {
    const dataLawyer: any = await database.getLeadsAssigned();

    if (!dataLawyer.success) {
      return toast.error('error getting Leads Assigned');
    }

    const filterLedas = dataLawyer.data.filter(
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

      if (response.code === 404) {
        return toast.error(`Error ${response.code}: ${response.messages}`);
      }

      return response;
    });

    await Promise.all(promises);
    fetchLeads();
    const DataFilter = filterByService(dataLeads, user?.service_type?.name);

    const filteredDataLeads = DataFilter.map(
      ({
        email,
        'phone number': phoneNumber,
        'description lead': descriptionLead,
        ...rest
      }) => rest
    );
    setNewData(filteredDataLeads);
    setSelectRowLeads([]);
    toast.success('Leads successfully added');
  };
  useEffect(() => {
    getLawyer();
  }, [user]);

  useEffect(() => {
    const DataFilter = filterByService(dataLeads, user?.service_type?.name);
    const filteredDataLeads = DataFilter.map(
      ({
        email,
        'phone number': phoneNumber,
        'description lead': descriptionLead,
        ...rest
      }) => rest
    );
    setNewData(filteredDataLeads);
    if (filteredDataLeads.length > 0) {
      const titles: any = Object.keys(filteredDataLeads[0]);
      setColumns(titles);
    }
    getSelectedRowsData();
  }, [selectedRows, dataLeads, availableLeads]);

  return (
    <div className='flex flex-col gap-5'>
      <Tilte
        name={`${user?.firstName} ${user?.lastName}`}
        des={user?.service_type?.name}
      >
        <div className='flex justify-center items-center gap-5'>
          <div className='bg-gray-200 px-4 py-1 rounded-md'>
            Available leads <span className='text-red-500'>{resultLeads}</span>{' '}
            out of {user?.max_leads}
          </div>
          <Button type='button' name='Pull leads' onClick={postAssignLeads} />
        </div>
      </Tilte>

      <SortableTable
        columns={columns}
        data={newData}
        onSelectRow={handleSelectRow}
        selectedRows={selectedRows}
        statusColors={statusColors}
      />
    </div>
  );
};

export default SelectLead;
