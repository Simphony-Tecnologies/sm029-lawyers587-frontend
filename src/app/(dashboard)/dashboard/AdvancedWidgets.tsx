'use client';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  MdAddCircleOutline,
  MdTrendingUp,
  MdChatBubbleOutline,
  MdEmojiEvents,
} from 'react-icons/md';
import { api } from '@/services/database';
import type { WidgetKey, WidgetMetricsResponse } from '@/types/api.types';
import {
  formatComparisonLabel,
  formatDeltaPct,
  formatSignedInt,
  periodToRange,
  trendToDirection,
} from '@/lib/metrics';
import {
  ConfirmationDialog,
  KpiCard,
  TrendPill,
  type ConfirmationField,
  type KpiTone,
} from '@/components/ui';

type WidgetDef = {
  key: WidgetKey;
  label: string;
  tone: KpiTone;
  icon: JSX.Element;
  /** Cohorte→status para el deep-link a Lead Management (mejor ajuste, editable). */
  statuses: string[];
};

// The 4 advanced backend widgets (period-bounded transitions + deltas).
// They coexist with the 8 legacy status KPIs — they do NOT replace them.
const WIDGET_DEFS: WidgetDef[] = [
  { key: 'nuevos', label: 'New', tone: 'violet', icon: <MdAddCircleOutline size={16} />, statuses: ['NEW'] },
  { key: 'en_proceso', label: 'In Progress', tone: 'amber', icon: <MdTrendingUp size={16} />, statuses: ['IN PROGRESS'] },
  { key: 'contactados', label: 'Contacted', tone: 'emerald', icon: <MdChatBubbleOutline size={16} />, statuses: ['ASSIGNED', 'IN PROGRESS'] },
  { key: 'conversiones', label: 'Conversions', tone: 'emerald', icon: <MdEmojiEvents size={16} />, statuses: ['CLOSED'] },
];

interface AdvancedWidgetsProps {
  /** Ventana relativa del PeriodSelect. `null` = all time → backend default 30d. */
  days: number | null;
  /** Navega a Lead Management preseteando el filtro de status (reusa el store). */
  onOpenLeads: (statuses: string[]) => void;
}

export const AdvancedWidgets = ({ days, onOpenLeads }: AdvancedWidgetsProps) => {
  const [data, setData] = useState<WidgetMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<WidgetKey | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.leads.metrics
      .widgets(periodToRange(days))
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) setData(res.data);
        else setError(res.message || 'Unable to load widgets');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days]);

  if (error) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500'>
        {error}
      </div>
    );
  }

  const comparison = data ? formatComparisonLabel(data.range) : 'Loading…';

  const selectedDef = WIDGET_DEFS.find((d) => d.key === selectedKey);
  const selected = selectedKey && data ? data.widgets[selectedKey] : null;

  const detailFields: ConfirmationField[] =
    selected && data
      ? [
          { label: 'Current', value: selected.count, highlight: true },
          { label: 'Previous period', value: selected.previous },
          { label: 'Change', value: formatSignedInt(selected.delta) },
          { label: 'Change %', value: formatDeltaPct(selected.delta_pct) },
          {
            label: 'Trend',
            value: (
              <TrendPill
                direction={trendToDirection(selected.trend)}
                value={formatDeltaPct(selected.delta_pct)}
              />
            ),
          },
          {
            label: 'Date range',
            value: `${dayjs(data.range.from).format('MMM D')} – ${dayjs(
              data.range.to
            ).format('MMM D, YYYY')}`,
          },
        ]
      : [];

  return (
    <>
      <div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4'>
        {WIDGET_DEFS.map((def) => {
          const w = data?.widgets[def.key];
          const handleClick =
            def.key === 'nuevos'
              ? () => onOpenLeads(def.statuses)
              : w
                ? () => setSelectedKey(def.key)
                : undefined;
          return (
            <KpiCard
              key={def.key}
              label={def.label}
              period={comparison}
              value={loading || !w ? '—' : w.count}
              tone={def.tone}
              icon={def.icon}
              onClick={handleClick}
              trend={
                w
                  ? {
                      direction: trendToDirection(w.trend),
                      value: formatDeltaPct(w.delta_pct),
                      meta: `Δ ${formatSignedInt(w.delta)}`,
                    }
                  : undefined
              }
            />
          );
        })}
      </div>

      <ConfirmationDialog
        open={selectedKey !== null && selected !== null}
        onClose={() => setSelectedKey(null)}
        title={selectedDef?.label ?? ''}
        subtitle={data ? formatComparisonLabel(data.range) : undefined}
        fields={detailFields}
        cancelLabel='Close'
        confirmLabel='View in Lead Management'
        onConfirm={() => {
          if (selectedDef) onOpenLeads(selectedDef.statuses);
          setSelectedKey(null);
        }}
      />
    </>
  );
};
