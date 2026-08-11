'use client';
import { useAuth } from '@/store/useAuth.store';

export interface FirmAccess {
  userId: number | null;
  firmId: number | null;
  hasFirm: boolean;
  isFirmAdmin: boolean;
  isGlobalAdmin: boolean;
}

// Deriva las capacidades de firma (Activity 25) desde el lawyer del login que
// persiste useAuth. El backend re-verifica todo por JWT en cada request; estos
// flags solo deciden qué UI mostrar, nunca son la fuente de verdad de seguridad.
export const useFirmAccess = (): FirmAccess => {
  const { user } = useAuth();
  const firmId: number | null =
    typeof user?.firm_id === 'number' ? user.firm_id : null;
  return {
    userId: typeof user?.id === 'number' ? user.id : null,
    firmId,
    hasFirm: firmId != null,
    isFirmAdmin: user?.is_firm_admin === true,
    isGlobalAdmin: String(user?.role?.name ?? '').toLowerCase() === 'admin',
  };
};
