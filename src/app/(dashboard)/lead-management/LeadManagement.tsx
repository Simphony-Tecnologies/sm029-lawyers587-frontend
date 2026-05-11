'use client';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import toast from 'react-hot-toast';
import {
  MdArchive,
  MdDeleteOutline,
  MdGridView,
  MdPersonAddAlt1,
  MdSwapHoriz,
  MdViewList,
} from 'react-icons/md';
import { useLeadsStore } from '@/store/useLead.store';
import { useSelectStatus } from '@/store/useSelectStatus';
import { api, database } from '@/services/database';
import type { LeadStatus } from '@/types/api.types';
import { statusSelectAll } from '@/constants/status';
import {
  Avatar,
  BulkActionBar,
  ConfirmationDialog,
  DataTable,
  FilterButton,
  LeadInfoModal,
  PageHead,
  SearchField,
  StatusPill,
  ViewToggle,
  toneFromString,
  variantFromStatus,
  type BulkAction,
  type ConfirmationField,
  type DataTableColumn,
  type LeadInfoSubmitPayload,
} from '@/components/ui';
import Modal from '@/components/organisms/Modal';
import CountdownTimer from '@/components/organisms/CountdownTimer';
import ReLoading from '@/components/atoms/ReLoading';
import Button from '@/components/atoms/Button';

dayjs.extend(utc);

type LeadRow = {
  'lead id': number;
  date: Date;
  date_updated: Date;
  'lead name': string;
  email: string;
  'phone number': string;
  service: string;
  'description lead': string;
  comments: string;
  lawyer: string;
  status: string;
};

const formatId = (id: number | string) => String(id).padStart(5, '0');
const formatDate = (d: Date | string) => dayjs(d).format('MMM DD, YYYY');
const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '·';

const STATUS_OPTIONS_SELECT = [
  { name: 'In progress', value: 'IN PROGRESS' },
  { name: 'Problematic', value: 'PROBLEMATIC' },
  { name: 'Send back', value: 'LOST' },
  { name: 'Retained', value: 'CLOSED' },
  { name: 'Disabled', value: 'DISABLED' },
];
const STATUS_OPTIONS_NEW = [{ name: 'New', value: 'NEW' }];
const STATUS_OPTIONS_DISABLED = [
  { name: 'New', value: 'NEW' },
  { name: 'Send Back', value: 'LOST' },
  { name: 'Disabled', value: 'DISABLED' },
];

const BULK_STATUS_OPTIONS: { name: string; value: string }[] = [
  { name: 'New', value: 'NEW' },
  { name: 'In progress', value: 'IN PROGRESS' },
  { name: 'Problematic', value: 'PROBLEMATIC' },
  { name: 'Send back', value: 'LOST' },
  { name: 'Retained', value: 'CLOSED' },
  { name: 'Disabled', value: 'DISABLED' },
];

type BulkDialogType = 'assign' | 'status' | 'archive' | 'delete' | null;

interface LawyerOption {
  id: number;
  name: string;
}

const MAX_PREVIEW_NAMES = 3;
const MAX_PREVIEW_IDS = 3;

