'use client';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FilterButton } from '@/components/ui/molecules/FilterButton';
import {
  MultiSelectFilter,
  type MultiSelectOption,
} from '@/components/ui/molecules/MultiSelectFilter';
import {
  SCORE_OPTIONS,
  type LeadAdvancedFilters,
} from '@/constants/leadAdvancedFilters';
import { SOURCE_FILTER_OPTIONS } from '@/lib/lead-source';
import type { LeadScore } from '@/types/api.types';

export interface LeadFiltersPanelProps {
  /** id del <section> (para aria-controls del botón Filters). */
  id?: string;
  /** Prefijo para ids únicos (admin / lawyer). */
  idPrefix: string;
  /** Status multiselección, sincronizado con los chips de status de la página. */
  status: {
    options: MultiSelectOption[];
    value: string[];
    onChange: (next: string[]) => void;
  };
  value: LeadAdvancedFilters;
  onChange: (next: LeadAdvancedFilters) => void;
  serviceOptions: MultiSelectOption[];
  /** Sin opciones → no se muestra "Assigned to" (vista del abogado). */
  lawyerOptions?: MultiSelectOption[];
  /** Sin opciones → no se muestra "Firm" (solo admin global). */
  firmOptions?: MultiSelectOption[];
  /** My Leads ya tiene chips de origen: no se duplica Source en el panel. */
  showSource?: boolean;
  channelOptions: MultiSelectOption[];
  className?: string;
}

const LABEL_CLASS =
  'text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500';

const Field = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) => (
  <div className='flex min-w-0 flex-col gap-1.5'>
    {htmlFor ? (
      <label htmlFor={htmlFor} className={LABEL_CLASS}>
        {label}
      </label>
    ) : (
      <span className={LABEL_CLASS}>{label}</span>
    )}
    {children}
  </div>
);

const ToggleGroup = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; hint?: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) => (
  <div role='group' aria-label={label} className='flex flex-wrap gap-1.5'>
    {options.map((o) => {
      const active = value.includes(o.value);
      return (
        <FilterButton
          key={o.value}
          label={o.label}
          count={o.hint}
          active={active}
          hideChevron
          onClick={() =>
            onChange(active ? value.filter((v) => v !== o.value) : [...value, o.value])
          }
        />
      );
    })}
  </div>
);

const dateInputClass = (hasValue: boolean) =>
  cn(
    'h-[34px] w-full min-w-0 rounded-lg border bg-white px-2 text-[12px] font-semibold text-slate-700 transition-colors focus:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/20',
    hasValue ? 'border-slate-900' : 'border-slate-200 hover:border-slate-300'
  );

