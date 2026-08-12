'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdDescription, MdCheck, MdClose } from 'react-icons/md';
import { database } from '@/services/database';
import Modal from '@/components/organisms/Modal';
import { VerificationBadge } from '@/components/ui/atoms/VerificationBadge';
import { formatDate } from '@/utils/formatDate';
import type { VerificationQueueItem } from '@/types/api.types';

const Verification = () => {
  const [rows, setRows] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VerificationQueueItem | null>(
    null
  );
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await database.getPendingVerifications();
    setRows(res.success ? res.data : []);
    setLoading(false);
    if (!res.success) toast.error(res.messages || 'Failed to load queue');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const viewDocument = async (id: number) => {
    const res = await database.getLicenseDocumentUrl(id);
    if (!res.success || !res.data) {
      toast.error(res.messages || 'Document not available');
      return;
    }
    window.open(res.data, '_blank', 'noopener');
    // El object URL se libera cuando la pestaña/documento ya no lo usa.
    setTimeout(() => URL.revokeObjectURL(res.data as string), 60_000);
  };

  const approve = async (item: VerificationQueueItem) => {
    setBusyId(item.id);
    const res = await database.verifyLawyer(item.id, { action: 'verify' });
    setBusyId(null);
    if (res.success) {
      toast.success(`${item.firstName} ${item.lastName} approved`);
      setRows((prev) => prev.filter((r) => r.id !== item.id));
    } else {
      toast.error(res.messages || 'Approval failed');
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (reason.trim().length === 0) {
      toast.error('A reason is required to reject');
      return;
    }
    setBusyId(rejectTarget.id);
    const res = await database.verifyLawyer(rejectTarget.id, {
      action: 'reject',
      reason: reason.trim(),
    });
    setBusyId(null);
    if (res.success) {
      toast.success(`${rejectTarget.firstName} rejected`);
      setRows((prev) => prev.filter((r) => r.id !== rejectTarget.id));
      setRejectTarget(null);
      setReason('');
    } else {
      toast.error(res.messages || 'Rejection failed');
    }
  };

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-extrabold text-slate-900'>
          Lawyer verification
        </h1>
        <p className='text-sm text-slate-500'>
          Review license documents and approve or reject new sign-ups.
        </p>
      </div>

      <Modal
        title='Reject sign-up'
        isOpen={rejectTarget !== null}
        setIsOpen={(open: boolean) => {
          if (!open) {
            setRejectTarget(null);
            setReason('');
          }
        }}
        className='max-w-md'
      >
        <div className='flex flex-col gap-3'>
          <p className='text-sm text-slate-600'>
            Rejecting{' '}
            <span className='font-semibold'>
              {rejectTarget?.firstName} {rejectTarget?.lastName}
            </span>
            . The reason is emailed to the lawyer and stored in the audit log.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder='Reason for rejection'
            className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25'
          />
          <div className='flex justify-end gap-2'>
            <button
              type='button'
              onClick={() => {
                setRejectTarget(null);
                setReason('');
              }}
              className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={confirmReject}
              disabled={busyId === rejectTarget?.id}
              className='rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-60'
            >
              Reject
            </button>
          </div>
        </div>
      </Modal>

      {loading ? (
        <p className='text-sm text-slate-400'>Loading…</p>
      ) : rows.length === 0 ? (
        <div className='rounded-xl border border-slate-200 bg-white p-10 text-center'>
          <p className='text-sm font-semibold text-slate-700'>
            No pending verifications
          </p>
          <p className='text-xs text-slate-400'>All sign-ups are reviewed.</p>
        </div>
      ) : (
        <div className='overflow-x-auto rounded-xl border border-slate-200 bg-white'>
          <table className='w-full text-left text-sm'>
            <thead className='border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500'>
              <tr>
                <th className='px-4 py-3'>Lawyer</th>
                <th className='px-4 py-3'>Firm</th>
                <th className='px-4 py-3'>LIC</th>
                <th className='px-4 py-3'>Requested</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className='border-b border-slate-100'>
                  <td className='px-4 py-3'>
                    <div className='font-semibold text-slate-800'>
                      {item.firstName} {item.lastName}
                    </div>
                    <div className='text-xs text-slate-400'>{item.email}</div>
                  </td>
                  <td className='px-4 py-3 text-slate-600'>{item.law_firm}</td>
                  <td className='px-4 py-3 font-mono text-xs text-slate-600'>
                    {item.code}
                  </td>
                  <td className='px-4 py-3 text-slate-500'>
                    {formatDate(new Date(item.created_at))}
                  </td>
                  <td className='px-4 py-3'>
                    <VerificationBadge status={item.verification_status} />
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center justify-end gap-2'>
                      <button
                        type='button'
                        onClick={() => viewDocument(item.id)}
                        title='View document'
                        className='inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50'
                      >
                        <MdDescription /> Document
                      </button>
                      <button
                        type='button'
                        onClick={() => approve(item)}
                        disabled={busyId === item.id}
                        title='Approve'
                        className='inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-opacity-90 disabled:opacity-60'
                      >
                        <MdCheck /> Approve
                      </button>
                      <button
                        type='button'
                        onClick={() => setRejectTarget(item)}
                        disabled={busyId === item.id}
                        title='Reject'
                        className='inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60'
                      >
                        <MdClose /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Verification;
