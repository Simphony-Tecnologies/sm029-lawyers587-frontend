import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { database, loginReturnPath } from './services/database';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
// M9 — solo un 4xx del backend dice que la sesión no sirve (token vencido o
// inválido, usuario borrado). 408/429 y los 5xx, timeouts o fallos de red son
// problemas pasajeros del backend: antes también mandaban al login y el abogado
// veía la sesión "cerrada sola".
const isSessionRejected = (code: number) =>
  code >= 400 && code < 500 && code !== 408 && code !== 429;
// Límite por intento: con el backend colgado la navegación no espera los 60 s
// del límite general (dos intentos = 20 s como máximo).
const AUTH_CHECK_TIMEOUT_MS = 10000;

export async function middleware(req: any) {
  const currentUser = req.cookies.get('currentUser')?.value;
  let role;

  if (currentUser) {
    let sub: unknown;
    try {
      // jwtDecode va DENTRO del try: una cookie `currentUser` malformada no debe
      // crashear el middleware (500) — se trata como sesión inválida y redirige.
      sub = jwtDecode(currentUser).sub;
    } catch (error) {
      sub = undefined;
    }
    if (!sub) {
      role = '';
    } else {
      let res = await database.authIdRol(sub, currentUser, AUTH_CHECK_TIMEOUT_MS);
      // Un fallo pasajero se reintenta una vez antes de decidir nada.
      if (!res.success && !isSessionRejected(res.code)) {
        res = await database.authIdRol(sub, currentUser, AUTH_CHECK_TIMEOUT_MS);
      }
      if (res.success) {
        role = res.data;
      } else if (isSessionRejected(res.code)) {
        role = '';
      } else {
        // El backend sigue sin responder: no se puede saber el rol, pero la
        // sesión no es inválida. Se deja pasar sin redirigir; los permisos los
        // aplica el backend en cada llamada de la página.
        return NextResponse.next();
      }
    }
  }
  const protectedRoutesAdmin = [
    '/lawyer-management',
    '/lawyer-management/assigned-leads',
    '/lawyer-management/lost-leads',
    '/lawyer-management/reassigned-leads',
    '/lead-management',
    '/dashboard',
    '/spam-settings',
    '/notification-settings',
    '/firm-admin',
    '/chatbot-settings',
    '/audit-log',
  ];
  const protectedRoutesLawyer = [
    '/all-leads',
    '/select-lead',
    '/dash-lawyers',
    '/my-firm',
  ];

  // Fase 2 — login con regreso: sin sesión válida, el link directo a la lista
  // (p. ej. desde un email) va al login conservando el destino en `?next=`.
  const { pathname } = req.nextUrl;
  if (
    !role &&
    ['/lead-management', '/all-leads'].some(
      (base) => pathname === base || pathname.startsWith(`${base}/`)
    )
  ) {
    const search = new URLSearchParams(req.nextUrl.search);
    search.delete('_rsc');
    const query = search.toString();
    const loginURL = new URL('/', req.nextUrl.origin);
    loginURL.searchParams.set('next', query ? `${pathname}?${query}` : pathname);
    return NextResponse.redirect(loginURL.toString());
  }
  // Con sesión y un `next` válido para el rol, va ahí en vez del dashboard.
  if (currentUser && pathname === '/') {
    const next = loginReturnPath(req.nextUrl.searchParams.get('next'), role);
    if (next) return NextResponse.redirect(new URL(next, req.url));
  }

  if (role === 'admin' && currentUser && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (role === 'lawyer' && currentUser && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dash-lawyers', req.url));
  }
  if (
    (role !== 'admin' || !currentUser) &&
    protectedRoutesAdmin.some((prefix) =>
      req.nextUrl.pathname.startsWith(prefix)
    )
  ) {
    const absoluteURL = new URL('/', req.nextUrl.origin);
    return NextResponse.redirect(absoluteURL.toString());
  }
  if (
    (role !== 'lawyer' || !currentUser) &&
    protectedRoutesLawyer.some((prefix) =>
      req.nextUrl.pathname.startsWith(prefix)
    )
  ) {
    const absoluteURL = new URL('/', req.nextUrl.origin);
    return NextResponse.redirect(absoluteURL.toString());
  }
}