const DateRange = ({
  idPrefix,
  from,
  to,
  onChange,
}: {
  idPrefix: string;
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) => (
  <div className='grid grid-cols-2 gap-2'>
    <label htmlFor={`${idPrefix}-from`} className='flex min-w-0 flex-col gap-1'>
      <span className='text-[10px] font-semibold text-slate-400'>From</span>
      <input
        id={`${idPrefix}-from`}
        type='date'
        value={from}
        max={to || undefined}
        onChange={(e) => onChange(e.target.value, to)}
        className={dateInputClass(!!from)}
      />
    </label>
    <label htmlFor={`${idPrefix}-to`} className='flex min-w-0 flex-col gap-1'>
      <span className='text-[10px] font-semibold text-slate-400'>To</span>
      <input
        id={`${idPrefix}-to`}
        type='date'
        value={to}
        min={from || undefined}
        onChange={(e) => onChange(from, e.target.value)}
        className={dateInputClass(!!to)}
      />
    </label>
  </div>
);

/**
 * Panel de filtros avanzados (inline, no modal). Agrupa como piensa el abogado:
 * qué y quién → de dónde viene → cuándo → prioridad. Cada cambio aplica al
 * instante; el estado vive en la URL (lo maneja la página).
 */
export const LeadFiltersPanel = ({
  id,
  idPrefix,
  status,
  value,
  onChange,
  serviceOptions,
  lawyerOptions,
  firmOptions,
  showSource = true,
  channelOptions,
  className,
}: LeadFiltersPanelProps) => {
  const set = <K extends keyof LeadAdvancedFilters>(key: K, next: LeadAdvancedFilters[K]) =>
    onChange({ ...value, [key]: next });

  const sourceOptions = SOURCE_FILTER_OPTIONS.filter((o) => o.value !== '').map((o) => ({
    value: o.value as string,
    label: o.label as string,
  }));

  return (
    <section
      id={id}
      aria-label='Filters'
      className={cn('rounded-xl border border-slate-200 bg-white p-4', className)}
    >
      {/* El grupo de fechas es más ancho: dos selectores nativos lado a lado. */}
      <div className='grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)]'>
        {/* Qué y quién */}
        <div className='flex min-w-0 flex-col gap-3.5'>
          <Field label='Status' htmlFor={`${idPrefix}-status`}>
            <MultiSelectFilter
              id={`${idPrefix}-status`}
              label='Status'
              options={status.options}
              value={status.value}
              onChange={status.onChange}
            />
          </Field>
          <Field label='Area of Law' htmlFor={`${idPrefix}-service`}>
            <MultiSelectFilter
              id={`${idPrefix}-service`}
              label='Area of Law'
              options={serviceOptions}
              value={value.services}
              onChange={(next) => set('services', next)}
            />
          </Field>
          {lawyerOptions ? (
            <Field label='Assigned to' htmlFor={`${idPrefix}-assigned`}>
              <MultiSelectFilter
                id={`${idPrefix}-assigned`}
                label='Assigned to'
                options={lawyerOptions}
                value={value.assigned}
                onChange={(next) => set('assigned', next)}
              />
            </Field>
          ) : null}
          {firmOptions ? (
            <Field label='Firm' htmlFor={`${idPrefix}-firm`}>
              <MultiSelectFilter
                id={`${idPrefix}-firm`}
                label='Firm'
                options={firmOptions}
                value={value.firms}
                onChange={(next) => set('firms', next)}
              />
            </Field>
          ) : null}
        </div>

        {/* De dónde viene */}
        <div className='flex min-w-0 flex-col gap-3.5 xl:border-l xl:border-slate-100 xl:pl-6'>
          {showSource ? (
            <Field label='Source'>
              <ToggleGroup
                label='Source'
                options={sourceOptions}
                value={value.sources}
                onChange={(next) => set('sources', next)}
              />
            </Field>
          ) : null}
          <Field label='Channel'>
            {channelOptions.length > 0 ? (
              <ToggleGroup
                label='Channel'
                options={channelOptions}
                value={value.channels}
                onChange={(next) => set('channels', next)}
              />
            ) : (
              <span className='text-[11px] text-slate-400'>—</span>
            )}
          </Field>
        </div>

        {/* Cuándo */}
        <div className='flex min-w-0 flex-col gap-3.5 xl:border-l xl:border-slate-100 xl:pl-6'>
          <Field label='Entry date'>
            <DateRange
              idPrefix={`${idPrefix}-entry`}
              from={value.entryFrom}
              to={value.entryTo}
              onChange={(from, to) => onChange({ ...value, entryFrom: from, entryTo: to })}
            />
          </Field>
          <Field label='Pull date'>
            <DateRange
              idPrefix={`${idPrefix}-pull`}
              from={value.pullFrom}
              to={value.pullTo}
              onChange={(from, to) => onChange({ ...value, pullFrom: from, pullTo: to })}
            />
          </Field>
        </div>

        {/* Prioridad */}
        <div className='flex min-w-0 flex-col gap-3.5 xl:border-l xl:border-slate-100 xl:pl-6'>
          <Field label='Score'>
            <ToggleGroup
              label='Score'
              options={SCORE_OPTIONS}
              value={value.scores}
              onChange={(next) => set('scores', next as LeadScore[])}
            />
          </Field>
        </div>
      </div>
    </section>
  );
};
LeadFiltersPanel.displayName = 'LeadFiltersPanel';
