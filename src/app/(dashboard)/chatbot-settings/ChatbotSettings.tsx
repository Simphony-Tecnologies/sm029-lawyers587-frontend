'use client';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { MdSmartToy, MdInfoOutline } from 'react-icons/md';
import { api } from '@/services/database';
import type { ChatbotSettings as ChatbotSettingsDTO } from '@/types/api.types';
import { PageHead } from '@/components/ui';

// Límites del backend (UpdateChatbotSettingsDto). Se validan también en servidor.
const LIMITS = {
  system_instructions: 20000,
  services_context: 20000,
  disclaimer: 4000,
  model: 60,
} as const;

// ── Átomos de formulario (mismo lenguaje visual que Notification Settings) ───

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className='text-[11px] font-bold uppercase tracking-wide text-slate-500'>
      {children}
    </label>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-5'>
      <h3 className='text-[13px] font-bold text-slate-900'>{title}</h3>
      {description ? (
        <p className='mt-1 text-[12px] text-slate-500'>{description}</p>
      ) : null}
      <div className='mt-4'>{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
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

function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span
      className={`text-[10px] font-medium tabular-nums ${
        over ? 'text-customRed' : 'text-slate-400'
      }`}
    >
      {value.length} / {max}
    </span>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function ChatbotSettings() {
  const [form, setForm] = useState<ChatbotSettingsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await api.chatbot.settings.get();
      if (!alive) return;
      if (res.success && res.data) {
        setForm(res.data);
      } else {
        setLoadError(
          res.code === 403
            ? 'Only a global admin can view the chatbot settings.'
            : res.message ?? 'Could not load chatbot settings.'
        );
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const set = <K extends keyof ChatbotSettingsDTO>(
    key: K,
    value: ChatbotSettingsDTO[K]
  ) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const thresholdInvalid =
    form?.confidence_threshold != null &&
    (form.confidence_threshold < 0 || form.confidence_threshold > 1);

  const overLimit =
    !!form &&
    ((form.system_instructions ?? '').length > LIMITS.system_instructions ||
      (form.services_context ?? '').length > LIMITS.services_context ||
      (form.disclaimer ?? '').length > LIMITS.disclaimer ||
      (form.model ?? '').length > LIMITS.model);

  const handleSave = async () => {
    if (!form || thresholdInvalid || overLimit) return;
    setSaving(true);
    try {
      // Solo los 6 campos editables (whitelist + forbidNonWhitelisted → 400).
      // confidence_threshold se omite si es null (evita fallar la validación 0..1).
      const patch = {
        enabled: form.enabled,
        system_instructions: form.system_instructions ?? '',
        services_context: form.services_context ?? '',
        disclaimer: form.disclaimer ?? '',
        model: form.model ?? '',
        ...(form.confidence_threshold != null
          ? { confidence_threshold: form.confidence_threshold }
          : {}),
      };
      const res = await api.chatbot.settings.update(patch);
      if (res.success && res.data) {
        setForm(res.data);
        toast.success('Chatbot settings saved');
      } else {
        toast.error(
          res.code === 403
            ? 'Only a global admin can edit these settings.'
            : res.message ?? 'Failed to save settings'
        );
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='flex flex-col gap-5'>
      <PageHead
        eyebrow='Configuration'
        title='Chatbot'
        action={
          form ? (
            <span className='text-[11px] font-medium text-slate-400'>
              Updated {dayjs(form.updated_at).format('MMM D, YYYY · HH:mm')}
            </span>
          ) : undefined
        }
      />

      {loading ? (
        <div className='rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400'>
          Loading chatbot settings…
        </div>
      ) : loadError ? (
        <div className='rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500'>
          {loadError}
        </div>
      ) : form ? (
        <>
          {/* Estado (enabled) */}
          <SettingsCard
            title='Assistant status'
            description='Turn the site-wide chatbot on or off. When paused, the widget replies that the assistant is unavailable.'
          >
            <div className='flex items-center justify-between'>
              <span className='text-[13px] font-medium text-slate-700'>
                {form.enabled ? 'Enabled' : 'Paused'}
              </span>
              <Toggle
                checked={form.enabled}
                onChange={(v) => set('enabled', v)}
              />
            </div>
          </SettingsCard>

          {/* Comportamiento (prompts) */}
          <SettingsCard
            title='Behavior'
            description='Text that guides how the assistant responds and classifies each conversation.'
          >
            <div className='flex flex-col gap-5'>
              <div className='flex flex-col gap-1.5'>
                <div className='flex items-center justify-between'>
                  <FieldLabel>System instructions</FieldLabel>
                  <CharCount
                    value={form.system_instructions ?? ''}
                    max={LIMITS.system_instructions}
                  />
                </div>
                <textarea
                  rows={6}
                  value={form.system_instructions ?? ''}
                  onChange={(e) => set('system_instructions', e.target.value)}
                  placeholder='e.g. You are the intake assistant for 587 Lawyers…'
                  className='w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-slate-400'
                />
              </div>

              <div className='flex flex-col gap-1.5'>
                <div className='flex items-center justify-between'>
                  <FieldLabel>Services context</FieldLabel>
                  <CharCount
                    value={form.services_context ?? ''}
                    max={LIMITS.services_context}
                  />
                </div>
                <textarea
                  rows={5}
                  value={form.services_context ?? ''}
                  onChange={(e) => set('services_context', e.target.value)}
                  placeholder='Describe the practice areas 587 Lawyers offers…'
                  className='w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-slate-400'
                />
              </div>

              <div className='flex flex-col gap-1.5'>
                <div className='flex items-center justify-between'>
                  <FieldLabel>Disclaimer</FieldLabel>
                  <CharCount
                    value={form.disclaimer ?? ''}
                    max={LIMITS.disclaimer}
                  />
                </div>
                <textarea
                  rows={3}
                  value={form.disclaimer ?? ''}
                  onChange={(e) => set('disclaimer', e.target.value)}
                  placeholder='e.g. This is an AI-assisted preliminary assessment, not legal advice.'
                  className='w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-slate-400'
                />
              </div>
            </div>
          </SettingsCard>

          {/* Modelo IA + umbral */}
          <SettingsCard
            title='AI model'
            description='Override the model used for replies and classification.'
          >
            <div className='grid gap-5 sm:grid-cols-2'>
              <div className='flex flex-col gap-1.5'>
                <div className='flex items-center justify-between'>
                  <FieldLabel>Model override</FieldLabel>
                  <CharCount value={form.model ?? ''} max={LIMITS.model} />
                </div>
                <input
                  type='text'
                  value={form.model ?? ''}
                  onChange={(e) => set('model', e.target.value)}
                  placeholder='claude-opus-4-8'
                  className='w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-slate-400'
                />
              </div>

              <div className='flex flex-col gap-1.5'>
                <FieldLabel>Confidence threshold (0–1)</FieldLabel>
                <div className='flex items-center gap-3'>
                  <input
                    type='range'
                    min={0}
                    max={1}
                    step={0.05}
                    value={form.confidence_threshold ?? 0}
                    onChange={(e) =>
                      set('confidence_threshold', Number(e.target.value))
                    }
                    className='flex-1 accent-slate-700'
                  />
                  <input
                    type='number'
                    min={0}
                    max={1}
                    step={0.05}
                    value={form.confidence_threshold ?? ''}
                    onChange={(e) =>
                      set(
                        'confidence_threshold',
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    className={`w-20 rounded-xl border px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-slate-400 ${
                      thresholdInvalid ? 'border-customRed' : 'border-slate-200'
                    }`}
                  />
                </div>
                <div className='flex items-start gap-1.5 text-[11px] text-amber-600'>
                  <MdInfoOutline size={13} className='mt-0.5 shrink-0' />
                  <span>
                    Saved to the DB, but not yet applied — the AI service reads
                    the threshold from an env var. Pending a backend change.
                  </span>
                </div>
                {thresholdInvalid ? (
                  <span className='text-[11px] font-medium text-customRed'>
                    Must be between 0 and 1.
                  </span>
                ) : null}
              </div>
            </div>
          </SettingsCard>

          <div className='flex items-center justify-end gap-3'>
            <button
              type='button'
              onClick={handleSave}
              disabled={saving || thresholdInvalid || overLimit}
              className='inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40'
            >
              <MdSmartToy size={16} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
