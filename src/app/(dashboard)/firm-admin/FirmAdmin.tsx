'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MdMergeType, MdArrowForward } from 'react-icons/md';
import { api } from '@/services/database';
import {
  PageHead,
  SectionHead,
  DataTable,
  FormField,
  fieldInputClass,
  ConfirmationDialog,
  type DataTableColumn,
} from '@/components/ui';
import { apiText } from '@/lib/apiText';
import type { FirmListItem } from '@/types/api.types';

// Valida un id de firma: entero positivo. Devuelve el número o null.
const toFirmId = (raw: string): number | null => {
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Obs 27 — tabla de firmas (GET /firms, admin global) para ver nombres e ids.
const columns: DataTableColumn<FirmListItem>[] = [
  {
    key: 'id',
    label: 'ID',
    width: '80px',
    sortable: true,
    render: (r) => (
      <span className='font-mono text-xs text-slate-600'>#{r.id}</span>
    ),
  },
  {
    key: 'name',
    label: 'Firm',
    width: 'minmax(160px, 2fr)',
    sortable: true,
    render: (r) => (
      <span className='block truncate font-semibold text-slate-800'>
        {r.name}
      </span>
    ),
  },
  {
    key: 'member_count',
    label: 'Members',
    width: '110px',
    sortable: true,
    align: 'right',
    headerClassName: 'pr-6',
    cellClassName: 'pr-6',
    render: (r) => <span className='tabular-nums'>{r.member_count}</span>,
  },
  {
    key: 'status',
    label: 'Status',
    width: '150px',
    sortable: true,
    render: (r) =>
      r.status === 'active' ? (
        <span className='inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700'>
          Active
        </span>
      ) : (
        <span className='inline-flex items-center gap-1.5'>
          <span className='inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500'>
            Merged
          </span>
          {r.merged_into_firm_id != null ? (
            <span className='font-mono text-xs text-slate-400'>
              → #{r.merged_into_firm_id}
            </span>
          ) : null}
        </span>
      ),
  },
];

const FirmAdmin = () => {
  const [firms, setFirms] = useState<FirmListItem[]>([]);
  const [firmsLoading, setFirmsLoading] = useState(true);
  // Si GET /firms falla, el formulario vuelve a los ids escritos a mano.
  const [manualIds, setManualIds] = useState(false);

  const [sourceRaw, setSourceRaw] = useState('');
  const [targetRaw, setTargetRaw] = useState('');
  const [sourceErr, setSourceErr] = useState<string>();
  const [targetErr, setTargetErr] = useState<string>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  const source = toFirmId(sourceRaw);
  const target = toFirmId(targetRaw);

  const loadFirms = useCallback(async () => {
    setFirmsLoading(true);
    const res = await api.firms.list();
    if (res.success && res.data) {
      setFirms(res.data);
      setManualIds(false);
    } else {
      toast.error(apiText(res.message, 'Failed to load firms'));
      setFirms([]);
      setManualIds(true);
    }
    setFirmsLoading(false);
  }, []);

  useEffect(() => {
    loadFirms();
  }, [loadFirms]);

  // Solo firmas activas: el backend rechaza una source ya `merged`, y fusionar
  // hacia una firma `merged` dejaría a los abogados en una firma inactiva.
  const activeFirms = useMemo(
    () => firms.filter((f) => f.status === 'active'),
    [firms]
  );

  // Etiqueta "#id · nombre" para el diálogo de confirmación.
  const firmLabel = (id: number | null): string => {
    if (id == null) return '—';
    const firm = firms.find((f) => f.id === id);
    return firm ? `#${id} · ${firm.name}` : `#${id}`;
  };

  const openConfirm = () => {
    const missingMsg = manualIds ? 'Enter a valid firm id' : 'Select a firm';
    let ok = true;
    if (source == null) {
      setSourceErr(missingMsg);
      ok = false;
    }
    if (target == null) {
      setTargetErr(missingMsg);
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
      // Refresca conteos y status (la source pasa a `merged`).
      loadFirms();
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

  // Control de cada lado del merge: select de firmas activas, o input de id
  // como antes si la lista no se pudo cargar.
  const renderFirmControl = (
    id: 'source' | 'target',
    value: string,
    onChange: (v: string) => void,
    hasError: boolean,
    placeholder: string
  ) =>
    manualIds ? (
      <input
        id={id}
        inputMode='numeric'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={fieldInputClass(hasError)}
      />
    ) : (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={firmsLoading}
        className={fieldInputClass(hasError)}
      >
        <option value=''>Select a firm</option>
        {activeFirms.map((f) => (
          <option key={f.id} value={String(f.id)}>
            #{f.id} · {f.name}
          </option>
        ))}
      </select>
    );

  return (
    <div className='flex flex-col gap-6'>
      <PageHead
        eyebrow='Global admin'
        title='Merge firms'
        subtitle='Move every lawyer from a source firm into a target firm. The source firm is then marked as merged. This action cannot be undone.'
      />

      <div className='flex flex-col gap-3'>
        <SectionHead title='Firms' />
        {firmsLoading ? (
          <p className='text-sm text-slate-400'>Loading…</p>
        ) : (
          <DataTable<FirmListItem>
            columns={columns}
            data={firms}
            rowKey={(r) => r.id}
            totalLabel='firms'
            pagination={{ enabled: true, initialPageSize: 10 }}
            emptyState={
              <div className='px-4 py-10 text-center text-sm text-slate-400'>
                No firms yet.
              </div>
            }
          />
        )}
      </div>

      <div className='max-w-2xl rounded-xl border border-slate-200 bg-white p-6'>
        <div className='flex flex-col items-start gap-4 sm:flex-row sm:items-end'>
          <FormField
            label={manualIds ? 'Source firm id' : 'Source firm'}
            htmlFor='source'
            required
            error={sourceErr}
            hint='All lawyers move out of this firm'
            className='w-full sm:min-w-0 sm:flex-1'
          >
            {renderFirmControl(
              'source',
              sourceRaw,
              (v) => {
                setSourceRaw(v);
                setSourceErr(undefined);
              },
              !!sourceErr,
              'e.g. 12'
            )}
          </FormField>

          <div className='hidden pb-2.5 text-slate-400 sm:block'>
            <MdArrowForward size={20} />
          </div>

          <FormField
            label={manualIds ? 'Target firm id' : 'Target firm'}
            htmlFor='target'
            required
            error={targetErr}
            hint='Lawyers are moved into this firm'
            className='w-full sm:min-w-0 sm:flex-1'
          >
            {renderFirmControl(
              'target',
              targetRaw,
              (v) => {
                setTargetRaw(v);
                setTargetErr(undefined);
              },
              !!targetErr,
              'e.g. 7'
            )}
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
          { label: 'Source firm', value: firmLabel(source) },
          {
            label: 'Target firm',
            value: firmLabel(target),
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
