'use client';

import { useEffect, useState } from 'react';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';
import Modal from '@/components/organisms/Modal';
import type { OnboardingVideo } from '@/types/api.types';

export const OnboardingModal = () => {
  const { user, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<OnboardingVideo[]>([]);
  const [busy, setBusy] = useState(false);

  const isPending = Boolean(user?.id) && user?.onboarding_status === 'pending';

  useEffect(() => {
    if (!isPending) return;
    let alive = true;
    (async () => {
      const res = await database.getMyOnboarding();
      if (!alive) return;
      const list = res.success && res.data ? res.data.videos : [];
      // Sin videos configurados → no molestamos. NO auto-mutamos el backend
      // desde el mount (no marcamos 'complete' aquí): un status-change en un
      // efecto es exactamente lo que evitamos. El status queda intacto; cuando
      // el backend tenga videos, se mostrarán en el próximo login.
      if (list.length === 0) return;
      setVideos(list);
      setOpen(true);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  // Disparado por acción del usuario (botón / cierre), nunca por el mount.
  const finish = async (action: 'complete' | 'skip') => {
    setBusy(true);
    await database.patchMyOnboarding(action);
    setBusy(false);
    setUser({
      ...user,
      onboarding_status: action === 'skip' ? 'skipped' : 'completed',
    });
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Modal
      title='Welcome — quick tour'
      isOpen={open}
      setIsOpen={(next: boolean) => {
        // Cerrar por la X cuenta como "skip".
        if (!next) void finish('skip');
      }}
      className='max-w-2xl'
    >
      <div className='flex flex-col gap-4'>
        <p className='text-sm text-slate-600'>
          Watch these short tutorials to get started. You can restart them later
          from your profile.
        </p>
        <div className='flex flex-col gap-4'>
          {videos.map((v) => (
            <div
              key={v.id}
              className='aspect-video w-full overflow-hidden rounded-lg bg-black'
            >
              <iframe
                title={`Onboarding video ${v.id}`}
                src={v.embedUrl}
                className='h-full w-full'
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                allowFullScreen
              />
            </div>
          ))}
        </div>
        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={() => finish('skip')}
            disabled={busy}
            className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60'
          >
            Skip
          </button>
          <button
            type='button'
            onClick={() => finish('complete')}
            disabled={busy}
            className='rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60'
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};

OnboardingModal.displayName = 'OnboardingModal';
