export const runtime = 'edge';

const ALLOWED_DOMAIN = '@grupomegalife.com';
const ACCESS_COOKIE = 'sb-access-token';

function getCookie(req: Request, name: string) {
  const header = req.headers.get('cookie') || '';
  const parts = header.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
  }
  return null;
}

export async function POST(req: Request) {
  const token = getCookie(req, ACCESS_COOKIE);
  if (!token) return Response.json({ error: 'Não autenticado' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });

  // Valida token no Supabase e obtém o usuário.
  const res = await fetch(`${url}/auth/v1/user`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  });

  if (!res.ok) {
    return Response.json({ error: 'Sessão inválida' }, { status: 401 });
  }

  const user = (await res.json().catch(() => null)) as { email?: string } | null;
  const email = user?.email || '';

  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    return Response.json({ error: 'Email não permitido' }, { status: 403 });
  }

  return Response.json({ ok: true, email });
}

