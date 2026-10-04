'use client';
import { useMemo, useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { cn } from '@/lib/cn';
import { Checkbox } from '@/components/ui/atoms/Checkbox';

export interface MultiSelectOption {
  value: string;
  label: string;
  /** Texto secundario (p. ej. rango de urgencia). */
  hint?: string;
}

export interface MultiSelectFilterProps {
  id: string;
  /** Nombre del campo (se anuncia junto al valor; el label visible lo pone el padre). */
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Texto cuando no hay selección. */
  placeholder?: string;
  /** Muestra el buscador; por defecto cuando hay más de 8 opciones. */
  searchable?: boolean;
  className?: string;
}

/**
 * Multiselección compacta para el panel de filtros: el disparador se ve como un
 * select y el desplegable lista checkboxes. Cada cambio aplica al instante.
 */
export const MultiSelectFilter = ({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'All',
  searchable,
  className,
}: MultiSelectFilterProps) => {
  const [query, setQuery] = useState('');
  const showSearch = searchable ?? options.length > 8;

  const selected = useMemo(() => new Set(value), [value]);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
      ? labelOf(value[0])
      : `${labelOf(value[0])} +${value.length - 1}`;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (v: string) => {
    onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <Popover className={cn('relative', className)}>
      <PopoverButton
        id={id}
        aria-label={`${label}: ${summary}`}
        className={cn(
          'flex h-[34px] w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40',
          value.length > 0
            ? 'border-slate-900 text-slate-900'
            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900'
        )}
      >
        <span className='truncate'>{summary}</span>
        <MdKeyboardArrowDown size={14} className='shrink-0 text-slate-400' aria-hidden />
      </PopoverButton>
      <PopoverPanel
        anchor='bottom start'
        className='z-50 flex w-[var(--button-width)] min-w-[220px] flex-col rounded-lg border border-slate-200 bg-white shadow-lg [--anchor-gap:4px] focus:outline-none'
      >
        {showSearch ? (
          <div className='border-b border-slate-100 p-2'>
            <input
              type='search'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search...'
              aria-label={`Search ${label}`}
              className='h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none'
            />
          </div>
        ) : null}
        <div className='max-h-[240px] overflow-y-auto py-1'>
          {visible.length === 0 ? (
            <div className='px-3 py-3 text-center text-[12px] font-medium text-slate-400'>
              No matches
            </div>
          ) : (
            visible.map((o) => {
              const checked = selected.has(o.value);
              return (
                <div
                  key={o.value}
                  onClick={() => toggle(o.value)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-slate-50',
                    checked && 'bg-slate-50'
                  )}
                >
                  <Checkbox
                    size='sm'
                    state={checked ? 'checked' : 'unchecked'}
                    aria-label={o.label}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggle(o.value)}
                  />
                  <span className='min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-700'>
                    {o.label}
                  </span>
                  {o.hint ? (
                    <span className='shrink-0 text-[10px] font-semibold tabular-nums text-slate-400'>
                      {o.hint}
                    </span>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </PopoverPanel>
    </Popover>
  );
};
MultiSelectFilter.displayName = 'MultiSelectFilter';
