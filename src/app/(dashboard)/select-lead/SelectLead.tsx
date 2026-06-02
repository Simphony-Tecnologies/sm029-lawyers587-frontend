'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MdArrowForward, MdInfoOutline, MdOutbox } from 'react-icons/md';
import { api, database } from '@/services/database';
import type { LeadDTO } from '@/types/api.types';
import { useAuth } from '@/store/useAuth.store';
import useLoadingStore from '@/store/useLoadingStore';
import { useLeadsStore } from '@/store/useLead.store';
import { getNameServiceLawyer } from '@/utils/getNameServiceLawyer';
import {
  Avatar,
  ConfirmationDialog,
  DataTable,
  EmptyStateBox,
  KpiCard,
  PageHead,
  StatusPill,
  toneFromString,
  variantFromStatus,
  type ConfirmationField,
  type DataTableColumn,
  type DataTableSelection,
  type SelectionKey,
} from '@/components/ui';
import Loading from '../loading';

dayjs.extend(utc);

type PoolRow = {
  id: number;
  fullName: string;
  service: string;
  status: LeadDTO['status'];
  entry_date: Date;
};

const toRow = (lead: LeadDTO): PoolRow => ({
  id: lead.id,
  fullName: lead.fullName ?? '',
  service: lead.service ?? '',
  status: lead.status,
  entry_date: new Date(lead.entry_date ?? lead.created_at),
});

