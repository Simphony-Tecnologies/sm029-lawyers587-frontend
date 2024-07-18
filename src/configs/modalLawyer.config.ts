export const modalLawyerInput = [
  {
    label: 'name',
    name: 'firstName',
    defaultValue: '',
    type: 'text',
    required: true,
  },
  {
    label: 'lastname',
    name: 'lastName',
    defaultValue: '',
    type: 'text',
    required: true,
  },
  {
    label: 'area of law',
    name: 'service_type_id',
    defaultValue: '',
    type: 'select',
    required: true,
    values: [],
  },
  {
    label: 'phone number',
    name: 'phone',
    defaultValue: '',
    type: 'number',
    required: true,
  },
  {
    label: 'email',
    name: 'email',
    defaultValue: '',
    type: 'text',
    required: true,
  },
  ,
  {
    label: 'password',
    name: 'password',
    defaultValue: '',
    type: 'password',
    required: true,
  },

  {
    label: 'No. Leads Allowed',
    name: 'max_leads',
    defaultValue: '',
    type: 'number',
    required: true,
  },
  {
    label: 'Role',
    name: 'role_id',
    defaultValue: '',
    type: 'number',
    required: true,
  },
  {
    label: 'Active',
    name: 'Active',
    defaultValue: '',
    type: 'text',
    required: true,
  },
];
export const modalLawyerStatistics = [
  {
    name: 'Total leads',
    value: '-',
    color: '#898989',
  },
  {
    name: 'Leads Available for request',
    value: '-',
    color: '#898989',
  },
  {
    name: 'Active Leads',
    value: '-',
    color: '#4AD991',
  },
  {
    name: 'Lost Leads',
    value: '-',
    color: '#FF9066',
  },
  {
    name: 'Missed Leads',
    value: '-',
    color: '#FEC53D',
  },
];
