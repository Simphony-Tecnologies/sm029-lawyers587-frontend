export const modalNewLawyerInput: ModalLawyerInput[] = [
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
    defaultValue: true,
    required: true,
    values: [
      { value: true, name: 'active' },
      { value: false, name: 'inactive' },
    ],
  },
];
