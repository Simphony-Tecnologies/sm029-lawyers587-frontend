import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { MdArrowUpward, MdArrowDownward, MdRemove } from 'react-icons/md';
import { cn } from '@/lib/cn';

const trendPillStyles = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-none',
  {
    variants: {
      direction: {
        up: 'bg-emerald-50 text-emerald-700',
        down: 'bg-red-50 text-customRed',
        neutral: 'bg-slate-100 text-slate-600',
      },
    },
    defaultVariants: { direction: 'neutral' },
  }
);

export interface TrendPillProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof trendPillStyles> {
  value: string;
}

const Icon = ({ direction }: { direction: TrendPillProps['direction'] }) => {
  if (direction === 'up') return <MdArrowUpward size={10} />;
  if (direction === 'down') return <MdArrowDownward size={10} />;
  return <MdRemove size={10} />;
};

export const TrendPill = forwardRef<HTMLSpanElement, TrendPillProps>(
  ({ direction, value, className, ...rest }, ref) => (
    <span
      ref={ref}
      className={cn(trendPillStyles({ direction }), className)}
      {...rest}
    >
      <Icon direction={direction} />
      {value}
    </span>
  )
);
TrendPill.displayName = 'TrendPill';
