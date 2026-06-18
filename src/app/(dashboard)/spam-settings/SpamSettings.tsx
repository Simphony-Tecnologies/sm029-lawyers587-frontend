'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { MdAdd, MdClose, MdDeleteOutline, MdEdit } from 'react-icons/md';
import { api } from '@/services/database';
import type {
  BlacklistEntry,
  CreateBlacklistDTO,
  CreatePatternDTO,
  SuspiciousPattern,
  UpdatePatternDTO,
} from '@/types/api.types';
import {
  DataTable,
  FilterButton,
  PageHead,
  type DataTableColumn,
} from '@/components/ui';

// ─── Helpers ────────────────────────────────────────────────────────────────

type Tab = 'blacklist' | 'patterns';

const formatDate = (d: string) => dayjs(d).format('MMM DD, YYYY');

const FIELD_OPTIONS: SuspiciousPattern['field_name'][] = [
  'full_name',
  'email',
  'description',
  'number',
];

// ─── Overlay shell ──────────────────────────────────────────────────────────

function DialogOverlay({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]'
      onClick={onClose}
    >
      <div
        className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-[15px] font-bold text-slate-900'>{title}</h2>
          <button
            type='button'
            onClick={onClose}
            className='flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          >
            <MdClose size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Label / Input atoms ────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className='text-[11px] font-bold uppercase tracking-wide text-slate-500'>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type='text'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className='h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-400'
    />
  );
}

