'use client';
import { MdClose } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface ActiveFilterChip {
  key: string;
  /** Campo (p. ej. "Area of Law"). */
  label: string;
  /** Valor visible (p. ej. "Family Lawyer"). */
  value: string;
  onRemove: () => void;
}

export interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
  className?: string;
}

/** Fila "por qué la lista está filtrada": un chip removible por valor + Clear all. */
export const ActiveFilterChips = ({ chips, onClearAll, className }: ActiveFilterChipsProps) => {
  if (chips.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className='inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white pl-2.5 pr-1 text-[11px] font-semibold text-slate-700'
        >
          <span className='shrink-0 text-slate-400'>{chip.label}:</span>
          <span className='truncate'>{chip.value}</span>
          <button
            type='button'
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.label}: ${chip.value}`}
            className='ml-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40'
          >
            <MdClose size={12} />
          </button>
        </span>
      ))}
      <button
        type='button'
        onClick={onClearAll}
        className='ml-1 inline-flex items-center gap-1 rounded bg-transparent text-[11px] font-bold text-slate-600 transition-colors hover:text-customRed focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40'
      >
        <MdClose size={12} />
        Clear all
      </button>
    </div>
  );
};
ActiveFilterChips.displayName = 'ActiveFilterChips';
