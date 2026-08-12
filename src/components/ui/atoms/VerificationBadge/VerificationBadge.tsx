import type { VerificationStatus } from '@/types/api.types';
import { cn } from '@/lib/cn';

const STYLES: Record<VerificationStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700' },
  verified: { label: 'Verified', className: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700' },
};

export const VerificationBadge = ({ status }: { status: VerificationStatus }) => {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
        s.className
      )}
    >
      {s.label}
    </span>
  );
};

VerificationBadge.displayName = 'VerificationBadge';
