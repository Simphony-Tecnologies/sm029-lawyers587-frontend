'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { MdClose } from 'react-icons/md';
import { api } from '@/services/database';
import type {
  ActionType,
  AuditEvent,
  AuditFilters,
  LawyerListItem,
} from '@/types/api.types';
import {
  DataTable,
  PageHead,
  Pagination,
  RowsPerPageSelect,
  type DataTableColumn,
} from '@/components/ui';
import { apiText } from '@/lib/apiText';
import {
  ActionDot,
  actorName,
  actorRoleLabel,
  describeEvent,
} from '../dashboard/Dashboard';

dayjs.extend(relativeTime);

// Obs 35 — log completo de auditoría (GET /audit, solo admin), paginado en el
// servidor (limit/offset + total). Cada fila se pinta igual que el feed
// "Recent activity" del dashboard (ActionDot + describeEvent + rol · actor).

// Mismas etiquetas que el Activity log del perfil del abogado.
const ACTION_OPTIONS: { value: ActionType; label: string }[] = [
  { value: 'assign', label: 'Assigned' },
  { value: 'unassign', label: 'Unassigned' },
  { value: 'status_change', label: 'Status change' },
  { value: 'update', label: 'Update' },
  { value: 'edit_denied', label: 'Edit denied' },
  { value: 'create', label: 'Created' },
  { value: 'delete', label: 'Deleted' },
  { value: 'login', label: 'Login' },
];

const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'lawyer', label: 'Lawyer' },
];

const PAGE_SIZES = [10, 20, 50, 100];

// Mismo patrón de filtros que el historial de Notification settings.
const CONTROL_CLASS =
  'h-9 w-40 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] outline-none focus:border-slate-400';

const Field = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) => (
  <div className='flex flex-col gap-1'>
    <label
      htmlFor={htmlFor}
      className='text-[11px] font-bold uppercase tracking-wide text-slate-500'
    >
      {label}
    </label>
    {children}
  </div>
);

