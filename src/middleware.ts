import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { database, loginReturnPath } from './services/database';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
export async function middleware(req: any) {
  const currentUser = req.cookies.get('currentUser')?.value;
  let role;

  if (currentUser) {
    try {
      // jwtDecode va DENTRO del try: una cookie `currentUser` malformada no debe
      // crashear el middleware (500) — se trata como sesión inválida y redirige.
      const decoded = jwtDecode(currentUser);
      const res = await database.authIdRol(decoded.sub, currentUser);

      if (!res.success) {
        throw new Error();
      }
      role = res.data;
    } catch (error) {
      role = '';
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
