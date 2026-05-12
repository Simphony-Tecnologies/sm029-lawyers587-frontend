import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface BrandProps extends HTMLAttributes<HTMLDivElement> {
  logo: ReactNode;
  role?: string;
}

export const Brand = forwardRef<HTMLDivElement, BrandProps>(
  ({ logo, role, className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-start gap-1.5 border-b border-slate-100 px-5 pb-4 pt-5',
          className
        )}
        {...rest}
      >
        <div className='flex shrink-0 items-center'>{logo}</div>
        {role ? (
          <span className='text-[10px] font-semibold uppercase tracking-wider text-slate-400'>
            {role}
          </span>
        ) : null}
      </div>
    );
  }
);
Brand.displayName = 'Brand';
