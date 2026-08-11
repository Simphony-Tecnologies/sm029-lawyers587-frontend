'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { EmptyStateBox } from '@/components/ui';
import { useFirmAccess } from '@/hooks/useFirmAccess';
import type { NavGate } from '@/types/routes.interface';

interface FirmGuardProps {
  gate: NavGate;
  children: ReactNode;
}

// Guard cliente para las subsecciones de firma. El middleware solo protege por
// rol (lawyer/admin); is_firm_admin y admin-global se resuelven acá para UX y el
// backend los re-verifica (403). `mounted` evita evaluar contra el store aún no
// rehidratado por zustand/persist en el primer render.
export function FirmGuard({ gate, children }: FirmGuardProps) {
  const [mounted, setMounted] = useState(false);
  const { hasFirm, isFirmAdmin, isGlobalAdmin } = useFirmAccess();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <p className='text-sm text-slate-400'>Loading…</p>;
  }

  const allowed =
    gate === 'firm'
      ? hasFirm
      : gate === 'firm_admin'
        ? isFirmAdmin
        : isGlobalAdmin;

  if (!allowed) {
    return (
      <EmptyStateBox
        icon='!'
        title='You don’t have permission to view this section'
        description={
          gate === 'global_admin'
            ? 'This area is restricted to the global administrator.'
            : 'This area is restricted to firm administrators. Ask a firm administrator if you think this is a mistake.'
        }
      />
    );
  }

  return <>{children}</>;
}
