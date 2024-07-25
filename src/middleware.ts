import { NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';
import { database } from './services/database';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
export async function middleware(req: any) {
  const currentUser = req.cookies.get('currentUser')?.value;
  let role;

  if (currentUser) {
    const decoded = jwtDecode(currentUser);

    try {
      const res = await database.authIdRol(decoded.sub);

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
  ];
  const protectedRoutesLawyer = ['/all-leads'];

  if (role === 'admin' && currentUser && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (role === 'lawyer' && currentUser && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/all-leads', req.url));
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
