'use client';
import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const menuPanelStyles = cva(
  'rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_1px_2px_rgba(11,15,25,0.06),0_24px_48px_rgba(11,15,25,0.16)] focus:outline-none',
  {
    variants: {
      width: {
        sm: 'w-56',
        md: 'w-[260px]',
        lg: 'w-72',
      },
    },
    defaultVariants: {
      width: 'md',
    },
  }
);

export interface MenuPanelProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof menuPanelStyles> {}

export const MenuPanel = forwardRef<HTMLDivElement, MenuPanelProps>(
  ({ width, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(menuPanelStyles({ width }), className)}
      {...rest}
    >
      {children}
    </div>
  )
);
MenuPanel.displayName = 'MenuPanel';
