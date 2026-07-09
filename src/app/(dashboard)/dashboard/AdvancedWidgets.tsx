'use client';
import { useEffect, useState } from 'react';
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
import { KpiCard, type KpiTone } from '@/components/ui';

type WidgetDef = {
  key: WidgetKey;
  label: string;
  tone: KpiTone;
  icon: JSX.Element;
};

// The 4 advanced backend widgets (period-bounded transitions + deltas).
// They coexist with the 8 legacy status KPIs — they do NOT replace them.
const WIDGET_DEFS: WidgetDef[] = [
  { key: 'nuevos', label: 'New', tone: 'violet', icon: <MdAddCircleOutline size={16} /> },
  { key: 'en_proceso', label: 'In Progress', tone: 'amber', icon: <MdTrendingUp size={16} /> },
  { key: 'contactados', label: 'Contacted', tone: 'emerald', icon: <MdChatBubbleOutline size={16} /> },
  { key: 'conversiones', label: 'Conversions', tone: 'emerald', icon: <MdEmojiEvents size={16} /> },
];

interface AdvancedWidgetsProps {
  /** Ventana relativa del PeriodSelect. `null` = all time → backend default 30d. */
  days: number | null;
}

export const AdvancedWidgets = ({ days }: AdvancedWidgetsProps) => {
  const [data, setData] = useState<WidgetMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className='grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4'>
      {WIDGET_DEFS.map((def) => {
        const w = data?.widgets[def.key];
        return (
          <KpiCard
            key={def.key}
            label={def.label}
            period={comparison}
            value={loading || !w ? '—' : w.count}
            tone={def.tone}
            icon={def.icon}
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
  );
};
