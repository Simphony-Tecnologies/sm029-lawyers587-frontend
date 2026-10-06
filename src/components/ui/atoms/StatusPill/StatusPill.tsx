import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const statusPillStyles = cva(
  'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider leading-none whitespace-nowrap',
  {
    variants: {
      variant: {
        new: 'bg-emerald-50 text-emerald-700',
        assigned: 'bg-sky-50 text-sky-700',
        'in-progress': 'bg-amber-50 text-amber-700',
        'waiting-on-client': 'bg-orange-50 text-orange-700',
        problematic: 'bg-rose-50 text-rose-700',
        closed: 'bg-slate-100 text-slate-600',
        completed: 'bg-indigo-50 text-indigo-700',
        lost: 'bg-orange-50 text-orange-700',
        expired: 'bg-stone-100 text-stone-600',
        disabled: 'bg-slate-100 text-slate-500',
        review: 'bg-amber-50 text-amber-700',
        trashed: 'bg-red-50 text-red-700',
        archived: 'bg-slate-100 text-slate-500',
      },
    },
    defaultVariants: {
      variant: 'new',
    },
  }
);

export type StatusPillVariant =
  | 'new'
  | 'assigned'
  | 'in-progress'
  | 'waiting-on-client'
  | 'problematic'
  | 'closed'
  | 'completed'
  | 'lost'
  | 'expired'
  | 'disabled'
  | 'review'
  | 'trashed'
  | 'archived';

export interface StatusPillProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusPillStyles> {}

const LABELS: Record<StatusPillVariant, string> = {
  new: 'New',
  assigned: 'Assigned',
  'in-progress': 'In progress',
  'waiting-on-client': 'Waiting on Client',
  problematic: 'Flagged',
  closed: 'Retained',
  completed: 'Completed',
  lost: 'Sent back',
  expired: 'Expired',
  disabled: 'Disabled',
  review: 'Review',
  trashed: 'Trashed',
  archived: 'Archived',
};

const RAW_TO_VARIANT: Record<string, StatusPillVariant> = {
  NEW: 'new',
  ASSIGNED: 'assigned',
  'IN PROGRESS': 'in-progress',
  WAITING_ON_CLIENT: 'waiting-on-client',
  PROBLEMATIC: 'problematic',
  CLOSED: 'closed',
  COMPLETED: 'completed',
  LOST: 'lost',
  // SEND_BACK y ARCHIVED caían al fallback 'closed' y se pintaban "Retained".
  // SEND_BACK comparte etiqueta con LOST ("Sent back") hasta la decisión C1.
  SEND_BACK: 'lost',
  ARCHIVED: 'archived',
  EXPIRED: 'expired',
  DISABLED: 'disabled',
  REVIEW: 'review',
  TRASHED: 'trashed',
};

export const variantFromStatus = (raw: string): StatusPillVariant =>
  RAW_TO_VARIANT[raw?.toUpperCase()] ?? 'closed';

export const StatusPill = forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ variant, className, children, ...rest }, ref) => (
    <span
      ref={ref}
      className={cn(statusPillStyles({ variant }), className)}
      {...rest}
    >
      {children ?? (variant ? LABELS[variant] : '')}
    </span>
  )
);
StatusPill.displayName = 'StatusPill';
