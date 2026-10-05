'use client';
import { useEffect, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { MdFileDownload } from 'react-icons/md';
import { api, downloadBlob } from '@/services/database';
import type {
  ExportFormat,
  MetricsPeriod,
  SourceAnalysisKey,
  SourceAnalysisResponse,
  SourceFunnel,
} from '@/types/api.types';
import { formatPercent } from '@/lib/metrics';
import { sourceLabel } from '@/lib/lead-source';
import { apiText } from '@/lib/apiText';

// Fase 3 (3.2) — Lead Source Analysis: embudo captured → converted por source
// (Chatbot vs Web Form) del período de calendario elegido.

interface SourceAnalysisPanelProps {
  period: MetricsPeriod;
  /** Control en el header (el PeriodSelect propio del panel). */
  action?: ReactNode;
}

// Filas mientras carga (valores '—'), para que la tarjeta no salte al llegar los datos.
const PLACEHOLDER_SOURCES: SourceAnalysisKey[] = ['chatbot', 'web_form'];

// Mismo estilo que los botones Export CSV de la Fase 1, con la altura del PeriodSelect.
const EXPORT_BUTTON_CLASS =
  'inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-3.5 text-xs font-bold tracking-[-0.005em] text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50';

export const SourceAnalysisPanel = ({ period, action }: SourceAnalysisPanelProps) => {
  const [data, setData] = useState<SourceAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.leads.metrics
      .sources(period)
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

  // CSV / PDF generados por el backend para el mismo período.
  const handleExport = async (format: ExportFormat) => {
    if (exporting) return;
    setExporting(format);
    const res = await api.leads.metrics.exportSources(period, format);
    setExporting(null);
    if (!res.success || !res.data) {
      // Texto genérico ya usado en la app (no el mensaje técnico del backend).
      toast.error('Something went wrong. Please try again.');
      return;
    }
    // `to` es exclusivo (inicio del período siguiente): el nombre lleva el último día.
    const range = data
      ? `${dayjs(data.from).format('YYYY-MM-DD')}-${dayjs(data.to).subtract(1, 'day').format('YYYY-MM-DD')}`
      : dayjs().format('YYYY-MM-DD');
    downloadBlob(res.data, `lead-source-analysis-${range}.${format}`);
  };

  const rows: Array<{ key: string; label: string; funnel: SourceFunnel | null }> =
    data && !loading
      ? data.sources.map((s) => ({
          key: s.source,
          label: sourceLabel(s.source),
          funnel: s,
        }))
      : PLACEHOLDER_SOURCES.map((key) => ({
          key,
          label: sourceLabel(key),
          funnel: null,
        }));
  // Escala común: la barra más larga es el source con más leads capturados.
  const maxCaptured = Math.max(0, ...rows.map((r) => r.funnel?.captured ?? 0));
  const total = data && !loading ? data.total : null;

  return (
    <div className='flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-sm font-bold text-slate-800'>Lead Source Analysis</h2>
        {/* El selector y los exports siguen visibles si la carga falla. */}
        <div className='flex flex-wrap items-center gap-2'>
          {action}
          {/* Los dos exports bajan juntos de línea en pantallas angostas. */}
          <div className='flex items-center gap-2'>
            {(['csv', 'pdf'] as const).map((format) => (
              <button
                key={format}
                type='button'
                onClick={() => handleExport(format)}
                disabled={!!exporting}
                className={EXPORT_BUTTON_CLASS}
              >
                <MdFileDownload size={14} />
                {format === 'csv' ? 'Export CSV' : 'Export PDF'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error ? (
        <p className='text-sm text-slate-500'>{error}</p>
      ) : (
        <div className='flex flex-col' aria-busy={loading}>
          {rows.map((row) => (
            <div
              key={row.key}
              className='flex flex-col gap-2.5 border-b border-slate-100 py-4 first:pt-1'
            >
              <div className='flex items-baseline justify-between gap-3'>
                <span className='text-[13px] font-semibold text-slate-800'>
                  {row.label}
                </span>
                <span className='flex items-baseline gap-1.5'>
                  <span className='text-[11px] font-medium text-slate-500'>Conversion</span>
                  <span className='text-sm font-bold tabular-nums text-slate-900'>
                    {row.funnel ? formatPercent(row.funnel.conversion_rate) : '—'}
                  </span>
                </span>
              </div>
              <div className='grid grid-cols-[72px_minmax(0,1fr)_44px] items-center gap-x-3 gap-y-1.5'>
                <FunnelBar
                  label='Captured'
                  value={row.funnel?.captured ?? null}
                  max={maxCaptured}
                  fillClass='bg-indigo-400'
                />
                <FunnelBar
                  label='Converted'
                  value={row.funnel?.converted ?? null}
                  max={maxCaptured}
                  fillClass='bg-emerald-500'
                />
              </div>
            </div>
          ))}
          <div className='flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 pt-3'>
            <span className='text-[13px] font-bold text-slate-800'>Total</span>
            <div className='flex flex-wrap items-baseline gap-x-5 gap-y-1'>
              <TotalFigure label='Captured' value={total?.captured ?? '—'} />
              <TotalFigure label='Converted' value={total?.converted ?? '—'} />
              <TotalFigure
                label='Conversion'
                value={total ? formatPercent(total.conversion_rate) : '—'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Una fila del embudo: etiqueta · barra · valor (la barra es decorativa; el
// número va en texto al lado).
const FunnelBar = ({
  label,
  value,
  max,
  fillClass,
}: {
  label: string;
  value: number | null;
  max: number;
  fillClass: string;
}) => {
  const pct = value != null && max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <>
      <span className='text-[11px] font-medium text-slate-500'>{label}</span>
      <div className='h-2 overflow-hidden rounded-full bg-slate-100' aria-hidden>
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className='text-right text-xs font-semibold tabular-nums text-slate-700'>
        {value ?? '—'}
      </span>
    </>
  );
};

const TotalFigure = ({ label, value }: { label: string; value: number | string }) => (
  <span className='flex items-baseline gap-1.5'>
    <span className='text-[11px] font-medium text-slate-500'>{label}</span>
    <span className='text-sm font-bold tabular-nums text-slate-900'>{value}</span>
  </span>
);
