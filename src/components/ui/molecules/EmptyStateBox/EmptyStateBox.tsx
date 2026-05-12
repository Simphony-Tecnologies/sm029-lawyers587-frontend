import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateBoxProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
}

export const EmptyStateBox = forwardRef<HTMLDivElement, EmptyStateBoxProps>(
  ({ icon, title, description, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-10 py-[72px] text-center',
        className
      )}
      {...rest}
    >
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_1px_1px,#E4E7EE_0.5px,transparent_0)] bg-[size:20px_20px] opacity-40'
      />
      <div className='relative z-[2] mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-slate-300'>
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-extrabold text-slate-400'>
          {icon ?? '…'}
        </div>
      </div>
      <h3 className='relative z-[2] mb-2 text-lg font-extrabold tracking-[-0.02em] text-slate-900'>
        {title}
      </h3>
      {description ? (
        <p className='relative z-[2] mx-auto max-w-[360px] text-[13px] font-medium leading-[1.55] text-slate-500'>
          {description}
        </p>
      ) : null}
    </div>
  )
);
EmptyStateBox.displayName = 'EmptyStateBox';
