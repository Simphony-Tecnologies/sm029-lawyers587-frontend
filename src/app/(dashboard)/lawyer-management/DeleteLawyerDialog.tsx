'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/database';
import { ConfirmationDialog } from '@/components/ui';

export interface DeleteTarget {
  id: number;
  name: string;
}

interface DeleteLawyerDialogProps {
  /** Abogados a borrar (uno desde la fila, varios desde "Delete selected"). */
  targets: DeleteTarget[];
  onClose: () => void;
  /** Ids borrados con éxito: la página refresca listas y conteos. */
  onDeleted: (ids: number[]) => void;
}

const CONFIRM_WORD = 'DELETE';
const MAX_NAMES = 3;

// Borrado definitivo de abogados. Hay que escribir DELETE a mano (sin pegar ni
// arrastrar) y el backend vuelve a exigir la misma confirmación. Si el backend
// rechaza (409: leads abiertos, único admin de la firma…), el diálogo queda
// abierto con su mensaje: son situaciones que el admin puede resolver.
export const DeleteLawyerDialog = ({
  targets,
  onClose,
  onDeleted,
}: DeleteLawyerDialogProps) => {
  const open = targets.length > 0;
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
  // Abogados que siguen pendientes (si un borrado múltiple falla en parte).
  const [pending, setPending] = useState<DeleteTarget[]>(targets);

  useEffect(() => {
    if (!open) return;
    setTyped('');
    setErrors([]);
    setPending(targets);
  }, [open, targets]);

  const handleConfirm = async () => {
    if (typed !== CONFIRM_WORD || loading || pending.length === 0) return;
    setLoading(true);
    const deleted: number[] = [];
    const failed: { target: DeleteTarget; message: string }[] = [];
    for (const target of pending) {
      const res = await api.lawyers.remove(target.id);
      if (res.success) {
        deleted.push(target.id);
      } else {
        failed.push({
          target,
          message:
            res.code === 404
              ? 'This lawyer no longer exists.'
              : res.message || 'Could not delete this lawyer.',
        });
      }
    }
    setLoading(false);
    if (deleted.length > 0) onDeleted(deleted);
    if (failed.length === 0) {
      toast.success(
        deleted.length === 1 ? 'Lawyer deleted' : `${deleted.length} lawyers deleted`
      );
      onClose();
      return;
    }
    setPending(failed.map((f) => f.target));
    setErrors(failed.map((f) => ({ name: f.target.name, message: f.message })));
    setTyped('');
  };

  const many = pending.length > 1;
  const names =
    pending.slice(0, MAX_NAMES).map((t) => t.name).join(', ') +
    (pending.length > MAX_NAMES ? ` +${pending.length - MAX_NAMES} more` : '');

  return (
    <ConfirmationDialog
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      variant='danger'
      title={many ? `Delete ${pending.length} lawyers permanently?` : 'Delete lawyer permanently?'}
      subtitle="This can't be undone."
      fields={[{ label: many ? 'Lawyers' : 'Lawyer', value: names, highlight: true }]}
      cancelLabel='Cancel'
      confirmLabel='Delete permanently'
      onConfirm={handleConfirm}
      loading={loading}
      confirmDisabled={typed !== CONFIRM_WORD || loading}
    >
      <div className='mt-2 flex flex-col gap-3'>
        <div className='flex flex-col gap-1 text-[12px] leading-[1.5] text-slate-600'>
          <p>
            <span className='font-bold text-slate-800'>Kept:</span> their comments on leads,
            their activity in the history, and their closed leads (still shown with their
            name).
          </p>
          <p>
            <span className='font-bold text-slate-800'>Deleted:</span> the account, areas of
            law, notifications and login history.
          </p>
        </div>

        {errors.length > 0 ? (
          <div
            role='alert'
            className='flex flex-col gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700'
          >
            {errors.map((e) => (
              <p key={e.name}>
                {many || errors.length > 1 ? (
                  <span className='font-bold'>{e.name}: </span>
                ) : null}
                {e.message}
              </p>
            ))}
          </div>
        ) : null}

        <div className='flex flex-col gap-1.5'>
          <label
            htmlFor='delete-lawyer-confirm'
            className='text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500'
          >
            Type DELETE to confirm
          </label>
          <input
            id='delete-lawyer-confirm'
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            // Se escribe a mano: sin pegar ni arrastrar texto.
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            autoComplete='off'
            autoCorrect='off'
            autoCapitalize='characters'
            spellCheck={false}
            disabled={loading}
            className='w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm tracking-[0.08em] text-slate-800 focus:border-slate-400 focus:outline-none disabled:opacity-60'
          />
        </div>
      </div>
    </ConfirmationDialog>
  );
};
