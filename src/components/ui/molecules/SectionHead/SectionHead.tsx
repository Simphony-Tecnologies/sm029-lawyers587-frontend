import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SectionHeadProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export const SectionHead = forwardRef<HTMLDivElement, SectionHeadProps>(
  ({ title, subtitle, action, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-end justify-between gap-3', className)}
      {...rest}
    >
      <div className='flex min-w-0 flex-col gap-0.5'>
        <h2 className='text-[17px] font-extrabold tracking-[-0.02em] text-slate-900'>
          {title}
        </h2>
        {subtitle ? (
          <p className='text-[12px] font-medium leading-[1.5] text-slate-500'>
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className='shrink-0'>{action}</div> : null}
    </div>
  )
);
SectionHead.displayName = 'SectionHead';
