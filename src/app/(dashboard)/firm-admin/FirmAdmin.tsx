'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { MdMergeType, MdArrowForward } from 'react-icons/md';
import { api } from '@/services/database';
import {
  PageHead,
  FormField,
  fieldInputClass,
  ConfirmationDialog,
} from '@/components/ui';
import { apiText } from '@/lib/apiText';

// Valida un id de firma: entero positivo. Devuelve el número o null.
const toFirmId = (raw: string): number | null => {
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const FirmAdmin = () => {
  const [sourceRaw, setSourceRaw] = useState('');
  const [targetRaw, setTargetRaw] = useState('');
  const [sourceErr, setSourceErr] = useState<string>();
  const [targetErr, setTargetErr] = useState<string>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  const source = toFirmId(sourceRaw);
  const target = toFirmId(targetRaw);

  const openConfirm = () => {
    let ok = true;
    if (source == null) {
      setSourceErr('Enter a valid firm id');
      ok = false;
    }
    if (target == null) {
      setTargetErr('Enter a valid firm id');
      ok = false;
    }
    if (source != null && target != null && source === target) {
      setTargetErr('Source and target must be different firms');
      ok = false;
    }
    if (!ok) return;
    setConfirmOpen(true);
  };

  const confirmMerge = async () => {
    if (source == null || target == null) return;
    setMerging(true);
    const res = await api.firms.merge({
      sourceFirmId: source,
      targetFirmId: target,
    });
    setMerging(false);
    setConfirmOpen(false);

    if (res.success && res.data?.merged) {
      toast.success(`Firm #${source} merged into firm #${target}`);
      setSourceRaw('');
      setTargetRaw('');
      return;
    }

    if (res.code === 404) {
      toast.error('The firm indicated does not exist.');
    } else if (res.code === 403) {
      toast.error('You don’t have permission to merge firms.');
    } else {
      // 400: misma firma o source ya está en estado `merged`.
      toast.error(apiText(res.message, 'Could not merge the firms'));
    }
  };

  return (
    <div className='flex flex-col gap-6'>
      <PageHead
        eyebrow='Global admin'
        title='Merge firms'
        subtitle='Move every lawyer from a source firm into a target firm. The source firm is then marked as merged. This action cannot be undone.'
      />

      <div className='max-w-2xl rounded-xl border border-slate-200 bg-white p-6'>
        <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-end'>
          <FormField
            label='Source firm id'
            htmlFor='source'
            required
            error={sourceErr}
            hint='All lawyers move out of this firm'
            className='w-full sm:w-48'
          >
            <input
              id='source'
              inputMode='numeric'
              value={sourceRaw}
              onChange={(e) => {
                setSourceRaw(e.target.value);
                setSourceErr(undefined);
              }}
              placeholder='e.g. 12'
              className={fieldInputClass(!!sourceErr)}
            />
          </FormField>

          <div className='hidden pb-2.5 text-slate-400 sm:block'>
            <MdArrowForward size={20} />
          </div>

          <FormField
            label='Target firm id'
            htmlFor='target'
            required
            error={targetErr}
            hint='Lawyers are moved into this firm'
            className='w-full sm:w-48'
          >
            <input
              id='target'
              inputMode='numeric'
              value={targetRaw}
              onChange={(e) => {
                setTargetRaw(e.target.value);
                setTargetErr(undefined);
              }}
              placeholder='e.g. 7'
              className={fieldInputClass(!!targetErr)}
            />
          </FormField>
        </div>

        <div className='mt-5'>
          <button
            type='button'
            onClick={openConfirm}
            className='inline-flex items-center gap-1.5 rounded-lg bg-customRed px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600'
          >
            <MdMergeType size={18} /> Merge firms
          </button>
        </div>

        <p className='mt-4 text-xs leading-relaxed text-slate-400'>
          The target firm keeps its settings and administrators. Administrators of
          the source firm become regular members after the merge.
        </p>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        variant='danger'
        title='Merge firms?'
        subtitle='Every lawyer in the source firm will be moved to the target firm.'
        fields={[
          { label: 'Source firm', value: source != null ? `#${source}` : '—' },
          {
            label: 'Target firm',
            value: target != null ? `#${target}` : '—',
            highlight: true,
          },
        ]}
        notice='This action cannot be undone. The source firm will be marked as merged.'
        confirmLabel='Merge firms'
        onConfirm={confirmMerge}
        loading={merging}
      />
    </div>
  );
};

export default FirmAdmin;
