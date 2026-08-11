'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MdPersonAdd, MdShield, MdShieldMoon } from 'react-icons/md';
import { api } from '@/services/database';
import Modal from '@/components/organisms/Modal';
import {
  PageHead,
  DataTable,
  FormField,
  fieldInputClass,
  type DataTableColumn,
} from '@/components/ui';
import { apiText } from '@/lib/apiText';
import type { AddFirmLawyerBody, FirmLawyer } from '@/types/api.types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = AddFirmLawyerBody;
type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
};

const validate = (form: FormState): FormErrors => {
  const errors: FormErrors = {};
  if (!form.firstName.trim()) errors.firstName = 'First name is required';
  if (!form.lastName.trim()) errors.lastName = 'Last name is required';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email';
  if (!form.phone.trim()) errors.phone = 'Phone is required';
  if (!form.password) errors.password = 'Password is required';
  else if (form.password.length < 6)
    errors.password = 'Password must be at least 6 characters';
  return errors;
};

const Members = () => {
  const [lawyers, setLawyers] = useState<FirmLawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const adminCount = useMemo(
    () => lawyers.filter((l) => l.is_firm_admin).length,
    [lawyers]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.firms.listLawyers();
    if (res.success && res.data) {
      setLawyers(res.data);
    } else {
      toast.error(apiText(res.message, 'Failed to load firm members'));
      setLawyers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setAdmin = async (lawyer: FirmLawyer, makeAdmin: boolean) => {
    setBusyId(lawyer.id);
    const res = await api.firms.setAdmin({
      lawyerId: lawyer.id,
      is_admin: makeAdmin,
    });
    setBusyId(null);
    if (res.success) {
      setLawyers((prev) =>
        prev.map((l) =>
          l.id === lawyer.id ? { ...l, is_firm_admin: makeAdmin } : l
        )
      );
      toast.success(
        makeAdmin
          ? `${lawyer.firstName} is now an administrator`
          : `${lawyer.firstName} is no longer an administrator`
      );
    } else if (res.code === 403) {
      toast.error('You can’t remove the last administrator of the firm.');
    } else {
      toast.error(apiText(res.message, 'Could not update administrator'));
    }
  };

  const closeAdd = () => {
    setAddOpen(false);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const submitAdd = async () => {
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    const res = await api.firms.addLawyer({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
    });
    setSubmitting(false);

    if (res.success && res.data) {
      toast.success(`${res.data.firstName} ${res.data.lastName} added`);
      // La lista viene id DESC → el nuevo (id mayor) va al principio.
      setLawyers((prev) => [res.data as FirmLawyer, ...prev]);
      closeAdd();
      return;
    }

    if (res.code === 409) {
      setErrors({ email: 'That email is already in use' });
      return;
    }
    toast.error(apiText(res.message, 'Could not add the lawyer'));
  };

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const columns: DataTableColumn<FirmLawyer>[] = [
    {
      key: 'lawyer',
      label: 'Lawyer',
      accessor: (r) => `${r.firstName} ${r.lastName}`,
      sortable: true,
      render: (r) => (
        <div>
          <div className='font-semibold text-slate-800'>
            {r.firstName} {r.lastName}
          </div>
          <div className='text-xs text-slate-400'>{r.email ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (r) => <span className='text-slate-600'>{r.phone || '—'}</span>,
    },
    {
      key: 'code',
      label: 'LIC',
      render: (r) => (
        <span className='font-mono text-xs text-slate-600'>{r.code}</span>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      accessor: (r) => (r.is_firm_admin ? 1 : 0),
      sortable: true,
      render: (r) =>
        r.is_firm_admin ? (
          <span className='inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700'>
            <MdShield size={13} /> Admin
          </span>
        ) : (
          <span className='inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500'>
            Member
          </span>
        ),
    },
    {
      key: 'actions',
      label: 'Admin',
      align: 'right',
      render: (r) => {
        const isLastAdmin = r.is_firm_admin && adminCount === 1;
        return r.is_firm_admin ? (
          <button
            type='button'
            disabled={busyId === r.id || isLastAdmin}
            onClick={() => setAdmin(r, false)}
            title={
              isLastAdmin
                ? 'A firm must keep at least one administrator'
                : 'Revoke administrator'
            }
            className='inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
          >
            <MdShieldMoon size={14} /> Revoke admin
          </button>
        ) : (
          <button
            type='button'
            disabled={busyId === r.id}
            onClick={() => setAdmin(r, true)}
            title='Make administrator'
            className='inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60'
          >
            <MdShield size={14} /> Make admin
          </button>
        );
      },
    },
  ];

  return (
    <div className='flex flex-col gap-6'>
      <PageHead
        eyebrow='Firm'
        title='Members'
        count={loading ? undefined : `${lawyers.length}`}
        subtitle='Lawyers that belong to your firm. Added lawyers are verified and active immediately.'
        action={
          <button
            type='button'
            onClick={() => setAddOpen(true)}
            className='inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90'
          >
            <MdPersonAdd size={16} /> Add lawyer
          </button>
        }
      />

      <Modal
        title='Add lawyer to firm'
        isOpen={addOpen}
        setIsOpen={(open: boolean) => (open ? setAddOpen(true) : closeAdd())}
        className='max-w-md'
      >
        <div className='flex flex-col gap-3'>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <FormField label='First name' htmlFor='firstName' required error={errors.firstName}>
              <input
                id='firstName'
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                className={fieldInputClass(!!errors.firstName)}
                placeholder='Jane'
              />
            </FormField>
            <FormField label='Last name' htmlFor='lastName' required error={errors.lastName}>
              <input
                id='lastName'
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
                className={fieldInputClass(!!errors.lastName)}
                placeholder='Doe'
              />
            </FormField>
          </div>
          <FormField label='Email' htmlFor='email' required error={errors.email}>
            <input
              id='email'
              type='email'
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={fieldInputClass(!!errors.email)}
              placeholder='jane.doe@example.com'
            />
          </FormField>
          <FormField label='Phone' htmlFor='phone' required error={errors.phone}>
            <input
              id='phone'
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className={fieldInputClass(!!errors.phone)}
              placeholder='+1 555 000 0000'
            />
          </FormField>
          <FormField
            label='Temporary password'
            htmlFor='password'
            required
            error={errors.password}
            hint='At least 6 characters. The lawyer can change it later.'
          >
            <input
              id='password'
              type='text'
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className={fieldInputClass(!!errors.password)}
              placeholder='••••••'
            />
          </FormField>

          <div className='mt-1 flex justify-end gap-2'>
            <button
              type='button'
              onClick={closeAdd}
              disabled={submitting}
              className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={submitAdd}
              disabled={submitting}
              className='rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60'
            >
              {submitting ? 'Adding…' : 'Add lawyer'}
            </button>
          </div>
        </div>
      </Modal>

      {loading ? (
        <p className='text-sm text-slate-400'>Loading…</p>
      ) : (
        <DataTable<FirmLawyer>
          columns={columns}
          data={lawyers}
          rowKey={(r) => r.id}
          totalLabel='members'
          pagination={{ enabled: true, initialPageSize: 10 }}
          emptyState={
            <div className='px-4 py-10 text-center text-sm text-slate-400'>
              No members yet. Add the first lawyer to your firm.
            </div>
          }
        />
      )}
    </div>
  );
};

export default Members;
