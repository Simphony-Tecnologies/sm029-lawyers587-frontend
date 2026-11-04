'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';

export interface NotificationItem {
  id: number;
  is_active: boolean;
  /** Estado de lectura del backend: null = sin leer. */
  read_at?: string | null;
  /** Recordatorios: el aviso cuenta como recibido a esta hora. */
  scheduled_at?: string | null;
  /** Derivado de `read_at` para el punto de no leído de la campana. */
  seen?: boolean;
  created_at: string;
  description?: string;
  [k: string]: any;
}

// La campana muestra los últimos avisos, leídos o no, para conservar el historial.
const BELL_LIMIT = 30;
// Con la pestaña visible se refresca cada minuto: un recordatorio que vence con
// la página abierta aparece sin recargar.
const BELL_POLL_MS = 60000;
// Estados del backend que no son un aviso para el usuario: duplicado de otro
// ya enviado, o un tipo que el abogado desactivó en sus preferencias.
const HIDDEN_STATUSES = new Set(['DEDUPLICATED', 'SKIPPED_PREFERENCE']);

const arrivedAt = (n: NotificationItem) =>
  new Date(n.scheduled_at ?? n.created_at).getTime();

/**
 * Hook central de notificaciones. Antes vivía duplicado en Header.tsx y
 * HeaderMobile.tsx con la rama admin comentada — eso rompió las
 * notificaciones del super admin en producción. Aquí restauramos las
 * dos ramas y hacemos defensive el parsing.
 *
 * - Admin: GET /notifications · Lawyer: GET /notifications/lawyer/:id. Los dos
 *   devuelven solo los avisos propios (findByLawyer en el backend).
 * - Sin leer = `read_at` vacío; se marca con PATCH /notifications/:id/read.
 *   El backend crea todo con `is_active: true`: filtrar por `is_active` dejaba
 *   la campana siempre vacía (obs 3 nov).
 * - Un recordatorio no aparece antes de su `scheduled_at`.
 *
 * Cuando el backend exponga `/notifications/me`, reemplazar las ramas
 * por una sola llamada.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const role = user?.role?.name?.toLowerCase?.() ?? '';
  const isAdmin = role === 'admin' || role === 'super admin';

  const fetchAll = useCallback(async () => {
    if (!user || Object.keys(user).length === 0 || !user.id) return;
    const url = isAdmin
      ? `${process.env.NEXT_PUBLIC_URL}/notifications`
      : `${process.env.NEXT_PUBLIC_URL}/notifications/lawyer/${user.id}`;

    setLoading(true);
    const res = await database.fetchData(url);
    setLoading(false);

    if (!res.success) {
      // No spammeamos toast al usuario por un fetch en background; el
      // bell simplemente queda en 0. Solo log a consola para debug.
      console.error('[notifications] fetch failed', res.messages);
      setItems([]);
      setCount(0);
      return;
    }
    // Defensive: el backend puede devolver { data: [...] } o un array
    // directo dependiendo de la ruta y la convención. Cubrimos ambos.
    const raw: any = res.data;
    const list: NotificationItem[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data
      : [];
    const now = Date.now();
    const recent = list
      .filter(
        (n) =>
          n &&
          !HIDDEN_STATUSES.has(String(n.status ?? '')) &&
          Number.isFinite(arrivedAt(n)) &&
          arrivedAt(n) <= now
      )
      .sort((a, b) => arrivedAt(b) - arrivedAt(a))
      .slice(0, BELL_LIMIT)
      .map((n) => ({ ...n, seen: !!n.read_at }));
    setItems(recent);
    setCount(recent.filter((n) => !n.seen).length);
  }, [user, isAdmin]);

  useEffect(() => {
    void fetchAll();
    const refresh = () => {
      if (!document.hidden) void fetchAll();
    };
    const interval = setInterval(refresh, BELL_POLL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [fetchAll]);

  // Marca una notificación específica como leída.
  const markRead = useCallback(
    async (id: number) => {
      const res = await database.patchData(
        `${process.env.NEXT_PUBLIC_URL}/notifications/${id}/read`,
        {}
      );
      if (!res.success) {
        toast.error('Could not mark notification as read');
        return false;
      }
      await fetchAll();
      return true;
    },
    [fetchAll]
  );

  // Al abrir la campana: solo los avisos que se ven. POST /notifications/read-all
  // marcaría también los recordatorios que todavía no llegan a su hora.
  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => !n.seen);
    if (unread.length === 0) return;
    setCount(0);
    await Promise.all(
      unread.map((n) =>
        database.patchData(
          `${process.env.NEXT_PUBLIC_URL}/notifications/${n.id}/read`,
          {}
        )
      )
    );
  }, [items]);

  return { items, count, loading, fetchAll, markRead, markAllRead };
}
