import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type LawyerStatus =
  | 'assignable'
  | 'capacity'
  | 'unassignable'
  | 'pending';

export interface LawyerStatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  status: LawyerStatus;
  label?: string;
}

const styleMap: Record<LawyerStatus, { wrap: string; dot: string; label: string }> = {
  assignable: {
    wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Assignable',
  },
  capacity: {
    wrap: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    label: 'At capacity',
  },
  unassignable: {
    wrap: 'bg-red-50 text-customRed border-red-200',
    dot: 'bg-customRed',
    label: 'Unassignable',
  },
  pending: {
    wrap: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'bg-slate-400',
    label: 'Pending',
  },
};

export const LawyerStatusPill = forwardRef<HTMLSpanElement, LawyerStatusPillProps>(
  ({ status, label, className, ...rest }, ref) => {
    const style = styleMap[status];
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.02em]',
          style.wrap,
          className
        )}
        {...rest}
      >
        <span aria-hidden className={cn('h-[5px] w-[5px] rounded-full', style.dot)} />
        {label ?? style.label}
      </span>
    );
  }
);
LawyerStatusPill.displayName = 'LawyerStatusPill';
