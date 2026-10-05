'use client';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { MdInfoOutline } from 'react-icons/md';
import { api } from '@/services/database';
import type {
  AgingKey,
  AgingReportResponse,
  AgingRow,
  MetricsPeriod,
} from '@/types/api.types';
import { apiText } from '@/lib/apiText';

// Fase 3 (3.3) — Aging Report: días promedio, P50 y P90 por status, con los
// intervalos que terminaron en el período de calendario elegido.

interface AgingPanelProps {
  period: MetricsPeriod;
  /** Control en el header (el PeriodSelect propio del panel). */
  action?: ReactNode;
}

// Orden, etiqueta y definición (texto del documento vendido) de cada fila.
const AGING_ROWS: Array<{ key: AgingKey; label: string; info: string }> = [
  { key: 'new', label: 'New', info: 'Days before the first contact' },
  { key: 'in_progress', label: 'In Progress', info: 'Days before conversion' },
  { key: 'contacted', label: 'Contacted', info: 'Days before the next action' },
];

const formatDays = (value: number | null | undefined): string =>
  value == null ? '—' : value.toFixed(1);

// Mismo estilo de encabezado que DataTable; en escritorio las cuatro columnas
// numéricas tienen el mismo ancho.
const TH_CLASS =
  'py-2 pl-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:w-[16%]';

export const AgingPanel = ({ period, action }: AgingPanelProps) => {
  const [data, setData] = useState<AgingReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.leads.metrics
      .aging(period)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setData(res.data);
        else {
          setData(null);
          setError(apiText(res.message) || null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period]);

  const byKey = new Map<AgingKey, AgingRow>(
    data && !loading ? data.rows.map((r) => [r.key, r]) : []
  );

  return (
    <div className='flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-sm font-bold text-slate-800'>Aging Report</h2>
        {/* El selector sigue visible si la carga falla. */}
        {action ? <div className='shrink-0'>{action}</div> : null}
      </div>
      {error ? (
        <p className='text-sm text-slate-500'>{error}</p>
      ) : (
        <table className='w-full border-collapse' aria-busy={loading}>
          <thead>
            <tr>
              <td rowSpan={2} className='border-b border-slate-200' />
              {/* "days" agrupa Average · P50 · P90; Leads es el número de leads medidos. */}
              <th
                colSpan={3}
                scope='colgroup'
                className='border-b border-slate-100 pb-1 pl-3 text-center text-[11px] font-medium text-slate-400'
              >
                days
              </th>
              <th
                rowSpan={2}
                scope='col'
                className={`${TH_CLASS} border-b border-slate-200 align-bottom`}
              >
                Leads
              </th>
            </tr>
            <tr className='border-b border-slate-200'>
              <th scope='col' className={TH_CLASS}>Average</th>
              <th scope='col' className={TH_CLASS}>P50</th>
              <th scope='col' className={TH_CLASS}>P90</th>
            </tr>
          </thead>
          <tbody>
            {AGING_ROWS.map((def) => {
              const row = byKey.get(def.key);
              return (
                <tr key={def.key} className='border-b border-slate-100 last:border-b-0'>
                  <th scope='row' className='relative py-3.5 pr-2 text-left'>
                    <span className='inline-flex items-center gap-1 text-[13px] font-semibold text-slate-800'>
                      {def.label}
                      <InfoTip text={def.info} />
                    </span>
                  </th>
                  <td className='py-3.5 pl-3 text-right text-xs font-semibold tabular-nums text-slate-900'>
                    {formatDays(row?.avg_days)}
                  </td>
                  <td className='py-3.5 pl-3 text-right text-xs font-medium tabular-nums text-slate-700'>
                    {formatDays(row?.p50_days)}
                  </td>
                  <td className='py-3.5 pl-3 text-right text-xs font-medium tabular-nums text-slate-700'>
                    {formatDays(row?.p90_days)}
                  </td>
                  <td className='py-3.5 pl-3 text-right text-xs font-medium tabular-nums text-slate-700'>
                    {row ? row.count : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Mismo patrón ⓘ que KpiCard: tooltip oscuro con la definición, visible con
// hover sobre el ícono o con foco de teclado. Anclado a la celda de la fila
// (th relative) y abierto hacia arriba para no salirse de la tarjeta.
const InfoTip = ({ text }: { text: string }) => {
  const id = useId();
  return (
    <span
      tabIndex={0}
      aria-describedby={id}
      className='group/info inline-flex rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-customRed/40'
    >
      <MdInfoOutline
        size={13}
        aria-hidden
        className='text-slate-400 transition-colors group-hover/info:text-slate-600 group-focus-visible/info:text-slate-600'
      />
      <span
        id={id}
        role='tooltip'
        className='pointer-events-none absolute bottom-full left-0 z-20 mb-1 w-max max-w-[15rem] rounded-lg bg-slate-900 px-2.5 py-2 text-[11px] font-medium leading-snug tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover/info:opacity-100 group-focus-visible/info:opacity-100'
      >
        {text}
      </span>
    </span>
  );
};