function SelectInput<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className='h-9 w-full rounded-md border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-400'
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function SpamSettings() {
  const [tab, setTab] = useState<Tab>('blacklist');

  // ── Blacklist state ─────────────────────────────────────────────────────
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [blLoading, setBlLoading] = useState(true);
  const [blDialogOpen, setBlDialogOpen] = useState(false);
  const [blType, setBlType] = useState<CreateBlacklistDTO['type']>('email');
  const [blValue, setBlValue] = useState('');

  // ── Patterns state ──────────────────────────────────────────────────────
  const [patterns, setPatterns] = useState<SuspiciousPattern[]>([]);
  const [ptLoading, setPtLoading] = useState(true);
  const [ptDialogOpen, setPtDialogOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<SuspiciousPattern | null>(null);
  const [ptFieldName, setPtFieldName] = useState<SuspiciousPattern['field_name']>('full_name');
  const [ptPattern, setPtPattern] = useState('');
  const [ptDescription, setPtDescription] = useState('');
  const [ptActive, setPtActive] = useState(true);

  // ── Fetchers ────────────────────────────────────────────────────────────

  const fetchBlacklist = useCallback(async () => {
    setBlLoading(true);
    try {
      const res = await api.spam.blacklist.list({ limit: 500 });
      if (res.success && res.data) setBlacklist(res.data.data);
    } catch {
      toast.error('Failed to load blacklist');
    } finally {
      setBlLoading(false);
    }
  }, []);

  const fetchPatterns = useCallback(async () => {
    setPtLoading(true);
    try {
      const res = await api.spam.patterns.list({ limit: 500 });
      if (res.success && res.data) setPatterns(res.data.data);
    } catch {
      toast.error('Failed to load patterns');
    } finally {
      setPtLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlacklist();
    fetchPatterns();
  }, [fetchBlacklist, fetchPatterns]);

  // ── Blacklist actions ───────────────────────────────────────────────────

  const handleAddBlacklist = async () => {
    const trimmed = blValue.trim();
    if (!trimmed) {
      toast.error('Value is required');
      return;
    }
    try {
      const res = await api.spam.blacklist.create({ type: blType, value: trimmed });
      if (res.success) {
        toast.success('Entry added');
        setBlDialogOpen(false);
        setBlValue('');
        fetchBlacklist();
      } else {
        toast.error(res.message ?? 'Failed to add entry');
      }
    } catch {
      toast.error('Failed to add entry');
    }
  };

  const handleDeleteBlacklist = async (id: number) => {
    try {
      const res = await api.spam.blacklist.delete(id);
      if (res.success) {
        toast.success('Entry deleted');
        fetchBlacklist();
      } else {
        toast.error(res.message ?? 'Failed to delete entry');
      }
    } catch {
      toast.error('Failed to delete entry');
    }
  };

  // ── Pattern actions ─────────────────────────────────────────────────────

  const openPatternDialog = (p?: SuspiciousPattern) => {
    if (p) {
      setEditingPattern(p);
      setPtFieldName(p.field_name);
      setPtPattern(p.pattern);
      setPtDescription(p.description ?? '');
      setPtActive(p.is_active);
    } else {
      setEditingPattern(null);
      setPtFieldName('full_name');
      setPtPattern('');
      setPtDescription('');
      setPtActive(true);
    }
    setPtDialogOpen(true);
  };

  const handleSavePattern = async () => {
    const trimmedPattern = ptPattern.trim();
    if (!trimmedPattern) {
      toast.error('Pattern is required');
      return;
    }
    try {
      if (editingPattern) {
        const body: UpdatePatternDTO = {
          field_name: ptFieldName,
          pattern: trimmedPattern,
          description: ptDescription.trim() || undefined,
          is_active: ptActive,
        };
        const res = await api.spam.patterns.update(editingPattern.id, body);
        if (res.success) {
          toast.success('Pattern updated');
          setPtDialogOpen(false);
          fetchPatterns();
        } else {
          toast.error(res.message ?? 'Failed to update pattern');
        }
      } else {
        const body: CreatePatternDTO = {
          field_name: ptFieldName,
          pattern: trimmedPattern,
          description: ptDescription.trim() || undefined,
          is_active: ptActive,
        };
        const res = await api.spam.patterns.create(body);
        if (res.success) {
          toast.success('Pattern created');
          setPtDialogOpen(false);
          fetchPatterns();
        } else {
          toast.error(res.message ?? 'Failed to create pattern');
        }
      }
    } catch {
      toast.error('Failed to save pattern');
    }
  };

  const handleTogglePattern = async (p: SuspiciousPattern) => {
    try {
      const res = await api.spam.patterns.update(p.id, { is_active: !p.is_active });
      if (res.success) {
        toast.success(p.is_active ? 'Pattern deactivated' : 'Pattern activated');
        fetchPatterns();
      } else {
        toast.error(res.message ?? 'Failed to toggle pattern');
      }
    } catch {
      toast.error('Failed to toggle pattern');
    }
  };

  const handleDeletePattern = async (id: number) => {
    try {
      const res = await api.spam.patterns.delete(id);
      if (res.success) {
        toast.success('Pattern deleted');
        fetchPatterns();
      } else {
        toast.error(res.message ?? 'Failed to delete pattern');
      }
    } catch {
      toast.error('Failed to delete pattern');
    }
  };

  // ── Blacklist columns ───────────────────────────────────────────────────

  const blColumns = useMemo<DataTableColumn<BlacklistEntry>[]>(
    () => [
      {
        key: 'type',
        label: 'Type',
        width: '120px',
        sortable: true,
        render: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              row.type === 'email'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {row.type}
          </span>
        ),
      },
      {
        key: 'value',
        label: 'Value',
        width: 'minmax(200px, 1fr)',
        sortable: true,
        render: (row) => (
          <span className='truncate text-[13px] font-medium text-slate-800'>
            {row.value}
          </span>
        ),
      },
      {
        key: 'created_at',
        label: 'Created',
        width: '140px',
        sortable: true,
        accessor: (row) => new Date(row.created_at),
        render: (row) => (
          <span className='text-[12px] text-slate-500'>
            {formatDate(row.created_at)}
          </span>
        ),
      },
      {
        key: 'actions',
        label: '',
        width: '60px',
        render: (row) => (
          <button
            type='button'
            onClick={() => handleDeleteBlacklist(row.id)}
            className='flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500'
            title='Delete entry'
          >
            <MdDeleteOutline size={16} />
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Pattern columns ─────────────────────────────────────────────────────

  const ptColumns = useMemo<DataTableColumn<SuspiciousPattern>[]>(
    () => [
      {
        key: 'field_name',
        label: 'Field',
        width: '130px',
        sortable: true,
        render: (row) => (
          <span className='inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600'>
            {row.field_name}
          </span>
        ),
      },
      {
        key: 'pattern',
        label: 'Pattern',
        width: 'minmax(180px, 1fr)',
        sortable: true,
        render: (row) => (
          <code className='truncate rounded bg-slate-50 px-1.5 py-0.5 text-[12px] text-slate-700'>
            {row.pattern}
          </code>
        ),
      },
      {
        key: 'description',
        label: 'Description',
        width: 'minmax(140px, 1fr)',
        render: (row) => (
          <span className='truncate text-[12px] text-slate-500'>
            {row.description ?? '—'}
          </span>
        ),
      },
      {
        key: 'is_active',
        label: 'Active',
        width: '80px',
        render: (row) => (
          <button
            type='button'
            onClick={() => handleTogglePattern(row)}
            className={`h-6 w-10 rounded-full transition-colors ${
              row.is_active ? 'bg-green-500' : 'bg-slate-300'
            }`}
            title={row.is_active ? 'Deactivate' : 'Activate'}
          >
            <span
              className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                row.is_active ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        ),
      },
      {
        key: 'actions',
        label: '',
        width: '90px',
        render: (row) => (
          <div className='flex items-center gap-1'>
            <button
              type='button'
              onClick={() => openPatternDialog(row)}
              className='flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              title='Edit pattern'
            >
              <MdEdit size={16} />
            </button>
            <button
              type='button'
              onClick={() => handleDeletePattern(row.id)}
              className='flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500'
              title='Delete pattern'
            >
              <MdDeleteOutline size={16} />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className='flex flex-1 flex-col gap-5 overflow-hidden p-6'>
      <PageHead title='Spam Settings' />

      {/* Tabs + action */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <FilterButton
            label='Blacklist'
            active={tab === 'blacklist'}
            count={blacklist.length}
            onClick={() => setTab('blacklist')}
          />
          <FilterButton
            label='Suspicious Patterns'
            active={tab === 'patterns'}
            count={patterns.length}
            onClick={() => setTab('patterns')}
          />
        </div>

        {tab === 'blacklist' ? (
          <button
            type='button'
            onClick={() => {
              setBlType('email');
              setBlValue('');
              setBlDialogOpen(true);
            }}
            className='inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-slate-900 px-3.5 text-[12px] font-bold text-white hover:bg-slate-800'
          >
            <MdAdd size={16} />
            Add Entry
          </button>
        ) : (
          <button
            type='button'
            onClick={() => openPatternDialog()}
            className='inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-slate-900 px-3.5 text-[12px] font-bold text-white hover:bg-slate-800'
          >
            <MdAdd size={16} />
            Add Pattern
          </button>
        )}
      </div>

      {/* Tables */}
      {tab === 'blacklist' ? (
        blLoading ? (
          <div className='flex flex-1 items-center justify-center text-[13px] text-slate-400'>
            Loading...
          </div>
        ) : (
          <DataTable<BlacklistEntry>
            columns={blColumns}
            data={blacklist}
            rowKey={(row) => row.id}
            totalLabel='entries'
            pagination={{ enabled: true, initialPageSize: 20 }}
          />
        )
      ) : ptLoading ? (
        <div className='flex flex-1 items-center justify-center text-[13px] text-slate-400'>
          Loading...
        </div>
      ) : (
        <DataTable<SuspiciousPattern>
          columns={ptColumns}
          data={patterns}
          rowKey={(row) => row.id}
          totalLabel='patterns'
          pagination={{ enabled: true, initialPageSize: 20 }}
        />
      )}

      {/* ── Blacklist add dialog ─────────────────────────────────────────── */}
      <DialogOverlay
        open={blDialogOpen}
        onClose={() => setBlDialogOpen(false)}
        title='Add Blacklist Entry'
      >
        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1'>
            <FieldLabel>Type</FieldLabel>
            <SelectInput
              value={blType}
              onChange={setBlType}
              options={['email', 'domain'] as const}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <FieldLabel>Value</FieldLabel>
            <TextInput
              value={blValue}
              onChange={setBlValue}
              placeholder={blType === 'email' ? 'spam@example.com' : 'example.com'}
            />
          </div>
          <div className='mt-2 flex justify-end gap-2'>
            <button
              type='button'
              onClick={() => setBlDialogOpen(false)}
              className='h-[34px] rounded-[9px] border border-slate-200 px-4 text-[12px] font-bold text-slate-600 hover:bg-slate-50'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={handleAddBlacklist}
              className='h-[34px] rounded-[9px] bg-slate-900 px-4 text-[12px] font-bold text-white hover:bg-slate-800'
            >
              Add
            </button>
          </div>
        </div>
      </DialogOverlay>

      {/* ── Pattern add/edit dialog ──────────────────────────────────────── */}
      <DialogOverlay
        open={ptDialogOpen}
        onClose={() => setPtDialogOpen(false)}
        title={editingPattern ? 'Edit Pattern' : 'Add Pattern'}
      >
        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1'>
            <FieldLabel>Field Name</FieldLabel>
            <SelectInput
              value={ptFieldName}
              onChange={setPtFieldName}
              options={FIELD_OPTIONS}
            />
          </div>
          <div className='flex flex-col gap-1'>
            <FieldLabel>Pattern</FieldLabel>
            <TextInput
              value={ptPattern}
              onChange={setPtPattern}
              placeholder='Regex pattern...'
            />
          </div>
          <div className='flex flex-col gap-1'>
            <FieldLabel>Description</FieldLabel>
            <TextInput
              value={ptDescription}
              onChange={setPtDescription}
              placeholder='Optional description'
            />
          </div>
          <div className='flex items-center gap-2'>
            <FieldLabel>Active</FieldLabel>
            <button
              type='button'
              onClick={() => setPtActive(!ptActive)}
              className={`h-6 w-10 rounded-full transition-colors ${
                ptActive ? 'bg-green-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  ptActive ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className='mt-2 flex justify-end gap-2'>
            <button
              type='button'
              onClick={() => setPtDialogOpen(false)}
              className='h-[34px] rounded-[9px] border border-slate-200 px-4 text-[12px] font-bold text-slate-600 hover:bg-slate-50'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={handleSavePattern}
              className='h-[34px] rounded-[9px] bg-slate-900 px-4 text-[12px] font-bold text-white hover:bg-slate-800'
            >
              {editingPattern ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </DialogOverlay>
    </div>
  );
}
