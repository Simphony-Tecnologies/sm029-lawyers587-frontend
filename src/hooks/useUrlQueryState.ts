'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Query string de la página como estado optimista (Fase 1 — filtros en la URL).
 *
 * `router.replace` no actualiza `useSearchParams` hasta que la navegación
 * termina; dos clics seguidos en los filtros leían la URL vieja y el segundo
 * borraba al primero. Aquí cada cambio se aplica al instante sobre el último
 * valor escrito y luego se refleja en la URL. Las navegaciones externas
 * (sidebar, dashboard, atrás/adelante) siguen mandando.
 */
export const useUrlQueryState = (path: string) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const spString = searchParams.toString();

  const [qs, setQs] = useState(spString);
  const qsRef = useRef(spString);
  // Query strings escritos por esta página y aún no confirmados por el router.
  const writtenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (writtenRef.current.has(spString)) {
      if (spString === qsRef.current) writtenRef.current.clear();
      return;
    }
    writtenRef.current.clear();
    qsRef.current = spString;
    setQs(spString);
  }, [spString]);

  const updateParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(qsRef.current);
      mutate(p);
      const next = p.toString();
      if (next === qsRef.current) return;
      qsRef.current = next;
      writtenRef.current.add(next);
      setQs(next);
      router.replace(next ? `${path}?${next}` : path, { scroll: false });
    },
    [router, path]
  );

  const params = useMemo(() => new URLSearchParams(qs), [qs]);
  /** Último query string escrito (sin esperar al render). */
  const getQuery = useCallback(() => qsRef.current, []);

  return { params, query: qs, updateParams, getQuery };
};
