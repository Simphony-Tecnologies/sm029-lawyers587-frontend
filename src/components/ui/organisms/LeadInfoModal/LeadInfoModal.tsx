'use client';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import {
  MdClose,
  MdEmail,
  MdInfoOutline,
  MdLock,
  MdPhone,
  MdDescription,
  MdWorkOutline,
  MdKeyboardArrowDown,
  MdHistoryEdu,
} from 'react-icons/md';
import { cn } from '@/lib/cn';
import {
  getLeadStatusMeta,
  isDestructiveStatus,
  type LeadStatusKey,
} from './leadStatusMeta';
import { api } from '@/services/database';
import type { NoteType, TimelineEntry } from '@/types/api.types';

const REASON_MAX = 500;

export interface LeadInfoLead {
  id: number | string;
  name: string;
  email?: string;
  phone?: string;
  service?: string;
  description?: string;
  comments?: string;
  selectedAt?: string;
  status: string;
}

export interface LeadStatusOption {
  name: string;
  value: string;
}

export interface LeadInfoSubmitPayload {
  status: string;
  comments: string;
  doNotContact?: boolean;
}

// Si el lead no tiene lawyer asignado, el modal puede ofrecer un picker
// inline. El parent provee la lista + handler.
export interface AssignableLawyer {
  id: number;
  name: string;
  services?: string[];
  activeLeads?: number;
}

export interface LeadInfoModalProps {
  open: boolean;
  onClose: () => void;
  lead: LeadInfoLead | null;
  statusOptions: LeadStatusOption[];
  onSubmit: (payload: LeadInfoSubmitPayload) => Promise<void> | void;
  loading?: boolean;
  breadcrumb?: string;
  countdown?: ReactNode;
  /** Si se provee y lead.status indica que no está asignado, el modal
   *  muestra un picker para asignar a un lawyer directo. */
  assignableLawyers?: AssignableLawyer[];
  onAssign?: (lawyerId: number, comment: string) => Promise<void> | void;
  assignLoading?: boolean;
}

const formatId = (id: number | string) =>
  String(id ?? '').padStart(5, '0') || '—';

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '·';

