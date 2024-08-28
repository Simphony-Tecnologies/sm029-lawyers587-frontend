export const modalLawyerInput: ModalLawyerInput[] = [
  {
    label: 'name',
    name: 'firstName',
    defaultValue: '',
    type: 'text',
    required: true,
  },
  {
    label: 'last name',
    name: 'lastname',
    defaultValue: '',
    type: 'text',
    required: true,
  },
  {
    label: 'area of law',
    name: 'service_type_id',
    type: 'multiselect',
    required: true,
    defaultValue: [],
    values: [
      {
        label: '',
        value: '',
      },
    ],
  },
  {
    label: 'phone number',
    name: 'phone',
    defaultValue: '',
    type: 'tel',
    required: true,
  },
  {
    label: 'email',
    name: 'email',
    defaultValue: '',
    type: 'text',
    required: true,
  },

  {
    label: 'password',
    name: 'password',
    defaultValue: '',
    type: 'password',
    required: true,
    mode: 'edit',
  },

  {
    label: 'No. Leads Allowed',
    name: 'max_leads',
    defaultValue: '',
    type: 'number',
    required: true,
  },
  {
    label: 'Name of Law Firm',
    name: 'name_of_law_firm',
    defaultValue: '',
    type: 'text',
    required: true,
  },
  {
    label: 'Role',
    name: 'role_id',
    type: 'select',
    defaultValue: 2,
    required: true,
    values: [],
  },
  {
    label: 'Active',
    name: 'is_active',
    type: 'select',
    defaultValue: '',
    required: true,
    values: [
      { value: true, name: 'active' },
      { value: false, name: 'inactive' },
    ],
  },
];
type statictics = {
  name: string;
  value: string | number;
  color: string;
};
export const modalLawyerStatistics: statictics[] = [
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
