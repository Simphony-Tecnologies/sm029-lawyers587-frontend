'use client';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const iconStyles = cva(
  'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]',
  {
    variants: {
      tone: {
        slate: 'bg-slate-100 text-slate-700',
        emerald: 'bg-emerald-50 text-emerald-600',
        sky: 'bg-sky-50 text-sky-600',
        amber: 'bg-amber-50 text-amber-600',
        coral: 'bg-red-50 text-customRed',
        violet: 'bg-violet-50 text-violet-600',
        rose: 'bg-rose-50 text-rose-600',
      },
    },
    defaultVariants: {
      tone: 'slate',
    },
  }
);

export type StatCardTone = NonNullable<
  VariantProps<typeof iconStyles>['tone']
>;

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: number | string;
  sub?: ReactNode;
  icon: ReactNode;
  tone?: StatCardTone;
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, sub, icon, tone, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5',
        className
      )}
      {...rest}
    >
      <span className={iconStyles({ tone })} aria-hidden>
        {icon}
      </span>
      <div className='flex min-w-0 flex-col gap-0.5'>
        <span className='text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500'>
          {label}
        </span>
        <span className='text-[22px] font-extrabold leading-[1.1] tracking-[-0.025em] tabular-nums text-slate-900'>
          {value}
        </span>
        {sub ? (
          <span className='mt-0.5 text-[10px] font-medium text-slate-400'>
            {sub}
          </span>
        ) : null}
      </div>
    </div>
  )
);
StatCard.displayName = 'StatCard';
