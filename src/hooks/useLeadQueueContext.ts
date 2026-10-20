'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/services/database';
import type { AuditEvent } from '@/types/api.types';

// Contexto de las colas "Returned to Admin" y "Flagged" del dashboard.
// Returned (obs 25): el listado ya trae el motivo y el abogado que devolvió el
// lead (return_reason / previous_lawyer), así que no se pide nada por fila.
// Flagged: el DTO no trae quién lo marcó ni la razón, así que se leen del audit
// log de cada lead (GET /leads/:id/history), con concurrencia y tope acotados.

export type LeadQueueContextKind = 'returned' | 'flagged';

export interface LeadQueueContext {
  /** Razón escrita al devolver / marcar el lead. */
  reason: string | null;
  /** Cuándo entró a la cola (devolución o flag). */
  at: Date | null;
  /** Returned: abogado previo. Flagged: quién lo marcó. */
  by: string | null;
  /** Id del abogado previo cuando el evento no trae el nombre (bulk assign): se resuelve al renderizar. */
  byId?: number | null;
}

export interface QueueContextLead {
  id: number;
  status: string;
  /** Abogado asignado según el listado (en EXPIRED es la asignación vencida). */
  lawyer?: string | null;
  updatedAt?: Date | null;
  /** Returned: motivo de la última devolución (return_reason del listado). */
  returnReason?: string | null;
  /** Returned: abogado que devolvió el lead (previous_lawyer del listado). */
  previousLawyer?: { id: number; firstName?: string | null; lastName?: string | null } | null;
}

const EXPIRED_REASON = 'Expired: no action within 48h';
const HISTORY_LIMIT = 50;
const MAX_LEADS = 200;
const CONCURRENCY = 6;

const personName = (
  person?: { firstName?: string | null; lastName?: string | null } | null
): string | null => {
  if (!person) return null;
  const name = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim();
  return name || null;
};

const newStatusOf = (ev: AuditEvent): string =>
  String(ev.new_value?.status ?? '').toUpperCase();

// Returned (obs 25): todo sale de la fila. "Desde" = updated_at (el cambio de
// status lo actualiza).
const returnedContext = (lead: QueueContextLead): LeadQueueContext => {
  // EXPIRED lo pone el cron sin evento de devolución: el motivo/abogado que el BE
  // deriva de las devoluciones serían de un ciclo anterior. La asignación vencida
  // sigue en el listado (el cron no la borra).
  if (lead.status === 'EXPIRED') {
    return { reason: EXPIRED_REASON, at: lead.updatedAt ?? null, by: lead.lawyer ?? null };
  }
  return {
    reason: lead.returnReason?.trim() || null,
    at: lead.updatedAt ?? null,
    by: personName(lead.previousLawyer),
    byId: lead.previousLawyer?.id ?? null,
  };
};

const parseFlagged = (events: AuditEvent[], lead: QueueContextLead): LeadQueueContext => {
  const ev = events.find(
    (e) => e.action_type === 'status_change' && newStatusOf(e) === 'PROBLEMATIC'
  );
  if (!ev) return { reason: null, at: lead.updatedAt ?? null, by: null };
  return {
    reason: ev.comment?.trim() || null,
    at: ev.timestamp ? new Date(ev.timestamp) : null,
    by: personName(ev.actor),
  };
};

// updated_at en la clave: si el lead sale y vuelve a entrar a la cola con el
// mismo status, se vuelve a leer su historial.
const cacheKey = (kind: LeadQueueContextKind, lead: QueueContextLead) =>
  `${kind}:${lead.id}:${lead.status}:${lead.updatedAt?.getTime() ?? ''}`;

export function useLeadQueueContext(
  kind: LeadQueueContextKind | undefined,
  leads: QueueContextLead[]
) {
  const cache = useRef(new Map<string, LeadQueueContext>());
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);

  // Solo Flagged lee el historial; Returned se resuelve con la fila.
  const signature =
    kind === 'flagged' ? leads.map((l) => cacheKey(kind, l)).join(',') : '';

  useEffect(() => {
    if (kind !== 'flagged') return;
    // Primero los que llevan más tiempo en la cola: son los que la tabla
    // muestra arriba (orden ascendente por tiempo en cola).
    const pending = leads
      .filter((l) => !cache.current.has(cacheKey(kind, l)))
      .sort(
        (a, b) => (a.updatedAt?.getTime() ?? 0) - (b.updatedAt?.getTime() ?? 0)
      )
      .slice(0, MAX_LEADS);
    if (pending.length === 0) return;

    let cancelled = false;
    let cursor = 0;
    setLoading(true);

    const worker = async () => {
      while (!cancelled && cursor < pending.length) {
        const lead = pending[cursor++];
        try {
          const res = await api.leads.history(lead.id, { limit: HISTORY_LIMIT });
          const events = res.success ? res.data?.data : null;
          // Un error no se cachea: el lead se reintenta en el próximo refresco.
          if (!Array.isArray(events)) continue;
          cache.current.set(cacheKey(kind, lead), parseFlagged(events, lead));
          // La tabla se completa a medida que llegan los historiales.
          if (!cancelled) setVersion((v) => v + 1);
        } catch {
          // Se muestra como sin dato; no bloquea al resto de la cola.
        }
      }
    };

    void Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker)
    ).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      setLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, signature]);

  const getContext = useCallback(
    (lead: QueueContextLead): LeadQueueContext | undefined => {
      if (!kind) return undefined;
      if (kind === 'returned') return returnedContext(lead);
      return cache.current.get(cacheKey(kind, lead));
    },
    // `version` fuerza un getter nuevo cuando llegan datos del audit log (Flagged).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, version]
  );

  return { getContext, loading };
}