const LeadManagement = () => {
  const { dataLeads, error, fetchLeads } = useLeadsStore();
  const { selecArray, setSelecArray } = useSelectStatus();

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const [isOpenLead, setIsOpenLead] = useState(false);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // ── Bulk selection state (UI only — endpoints pending) ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDialog, setBulkDialog] = useState<BulkDialogType>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [assignLawyerId, setAssignLawyerId] = useState<number | ''>('');
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [lawyers, setLawyers] = useState<LawyerOption[]>([]);
  const [lawyersLoading, setLawyersLoading] = useState(false);

  const uniqueStatuses = useMemo<string[]>(() => {
    if (!dataLeads) return [];
    return Array.from(new Set((dataLeads as any[]).map((l) => l.status)));
  }, [dataLeads]);

  const filtered = useMemo<LeadRow[]>(() => {
    if (!dataLeads) return [];
    let list = dataLeads as LeadRow[];

    if (selecArray.length > 0) {
      const set = new Set(selecArray.map((s) => s.toLowerCase()));
      list = list.filter((l) => set.has(l.status?.toLowerCase()));
    } else if (statusFilter) {
      list = list.filter((l) => l.status === statusFilter);
    }

    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          l['lead name']?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l['phone number']?.toLowerCase().includes(q) ||
          l.status?.toLowerCase().includes(q) ||
          String(l['lead id']).includes(q)
      );
    }
    return list;
  }, [dataLeads, selecArray, statusFilter, searchText]);

  const handleStatusClick = (status: string | null) => {
    setSelecArray([]);
    setStatusFilter(status);
  };

  const openLead = (row: LeadRow) => {
    setSelectedLead(row);
    setIsOpenLead(true);
  };

  const handleSaveLead = async ({
    status,
    comments,
  }: LeadInfoSubmitPayload): Promise<void> => {
    if (!selectedLead || Object.keys(selectedLead).length === 0) return;
    if (selectedLead.status === 'NEW') {
      toast.error(
        "You can't modify the lead if it isn't assigned to a lawyer"
      );
      return;
    }
    const upper = (status ?? '').toUpperCase() as LeadStatus;
    const reasonRequired = upper === 'PROBLEMATIC' || upper === 'SEND_BACK' || upper === 'LOST';
    const reason = (comments ?? '').trim();
    if (reasonRequired && reason.length === 0) {
      toast.error('A reason is required for this status change');
      return;
    }

    setLoading(true);
    // Statuses que implican quitar asignación → endpoint /unassign dedicado.
    const unassignStatuses: LeadStatus[] = ['LOST', 'SEND_BACK'];
    const leadId = selectedLead['lead id'];
    const res = unassignStatuses.includes(upper)
      ? await api.leads.unassign(leadId, { status: upper, comment: reason })
      : await api.leads.update(leadId, {
          status: upper,
          comment: reason || undefined,
          description: selectedLead['description lead'] ?? '',
        });
    if (!res.success) {
      setLoading(false);
      toast.error(res.message || 'Error updating Lead information');
      return;
    }
    toast.success('Lead information updated successfully');
    setIsOpenLead(false);
    fetchLeads();
    setLoading(false);
  };

  const deleteLead = async () => {
    if (
      selectedLead.status !== 'NEW' &&
      selectedLead.status !== 'DISABLED' &&
      selectedLead.status !== 'LOST'
    ) {
      return toast.error(
        'You cannot delete the lead because it is assigned to a lawyer.'
      );
    }
    const dataDelete = await database.deleteData(
      `${process.env.NEXT_PUBLIC_URL}/leads/${selectedLead['lead id']}`
    );
    const deleteAssigned = await database.deleteData(
      `${process.env.NEXT_PUBLIC_URL}/leads-assigned/lead/${selectedLead['lead id']}`
    );
    if (!dataDelete.success || !deleteAssigned.success) {
      return toast.error('Error to delete lawyer');
    }
    toast.success('Success to delete');
    setIsOpenDelete(false);
    fetchLeads();
  };

  useEffect(() => {
    if (!dataLeads) fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch lawyers list for the Assign-to picker (loaded lazily on first need)
  const ensureLawyersLoaded = async () => {
    if (lawyers.length > 0 || lawyersLoading) return;
    setLawyersLoading(true);
    try {
      const res = await database.getData(
        `${process.env.NEXT_PUBLIC_URL}/lawyers`
      );
      if (res.success && Array.isArray(res.data)) {
        const opts: LawyerOption[] = res.data
          .filter((l: any) => l && (l.id ?? l.lawyer_id))
          .map((l: any) => ({
            id: Number(l.id ?? l.lawyer_id),
            name:
              l.name ??
              `${l.first_name ?? ''} ${l.last_name ?? ''}`.trim() ??
              `Lawyer #${l.id}`,
          }))
          .filter((o: LawyerOption) => Number.isFinite(o.id) && o.name);
        setLawyers(opts);
      }
    } catch {
      /* silent — picker stays empty */
    } finally {
      setLawyersLoading(false);
    }
  };

  // Selected leads derived from current dataset
  const selectedLeads = useMemo<LeadRow[]>(() => {
    if (selectedIds.size === 0 || !dataLeads) return [];
    return (dataLeads as LeadRow[]).filter((l) =>
      selectedIds.has(Number(l['lead id']))
    );
  }, [dataLeads, selectedIds]);

  const clearSelection = () => setSelectedIds(new Set());

  const openBulkDialog = (type: Exclude<BulkDialogType, null>) => {
    if (selectedIds.size === 0) return;
    if (type === 'assign') {
      setAssignLawyerId('');
      void ensureLawyersLoaded();
    }
    if (type === 'status') {
      setBulkStatus('');
    }
    setBulkDialog(type);
  };

  const closeBulkDialog = () => {
    if (bulkLoading) return;
    setBulkDialog(null);
  };

  // UI-only stub: simulate latency, toast success, clear selection
  const runBulkStub = async (message: string) => {
    setBulkLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      toast.success(message);
      clearSelection();
      setBulkDialog(null);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleConfirmAssign = () => {
    const lawyer = lawyers.find((l) => l.id === assignLawyerId);
    if (!lawyer) return;
    void runBulkStub(
      `Assigned ${selectedIds.size} lead${
        selectedIds.size === 1 ? '' : 's'
      } to ${lawyer.name} (UI demo — endpoint pending)`
    );
  };

  const handleConfirmStatus = () => {
    if (!bulkStatus) return;
    const label =
      BULK_STATUS_OPTIONS.find((o) => o.value === bulkStatus)?.name ??
      bulkStatus;
    void runBulkStub(
      `Status updated to "${label}" for ${selectedIds.size} lead${
        selectedIds.size === 1 ? '' : 's'
      } (UI demo — endpoint pending)`
    );
  };

  const handleConfirmArchive = () => {
    void runBulkStub(
      `Archived ${selectedIds.size} lead${
        selectedIds.size === 1 ? '' : 's'
      } (UI demo — endpoint pending)`
    );
  };

  const handleConfirmDelete = () => {
    void runBulkStub(
      `Deleted ${selectedIds.size} lead${
        selectedIds.size === 1 ? '' : 's'
      } (UI demo — endpoint pending)`
    );
  };

  // Preview helpers shared by dialogs
  const previewIds = useMemo(() => {
    const ids = selectedLeads.map((l) => `#${formatId(l['lead id'])}`);
    if (ids.length <= MAX_PREVIEW_IDS) return ids.join(', ');
    return `${ids.slice(0, MAX_PREVIEW_IDS).join(', ')} +${
      ids.length - MAX_PREVIEW_IDS
    } more`;
  }, [selectedLeads]);

  const previewNames = useMemo(() => {
    const names = selectedLeads.map((l) => l['lead name'] || '—');
    if (names.length <= MAX_PREVIEW_NAMES) return names.join(', ');
    return `${names.slice(0, MAX_PREVIEW_NAMES).join(', ')} +${
      names.length - MAX_PREVIEW_NAMES
    } more`;
  }, [selectedLeads]);

  const bulkActions: BulkAction[] = [
    {
      key: 'assign',
      label: 'Assign to',
      icon: <MdPersonAddAlt1 size={14} />,
      onClick: () => openBulkDialog('assign'),
    },
    {
      key: 'status',
      label: 'Change status',
      icon: <MdSwapHoriz size={14} />,
      onClick: () => openBulkDialog('status'),
    },
    {
      key: 'archive',
      label: 'Archive',
      icon: <MdArchive size={14} />,
      onClick: () => openBulkDialog('archive'),
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <MdDeleteOutline size={14} />,
      variant: 'danger',
      onClick: () => openBulkDialog('delete'),
    },
  ];

  const assignFields: ConfirmationField[] = [
    { label: 'Action', value: 'Assign to lawyer' },
    {
      label: 'Leads affected',
      value: `${selectedIds.size} ${
        selectedIds.size === 1 ? 'lead' : 'leads'
      }`,
    },
    {
      label: 'Assign to',
      value: (() => {
        const lawyer = lawyers.find((l) => l.id === assignLawyerId);
        return lawyer ? lawyer.name : '—';
      })(),
      highlight: !!assignLawyerId,
    },
    { label: 'IDs', value: previewIds || '—' },
  ];

  const statusFields: ConfirmationField[] = [
    { label: 'Action', value: 'Change status' },
    {
      label: 'Leads affected',
      value: `${selectedIds.size} ${
        selectedIds.size === 1 ? 'lead' : 'leads'
      }`,
    },
    {
      label: 'New status',
      value:
        BULK_STATUS_OPTIONS.find((o) => o.value === bulkStatus)?.name ?? '—',
      highlight: !!bulkStatus,
    },
    { label: 'IDs', value: previewIds || '—' },
  ];

  const archiveFields: ConfirmationField[] = [
    { label: 'Action', value: 'Archive leads' },
    {
      label: 'Leads affected',
      value: `${selectedIds.size} ${
        selectedIds.size === 1 ? 'lead' : 'leads'
      }`,
    },
    { label: 'IDs', value: previewIds || '—' },
  ];

  const deleteFields: ConfirmationField[] = [
    { label: 'Leads', value: previewNames || '—' },
    { label: 'IDs', value: previewIds || '—' },
  ];

  const columns: DataTableColumn<LeadRow>[] = [
    {
      key: 'lead id',
      label: 'ID',
      width: '68px',
      sortable: true,
      accessor: (r) => r['lead id'],
      render: (r) => (
        <span className='font-bold tabular-nums text-slate-900'>
          {formatId(r['lead id'])}
        </span>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      width: '88px',
      sortable: true,
      accessor: (r) => r.date,
      render: (r) => (
        <span className='text-[11px] tabular-nums text-slate-500'>
          {formatDate(r.date)}
        </span>
      ),
    },
    {
      key: 'lead name',
      label: 'Lead',
      width: 'minmax(180px, 220px)',
      sortable: true,
      accessor: (r) => r['lead name'],
      render: (r) => (
        <div className='flex min-w-0 flex-col gap-0.5'>
          <span className='truncate text-[13px] font-bold tracking-[-0.005em] text-slate-900'>
            {r['lead name'] || '—'}
          </span>
          <span className='truncate text-[11px] font-medium text-slate-400'>
            {r.email || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'phone number',
      label: 'Phone',
      width: '130px',
      render: (r) => (
        <span className='text-[11px] tabular-nums text-slate-600'>
          {r['phone number'] || '—'}
        </span>
      ),
    },
    {
      key: 'service',
      label: 'Service',
      width: '110px',
      sortable: true,
      accessor: (r) => r.service,
      render: (r) => (
        <span className='text-[11px] font-semibold text-slate-700'>
          {r.service || '—'}
        </span>
      ),
    },
    {
      key: 'description lead',
      label: 'Description',
      width: 'minmax(200px, 1fr)',
      render: (r) => (
        <span
          title={r['description lead']}
          className='block truncate pr-3 text-xs text-slate-500'
        >
          {r['description lead'] || '—'}
        </span>
      ),
    },
    {
      key: 'lawyer',
      label: 'Assigned to',
      width: '170px',
      sortable: true,
      accessor: (r) => r.lawyer,
      render: (r) => {
        const isAssigned = r.lawyer && !/no assigned/i.test(r.lawyer);
        if (!isAssigned) {
          return (
            <span className='text-[11px] font-medium italic text-slate-400'>
              Unassigned
            </span>
          );
        }
        return (
          <div className='flex min-w-0 items-center gap-2'>
            <Avatar
              size='xs'
              tone={toneFromString(r.lawyer)}
              initials={initialsOf(r.lawyer)}
            />
            <span className='truncate text-xs font-semibold text-slate-700'>
              {r.lawyer}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      sortable: true,
      accessor: (r) => r.status,
      render: (r) => <StatusPill variant={variantFromStatus(r.status)} />,
    },
  ];

  if (loading) return <ReLoading />;

  return (
    <div className='flex flex-col gap-4 min-h-0 flex-1'>
      {/* Modal: Lead detail / status update */}
      <LeadInfoModal
        open={isOpenLead}
        onClose={() => setIsOpenLead(false)}
        lead={
          Object.keys(selectedLead).length > 0
            ? {
                id: selectedLead['lead id'],
                name: selectedLead['lead name'],
                email: selectedLead.email,
                phone: selectedLead['phone number'],
                service: selectedLead.service,
                description: selectedLead['description lead'],
                comments: selectedLead.comments,
                selectedAt: selectedLead.date
                  ? dayjs
                      .utc(selectedLead.date as string)
                      .local()
                      .format('MMM D, YYYY')
                  : undefined,
                status: selectedLead.status,
              }
            : null
        }
        statusOptions={
          selectedLead.status === 'DISABLED' ||
          selectedLead.status === 'LOST'
            ? STATUS_OPTIONS_DISABLED
            : selectedLead.status === 'NEW'
            ? STATUS_OPTIONS_NEW
            : STATUS_OPTIONS_SELECT
        }
        onSubmit={handleSaveLead}
        loading={loading}
        countdown={
          selectedLead.status === 'ASSIGNED' && selectedLead.date_updated ? (
            <CountdownTimer targetDate={selectedLead.date_updated} />
          ) : undefined
        }
      />

      {/* Modal: Delete confirmation */}
      <Modal
        title='Delete'
        isOpen={isOpenDelete}
        setIsOpen={setIsOpenDelete}
        className='max-w-sm'
      >
        <div className='flex flex-col gap-4'>
          <div className='flex justify-center text-center'>
            <p>
              Are you sure you want to delete the lead{' '}
              <span className='font-medium'>{selectedLead?.email}?</span>
            </p>
          </div>
          <div className='flex justify-around'>
            <Button
              name='Cancel'
              type='button'
              onClick={() => setIsOpenDelete(false)}
            />
            <Button
              name='Delete'
              type='button'
              color='bg-red-500'
              onClick={deleteLead}
            />
          </div>
        </div>
      </Modal>

      {/* Page head */}
      <PageHead
        title='Leads Manage'
        action={
          <span className='text-[13px] font-medium tabular-nums text-slate-400'>
            {filtered.length} leads
          </span>
        }
      />

      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-2.5'>
        <SearchField
          placeholder='Search by name, email, phone or ID...'
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
        <FilterButton
          label='All'
          active={!statusFilter && selecArray.length === 0}
          onClick={() => handleStatusClick(null)}
        />
        {uniqueStatuses.map((s) => {
          const niceLabel =
            statusSelectAll.find((it) => it.value === s)?.name ?? s;
          return (
            <FilterButton
              key={s}
              label={niceLabel}
              active={statusFilter === s}
              onClick={() => handleStatusClick(s)}
            />
          );
        })}

        <div className='ml-auto flex items-center gap-2'>
          <ViewToggle
            value={view}
            onChange={(v) => setView(v as 'grid' | 'list')}
            options={[
              { value: 'grid', icon: <MdGridView size={14} />, label: 'Grid view' },
              { value: 'list', icon: <MdViewList size={14} />, label: 'List view' },
            ]}
          />
        </div>
      </div>

      {/* Table or error */}
      {error ? (
        <div className='flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-10 text-center'>
          <div className='flex flex-col gap-1'>
            <span className='text-[13px] font-semibold text-rose-700'>
              Failed to load leads
            </span>
            <span className='text-[11px] text-rose-500'>
              Try refreshing the page or check your connection
            </span>
          </div>
        </div>
      ) : (
        <DataTable<LeadRow>
          columns={columns}
          data={filtered}
          rowKey={(row) => row['lead id']}
          onRowClick={openLead}
          pagination={{ enabled: true, initialPageSize: 10 }}
          totalLabel='leads'
          initialSort={{ key: 'date', direction: 'desc' }}
          selection={{
            getRowKey: (row) => Number(row['lead id']),
            selectedKeys: selectedIds,
            onChange: (next) => setSelectedIds(next as Set<number>),
            selectAllScope: 'page',
            ariaLabel: 'Select all leads on this page',
          }}
          emptyState={
            <div className='flex flex-col items-center gap-1'>
              <span className='text-[13px] font-semibold text-slate-700'>
                No leads match your filters
              </span>
              <span className='text-[11px] text-slate-400'>
                Adjust the search or status filters above
              </span>
            </div>
          }
        />
      )}

      {/* Sticky bulk action bar */}
      <BulkActionBar
        count={selectedIds.size}
        actions={bulkActions}
        onDeselect={clearSelection}
      />

      {/* Bulk dialogs */}
      <ConfirmationDialog
        open={bulkDialog === 'assign'}
        onClose={closeBulkDialog}
        title='Confirm bulk assignment'
        subtitle='Review the action below before confirming.'
        fields={assignFields}
        notice="This action will be recorded in each lead's history. The assigned lawyer will receive a notification."
        confirmLabel='Confirm assignment'
        onConfirm={handleConfirmAssign}
        loading={bulkLoading}
        confirmDisabled={!assignLawyerId}
      >
        <div className='mb-1 flex flex-col gap-1.5'>
          <label
            htmlFor='bulk-assign-lawyer'
            className='text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500'
          >
            Lawyer
          </label>
          <select
            id='bulk-assign-lawyer'
            value={assignLawyerId === '' ? '' : String(assignLawyerId)}
            onChange={(e) =>
              setAssignLawyerId(e.target.value ? Number(e.target.value) : '')
            }
            disabled={lawyersLoading}
            className='h-10 w-full rounded-[9px] border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900 transition-colors hover:border-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-customRed/20'
          >
            <option value=''>
              {lawyersLoading ? 'Loading lawyers…' : 'Select a lawyer…'}
            </option>
            {lawyers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </ConfirmationDialog>

      <ConfirmationDialog
        open={bulkDialog === 'status'}
        onClose={closeBulkDialog}
        title='Change status'
        subtitle='Apply a new status to all selected leads.'
        fields={statusFields}
        notice='Each lead history will be updated. Lawyers may receive a notification depending on the new status.'
        confirmLabel='Apply status'
        onConfirm={handleConfirmStatus}
        loading={bulkLoading}
        confirmDisabled={!bulkStatus}
      >
        <div className='mb-1 flex flex-col gap-1.5'>
          <label
            htmlFor='bulk-status-select'
            className='text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500'
          >
            Status
          </label>
          <select
            id='bulk-status-select'
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className='h-10 w-full rounded-[9px] border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900 transition-colors hover:border-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-customRed/20'
          >
            <option value=''>Select a status…</option>
            {BULK_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </ConfirmationDialog>

      <ConfirmationDialog
        open={bulkDialog === 'archive'}
        onClose={closeBulkDialog}
        title={`Archive ${selectedIds.size} ${
          selectedIds.size === 1 ? 'lead' : 'leads'
        }`}
        subtitle='Archived leads stay in the system but are hidden from the active list.'
        fields={archiveFields}
        notice='You can restore archived leads from the Trash section at any time.'
        confirmLabel='Archive'
        onConfirm={handleConfirmArchive}
        loading={bulkLoading}
      />

      <ConfirmationDialog
        open={bulkDialog === 'delete'}
        onClose={closeBulkDialog}
        variant='danger'
        title={`Delete ${selectedIds.size} ${
          selectedIds.size === 1 ? 'lead' : 'leads'
        }`}
        subtitle='This action is permanent and cannot be undone.'
        fields={deleteFields}
        notice='Deleted leads will be moved to Trash and can be restored within the retention period. All history will be preserved.'
        confirmLabel={`Delete ${selectedIds.size} ${
          selectedIds.size === 1 ? 'lead' : 'leads'
        }`}
        onConfirm={handleConfirmDelete}
        loading={bulkLoading}
      />
    </div>
  );
};

export default LeadManagement;
