import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PageHeadProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  count?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export const PageHead = forwardRef<HTMLDivElement, PageHeadProps>(
  ({ eyebrow, title, count, subtitle, action, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-start justify-between gap-4',
        !subtitle && 'items-center',
        className
      )}
      {...rest}
    >
      <div className='min-w-0'>
        {eyebrow ? (
          <span className='block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400'>
            {eyebrow}
          </span>
        ) : null}
        <h1 className='mt-0.5 flex items-baseline gap-2.5 text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] text-slate-900'>
          <span className='truncate'>{title}</span>
          {count ? (
            <span className='text-[13px] font-medium tabular-nums text-slate-400'>
              {count}
            </span>
          ) : null}
        </h1>
        {subtitle ? (
          <p className='mt-1 text-[13px] font-medium leading-[1.5] text-slate-500'>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className='shrink-0'>{action}</div> : null}
    </div>
  )
);
PageHead.displayName = 'PageHead';
