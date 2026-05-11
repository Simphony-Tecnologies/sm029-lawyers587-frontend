'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const iconButtonStyles = cva(
  'relative inline-flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-8 w-8',
        md: 'h-9 w-9',
      },
      variant: {
        ghost:
          'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 data-[active]:bg-slate-100 data-[active]:text-slate-900 data-[open]:bg-slate-100 data-[open]:text-slate-900',
        outline:
          'border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-900',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'ghost',
    },
  }
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonStyles> {}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size, variant, type, className, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={cn(iconButtonStyles({ size, variant }), className)}
        {...rest}
      />
    );
  }
);
IconButton.displayName = 'IconButton';
