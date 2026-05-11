import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface BrandMarkProps extends HTMLAttributes<HTMLDivElement> {}

export const BrandMark = forwardRef<HTMLDivElement, BrandMarkProps>(
  ({ className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-customRed',
          className
        )}
        aria-hidden
        {...rest}
      >
        <div className='grid h-4 w-4 grid-cols-2 gap-[2px]'>
          <span className='rounded-[1.5px] bg-white' />
          <span className='rounded-[1.5px] bg-white' />
          <span className='rounded-[1.5px] bg-white' />
          <span className='rounded-[1.5px] bg-white' />
        </div>
      </div>
    );
  }
);
BrandMark.displayName = 'BrandMark';
