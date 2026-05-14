'use client';
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import {
  MdClose,
  MdImage,
  MdKeyboardArrowDown,
  MdUpload,
  MdArrowForward,
} from 'react-icons/md';
import { cn } from '@/lib/cn';

export type LawyerFormMode = 'edit' | 'new';

export type LawyerStatusKey =
  | 'assignable'
  | 'capacity'
  | 'unassignable'
  | 'pending';

export interface LawyerFormSpecialtyOption {
  value: number | string;
  label: string;
}

export interface LawyerFormStats {
  total: number;
  available: number;
  active: number;
  lost: number;
  missed: number;
}

export interface LawyerFormInitialData {
  id?: number | string;
  code?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  name_of_law_firm?: string;
  notes?: string;
  profile_image_url?: string | null;
  specialtyId?: number | string | null;
  /** Multi-area: lista de service_type_id actuales del lawyer. Sobreescribe
   *  specialtyId si está presente. */
  specialtyIds?: Array<number | string>;
  extraSpecialtiesCount?: number;
  max_leads?: number;
  /** When edit mode: pre-computed stats + status used for the activity block */
  stats?: LawyerFormStats;
  status?: LawyerStatusKey;
  statusHint?: string;
  sinceLabel?: string;
}

export interface LawyerFormPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  name_of_law_firm: string;
  notes: string;
  /** Single area legacy — null si multi. Se mantiene por compat. */
  specialtyId: number | string | null;
  /** Multi-area: array de service_type_ids seleccionados. Cliente pidió
   *  recuperar esta funcionalidad que existía antes. */
  specialtyIds: number[];
  max_leads: number;
  /** Only used in 'new' mode */
  password?: string;
  /** New file selected via the avatar uploader */
  imageFile?: File | null;
}

export interface LawyerFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: LawyerFormMode;
  initial?: LawyerFormInitialData | null;
  specialties: LawyerFormSpecialtyOption[];
  onSubmit: (payload: LawyerFormPayload) => Promise<void> | void;
  onOpenPasswordUpdate?: () => void;
  loading?: boolean;
}

const initialsOf = (firstName?: string, lastName?: string) => {
  const f = (firstName ?? '').trim().charAt(0);
  const l = (lastName ?? '').trim().charAt(0);
  return (f + l).toUpperCase() || '·';
};

const formatCode = (id?: number | string, code?: string) =>
  code ?? (id !== undefined ? String(id).padStart(5, '0') : 'AUTO-GENERATED');

const STATUS_PILL: Record<
  LawyerStatusKey,
  { wrap: string; dot: string; label: string }
> = {
  assignable: {
    wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Assignable',
  },
  capacity: {
    wrap: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    label: 'At capacity',
  },
  unassignable: {
    wrap: 'bg-red-50 text-customRed border-red-200',
    dot: 'bg-customRed',
    label: 'Unassignable',
  },
  pending: {
    wrap: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'bg-slate-400',
    label: 'Pending',
  },
};

