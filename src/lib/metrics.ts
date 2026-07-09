import type { MetricRange, Trend } from '@/types/api.types';

const DAY_MS = 86_400_000;

/**
 * Convierte la ventana relativa del PeriodSelect (días hacia atrás) al rango
 * absoluto date_from/date_to que espera el backend. `null` (all time) → sin
 * fechas; el backend usa su default de 30 días.
 */
export function periodToRange(
  days: number | null,
  now: Date = new Date()
): { date_from?: string; date_to?: string } {
  if (days == null) return {};
  const from = new Date(now.getTime() - days * DAY_MS);
  return { date_from: from.toISOString(), date_to: now.toISOString() };
}

/** Trend del backend → dirección del TrendPill (flat = neutral). */
export function trendToDirection(trend: Trend): 'up' | 'down' | 'neutral' {
  if (trend === 'up') return 'up';
  if (trend === 'down') return 'down';
  return 'neutral';
}

/** Variación % con signo. `null` (base 0 → N/A) → '—'. Nunca NaN/∞. */
export function formatDeltaPct(pct: number | null): string {
  if (pct == null) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

/** Porcentaje simple (conversion_rate). `null` → '—'. */
export function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(1)}%`;
}

/** Horas promedio de respuesta. `null` → '—'. */
export function formatHours(hours: number | null): string {
  if (hours == null) return '—';
  return `${hours.toFixed(1)}h`;
}

/** Entero con signo para deltas absolutos: +5 / -3 / 0. */
export function formatSignedInt(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Etiqueta de comparación legible derivada del range (span en días). */
export function formatComparisonLabel(range: MetricRange): string {
  const spanDays = Math.round(
    (new Date(range.to).getTime() - new Date(range.from).getTime()) / DAY_MS
  );
  return `vs prev ${spanDays}d`;
}