const AuditLog = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [entityType, setEntityType] = useState('');
  const [actionType, setActionType] = useState('');
  const [actorId, setActorId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [actors, setActors] = useState<LawyerListItem[]>([]);

  const hasFilters = !!(entityType || actionType || actorId || dateFrom || dateTo);

  // Opciones del filtro por actor: todos los usuarios (abogados y admins).
  useEffect(() => {
    api.lawyers.list({ limit: 1000 }).then((res) => {
      if (res.success && res.data) setActors(res.data.data ?? []);
    });
  }, []);

  const actorOptions = useMemo(
    () =>
      actors
        .map((a) => ({
          value: String(a.id),
          label: `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || a.email,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [actors]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const query: AuditFilters = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
    if (entityType) query.entity_type = entityType;
    if (actionType) query.action_type = actionType;
    if (actorId) query.actor_id = Number(actorId);
    // Días completos en hora local: From desde las 00:00, To hasta las 23:59:59.
    if (dateFrom) query.date_from = dayjs(dateFrom).startOf('day').toISOString();
    if (dateTo) query.date_to = dayjs(dateTo).endOf('day').toISOString();
    api.audit
      .list(query)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setEvents(res.data.data ?? []);
          setTotal(res.data.total ?? 0);
        } else {
          setEvents([]);
          setTotal(0);
          setError(apiText(res.message));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, pageSize, entityType, actionType, actorId, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Cualquier cambio de filtro vuelve a la primera página.
  const withFirstPage =
    (setter: (v: string) => void) => (value: string) => {
      setter(value);
      setPage(1);
    };

  const clearFilters = () => {
    setEntityType('');
    setActionType('');
    setActorId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const columns: DataTableColumn<AuditEvent>[] = [
    {
      key: 'action_type',
      label: '',
      width: '44px',
      render: (ev) => <ActionDot type={ev.action_type} />,
    },
    {
      key: 'detail',
      label: 'Detail',
      width: 'minmax(220px, 1fr)',
      render: (ev) => (
        <span className='block truncate pr-3 text-[12px] font-semibold text-slate-700'>
          {describeEvent(ev)}
        </span>
      ),
    },
    {
      key: 'actor',
      label: 'Lawyer',
      width: 'minmax(170px, 240px)',
      render: (ev) => (
        <span className='block truncate pr-3 text-[11px] text-slate-500'>
          {actorRoleLabel(ev)}{' '}
          · <strong className='font-semibold text-slate-700'>{actorName(ev)}</strong>
        </span>
      ),
    },
    {
      key: 'timestamp',
      label: 'Date',
      width: '120px',
      render: (ev) => (
        <div className='flex flex-col gap-0.5'>
          <span className='text-[11px] tabular-nums text-slate-600'>
            {dayjs(ev.timestamp).format('MMM DD, HH:mm')}
          </span>
          <span className='text-[10px] font-medium text-slate-400'>
            {dayjs(ev.timestamp).fromNow()}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <PageHead
        title='Audit log'
        action={
          <span className='text-[13px] font-medium tabular-nums text-slate-400'>
            {total} events
          </span>
        }
      />

      <div className='flex flex-wrap items-end gap-3'>
        <Field label='Type' htmlFor='audit-entity'>
          <select
            id='audit-entity'
            value={entityType}
            onChange={(e) => withFirstPage(setEntityType)(e.target.value)}
            className={CONTROL_CLASS}
          >
            <option value=''>All</option>
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label='Action' htmlFor='audit-action'>
          <select
            id='audit-action'
            value={actionType}
            onChange={(e) => withFirstPage(setActionType)(e.target.value)}
            className={CONTROL_CLASS}
          >
            <option value=''>All</option>
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label='Lawyer' htmlFor='audit-actor'>
          <select
            id='audit-actor'
            value={actorId}
            onChange={(e) => withFirstPage(setActorId)(e.target.value)}
            className={CONTROL_CLASS}
          >
            <option value=''>All</option>
            {actorOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label='From' htmlFor='audit-from'>
          <input
            id='audit-from'
            type='date'
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => withFirstPage(setDateFrom)(e.target.value)}
            className={CONTROL_CLASS}
          />
        </Field>
        <Field label='To' htmlFor='audit-to'>
          <input
            id='audit-to'
            type='date'
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => withFirstPage(setDateTo)(e.target.value)}
            className={CONTROL_CLASS}
          />
        </Field>
        {hasFilters ? (
          <button
            type='button'
            onClick={clearFilters}
            className='inline-flex h-9 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          >
            <MdClose size={14} />
            Clear
          </button>
        ) : null}
      </div>

      {error ? (
        <p className='text-[13px] font-medium text-rose-600'>{error}</p>
      ) : null}

      {/* Paginación en el servidor: la tabla muestra la página pedida y el pie
          usa el total de GET /audit. */}
      <div
        aria-busy={loading}
        className={`flex min-h-0 flex-1 flex-col transition-opacity ${
          loading && events.length > 0 ? 'opacity-60' : ''
        }`}
      >
        <DataTable<AuditEvent>
          className='rounded-b-none'
          columns={columns}
          data={events}
          rowKey={(ev) => `${ev.entity_type}-${ev.entity_id}-${ev.id}`}
          totalLabel=''
          emptyState={
            <div className='flex flex-col items-center gap-1'>
              <span className='text-[13px] font-semibold text-slate-700'>
                {loading
                  ? 'Loading activity…'
                  : hasFilters
                  ? 'No matching events'
                  : 'No recent activity yet'}
              </span>
              {!loading ? (
                <span className='text-[11px] text-slate-400'>
                  {hasFilters
                    ? 'Try adjusting your filters'
                    : 'Audit log entries will appear here as they happen'}
                </span>
              ) : null}
            </div>
          }
        />
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border border-t-0 border-slate-200 bg-white px-5 py-3'>
          <div className='flex items-center gap-2 text-[11px] font-medium text-slate-500'>
            Showing
            <RowsPerPageSelect
              value={pageSize}
              onChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
              options={PAGE_SIZES}
            />
            of {total} events
          </div>
          <Pagination
            page={Math.min(page, pageCount)}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
