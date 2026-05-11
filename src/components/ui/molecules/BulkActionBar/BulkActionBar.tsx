'use client';
import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface BulkAction {
  key: string;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'danger';
  onClick: () => void;
  disabled?: boolean;
}

export interface BulkActionBarProps {
  count: number;
  itemLabel?: { singular: string; plural: string };
  actions: BulkAction[];
  onDeselect: () => void;
  className?: string;
}

export const BulkActionBar = ({
  count,
  itemLabel = { singular: 'lead selected', plural: 'leads selected' },
  actions,
  onDeselect,
  className,
}: BulkActionBarProps) => {
  if (count <= 0) return null;

  const label = count === 1 ? itemLabel.singular : itemLabel.plural;

  return (
    <div
      role='toolbar'
      aria-label='Bulk actions'
      className={cn(
        'sticky bottom-3 z-20 mx-auto flex h-14 w-full items-center gap-0 rounded-[14px] bg-slate-900 pl-5 pr-2',
        'shadow-[0_-4px_32px_rgba(11,15,25,0.22),0_0_0_1px_rgba(255,255,255,0.06)_inset]',
        className
      )}
    >
      <span className='whitespace-nowrap text-[13px] font-bold text-white'>
        <span className='font-extrabold tabular-nums'>{count}</span>{' '}
        <span className='font-medium text-white/80'>{label}</span>
      </span>

      <span
        aria-hidden
        className='mx-3 h-7 w-px flex-shrink-0 bg-white/10'
      />

      <div className='flex flex-1 items-center gap-1.5'>
        {actions.map((action) => (
          <button
            key={action.key}
            type='button'
            disabled={action.disabled}
            onClick={action.onClick}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3.5 text-xs font-semibold tracking-[-0.005em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-40',
              action.variant === 'danger'
                ? 'border-red-300/20 bg-white/[0.04] text-red-300 hover:bg-rose-600/20 hover:text-red-100'
                : 'border-white/10 bg-white/[0.06] text-white/85 hover:bg-white/[0.12] hover:text-white'
            )}
          >
            {action.icon ? (
              <span className='inline-flex'>{action.icon}</span>
            ) : null}
            {action.label}
          </button>
        ))}
      </div>

      <button
        type='button'
        onClick={onDeselect}
        className='ml-auto inline-flex h-9 items-center whitespace-nowrap rounded-lg bg-transparent px-3.5 text-xs font-semibold text-white/50 transition-colors hover:text-white/85 focus:outline-none focus-visible:text-white'
      >
        Deselect all
      </button>
    </div>
  );
};
BulkActionBar.displayName = 'BulkActionBar';
