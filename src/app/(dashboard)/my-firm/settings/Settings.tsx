'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/database';
import {
  PageHead,
  EmptyStateBox,
  FormField,
  fieldInputClass,
} from '@/components/ui';
import { apiText } from '@/lib/apiText';
import type { Firm, FirmSettings } from '@/types/api.types';

// Obs 52 — formulario estructurado en lugar de cajas de JSON. El backend hoy
// solo guarda `settings.notifications` / `settings.templates` (shallow-merge en
// PATCH /firms/me/settings) y no consume ninguna clave, así que no hay un
// catálogo fijo: se renderizan las claves ya guardadas (booleanos → toggle,
// strings → campo de texto). Las de otro tipo (números, objetos, arrays, null)
// no se muestran pero se conservan al guardar.

type Blob = Record<string, unknown>;
type SectionKey = keyof FirmSettings; // 'notifications' | 'templates'
type Draft = Record<SectionKey, Blob>;

const SECTIONS: SectionKey[] = ['notifications', 'templates'];

// Copia de los sub-blobs ({} si no existen) para editar sin mutar el original.
const toDraft = (settings: FirmSettings | null): Draft => ({
  notifications: { ...(settings?.notifications ?? {}) },
  templates: { ...(settings?.templates ?? {}) },
});

// Humaniza una clave: "newLead" / "new_lead" → "New lead".
const humanize = (key: string): string => {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .trim()
    .toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : key;
};

// Claves que se pueden editar en el formulario.
const editableEntries = (blob: Blob): [string, boolean | string][] =>
  Object.entries(blob).filter(
    (entry): entry is [string, boolean | string] =>
      typeof entry[1] === 'boolean' || typeof entry[1] === 'string'
  );

// Mismo switch que Chatbot Settings.
function Toggle({
  checked,
  onChange,
  labelledBy,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  labelledBy: string;
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// Tarjeta de un sub-blob: una fila por clave editable. `multiline` usa
// textarea para los strings (las plantillas suelen ser texto largo).
function SectionCard({
  section,
  title,
  blob,
  onChange,
  multiline = false,
}: {
  section: SectionKey;
  title: string;
  blob: Blob;
  onChange: (section: SectionKey, key: string, value: boolean | string) => void;
  multiline?: boolean;
}) {
  const entries = editableEntries(blob);
  return (
    <div className='rounded-xl border border-slate-200 bg-white p-5'>
      <h2 className='mb-3 text-sm font-bold text-slate-900'>{title}</h2>
      {entries.length === 0 ? (
        <p className='text-sm text-slate-400'>No settings stored yet.</p>
      ) : (
        <div className='flex flex-col divide-y divide-slate-100'>
          {entries.map(([key, value]) => {
            const id = `${section}-${key}`;
            if (typeof value === 'boolean') {
              return (
                <div
                  key={key}
                  className='flex items-center justify-between gap-4 py-3'
                >
                  <span
                    id={id}
                    className='min-w-0 break-words text-sm font-medium text-slate-700'
                  >
                    {humanize(key)}
                  </span>
                  <Toggle
                    checked={value}
                    onChange={(v) => onChange(section, key, v)}
                    labelledBy={id}
                  />
                </div>
              );
            }
            return (
              <FormField
                key={key}
                label={humanize(key)}
                htmlFor={id}
                className='py-3'
              >
                {multiline ? (
                  <textarea
                    id={id}
                    value={value}
                    onChange={(e) => onChange(section, key, e.target.value)}
                    rows={4}
                    className={fieldInputClass()}
                  />
                ) : (
                  <input
                    id={id}
                    value={value}
                    onChange={(e) => onChange(section, key, e.target.value)}
                    className={fieldInputClass()}
                  />
                )}
              </FormField>
            );
          })}
        </div>
      )}
    </div>
  );
}

const Settings = () => {
  const [firm, setFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // `original` = lo guardado; `draft` = lo editado (arranca como copia).
  const [original, setOriginal] = useState<Draft>(() => toDraft(null));
  const [draft, setDraft] = useState<Draft>(() => toDraft(null));
  const [saving, setSaving] = useState(false);

  const hydrate = (f: Firm) => {
    setFirm(f);
    setOriginal(toDraft(f.settings));
    setDraft(toDraft(f.settings));
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.firms.me();
    if (res.success && res.data?.firm) {
      hydrate(res.data.firm);
    } else if (res.success && !res.data?.firm) {
      setError('Your account is not linked to a firm yet.');
    } else {
      const msg = apiText(res.message, 'Unable to load firm settings');
      setError(msg);
      toast.error(msg);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setValue = (section: SectionKey, key: string, value: boolean | string) =>
    setDraft((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));

  const save = async () => {
    // Solo se envían los sub-blobs que cambiaron: el backend hace shallow-merge
    // a nivel raíz, así que omitir uno lo deja intacto, y el que se envía
    // reemplaza al guardado → se manda completo (incluye claves no mostradas).
    const body: Partial<FirmSettings> = {};
    for (const section of SECTIONS) {
      if (JSON.stringify(draft[section]) !== JSON.stringify(original[section])) {
        body[section] = draft[section];
      }
    }

    if (Object.keys(body).length === 0) {
      toast('Nothing to save', { icon: 'ℹ️' });
      return;
    }

    setSaving(true);
    const res = await api.firms.updateSettings(body);
    setSaving(false);

    if (res.success && res.data) {
      hydrate(res.data);
      toast.success('Firm settings saved');
    } else {
      toast.error(apiText(res.message, 'Could not save settings'));
    }
  };

  if (loading) {
    return <p className='text-sm text-slate-400'>Loading…</p>;
  }

  if (error || !firm) {
    return (
      <EmptyStateBox
        icon='!'
        title='Firm settings unavailable'
        description={error ?? 'Unable to load firm settings.'}
      />
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <PageHead
        eyebrow='Firm'
        title='Settings'
        subtitle='Notification and template preferences for your firm. Changes are merged with existing settings — omit a section to leave it untouched.'
      />

      <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
        <SectionCard
          section='notifications'
          title='Notifications'
          blob={draft.notifications}
          onChange={setValue}
        />
        <SectionCard
          section='templates'
          title='Templates'
          blob={draft.templates}
          onChange={setValue}
          multiline
        />
      </div>

      <div className='flex justify-end'>
        <button
          type='button'
          onClick={save}
          disabled={saving}
          className='rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60'
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
