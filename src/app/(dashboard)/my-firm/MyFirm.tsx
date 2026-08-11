'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  MdDomain,
  MdGroups,
  MdShield,
  MdChevronRight,
} from 'react-icons/md';
import { api } from '@/services/database';
import { PageHead, EmptyStateBox } from '@/components/ui';
import { formatDate } from '@/utils/formatDate';
import { apiText } from '@/lib/apiText';
import { useFirmAccess } from '@/hooks/useFirmAccess';
import type { MyFirmResponse } from '@/types/api.types';

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) => (
  <div className='flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4'>
    <span className='flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg text-slate-500'>
      {icon}
    </span>
    <div className='min-w-0'>
      <p className='text-[11px] font-semibold uppercase tracking-wider text-slate-400'>
        {label}
      </p>
      <p className='truncate text-lg font-extrabold text-slate-900'>{value}</p>
    </div>
  </div>
);

const ManageLink = ({
  href,
  label,
  desc,
}: {
  href: string;
  label: string;
  desc: string;
}) => (
  <Link
    href={href}
    className='flex items-center justify-between gap-4 py-3 transition-colors hover:bg-slate-50'
  >
    <div>
      <p className='text-sm font-semibold text-slate-800'>{label}</p>
      <p className='text-xs text-slate-400'>{desc}</p>
    </div>
    <MdChevronRight className='shrink-0 text-slate-400' size={18} />
  </Link>
);

const MyFirm = () => {
  const { isFirmAdmin, userId } = useFirmAccess();
  const [data, setData] = useState<MyFirmResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await api.firms.me();
    if (res.success && res.data) {
      setData(res.data);
    } else {
      const msg = apiText(res.message, 'Unable to load your firm');
      setError(msg);
      toast.error(msg);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className='text-sm text-slate-400'>Loading…</p>;
  }

  if (error) {
    return <EmptyStateBox icon='!' title='Something went wrong' description={error} />;
  }

  // Edge pre-backfill: el lawyer no está ligado a ninguna firma.
  if (!data || data.firm == null) {
    return (
      <div className='flex flex-col gap-6'>
        <PageHead eyebrow='Firm' title='My Firm' />
        <EmptyStateBox
          icon={<MdDomain />}
          title='You’re not part of a firm yet'
          description='When a firm administrator adds you to a firm, its details will appear here.'
        />
      </div>
    );
  }

  const { firm, member_count, admins } = data;
  const iAmAdmin = isFirmAdmin || (userId != null && admins.includes(userId));

  return (
    <div className='flex flex-col gap-6'>
      <PageHead
        eyebrow='Firm'
        title={firm.name}
        subtitle={`Firm #${firm.id} · created ${formatDate(new Date(firm.created_at))}`}
        action={
          <span
            className={
              firm.status === 'active'
                ? 'inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700'
                : 'inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500'
            }
          >
            {firm.status === 'active' ? 'Active' : 'Merged'}
          </span>
        }
      />

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard icon={<MdGroups />} label='Members' value={member_count} />
        <StatCard icon={<MdShield />} label='Administrators' value={admins.length} />
        <StatCard
          icon={<MdDomain />}
          label='Status'
          value={firm.status === 'active' ? 'Active' : 'Merged'}
        />
      </div>

      {iAmAdmin ? (
        <div className='rounded-xl border border-slate-200 bg-white p-5'>
          <h2 className='mb-1 text-sm font-bold text-slate-900'>Manage</h2>
          <div className='flex flex-col divide-y divide-slate-100'>
            <ManageLink
              href='/my-firm/members'
              label='Members'
              desc='Add lawyers and manage administrators'
            />
            <ManageLink
              href='/my-firm/settings'
              label='Settings'
              desc='Notifications and templates'
            />
            <ManageLink
              href='/my-firm/leads'
              label='Firm Leads'
              desc='Leads assigned to any member of the firm'
            />
          </div>
        </div>
      ) : (
        <div className='rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500'>
          You have read-only access to this firm. Contact a firm administrator to
          make changes.
        </div>
      )}
    </div>
  );
};

export default MyFirm;
