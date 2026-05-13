'use client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { database } from '@/services/database';
import { useAuth } from '@/store/useAuth.store';

export interface NotificationItem {
  id: number;
  is_active: boolean;
  created_at: string;
  description?: string;
  [k: string]: any;
}

/**
 * Hook central de notificaciones. Antes vivía duplicado en Header.tsx y
 * HeaderMobile.tsx con la rama admin comentada — eso rompió las
 * notificaciones del super admin en producción. Aquí restauramos las
 * dos ramas y hacemos defensive el parsing.
 *
 * - Admin: GET /notifications  (lista global)
 * - Lawyer: GET /notifications/lawyer/:id
 *
 * Cuando el backend exponga `/notifications/me`, reemplazar las ramas
 * por una sola llamada.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user || Object.keys(user).length === 0 || !user.id) return;
    const role = user?.role?.name?.toLowerCase?.() ?? '';
    const isAdmin = role === 'admin' || role === 'super admin';
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
    const unread = list
      .filter((n) => n && n.is_active === false)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
    setItems(unread);
    setCount(unread.length);
  }, [user]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Marca una notificación específica como leída (is_active = true).
  const markRead = useCallback(
    async (id: number) => {
      const res = await database.updateData(
        `${process.env.NEXT_PUBLIC_URL}/notifications/${id}`,
        { is_active: true }
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

  const markAllRead = useCallback(async () => {
    if (items.length === 0) return;
    setCount(0);
    await Promise.all(
      items.map((n) =>
        database.updateData(
          `${process.env.NEXT_PUBLIC_URL}/notifications/${n.id}`,
          { is_active: true }
        )
      )
    );
  }, [items]);

  return { items, count, loading, fetchAll, markRead, markAllRead };
}
