type LawyerData = {
  code: string;
  id: number;
  password: string;
  created_at: string;
  email: string;
  firstName: string;
  lastName: string;
  is_active: string;
  phone: string;
  last_login: Date;
  max_leads: string;
  role: {
    id: number;
    name: string;
  };
  service_type: {
    id: number;
    name: string;
  };
  law_firm: string;
  notes: string;
  status: 'Assignable' | 'Unassignable';
};
