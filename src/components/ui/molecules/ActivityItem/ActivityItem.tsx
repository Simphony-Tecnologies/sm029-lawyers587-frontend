import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconBadge } from '@/components/ui/atoms/IconBadge';
import type { KpiTone } from '@/components/ui/molecules/KpiCard';

export type ActivityTone = KpiTone | 'sky';

export interface ActivityItemProps extends HTMLAttributes<HTMLDivElement> {
  tone: ActivityTone;
  icon: ReactNode;
  description: ReactNode;
  actor?: ReactNode;
  time?: string;
}

export const ActivityItem = forwardRef<HTMLDivElement, ActivityItemProps>(
  ({ tone, icon, description, actor, time, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-slate-100 py-3 last:border-b-0',
        className
      )}
      {...rest}
    >
      <IconBadge size='sm' tone={tone} aria-hidden>
        {icon}
      </IconBadge>
      <div className='flex min-w-0 flex-col gap-px leading-snug'>
        <span className='truncate text-[13px] font-medium tracking-[-0.005em] text-slate-700'>
          {description}
        </span>
        {actor ? (
          <span className='truncate text-[11px] font-medium text-slate-400'>
            {actor}
          </span>
        ) : null}
      </div>
      {time ? (
        <span className='whitespace-nowrap text-[11px] font-semibold tabular-nums text-slate-400'>
          {time}
        </span>
      ) : null}
    </div>
  )
);
ActivityItem.displayName = 'ActivityItem';
