import { cookies } from 'next/headers';

const ACCESS_COOKIE = 'sb-access-token';
const REFRESH_COOKIE = 'sb-refresh-token';

type Body =
  | { clear: true }
  | {
      access_token: string;
      refresh_token: string;
    };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const store = await cookies();

  if (!body) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if ('clear' in body && body.clear) {
    store.delete(ACCESS_COOKIE);
    store.delete(REFRESH_COOKIE);
    return Response.json({ ok: true });
  }

  if (!body.access_token || !body.refresh_token) {
    return Response.json({ error: 'Missing tokens' }, { status: 400 });
  }

  // Cookies httpOnly para permitir validação no servidor (middleware/edge route).
  // Em dev (http), secure=false; em produção, secure=true.
  const isProd = process.env.NODE_ENV === 'production';

  store.set(ACCESS_COOKIE, body.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  store.set(REFRESH_COOKIE, body.refresh_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  return Response.json({ ok: true });
}

