import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_DOMAIN = '@grupomegalife.com';
const ACCESS_COOKIE = 'sb-access-token';

const PUBLIC_PATHS = new Set<string>([
  '/auth',
  '/api/auth/session',
  '/api/auth/validate',
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/favicon')) return true;
  if (pathname.startsWith('/robots.txt')) return true;
  if (pathname.startsWith('/sitemap')) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      authorization: `Bearer ${token}`,
      apikey: supabaseAnon,
    },
  });

  if (!userRes.ok) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    const res = NextResponse.redirect(url);
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete('sb-refresh-token');
    return res;
  }

  const user = (await userRes.json().catch(() => null)) as { email?: string } | null;
  const email = (user?.email || '').toLowerCase();
  if (!email.endsWith(ALLOWED_DOMAIN)) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth';
    const res = NextResponse.redirect(url);
    res.cookies.delete(ACCESS_COOKIE);
    res.cookies.delete('sb-refresh-token');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

