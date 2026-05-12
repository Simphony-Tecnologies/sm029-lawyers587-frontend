'use client';
import { Fragment, type ReactNode } from 'react';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react';
import { MdCheck, MdKeyboardArrowDown } from 'react-icons/md';
import { cn } from '@/lib/cn';

export type PeriodKey = 'today' | 'week' | 'month' | 'all';

export interface PeriodOption {
  key: PeriodKey;
  label: string;
  /** Días hacia atrás desde hoy. `null` = sin filtro (all time). */
  days: number | null;
}

export const DEFAULT_PERIODS: PeriodOption[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: 'week', label: 'This week', days: 7 },
  { key: 'month', label: 'This month', days: 30 },
  { key: 'all', label: 'All time', days: null },
];

export interface PeriodSelectProps {
  value?: PeriodKey;
  onChange?: (next: PeriodOption) => void;
  options?: PeriodOption[];
  className?: string;
  /** Legacy: si no se pasa value/onChange el botón se renderiza estático con este label. */
  label?: string;
  children?: ReactNode;
}

export const PeriodSelect = ({
  value,
  onChange,
  options = DEFAULT_PERIODS,
  className,
  label,
}: PeriodSelectProps) => {
  // Modo estático: si no hay onChange, se renderiza como botón decorativo
  // (preserva uso legacy donde solo se pasaba `label`).
  if (!onChange) {
    return (
      <button
        type='button'
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-[9px] border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors',
          className
        )}
      >
        {label ?? 'This week'}
        <MdKeyboardArrowDown size={14} className='text-slate-400' />
      </button>
    );
  }

  const current =
    options.find((o) => o.key === value) ?? options[1] /* week default */;

  return (
    <Menu as='div' className={cn('relative', className)}>
      <MenuButton className='inline-flex h-9 items-center gap-2 rounded-[9px] border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40'>
        {current.label}
        <MdKeyboardArrowDown size={14} className='text-slate-400' />
      </MenuButton>
      <Transition
        as={Fragment}
        enter='transition ease-out duration-100'
        enterFrom='opacity-0 scale-95'
        enterTo='opacity-100 scale-100'
        leave='transition ease-in duration-75'
        leaveFrom='opacity-100 scale-100'
        leaveTo='opacity-0 scale-95'
      >
        <MenuItems className='absolute right-0 z-50 mt-1 w-44 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-200 focus:outline-none'>
          {options.map((opt) => {
            const selected = opt.key === current.key;
            return (
              <MenuItem key={opt.key}>
                {({ active }) => (
                  <button
                    type='button'
                    onClick={() => onChange(opt)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 bg-transparent px-3 py-2 text-left text-[12px] font-semibold transition-colors',
                      active ? 'bg-slate-50 text-slate-900' : 'text-slate-700'
                    )}
                  >
                    {opt.label}
                    {selected ? (
                      <MdCheck size={14} className='text-customRed' />
                    ) : null}
                  </button>
                )}
              </MenuItem>
            );
          })}
        </MenuItems>
      </Transition>
    </Menu>
  );
};
