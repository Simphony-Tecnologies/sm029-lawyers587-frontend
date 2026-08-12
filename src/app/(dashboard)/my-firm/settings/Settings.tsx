'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/database';
import { PageHead, EmptyStateBox, FormField } from '@/components/ui';
import { apiText } from '@/lib/apiText';
import type { Firm, FirmSettings } from '@/types/api.types';

// Serializa un sub-blob a JSON legible para el textarea ('' si no existe).
const toText = (blob?: Record<string, unknown>): string =>
  blob && Object.keys(blob).length > 0 ? JSON.stringify(blob, null, 2) : '';

// Valida que el texto sea un objeto JSON plano. Devuelve el objeto o un error.
const parseBlob = (
  text: string
): { value?: Record<string, unknown>; error?: string } => {
  const trimmed = text.trim();
  if (!trimmed) return {}; // vacío = no tocar este sub-blob
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { error: 'Invalid JSON' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: 'Must be a JSON object, e.g. { "newLead": true }' };
  }
  return { value: parsed as Record<string, unknown> };
};

const Settings = () => {
  const [firm, setFirm] = useState<Firm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notifText, setNotifText] = useState('');
  const [templText, setTemplText] = useState('');
  const [notifErr, setNotifErr] = useState<string>();
  const [templErr, setTemplErr] = useState<string>();
  const [saving, setSaving] = useState(false);

  const hydrate = (f: Firm) => {
    setFirm(f);
    setNotifText(toText(f.settings?.notifications));
    setTemplText(toText(f.settings?.templates));
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

  const save = async () => {
    const notif = parseBlob(notifText);
    const templ = parseBlob(templText);
    setNotifErr(notif.error);
    setTemplErr(templ.error);
    if (notif.error || templ.error) return;

    // Solo incluir los sub-blobs con contenido: el backend hace shallow-merge,
    // así que omitir uno lo deja intacto. Para limpiarlo, escribí `{}`.
    const body: Partial<FirmSettings> = {};
    if (notif.value) body.notifications = notif.value;
    if (templ.value) body.templates = templ.value;

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
        <div className='rounded-xl border border-slate-200 bg-white p-5'>
          <FormField
            label='Notifications'
            htmlFor='notifications'
            error={notifErr}
            hint='JSON object. Example: { "newLead": true }'
          >
            <textarea
              id='notifications'
              value={notifText}
              onChange={(e) => {
                setNotifText(e.target.value);
                setNotifErr(undefined);
              }}
              rows={10}
              spellCheck={false}
              placeholder='{ }'
              className={`w-full rounded-lg border bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-primary/25 ${
                notifErr ? 'border-rose-400' : 'border-slate-300 focus:border-primary'
              }`}
            />
          </FormField>
        </div>

        <div className='rounded-xl border border-slate-200 bg-white p-5'>
          <FormField
            label='Templates'
            htmlFor='templates'
            error={templErr}
            hint='JSON object. Example: { "welcomeEmail": "..." }'
          >
            <textarea
              id='templates'
              value={templText}
              onChange={(e) => {
                setTemplText(e.target.value);
                setTemplErr(undefined);
              }}
              rows={10}
              spellCheck={false}
              placeholder='{ }'
              className={`w-full rounded-lg border bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-primary/25 ${
                templErr ? 'border-rose-400' : 'border-slate-300 focus:border-primary'
              }`}
            />
          </FormField>
        </div>
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