export const LawyerFormModal = ({
  open,
  onClose,
  mode,
  initial,
  specialties,
  onSubmit,
  onOpenPasswordUpdate,
  loading = false,
}: LawyerFormModalProps) => {
  const isEdit = mode === 'edit';

  // ── form state (controlled so we can reset on open) ──
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [maxLeads, setMaxLeads] = useState('');
  const [lawFirm, setLawFirm] = useState('');
  const [notes, setNotes] = useState('');
  const [password, setPassword] = useState('');
  // Multi-area: Set de service_type_ids seleccionados.
  const [specialtyIds, setSpecialtyIds] = useState<Set<number>>(new Set());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state whenever the modal opens (or the initial data changes)
  useEffect(() => {
    if (!open) return;
    setFirstName(initial?.firstName ?? '');
    setLastName(initial?.lastName ?? '');
    setEmail(initial?.email ?? '');
    setPhone(initial?.phone ?? '');
    setMaxLeads(
      initial?.max_leads !== undefined && initial.max_leads !== null
        ? String(initial.max_leads)
        : ''
    );
    setLawFirm(initial?.name_of_law_firm ?? '');
    setNotes(initial?.notes ?? '');
    setPassword('');
    // Multi-area: leer initial.specialtyIds (preferred) o caer al
    // legacy specialtyId single.
    if (Array.isArray(initial?.specialtyIds)) {
      setSpecialtyIds(
        new Set(
          (initial!.specialtyIds || [])
            .map((v) => Number(v))
            .filter((n) => Number.isFinite(n))
        )
      );
    } else if (
      initial?.specialtyId !== undefined &&
      initial?.specialtyId !== null
    ) {
      setSpecialtyIds(new Set([Number(initial.specialtyId)]));
    } else {
      setSpecialtyIds(new Set());
    }
    setImageFile(null);
    setImagePreview(initial?.profile_image_url ?? null);
  }, [open, initial]);

  const handleImagePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      // simple guard; parent can re-validate
      e.target.value = '';
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview((ev.target?.result as string) ?? null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const headerCrumb = useMemo(() => {
    if (isEdit) {
      return (
        <>
          Lawyer Management <span className='mx-1 text-slate-300'>·</span>
          <strong className='font-bold text-customRed'>
            #{formatCode(initial?.id, initial?.code)}
          </strong>
        </>
      );
    }
    return <>Lawyer Management</>;
  }, [isEdit, initial?.id, initial?.code]);

  const headerTitle = isEdit ? 'Lawyer Details' : 'New Lawyer';
  const submitLabel = isEdit ? 'Save changes' : 'Create lawyer';

  const stats = initial?.stats;
  const status = initial?.status;
  const statusHint = initial?.statusHint;
  const sinceLabel = initial?.sinceLabel;

  // Validación crítica: max_leads OBLIGATORIO >= 1 cuando hay áreas.
  // Antes el form aceptaba 0 silenciosamente → POST /lawyers-services
  // con max_leads=0 → backend rechaza CADA assign con "max exceeded"
  // porque cualquier lead lo supera. (Bug reportado en producción).
  const ids = Array.from(specialtyIds);
  const parsedMaxLeads = Number(maxLeads);
  const maxLeadsInvalid =
    ids.length > 0 &&
    (!Number.isFinite(parsedMaxLeads) || parsedMaxLeads < 1);

  const handleSubmit = async () => {
    if (loading) return;
    if (maxLeadsInvalid) return; // ya bloqueado por confirmDisabled
    await onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      name_of_law_firm: lawFirm.trim(),
      notes: notes.trim(),
      // legacy single specialty: enviamos el primero si hay alguno, null si no.
      specialtyId: ids[0] ?? null,
      // multi-area: array completo.
      specialtyIds: ids,
      max_leads: parsedMaxLeads,
      password: isEdit ? undefined : password,
      imageFile,
    });
  };

  const toggleSpecialty = (id: number) => {
    setSpecialtyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as='div'
        className='relative z-50'
        onClose={loading ? () => {} : onClose}
      >
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
            <DialogPanel className='relative flex w-full max-w-[560px] max-h-[calc(100vh-32px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(11,15,25,0.22)]'>
              <span
                aria-hidden
                className='absolute inset-x-0 top-0 z-[2] h-[3px] bg-slate-900'
              />

              {/* Header */}
              <div className='flex items-center justify-between gap-3 border-b border-slate-100 px-6 pb-4 pt-5'>
                <div className='flex min-w-0 flex-col gap-0.5'>
                  <span className='flex items-center text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500'>
                    {headerCrumb}
                  </span>
                  <DialogTitle className='text-[18px] font-extrabold leading-[1.2] tracking-[-0.02em] text-slate-900'>
                    {headerTitle}
                  </DialogTitle>
                </div>
                <button
                  type='button'
                  onClick={onClose}
                  disabled={loading}
                  className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-50'
                  aria-label='Close'
                >
                  <MdClose size={14} />
                </button>
              </div>

              {/* Body */}
              <div className='flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5'>
                {/* Image strip */}
                <ImageStrip
                  preview={imagePreview}
                  initials={initialsOf(firstName, lastName)}
                  code={formatCode(initial?.id, initial?.code)}
                  onPick={() => fileInputRef.current?.click()}
                  isEdit={isEdit}
                />
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={handleImagePick}
                />

                <FormRow>
                  <Field
                    label="Lawyer's first name"
                    required
                  >
                    <Input
                      type='text'
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder='First name'
                      disabled={loading}
                    />
                  </Field>
                  <Field label='Last name' required>
                    <Input
                      type='text'
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder='Last name'
                      disabled={loading}
                    />
                  </Field>
                </FormRow>

                <FormRow>
                  <Field label='Areas of Law'>
                    {/* Multi-area: chips toggleables. Click agrega/quita
                        del Set. El cliente reportó que la versión single-
                        select había degradado la funcionalidad original. */}
                    <div className='flex flex-wrap gap-1.5'>
                      {specialties.length === 0 ? (
                        <span className='text-[12px] text-slate-400'>
                          No areas available
                        </span>
                      ) : (
                        specialties.map((s) => {
                          const id = Number(s.value);
                          const active = specialtyIds.has(id);
                          return (
                            <button
                              key={s.value}
                              type='button'
                              onClick={() => toggleSpecialty(id)}
                              disabled={loading}
                              className={
                                'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ' +
                                (active
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
                              }
                            >
                              {active ? '✓ ' : ''}
                              {s.label}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </Field>
                  <Field
                    label={
                      ids.length > 0
                        ? 'No. Leads Allowed (per area) *'
                        : 'No. Leads Allowed (per area)'
                    }
                  >
                    <Input
                      type='number'
                      min={1}
                      value={maxLeads}
                      onChange={(e) => setMaxLeads(e.target.value)}
                      placeholder='10'
                      disabled={loading}
                    />
                    {maxLeadsInvalid ? (
                      <span className='mt-1 block text-[11px] font-semibold text-customRed'>
                        Required. Must be at least 1 — otherwise no leads
                        can be assigned to this lawyer.
                      </span>
                    ) : null}
                  </Field>
                </FormRow>

                <FormRow>
                  <Field label='Email' required>
                    <Input
                      type='email'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder='lawyer@firm.ca'
                      disabled={loading}
                    />
                  </Field>
                  <Field label='Phone Number' required>
                    <Input
                      type='tel'
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder='+1 000 000 0000'
                      disabled={loading}
                    />
                  </Field>
                </FormRow>

                <Field label='Name of Law Firm'>
                  <Input
                    type='text'
                    value={lawFirm}
                    onChange={(e) => setLawFirm(e.target.value)}
                    placeholder='Firm name'
                    disabled={loading}
                  />
                </Field>

                <Field label='Notes'>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder='Internal notes about this lawyer…'
                    disabled={loading}
                  />
                </Field>

                {isEdit ? (
                  <Field label='Password'>
                    <div className='flex items-center gap-3'>
                      <input
                        readOnly
                        type='password'
                        value='••••••••'
                        aria-label='Password (masked)'
                        className='h-10 flex-1 rounded-[9px] border-[1.5px] border-slate-200 bg-white px-3 text-[13px] font-medium tracking-[0.3em] text-slate-900 outline-none'
                      />
                      <button
                        type='button'
                        onClick={onOpenPasswordUpdate}
                        disabled={loading}
                        className='inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-slate-900 transition-colors hover:text-customRed focus:outline-none focus-visible:text-customRed'
                      >
                        Update Password
                        <MdArrowForward size={12} />
                      </button>
                    </div>
                  </Field>
                ) : (
                  <Field label='Password' required>
                    <Input
                      type='password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder='Set initial password'
                      disabled={loading}
                    />
                  </Field>
                )}

                {isEdit && stats ? (
                  <ActivityBlock
                    stats={stats}
                    status={status ?? 'assignable'}
                    statusHint={statusHint}
                    sinceLabel={sinceLabel}
                  />
                ) : null}
              </div>

              {/* Footer */}
              <div className='flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 pb-5 pt-4'>
                <button
                  type='button'
                  onClick={onClose}
                  disabled={loading}
                  className='inline-flex h-[38px] items-center rounded-[9px] border border-slate-200 bg-white px-4 text-xs font-bold tracking-[-0.005em] text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleSubmit}
                  disabled={loading || maxLeadsInvalid}
                  className='inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border border-slate-900 bg-slate-900 px-4 text-xs font-bold tracking-[-0.005em] text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700/40 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {loading ? 'Saving…' : submitLabel}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};
LawyerFormModal.displayName = 'LawyerFormModal';

// ── Internal subcomponents ─────────────────────────────────────────────────

interface ImageStripProps {
  preview: string | null;
  initials: string;
  code: string;
  isEdit: boolean;
  onPick: () => void;
}

const ImageStrip = ({
  preview,
  initials,
  code,
  isEdit,
  onPick,
}: ImageStripProps) => (
  <div className='flex items-center gap-3.5 rounded-[11px] border border-slate-200 bg-slate-50 px-4 py-3.5'>
    {preview ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={preview}
        alt='Profile preview'
        className='h-12 w-12 flex-shrink-0 rounded-[12px] object-cover'
      />
    ) : isEdit ? (
      <div
        aria-hidden
        className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[12px] text-sm font-extrabold tracking-[-0.02em] text-white'
        style={{
          background:
            'linear-gradient(135deg, #2A3142 0%, #0B0F19 100%)',
        }}
      >
        {initials}
      </div>
    ) : (
      <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[12px] border border-dashed border-slate-300 bg-white text-slate-400'>
        <MdImage size={20} />
      </div>
    )}
    <div className='flex min-w-0 flex-col gap-0.5'>
      <span className='text-[10px] font-bold uppercase tracking-[0.04em] text-slate-400'>
        CODE · {code}
      </span>
      <button
        type='button'
        onClick={onPick}
        className='inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 transition-colors hover:text-customRed focus:outline-none'
      >
        <MdUpload size={12} />
        {isEdit ? 'Change image' : 'Upload image'}
      </button>
    </div>
    <span className='ml-auto text-[11px] font-medium text-slate-500'>
      JPG, PNG · up to 2 MB
    </span>
  </div>
);

const FormRow = ({ children }: { children: ReactNode }) => (
  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>{children}</div>
);

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

const Field = ({ label, required, children }: FieldProps) => (
  <div className='flex flex-col gap-1.5'>
    <label className='inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-700'>
      {label}
      {required ? (
        <span className='font-bold text-customRed' aria-hidden>
          *
        </span>
      ) : null}
    </label>
    {children}
  </div>
);

const Input = ({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'h-10 w-full rounded-[9px] border-[1.5px] border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900 outline-none transition-colors',
      'placeholder:font-normal placeholder:text-slate-400',
      'focus:border-slate-900 focus:shadow-[0_0_0_3px_rgba(11,15,25,0.06)]',
      'disabled:cursor-not-allowed disabled:opacity-60',
      className
    )}
    {...rest}
  />
);

const Textarea = ({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      'min-h-[76px] w-full resize-y rounded-[9px] border-[1.5px] border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium leading-[1.5] text-slate-900 outline-none transition-colors',
      'placeholder:font-normal placeholder:text-slate-400',
      'focus:border-slate-900 focus:shadow-[0_0_0_3px_rgba(11,15,25,0.06)]',
      'disabled:cursor-not-allowed disabled:opacity-60',
      className
    )}
    {...rest}
  />
);

interface SelectTriggerProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  extraCount?: number;
}

const SelectTrigger = ({
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
  extraCount,
}: SelectTriggerProps) => {
  const selected = options.find((o) => o.value === value);
  const hasExtras = (extraCount ?? 0) > 0;
  return (
    <div className='relative h-10 w-full'>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'absolute inset-0 w-full cursor-pointer appearance-none rounded-[9px] border-[1.5px] border-slate-200 bg-white pl-3 pr-9 text-[13px] font-medium text-slate-900 outline-none transition-colors',
          'hover:border-slate-300 hover:bg-slate-50',
          'focus:border-slate-900 focus:shadow-[0_0_0_3px_rgba(11,15,25,0.06)]',
          'disabled:cursor-not-allowed disabled:opacity-60'
        )}
      >
        <option value=''>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className='pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-slate-400'>
        {hasExtras && selected ? (
          <span className='inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-slate-500'>
            +{extraCount}
          </span>
        ) : null}
        <MdKeyboardArrowDown size={14} />
      </div>
    </div>
  );
};

interface ActivityBlockProps {
  stats: LawyerFormStats;
  status: LawyerStatusKey;
  statusHint?: string;
  sinceLabel?: string;
}

const ActivityBlock = ({
  stats,
  status,
  statusHint,
  sinceLabel,
}: ActivityBlockProps) => {
  const pill = STATUS_PILL[status];
  const isWarning =
    status === 'unassignable' || status === 'capacity' || status === 'pending';
  return (
    <div className='flex flex-col gap-3 rounded-[11px] border border-slate-200 bg-slate-50 px-4 py-3.5'>
      <div className='flex items-center justify-between'>
        <span className='text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500'>
          Activity summary
        </span>
        {sinceLabel ? (
          <span className='inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500'>
            <span aria-hidden className='h-[6px] w-[6px] rounded-full bg-customGreen' />
            {sinceLabel}
          </span>
        ) : null}
      </div>
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-5'>
        <StatCell label='Total' value={stats.total} />
        <StatCell label='Available' value={stats.available} />
        <StatCell label='Active' value={stats.active} />
        <StatCell label='Lost' value={stats.lost} />
        <StatCell label='Missed' value={stats.missed} />
      </div>
      <div className='flex flex-wrap items-center gap-2.5 border-t border-slate-200 pt-3'>
        <span className='text-[11px] font-bold uppercase tracking-[0.04em] text-slate-500'>
          Status
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.02em]',
            pill.wrap
          )}
        >
          <span aria-hidden className={cn('h-[5px] w-[5px] rounded-full', pill.dot)} />
          {pill.label}
        </span>
        {statusHint ? (
          <span
            className={cn(
              'text-[11px] font-medium leading-[1.4]',
              isWarning ? 'font-semibold text-customRed' : 'text-slate-500'
            )}
          >
            {statusHint}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const StatCell = ({ label, value }: { label: string; value: number }) => (
  <div className='flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2'>
    <span className='text-[9px] font-bold uppercase tracking-[0.06em] text-slate-400'>
      {label}
    </span>
    <span className='text-[18px] font-extrabold leading-none tabular-nums tracking-[-0.02em] text-slate-900'>
      {value}
    </span>
  </div>
);
