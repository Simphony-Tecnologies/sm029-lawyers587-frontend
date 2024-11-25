import SortableTable from '@/components/organisms/SortableTable';
import Tilte from '@/components/organisms/Tilte';
import { database } from '@/services/database';

const AssignedLeads = async () => {
  let columns: any = [];
  let data = [];
  let error = null;
  const statusColors = {
    assigned: '#00B69B',
    Unassignable: '#FF4240',
  };
  try {
    const url = `${process.env.NEXT_PUBLIC_URL}/leads`;
    const leadsData = await database.getData(url);

    if (!leadsData.success) {
      throw new Error('Failed to fetch leads data');
    }
    data = leadsData.data.map((lead: any) => ({
      'id lead': lead.id,
      date: lead.created_at,
      'lead name': lead.full_name,
      email: lead.email,
      'phone number': lead.phone_number,
      'service type': lead.lawyer_type,
      'description lead': lead.description,
      notes: lead.notes,
      status: lead.status === 1 ? 'assigned' : '',
    }));
    columns = Object.keys(data[0]);
  } catch (err) {
    console.error('Error fetching leads data:', err);
    error = 'There are no new leads, please try again later.';
  }

  return (
    <div>
      <Tilte name='Assigned Leads' />
      {error ? (
        <div>{error}</div>
      ) : (
        <SortableTable
          columns={columns}
          data={data}
          statusColors={statusColors}
        />
      )}
    </div>
  );
};

export default AssignedLeads;
