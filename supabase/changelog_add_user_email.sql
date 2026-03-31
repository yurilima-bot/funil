-- Auditoria: registra o email do usuário que fez a alteração.
-- Execute no Supabase SQL Editor.

alter table public.changelog
add column if not exists user_email text;

create index if not exists idx_changelog_user_email on public.changelog(user_email);

