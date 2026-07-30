// Espejo client-side del mapeo de labels del backend para el `source` de un lead
// (Activity 26). Se usa como fallback cuando la respuesta no trae `source_label`
// (p. ej. GET /leads/:id) y para las opciones del filtro.

export type LeadSource =
  | 'chatbot'
  | 'web_form'
  | 'web' // legacy WordPress → se muestra/filtra como "Web Form"
  | 'api'
  | 'system'
  | 'bulk';

const SOURCE_LABELS: Record<string, string> = {
  chatbot: 'Chatbot',
  web_form: 'Web Form',
  web: 'Web Form', // legacy → Web Form
  api: 'API',
  system: 'System',
  bulk: 'Bulk Import',
};

/** Mirrors backend sourceLabel(): default "Web Form" para null/desconocido. */
export function sourceLabel(source?: string | null): string {
  return SOURCE_LABELS[(source ?? '').trim().toLowerCase()] ?? 'Web Form';
}

/**
 * Bucket de estilo canónico para el badge — colapsa el legacy `web` dentro de
 * `web_form`. Los valores fuera del set conocido caen en 'unknown'.
 */
export type SourceVariant =
  | 'chatbot'
  | 'web_form'
  | 'api'
  | 'system'
  | 'bulk'
  | 'unknown';

export function sourceVariant(source?: string | null): SourceVariant {
  const s = (source ?? '').trim().toLowerCase();
  if (s === 'chatbot') return 'chatbot';
  if (s === 'web_form' || s === 'web') return 'web_form';
  if (s === 'api') return 'api';
  if (s === 'system') return 'system';
  if (s === 'bulk') return 'bulk';
  return 'unknown';
}

/** Opciones del filtro de origen. `web_form` incluye los legacy `web`. */
export const SOURCE_FILTER_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'chatbot', label: 'Chatbot' },
  { value: 'web_form', label: 'Web Form' },
] as const;
