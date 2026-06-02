import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/database';
import type { LeadDTO } from '@/types/api.types';

const EXPIRATION_HOURS = 48;

const isZombie = (lead: LeadDTO): boolean => {
  if (lead.status !== 'ASSIGNED') return false;
  const ts = lead.updated_at ?? lead.created_at ?? lead.entry_date;
  if (!ts) return false;
  const ageMs = Date.now() - new Date(ts).getTime();
  return ageMs > EXPIRATION_HOURS * 36e5;
};

/**
 * Detects ASSIGNED leads older than 48h and auto-unassigns them
 * to free capacity slots. Runs once per mount (deduplicated).
 * Returns a trigger function that accepts the current leads array.
 */
export function useExpiredLeadsRelease() {
  const ranRef = useRef(false);

  const releaseExpired = useCallback(
    async (leads: LeadDTO[]): Promise<number> => {
      if (ranRef.current) return 0;
      ranRef.current = true;

      const zombies = leads.filter(isZombie);
      if (zombies.length === 0) return 0;

      let released = 0;
      for (const lead of zombies) {
        const res = await api.leads.unassign(lead.id, {
          status: 'EXPIRED',
          comment: `Auto-expired: assigned for over ${EXPIRATION_HOURS}h without action`,
        });
        if (res.success) released++;
      }

      if (released > 0) {
        toast(
          `${released} expired lead${released === 1 ? '' : 's'} released back to the pool`,
          { icon: '🔄', duration: 4000 }
        );
      }

      return released;
    },
    []
  );

  const reset = useCallback(() => {
    ranRef.current = false;
  }, []);

  return { releaseExpired, reset };
}