const SelectLead = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { fetchLeads } = useLeadsStore();
  const { setLoading, isLoading } = useLoadingStore();

  const [pool, setPool] = useState<PoolRow[]>([]);
  const [assignedCount, setAssignedCount] = useState(0);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<SelectionKey>>(
    new Set()
  );
  const [pulling, setPulling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lawyerServices = useMemo(
    () => getNameServiceLawyer(userDetail?.lawyersServices, services),
    [userDetail, services]
  );

  const capacityTotal = useMemo(
    () =>
      lawyerServices.reduce(
        (acc: number, curr: any) => acc + (curr.max_leads ?? 0),
        0
      ),
    [lawyerServices]
  );

  const available = Math.max(
    capacityTotal - assignedCount - selectedKeys.size,
    0
  );

  // Filtrar pool por services del lawyer — evita pulls a áreas que el backend rechaza
  const filteredPool = useMemo(() => {
    if (!lawyerServices.length) return pool;
    const names = new Set(
      lawyerServices.map((s: any) => s?.name).filter(Boolean)
    );
    if (names.size === 0) return pool;
    return pool.filter((row) => names.has(row.service));
  }, [pool, lawyerServices]);

  const fetchUserAndServices = async () => {
    if (!user?.id) return;
    const [lawyerRes, servicesRes] = await Promise.all([
      database.getLawyer(user.id),
      database.getData(`${process.env.NEXT_PUBLIC_URL}/service_types`),
    ]);
    const dto = lawyerRes?.data?.data ?? lawyerRes?.data ?? null;
    setUserDetail(dto);
    if (servicesRes.success) setServices(servicesRes.data);
  };

  const fetchAssignedCount = async () => {
    if (!user?.id) return;
    const res = await api.leads.list({
      assigned_to: Number(user.id),
      limit: 1,
    });
    if (res.success && res.data) setAssignedCount(res.data.total);
  };

  const fetchPool = async () => {
    setLoading(true);
    const res = await api.leads.pool({ limit: 100 });
    setLoading(false);
    if (!res.success || !res.data) {
      toast.error(res.message || 'Could not load lead pool');
      setPool([]);
      return;
    }
    setPool(res.data.data.map(toRow));
  };

  useEffect(() => {
    void fetchUserAndServices();
    void fetchAssignedCount();
    void fetchPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // UX-L03: abrir dialog de pre-confirmación con resumen.
  const openPullConfirm = () => {
    if (selectedKeys.size === 0) {
      toast.error('You need to select at least one lead');
      return;
    }
    if (capacityTotal - assignedCount < selectedKeys.size) {
      toast.error(
        'You have exceeded the available leads. Please remove some to continue.'
      );
      return;
    }
    setConfirmOpen(true);
  };

  const handlePull = async () => {
    setPulling(true);
    const ids = Array.from(selectedKeys).map((k) => Number(k));
    let succeeded = 0;
    const errors: string[] = [];
    for (const leadId of ids) {
      const res = await api.leads.pull({ lead_id: leadId, comment: 'Pulled from pool' });
      if (res.success) {
        succeeded++;
      } else {
        errors.push(res.message || `Lead #${leadId} failed (code ${res.code})`);
      }
    }
    setPulling(false);
    if (errors.length > 0) {
      const unique = Array.from(new Set(errors));
      toast.error(
        `Pulled ${succeeded}/${ids.length} · ${errors.length} failed: ${unique.join('; ')}`
      );
    } else {
      // UX-L10: toast con CTA para que el lawyer vea sus leads pulled.
      toast.success(
        (t) => (
          <span className='flex items-center gap-2'>
            <span>
              Pulled {succeeded} lead{succeeded === 1 ? '' : 's'} successfully
            </span>
            <button
              type='button'
              onClick={() => {
                toast.dismiss(t.id);
                router.push('/all-leads');
              }}
              className='inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-bold text-white'
            >
              View
              <MdArrowForward size={12} />
            </button>
          </span>
        ),
        { duration: 6000 }
      );
    }
    setSelectedKeys(new Set());
    setConfirmOpen(false);
    void fetchLeads();
    void fetchAssignedCount();
    void fetchPool();
  };

  // Resumen para el dialog de pre-confirmación.
  const pullPreview = useMemo(() => {
    const selected = filteredPool.filter((p) => selectedKeys.has(p.id));
    const byService: Record<string, number> = {};
    for (const lead of selected) {
      const s = lead.service || '—';
      byService[s] = (byService[s] || 0) + 1;
    }
    return {
      count: selected.length,
      byService,
      after: capacityTotal - assignedCount - selected.length,
    };
  }, [filteredPool, selectedKeys, capacityTotal, assignedCount]);

  const pullFields: ConfirmationField[] = [
    {
      label: 'Action',
      value: `Pull ${pullPreview.count} lead${
        pullPreview.count === 1 ? '' : 's'
      }`,
    },
    {
      label: 'By area of law',
      value:
        Object.entries(pullPreview.byService)
          .map(([s, n]) => `${s} (${n})`)
          .join(' · ') || '—',
    },
    {
      label: 'After pull',
      value: `${pullPreview.after} of ${capacityTotal} slots free`,
      highlight: true,
    },
  ];

  const columns: DataTableColumn<PoolRow>[] = [
    {
      key: 'id',
      label: 'ID',
      width: '80px',
      sortable: true,
      accessor: (r) => r.id,
      render: (r) => (
        <span className='font-mono text-xs text-slate-400'>
          #{String(r.id).padStart(5, '0')}
        </span>
      ),
    },
    {
      key: 'fullName',
      label: 'Lead',
      sortable: true,
      accessor: (r) => r.fullName,
      render: (r) => (
        <div className='flex items-center gap-2.5'>
          <Avatar
            initials={r.fullName.slice(0, 2).toUpperCase() || '·'}
            tone={toneFromString(r.fullName) as any}
            size='sm'
          />
          <span className='truncate text-[13px] font-bold text-slate-900'>
            {r.fullName || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'service',
      label: 'Service',
      width: '200px',
      sortable: true,
      accessor: (r) => r.service,
    },
    {
      key: 'status',
      label: 'Status',
      width: '140px',
      sortable: true,
      accessor: (r) => r.status,
      render: (r) => <StatusPill variant={variantFromStatus(r.status) as any} />,
    },
    {
      key: 'entry_date',
      label: 'Entry',
      width: '130px',
      sortable: true,
      accessor: (r) => r.entry_date,
      render: (r) => (
        <span className='text-[12px] text-slate-500'>
          {dayjs.utc(r.entry_date).local().format('MMM DD, HH:mm')}
        </span>
      ),
    },
  ];

  const selection: DataTableSelection<PoolRow> = {
    getRowKey: (r) => r.id,
    selectedKeys,
    onChange: (next) => setSelectedKeys(new Set(next)),
  };

  if (isLoading && pool.length === 0) return <Loading />;

  return (
    <div className='flex flex-col gap-5'>
      <PageHead
        eyebrow='Available pool'
        title={
          userDetail
            ? `${userDetail.firstName ?? ''} ${userDetail.lastName ?? ''}`.trim() ||
              'Select Lead'
            : 'Select Lead'
        }
        subtitle={lawyerServices
          .map((s: any) => s?.name?.replace(' Lawyer', ''))
          .filter(Boolean)
          .join(' · ')}
        action={
          <button
            type='button'
            disabled={pulling || selectedKeys.size === 0}
            onClick={openPullConfirm}
            className='inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border border-slate-900 bg-slate-900 px-3.5 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {pulling
              ? 'Pulling…'
              : selectedKeys.size > 0
                ? `Pull ${selectedKeys.size} lead${selectedKeys.size !== 1 ? 's' : ''}`
                : 'Pull leads'}
          </button>
        }
      />

      {/* UX-L04: capacity hero — el dato más relevante del lawyer.
          KpiCard reutilizado para visibilidad consistente. */}
      <div className='grid gap-3.5 sm:grid-cols-3'>
        <KpiCard
          label='Available capacity'
          period='Free slots right now'
          tone='violet'
          icon={<MdOutbox size={14} />}
          value={available}
          caption={
            <span className='text-[11px] font-medium text-slate-400'>
              of {capacityTotal || '—'} total
            </span>
          }
        />
        <KpiCard
          label='Already assigned'
          period='Active right now'
          tone='emerald'
          icon={<MdInfoOutline size={14} />}
          value={assignedCount}
          caption={
            <span className='text-[11px] font-medium text-slate-400'>
              of {capacityTotal || '—'} total
            </span>
          }
        />
        <KpiCard
          label='In the pool'
          period='Available to pull'
          tone='amber'
          icon={<MdOutbox size={14} />}
          value={filteredPool.length}
          caption={
            <span className='text-[11px] font-medium text-slate-400'>
              {selectedKeys.size > 0
                ? `${selectedKeys.size} selected`
                : 'Tap a row to select'}
            </span>
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredPool}
        rowKey={(r) => r.id}
        selection={selection}
        pagination={{
          enabled: true,
          initialPageSize: 20,
          pageSizes: [10, 25, 50],
        }}
        totalLabel='leads in pool'
        emptyState={
          <EmptyStateBox
            icon={<MdInfoOutline size={18} />}
            title='No leads available'
            description='There are no leads to assign to your service type lawyer yet. Please wait; they will be available soon.'
          />
        }
      />

      {/* UX-L03: pre-confirmación con resumen claro. Evita pulls accidentales. */}
      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => !pulling && setConfirmOpen(false)}
        title='Confirm pull'
        subtitle='These leads will move to your "My Leads" section once pulled.'
        fields={pullFields}
        notice='You will have 48 hours to act on each lead before it expires back to the pool.'
        confirmLabel={
          pulling
            ? 'Pulling…'
            : `Pull ${pullPreview.count} lead${
                pullPreview.count === 1 ? '' : 's'
              }`
        }
        loading={pulling}
        onConfirm={handlePull}
        confirmDisabled={pullPreview.count === 0}
      />
    </div>
  );
};

export default SelectLead;