export const LeadInfoModal = ({
  open,
  onClose,
  lead,
  statusOptions,
  onSubmit,
  loading = false,
  breadcrumb = 'My Leads',
  countdown,
  assignableLawyers,
  onAssign,
  assignLoading = false,
}: LeadInfoModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [doNotContact, setDoNotContact] = useState<boolean>(true);
  // Issue #2: single-assign desde el modal cuando lead.status indica
  // que aún no tiene lawyer (NEW / EXPIRED).
  const [assignLawyerId, setAssignLawyerId] = useState<number | ''>('');
  const [assignReason, setAssignReason] = useState('');
  const [assignSearch, setAssignSearch] = useState('');
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'audit' | 'comment'>('all');
  const [newComment, setNewComment] = useState('');
  const [newCommentType, setNewCommentType] = useState<NoteType>('internal');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Reset internal state when the modal opens with a new lead.
  // `comment` (razón de auditoría) siempre arranca vacío — sólo se llena
  // cuando el user cambia a un status crítico y escribe la razón. No tomamos
  // lead.comments (campo distinto, persiste en la entidad lead).
  useEffect(() => {
    if (!open || !lead) return;
    setSelectedStatus(lead.status ?? '');
    setComment('');
    setDoNotContact(true);
    setNewComment('');
    setNewCommentType('internal');
    setAssignLawyerId('');
    setAssignReason('');
    setAssignSearch('');
  }, [open, lead]);

  const fetchTimeline = async (
    leadId: number | string,
    filter: 'all' | 'audit' | 'comment' = 'all'
  ) => {
    if (typeof leadId !== 'number' && Number.isNaN(Number(leadId))) return;
    setTimelineLoading(true);
    const res = await api.leads.timeline(Number(leadId), {
      type: filter,
      limit: 25,
    });
    setTimelineLoading(false);
    if (!res.success || !res.data) {
      setTimeline([]);
      return;
    }
    // Defensivo: backend a veces retorna { data: { data: [], total } },
    // a veces { data: [] } directo según filtro. Cubrimos ambos shapes.
    const payload: any = res.data;
    const list: TimelineEntry[] = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
      ? payload
      : [];
    setTimeline(list);
  };

  useEffect(() => {
    if (!open || !lead) {
      setTimeline([]);
      setTimelineFilter('all');
      return;
    }
    void fetchTimeline(lead.id, timelineFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id, timelineFilter]);

  const handleAddComment = async () => {
    if (!lead) return;
    const content = newComment.trim();
    if (content.length === 0) return;
    setCommentSubmitting(true);
    const res = await api.leads.comments.create(Number(lead.id), {
      content,
      note_type: newCommentType,
    });
    setCommentSubmitting(false);
    if (!res.success) return;
    setNewComment('');
    void fetchTimeline(lead.id, timelineFilter);
  };

  const currentMeta = useMemo(
    () => getLeadStatusMeta(lead?.status),
    [lead?.status]
  );

  const nextMeta = useMemo(
    () => getLeadStatusMeta(selectedStatus),
    [selectedStatus]
  );

  const isDestructive = isDestructiveStatus(selectedStatus);
  const statusChanged =
    !!lead && (lead.status ?? '').toUpperCase() !==
      (selectedStatus ?? '').toUpperCase();

  // Issue #2: el lead se considera asignable cuando está en NEW o EXPIRED
  // (alineado con la regla del backend en PATCH /leads/:id/assign).
  const leadStatusUpper = (lead?.status ?? '').toUpperCase();
  const canAssign =
    !!onAssign &&
    Array.isArray(assignableLawyers) &&
    (leadStatusUpper === 'NEW' || leadStatusUpper === 'EXPIRED');

  const filteredLawyers = useMemo(() => {
    if (!assignableLawyers) return [];
    const q = assignSearch.trim().toLowerCase();
    if (!q) return assignableLawyers;
    return assignableLawyers.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.services ?? []).some((s) => s.toLowerCase().includes(q))
    );
  }, [assignableLawyers, assignSearch]);

  const reasonLength = comment.length;
  const reasonRequiredMissing = isDestructive && reasonLength === 0;

  const handleSubmit = async () => {
    if (!lead) return;
    if (loading) return;
    if (reasonRequiredMissing) return;
    await onSubmit({
      status: selectedStatus,
      comments: comment,
      doNotContact: isDestructive ? doNotContact : undefined,
    });
  };

  const handleAssignSubmit = async () => {
    if (!onAssign || assignLawyerId === '' || assignLoading) return;
    const reason = assignReason.trim();
    if (reason.length === 0) return;
    await onAssign(Number(assignLawyerId), reason);
  };

  if (!lead && !open) return null;

  const accentClass = isDestructive ? 'bg-customRed' : 'bg-sky-500';

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={loading ? () => {} : onClose}>
        <TransitionChild
          as={Fragment}
          enter='ease-out duration-150'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div
            aria-hidden
            className='fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]'
          />
        </TransitionChild>

        <div className='fixed inset-0 flex items-center justify-center p-4'>
          <TransitionChild
            as={Fragment}
            enter='ease-out duration-150'
            enterFrom='opacity-0 scale-95'
            enterTo='opacity-100 scale-100'
            leave='ease-in duration-100'
            leaveFrom='opacity-100 scale-100'
            leaveTo='opacity-0 scale-95'
          >
            <DialogPanel className='relative w-full max-w-[540px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(11,15,25,0.22)]'>
              {/* Top accent stripe */}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-0 top-0 z-[2] h-[3px]',
                  accentClass
                )}
              />

              {/* Header */}
              <div className='flex items-center justify-between gap-3 border-b border-slate-100 px-6 pb-4 pt-5'>
                <div className='flex min-w-0 flex-col gap-1'>
                  <span className='flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500'>
                    {breadcrumb}
                    <span aria-hidden className='text-slate-300'>
                      ›
                    </span>
                    <strong className='font-bold text-customRed'>
                      #{formatId(lead?.id ?? '')}
                    </strong>
                  </span>
                  <DialogTitle className='text-[18px] font-extrabold leading-[1.2] tracking-[-0.02em] text-slate-900'>
                    Lead Info
                  </DialogTitle>
                </div>
                <button
                  type='button'
                  onClick={onClose}
                  disabled={loading}
                  className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[13px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50'
                  aria-label='Close'
                >
                  <MdClose size={16} />
                </button>
              </div>

              {/* Identity strip */}
              <div className='flex items-center gap-3.5 border-b border-slate-100 bg-slate-50 px-6 py-4'>
                <div
                  aria-hidden
                  className='flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] text-[15px] font-extrabold tracking-[-0.02em] text-white shadow-[0_4px_12px_rgba(240,68,56,0.25)]'
                  style={{
                    background:
                      'linear-gradient(135deg, #F04438 0%, #B91C1C 100%)',
                  }}
                >
                  {initialsOf(lead?.name ?? '')}
                </div>
                <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <span className='truncate text-[16px] font-extrabold leading-[1.15] tracking-[-0.015em] text-slate-900'>
                    {lead?.name || '—'}
                  </span>
                  <div className='flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500'>
                    <span className='font-bold tracking-[0.04em] text-slate-400'>
                      #{formatId(lead?.id ?? '')}
                    </span>
                    {lead?.service ? (
                      <>
                        <span aria-hidden className='text-slate-300'>
                          ·
                        </span>
                        <span>{lead.service}</span>
                      </>
                    ) : null}
                    {lead?.selectedAt ? (
                      <>
                        <span aria-hidden className='text-slate-300'>
                          ·
                        </span>
                        <span>Selected {lead.selectedAt}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <span
                  className={cn(
                    'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.02em]',
                    currentMeta.badgeBgClass,
                    currentMeta.textClass
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'h-[5px] w-[5px] rounded-full',
                      currentMeta.dotClass
                    )}
                  />
                  {currentMeta.label}
                </span>
              </div>

              {/* Body */}
              <div className='flex max-h-[58vh] flex-col gap-[18px] overflow-y-auto px-6 py-5'>
                {countdown ? (
                  <div className='rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-medium text-amber-800'>
                    {countdown}
                  </div>
                ) : null}

                {/* Status block */}
                <section className='flex flex-col gap-2'>
                  <label
                    htmlFor='lead-status'
                    className='inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'
                  >
                    Status
                  </label>

                  {statusChanged ? (
                    <div className='grid grid-cols-[1fr_24px_1fr] items-center gap-2.5 rounded-[11px] border border-slate-200 bg-white px-3.5 py-3'>
                      <div className='flex flex-col gap-1'>
                        <span className='text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400'>
                          Current
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-[13px] font-bold tracking-[-0.005em]',
                            currentMeta.textClass
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'h-[7px] w-[7px] rounded-full',
                              currentMeta.dotClass
                            )}
                          />
                          {currentMeta.label}
                        </span>
                      </div>
                      <span
                        aria-hidden
                        className='text-center text-[14px] text-slate-300'
                      >
                        →
                      </span>
                      <div className='flex flex-col gap-1'>
                        <span className='text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400'>
                          New status
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 text-[13px] font-bold tracking-[-0.005em]',
                            nextMeta.textClass
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'h-[7px] w-[7px] rounded-full',
                              nextMeta.dotClass
                            )}
                          />
                          {nextMeta.label}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      'relative flex h-11 w-full items-center rounded-[10px] border-[1.5px] transition-colors',
                      nextMeta.triggerClass,
                      nextMeta.triggerHoverClass,
                      'focus-within:border-slate-900 focus-within:shadow-[0_0_0_3px_rgba(11,15,25,0.06)]'
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'pointer-events-none absolute left-3.5 h-2 w-2 rounded-full',
                        nextMeta.dotClass
                      )}
                    />
                    <select
                      id='lead-status'
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      disabled={loading || statusOptions.length === 0}
                      className={cn(
                        'h-full w-full cursor-pointer appearance-none bg-transparent pl-9 pr-9 text-[13px] font-bold leading-none tracking-[-0.005em] focus:outline-none disabled:cursor-not-allowed',
                        'text-current'
                      )}
                    >
                      {statusOptions.length === 0 ? (
                        <option value=''>No options available</option>
                      ) : null}
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                    <span
                      aria-hidden
                      className={cn(
                        'pointer-events-none absolute right-3.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em]',
                        nextMeta.triggerMetaClass
                      )}
                    >
                      <span>Change</span>
                      <MdKeyboardArrowDown size={14} />
                    </span>
                  </div>
                </section>

                {/* Destructive warning */}
                {isDestructive ? (
                  <div className='flex items-start gap-2.5 rounded-[10px] border border-rose-200/80 bg-red-50 px-3.5 py-3 text-xs font-medium leading-[1.5] text-slate-700'>
                    <span
                      aria-hidden
                      className='mt-0.5 inline-flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-customRed text-[10px] font-extrabold text-white'
                    >
                      !
                    </span>
                    <span>
                      <strong className='font-bold text-slate-900'>
                        This action is permanent.
                      </strong>{' '}
                      Once marked as lost, the lead will not be reinstated to
                      the active queue and will be reviewed by the super admin.
                    </span>
                  </div>
                ) : null}

                {/* Lead details */}
                <section className='flex flex-col gap-2'>
                  <span className='text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'>
                    Lead details
                  </span>
                  <div className='flex flex-col rounded-[11px] border border-slate-200 bg-slate-50 px-4'>
                    <DetailRow
                      icon={<MdEmail size={11} />}
                      label='Email'
                      value={lead?.email}
                      locked
                    />
                    <DetailRow
                      icon={<MdPhone size={11} />}
                      label='Phone'
                      value={lead?.phone}
                      locked
                    />
                    <DetailRow
                      icon={<MdWorkOutline size={11} />}
                      label='Service'
                      value={lead?.service}
                      locked
                    />
                    <DetailRow
                      icon={<MdDescription size={11} />}
                      label='Summary'
                      value={lead?.description}
                      multiline
                      isLast
                    />
                  </div>
                </section>

                {/* Reason for status change — sólo visible cuando el status
                    seleccionado es crítico (PROBLEMATIC / SEND_BACK / LOST).
                    Backend obliga `comment` en esos casos y va al
                    audit_log.comment. Para statuses no críticos la razón
                    NO es necesaria — el cliente lo veía como redundancia con
                    el composer "Add a comment" de abajo. */}
                {isDestructive ? (
                  <section className='flex flex-col gap-1.5'>
                    <label
                      htmlFor='lead-comment'
                      className='inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'
                    >
                      Reason for {(selectedStatus ?? '').toLowerCase().replace('_', ' ')}
                      <span className='rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-customRed'>
                        Required
                      </span>
                    </label>
                    <textarea
                      id='lead-comment'
                      value={comment}
                      onChange={(e) =>
                        setComment(e.target.value.slice(0, REASON_MAX))
                      }
                      placeholder='Explain the reason for this status change. The super admin will see this in the lead history.'
                      disabled={loading}
                      className={cn(
                        'min-h-[96px] w-full resize-y rounded-[10px] border-[1.5px] bg-white px-3.5 py-3 text-[13px] font-medium leading-[1.5] text-slate-900 outline-none transition-colors',
                        'placeholder:font-normal placeholder:text-slate-400',
                        'border-rose-200 focus:border-customRed focus:shadow-[0_0_0_3px_rgba(240,68,56,0.10)]',
                        'disabled:cursor-not-allowed disabled:opacity-60'
                      )}
                    />
                    <div className='flex items-center justify-between'>
                      {reasonRequiredMissing ? (
                        <span className='text-[10px] font-semibold text-customRed'>
                          A reason is required for this status change.
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className='text-[10px] font-semibold tabular-nums text-slate-400'>
                        {reasonLength} / {REASON_MAX}
                      </span>
                    </div>
                  </section>
                ) : null}

                {/* Issue #2: Assign-to-lawyer inline — sólo cuando el lead
                    está NEW/EXPIRED y el parent provee el contexto. Evita
                    forzar al admin a salir del modal y usar bulk con N=1. */}
                {canAssign ? (
                  <section className='flex flex-col gap-2'>
                    <div className='flex items-center justify-between'>
                      <span className='text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'>
                        Assign to lawyer
                      </span>
                    </div>
                    <input
                      type='search'
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      placeholder='Search by name or area of law…'
                      disabled={assignLoading}
                      className='h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none disabled:opacity-60'
                    />
                    <div className='max-h-[180px] overflow-y-auto rounded-md border border-slate-200 bg-white'>
                      {filteredLawyers.length === 0 ? (
                        <div className='px-3 py-3 text-center text-[12px] font-medium text-slate-400'>
                          {assignableLawyers && assignableLawyers.length === 0
                            ? 'No active lawyers available'
                            : 'No matches'}
                        </div>
                      ) : (
                        filteredLawyers.map((l) => {
                          const selected = assignLawyerId === l.id;
                          return (
                            <button
                              key={l.id}
                              type='button'
                              onClick={() =>
                                setAssignLawyerId(selected ? '' : l.id)
                              }
                              disabled={assignLoading}
                              className={cn(
                                'flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition-colors last:border-b-0',
                                selected
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-white text-slate-800 hover:bg-slate-50'
                              )}
                            >
                              <div className='flex min-w-0 flex-col'>
                                <span className='truncate text-[12px] font-bold'>
                                  {l.name}
                                </span>
                                <span
                                  className={cn(
                                    'truncate text-[10px]',
                                    selected ? 'text-white/70' : 'text-slate-500'
                                  )}
                                >
                                  {(l.services ?? []).join(', ') ||
                                    'No areas of law'}
                                </span>
                              </div>
                              {typeof l.activeLeads === 'number' ? (
                                <span
                                  className={cn(
                                    'flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                                    selected
                                      ? 'bg-white/15 text-white'
                                      : 'bg-slate-100 text-slate-600'
                                  )}
                                >
                                  {l.activeLeads} active
                                </span>
                              ) : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <textarea
                      value={assignReason}
                      onChange={(e) => setAssignReason(e.target.value)}
                      rows={2}
                      placeholder='Reason for assignment (required)'
                      disabled={assignLoading}
                      className='w-full resize-none rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none disabled:opacity-60'
                    />
                    <div className='flex items-center justify-end'>
                      <button
                        type='button'
                        onClick={handleAssignSubmit}
                        disabled={
                          assignLoading ||
                          assignLawyerId === '' ||
                          assignReason.trim().length === 0
                        }
                        className='inline-flex h-8 items-center rounded-md bg-slate-900 px-3 text-[12px] font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        {assignLoading ? 'Assigning…' : 'Assign lawyer'}
                      </button>
                    </div>
                  </section>
                ) : null}

                {/* Activity & Comments (timeline + add comment)
                    NOTA: el cliente pidió simplificar — sólo "Comments",
                    sin distinción Internal/Client-facing/Urgent ni filtros
                    Audit/Comments separados. El código de tipos (NoteType,
                    chips selectables, FilterChip) queda comentado más abajo
                    en caso de que se reactive más adelante. */}
                <section className='flex flex-col gap-2'>
                  <div className='flex items-center justify-between'>
                    <span className='text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'>
                      Activity &amp; Comments
                    </span>
                    {timelineLoading ? (
                      <span className='text-[10px] font-semibold text-slate-400'>
                        Loading…
                      </span>
                    ) : null}
                  </div>
                  {/*
                  --- Legacy filter chips (parked; cliente pidió quitar
                      hasta validar que el backend devuelva data para
                      cada filtro consistentemente):

                  <FilterChip label='All' active={timelineFilter === 'all'}
                    onClick={() => setTimelineFilter('all')} />
                  <FilterChip label='Audit' active={timelineFilter === 'audit'}
                    onClick={() => setTimelineFilter('audit')} />
                  <FilterChip label='Comments' active={timelineFilter === 'comment'}
                    onClick={() => setTimelineFilter('comment')} />
                  */}
                  <div className='flex max-h-[260px] flex-col divide-y divide-slate-100 overflow-y-auto rounded-[10px] border border-slate-200 bg-white'>
                    {timeline.length === 0 && !timelineLoading ? (
                      <div className='px-3.5 py-4 text-center text-[12px] font-medium text-slate-400'>
                        No activity yet.
                      </div>
                    ) : (
                      timeline.map((entry) => (
                        <TimelineRow
                          key={`${entry.type}-${entry.id}`}
                          entry={entry}
                        />
                      ))
                    )}
                  </div>
                  <CommentComposer
                    value={newComment}
                    submitting={commentSubmitting}
                    onChangeValue={setNewComment}
                    onSubmit={handleAddComment}
                  />
                </section>

                {/* Toggle (destructive only) */}
                {isDestructive ? (
                  <div className='flex items-center gap-3 rounded-[11px] border border-slate-200 bg-slate-50 px-4 py-3.5'>
                    <button
                      type='button'
                      role='switch'
                      aria-checked={doNotContact}
                      onClick={() => setDoNotContact((v) => !v)}
                      disabled={loading}
                      className={cn(
                        'relative h-5 w-[34px] flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-60',
                        doNotContact ? 'bg-slate-900' : 'bg-slate-300'
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(11,15,25,0.20)] transition-transform',
                          doNotContact ? 'translate-x-[14px]' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                    <div className='flex flex-1 flex-col'>
                      <span className='text-xs font-bold tracking-[-0.005em] text-slate-900'>
                        Do not contact this lead again
                      </span>
                      <span className='text-[11px] font-medium leading-[1.4] text-slate-500'>
                        Client won&apos;t be re-assigned from future intakes.
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className='flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-6 pb-5 pt-4'>
                <span className='inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500'>
                  {isDestructive ? (
                    <>
                      <MdLock size={12} className='text-slate-400' />
                      Logged &amp; sent to super admin review
                    </>
                  ) : (
                    <>
                      <MdHistoryEdu size={12} className='text-slate-400' />
                      Changes are logged in the lead history
                    </>
                  )}
                </span>
                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={onClose}
                    disabled={loading}
                    className='inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-4 text-[13px] font-bold tracking-[-0.005em] text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    onClick={handleSubmit}
                    disabled={loading || reasonRequiredMissing}
                    className={cn(
                      'inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border px-4 text-[13px] font-bold tracking-[-0.005em] text-white transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
                      isDestructive
                        ? 'border-customRed bg-customRed shadow-[0_6px_16px_rgba(240,68,56,0.25)] hover:bg-red-600 focus-visible:ring-customRed/40'
                        : 'border-slate-900 bg-slate-900 hover:bg-slate-800 focus-visible:ring-slate-700/40'
                    )}
                  >
                    {loading
                      ? 'Saving…'
                      : isDestructive
                      ? 'Mark as Lost'
                      : 'Save changes'}
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};
LeadInfoModal.displayName = 'LeadInfoModal';

interface DetailRowProps {
  icon: ReactNode;
  label: string;
  value?: ReactNode;
  locked?: boolean;
  multiline?: boolean;
  isLast?: boolean;
}

const DetailRow = ({
  icon,
  label,
  value,
  locked = false,
  multiline = false,
  isLast = false,
}: DetailRowProps) => {
  const display = value === undefined || value === null || value === '' ? '—' : value;
  return (
    <div
      className={cn(
        'grid items-center gap-2.5 py-2.5',
        multiline
          ? '[grid-template-columns:92px_1fr] items-start py-3'
          : '[grid-template-columns:92px_1fr_auto] min-h-[40px]',
        !isLast && 'border-b border-slate-200'
      )}
    >
      <span className='inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-400'>
        <span aria-hidden className='text-slate-400'>
          {icon}
        </span>
        {label}
      </span>
      <span
        className={cn(
          'min-w-0 text-xs tracking-[-0.005em]',
          multiline
            ? 'whitespace-pre-wrap break-words font-medium leading-[1.5] text-slate-700'
            : 'truncate font-semibold text-slate-900'
        )}
      >
        {display}
      </span>
      {!multiline && locked ? (
        <span
          aria-hidden
          className='flex h-[18px] w-[18px] items-center justify-center text-slate-300'
          title='Read-only'
        >
          <MdLock size={11} />
        </span>
      ) : null}
    </div>
  );
};

// ─── Parked: legacy comment type system ──────────────────────────────
// El cliente pidió simplificar — todos los comments van como 'internal'.
// Estas constantes y el sub-componente FilterChip quedan referenciables
// si reactivamos los tipos. NO BORRAR.

const NOTE_TYPE_LABEL: Record<NoteType, string> = {
  internal: 'Internal',
  client_facing: 'Client-facing',
  urgent: 'Urgent',
};

// Color tokens alineados al mock 17:
//  - internal → ink-500 (slate-700/800)
//  - client_facing → sky-500
//  - urgent → coral (customRed)
const NOTE_TYPE_BADGE: Record<NoteType, string> = {
  internal: 'bg-slate-100 text-slate-700',
  client_facing: 'bg-sky-50 text-sky-700',
  urgent: 'bg-red-50 text-customRed',
};

const NOTE_TYPE_DOT: Record<NoteType, string> = {
  internal: 'bg-slate-700',
  client_facing: 'bg-sky-500',
  urgent: 'bg-customRed',
};

const NOTE_TYPE_PLACEHOLDER: Record<NoteType, string> = {
  internal:
    'Write a note about this case. Only admins and assigned lawyers will see this.',
  client_facing:
    'Write a note safe to share with the client. Keep tone professional.',
  urgent:
    'Flag this lead for immediate attention. Super admin gets notified.',
};

const formatTs = (ts: string) => {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
};

const initialsFromActor = (
  actor: { firstName?: string; lastName?: string } | undefined
): string => {
  const f = (actor?.firstName ?? '').trim().charAt(0);
  const l = (actor?.lastName ?? '').trim().charAt(0);
  return (f + l || '·').toUpperCase();
};

// Parked: usado por los chips All/Audit/Comments del timeline.
// Re-importar en el render cuando se reactiven los filtros del timeline.
// (Referenciado vía `void` al final del archivo para evitar el unused.)
const FilterChip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type='button'
    onClick={onClick}
    className={cn(
      'h-6 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.04em] transition-colors',
      active
        ? 'bg-slate-900 text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    )}
  >
    {label}
  </button>
);

// Tipos de comentario disponibles en backend (internal/client_facing/urgent).
// Parked: el cliente pidió simplificar — toda comment ahora va como 'internal'.
// Reactivar exportando NOTE_TYPES + ampliando CommentComposer cuando se valide
// el flujo completo de tipos.
const NOTE_TYPES: NoteType[] = ['internal', 'client_facing', 'urgent'];
void NOTE_TYPES; // keep-alive para que TS no marque como unused

const CommentComposer = ({
  value,
  submitting,
  onChangeValue,
  onSubmit,
}: {
  value: string;
  submitting: boolean;
  onChangeValue: (next: string) => void;
  onSubmit: () => void;
}) => {
  return (
    <div className='flex flex-col gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 transition-colors'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-[10px] font-bold uppercase tracking-[0.04em] text-slate-600'>
          Add a comment
        </span>
        {/*
          --- Legacy: chips Internal / Client-facing / Urgent ---
          Parked por pedido del cliente. Restaurar pasando `type` +
          `onChangeType` props y renderizando los 3 chips con
          NOTE_TYPE_DOT / NOTE_TYPE_LABEL definidos arriba.
        */}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        placeholder='Write a comment about this case. Visible to admins and the assigned lawyer.'
        rows={2}
        disabled={submitting}
        className={cn(
          'w-full resize-none rounded-md border bg-white px-2.5 py-1.5 text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60 transition-colors',
          'border-slate-200 focus:border-slate-400'
        )}
      />
      <div className='flex items-center justify-between'>
        <span className='text-[10px] font-semibold tabular-nums text-slate-400'>
          {value.length} / 500
        </span>
        <button
          type='button'
          onClick={onSubmit}
          disabled={submitting || value.trim().length === 0}
          className='inline-flex h-7 items-center gap-1 rounded-md bg-slate-900 px-3 text-[11px] font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {submitting ? 'Adding…' : 'Add comment'}
        </button>
      </div>
    </div>
  );
};

const TimelineRow = ({ entry }: { entry: TimelineEntry }) => {
  const actorName =
    `${entry.actor?.firstName ?? ''} ${entry.actor?.lastName ?? ''}`.trim() ||
    'System';
  const initials = initialsFromActor(entry.actor);

  if (entry.type === 'comment') {
    // Cliente pidió no diferenciar tipos visualmente — todas las comments
    // se renderizan con la misma estética neutral.
    return (
      <div className='flex gap-2.5 px-3.5 py-3'>
        <span className='mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-slate-700 text-[10px] font-bold text-white'>
          {initials}
        </span>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <div className='flex items-center justify-between gap-2'>
            <span className='truncate text-[11px] font-bold text-slate-900'>
              {actorName}
            </span>
            <span className='text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500'>
              Comment
            </span>
          </div>
          <span className='whitespace-pre-wrap text-[12px] leading-[1.5] text-slate-700'>
            {entry.content}
          </span>
          <span className='text-[10px] font-semibold text-slate-400'>
            {formatTs(entry.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  const from = entry.old_value?.status;
  const to = entry.new_value?.status;
  const detail =
    entry.action_type === 'status_change' && from && to ? (
      <>
        <strong className='font-bold text-slate-900'>{from}</strong>
        {' → '}
        <strong className='font-bold text-slate-900'>{to}</strong>
      </>
    ) : (
      entry.action_type.replace('_', ' ')
    );

  return (
    <div className='flex gap-2.5 px-3.5 py-3'>
      <span className='mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-600'>
        {initials}
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <div className='flex items-center justify-between gap-2'>
          <span className='truncate text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'>
            {entry.action_type.replace('_', ' ')}
          </span>
          <span className='text-[10px] font-semibold text-slate-400'>
            {formatTs(entry.timestamp)}
          </span>
        </div>
        <span className='text-[12px] text-slate-700'>{detail}</span>
        <span className='text-[10px] font-medium text-slate-500'>
          by {actorName}
          {entry.comment ? ` · "${entry.comment.slice(0, 80)}"` : ''}
        </span>
      </div>
    </div>
  );
};

// keep-alive de constantes parked (NOTE_TYPE_*, FilterChip). Evita unused
// warnings sin borrar código que el cliente puede pedir reactivar.
void NOTE_TYPE_LABEL;
void NOTE_TYPE_BADGE;
void NOTE_TYPE_DOT;
void NOTE_TYPE_PLACEHOLDER;
void FilterChip;
