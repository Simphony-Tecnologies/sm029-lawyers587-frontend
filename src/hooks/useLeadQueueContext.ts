'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/services/database';
import type { AuditEvent } from '@/types/api.types';

// Contexto de las colas "Returned to Admin" y "Flagged" del dashboard: el DTO
// del listado no trae la razón ni el abogado previo, así que se leen del audit
// log de cada lead (GET /leads/:id/history). Solo se consulta para las filas de
// esas dos colas, con concurrencia y tope acotados.

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
}

const RETURN_STATUSES = new Set(['SEND_BACK', 'LOST']);
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

// Abogado de un evento 'assign'. Cada ruta audita distinto:
// PATCH /:id/assign → new_value.assigned_lawyer; pull del pool → el actor es el
// abogado; bulk assign → solo new_value.assigned_lawyer_id (nombre al renderizar).
const assignedLawyerOf = (ev: AuditEvent): Pick<LeadQueueContext, 'by' | 'byId'> => {
  const byLawyerActor = String(ev.actor_role ?? '').toLowerCase() === 'lawyer';
  const id =
    Number(ev.new_value?.assigned_lawyer_id ?? ev.new_value?.assigned_lawyer?.id) ||
    (byLawyerActor ? Number(ev.actor_id) : 0);
  return {
    by:
      personName(ev.new_value?.assigned_lawyer) ??
      (byLawyerActor ? personName(ev.actor) : null),
    byId: id || null,
  };
};
const NO_LAWYER: Pick<LeadQueueContext, 'by' | 'byId'> = { by: null, byId: null };

// Eventos en orden DESC (el más reciente primero).
const parseReturned = (
  events: AuditEvent[],
  lead: QueueContextLead
): LeadQueueContext => {
  const returnIdx = events.findIndex(
    (ev) =>
      ev.action_type === 'unassign' ||
      (ev.action_type === 'status_change' && RETURN_STATUSES.has(newStatusOf(ev)))
  );
  const assignIdx = events.findIndex((ev) => ev.action_type === 'assign');

  // Hubo una asignación después de la última devolución auditada: la devolución
  // actual no dejó evento (p. ej. al desactivar o borrar al abogado, el BE
  // devuelve sus leads sin auditar). Se atribuye al abogado de esa asignación.
  if (returnIdx < 0 || (assignIdx >= 0 && assignIdx < returnIdx)) {
    return {
      reason: null,
      at: lead.updatedAt ?? null,
      ...(assignIdx >= 0 ? assignedLawyerOf(events[assignIdx]) : NO_LAWYER),
    };
  }

  const ev = events[returnIdx];
  // Si lo devolvió el propio abogado, él es el abogado previo. Si fue un admin,
  // se toma el abogado de la última asignación anterior a la devolución.
  const lawyer =
    String(ev.actor_role ?? '').toLowerCase() === 'lawyer'
      ? { by: personName(ev.actor), byId: Number(ev.actor_id) || null }
      : (() => {
          const assign = events.slice(returnIdx + 1).find((e) => e.action_type === 'assign');
          return assign ? assignedLawyerOf(assign) : NO_LAWYER;
        })();
  return {
    reason: ev.comment?.trim() || null,
    at: ev.timestamp ? new Date(ev.timestamp) : null,
    ...lawyer,
  };
};

// EXPIRED lo pone el cron (sin evento) o un admin a mano (status_change con
// razón). Solo cuenta un evento posterior a la última asignación.
const parseExpired = (
  events: AuditEvent[],
  lead: QueueContextLead
): LeadQueueContext => {
  const expiredIdx = events.findIndex(
    (ev) => ev.action_type === 'status_change' && newStatusOf(ev) === 'EXPIRED'
  );
  const assignIdx = events.findIndex((ev) => ev.action_type === 'assign');
  // La asignación vencida sigue en el listado (el cron no la borra).
  const lastLawyer = lead.lawyer
    ? { by: lead.lawyer, byId: null }
    : assignIdx >= 0
    ? assignedLawyerOf(events[assignIdx])
    : NO_LAWYER;
  if (expiredIdx >= 0 && (assignIdx < 0 || expiredIdx < assignIdx)) {
    const ev = events[expiredIdx];
    return {
      reason: ev.comment?.trim() || EXPIRED_REASON,
      at: ev.timestamp ? new Date(ev.timestamp) : lead.updatedAt ?? null,
      ...lastLawyer,
    };
  }
  return { reason: EXPIRED_REASON, at: lead.updatedAt ?? null, ...lastLawyer };
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

  const signature = kind
    ? leads.map((l) => cacheKey(kind, l)).join(',')
    : '';

  useEffect(() => {
    if (!kind) return;
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
          cache.current.set(
            cacheKey(kind, lead),
            kind === 'flagged'
              ? parseFlagged(events, lead)
              : lead.status === 'EXPIRED'
              ? parseExpired(events, lead)
              : parseReturned(events, lead)
          );
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
      const cached = cache.current.get(cacheKey(kind, lead));
      if (cached) return cached;
      // Mientras llega el historial, EXPIRED muestra el caso típico (cron).
      if (kind === 'returned' && lead.status === 'EXPIRED') {
        return { reason: EXPIRED_REASON, at: lead.updatedAt ?? null, by: lead.lawyer ?? null };
      }
      return undefined;
    },
    // `version` fuerza un getter nuevo cuando llegan datos del audit log.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, version]
  );

  return { getContext, loading };
}
