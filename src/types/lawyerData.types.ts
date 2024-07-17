type LawyerData = {
  code: string;
  created_at: string;
  email: string;
  firstName: string;
  lastName: string;
  is_active: string;
  phone: string;
  last_login: string;
  max_leads: string;
  role: {
    id: number;
    name: string;
  };
  service_type: {
    id: number;
    name: string;
  };
  status: 'Assignable' | 'Unassignable';
};
