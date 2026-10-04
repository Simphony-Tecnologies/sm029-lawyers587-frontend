import dayjs from 'dayjs';

// Fase 1 — CSV generado en el cliente con exactamente las filas visibles.
// Mismo formato que el export de las colas del dashboard: comillas dobles,
// guarda contra inyección de fórmulas y BOM UTF-8 (Excel abre bien los acentos).

export const csvCell = (value: unknown): string => {
  const text =
    value instanceof Date
      ? Number.isNaN(value.getTime())
        ? ''
        : dayjs(value).format('YYYY-MM-DD HH:mm')
      : String(value ?? '');
  // Prefijo ' ante =,+,-,@ (fórmulas de hoja de cálculo), salvo teléfonos.
  const risky = /^[=+\-@]/.test(text) && !/^\+?[\d\s().-]+$/.test(text);
  return `"${(risky ? `'${text}` : text).replace(/"/g, '""')}"`;
};

export const buildCsvBlob = (header: string[], rows: unknown[][]): Blob => {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(','));
  return new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
};
