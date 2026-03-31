-- Bloqueia criação de usuário fora do domínio permitido.
-- Execute no Supabase SQL Editor.
--
-- Observação: esta trigger atua em `auth.users` (cadastro via Supabase Auth).
-- Ela não substitui validações no app/middleware; é a última linha de defesa.

create or replace function public.enforce_allowed_email_domain()
returns trigger
language plpgsql
security definer
as $$
declare
  allowed_domain text := '@grupomegalife.com';
  email_lower text;
begin
  email_lower := lower(new.email);

  if email_lower is null or email_lower = '' then
    raise exception 'email_required';
  end if;

  if right(email_lower, length(allowed_domain)) <> allowed_domain then
    raise exception 'email_domain_not_allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_allowed_email_domain on auth.users;

create trigger trg_enforce_allowed_email_domain
before insert on auth.users
for each row
execute function public.enforce_allowed_email_domain();

