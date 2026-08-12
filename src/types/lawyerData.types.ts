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
  profile_image_url: string;
  verification_status?: 'pending' | 'verified' | 'rejected';
  onboarding_status?: 'pending' | 'completed' | 'skipped';
  license_document_url?: string | null;
  verified_at?: string | null;
  rejection_reason?: string | null;
  // ── Firm-level admin (Activity 25) ── el login ya los incluye en `lawyer`.
  // Opcionales: sesiones persistidas antes de A25 no los tienen (pre-backfill).
  firm_id?: number | null;
  is_firm_admin?: boolean;
} | null;
