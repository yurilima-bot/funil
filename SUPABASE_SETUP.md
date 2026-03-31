# Integração com Supabase - Guia de Setup

Seu projeto foi integrado com Supabase! Aqui estão os passos para configurar:

## 1️⃣ Criar conta no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "Sign Up"
3. Crie uma conta com email/GitHub

## 2️⃣ Criar um novo projeto

1. No dashboard, clique em "New project"
2. Escolha um nome e password para o database
3. Escolha a região mais próxima (ex: `us-east-1`)
4. Clique em "Create new project" (demora alguns minutos)

## 3️⃣ Executar SQL das tabelas

1. Na barra lateral, vá para **SQL Editor**
2. Clique em **New Query**
3. Cole o SQL abaixo:

```sql
-- Tabela para armazenar funis
CREATE TABLE funis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  tipo VARCHAR(100) NOT NULL,
  oferta VARCHAR(100),
  nome VARCHAR(255) NOT NULL,
  versao VARCHAR(50),
  pais VARCHAR(50) NOT NULL,
  checkout VARCHAR(100),
  status VARCHAR(50) NOT NULL,
  url TEXT,
  data_criacao DATE NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar changelog
CREATE TABLE changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(20) NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  user_email TEXT,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  fields TEXT,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX idx_funis_codigo ON funis(codigo);
CREATE INDEX idx_funis_status ON funis(status);
CREATE INDEX idx_changelog_codigo ON changelog(codigo);
CREATE INDEX idx_changelog_timestamp ON changelog(timestamp);
CREATE INDEX idx_changelog_user_email ON changelog(user_email);
```

4. Clique em **Run** (botão azul no canto inferior direito)

## 4️⃣ Obter chaves da API

1. Vá para **Settings** > **API** (na barra lateral)
2. Copie as duas chaves:
   - `Project URL` → copie a URL completa
   - `anon public` → copie a chave

## 5️⃣ Configurar arquivo .env.local

1. Abra o arquivo `.env.local` na raiz do projeto
2. Substitua os valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

**⚠️ Importante:** Nunca commite `.env.local` no Git! Adicione-o ao `.gitignore` (já deve estar lá)

## 6️⃣ Testar a conexão

1. Abra o terminal na pasta do projeto
2. Execute:

```bash
npm run dev
```

3. Acesse `http://localhost:3000`
4. Crie um novo funil (deve aparecer no Supabase)
5. Verifique em **SQL Editor** > **Tabelas** > `funis`

## 📋 O que muda agora?

✅ **Antes (localStorage):**
- Dados salvos apenas no navegador
- Perdidos ao limpar cache

✅ **Depois (Supabase):**
- Dados salvos no banco de dados online
- Acesso de qualquer dispositivo
- Histórico de alterações persistente
- Possibilidade de adicionar autenticação

## 🆘 Troubleshooting

### "Module not found: Can't resolve '@/lib/db'"
- Execute: `npm install`

### "Cannot read property 'project_url'"
- Verifique se `.env.local` está correto
- Reinicie o servidor: `npm run dev`

### "Erro ao buscar funis"
- Verifique a conexão com internet
- Confirme que as chaves do Supabase estão corretas
- Verifique se as tabelas foram criadas

## 🔐 Segurança (Próximos passos)

Para adicionar autenticação, você pode usar:
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [NextAuth.js](https://next-auth.js.org/)
- Simples: senha fixa/token na variável de ambiente

## 🔒 Restringir Auth por domínio (grupomegalife.com)

Para permitir **apenas** usuários com email `@grupomegalife.com`, execute o SQL em `supabase/auth_domain_restriction.sql` no **SQL Editor** do Supabase.

Além disso, este projeto já inclui:

- **Proxy do Next.js** (`proxy.ts`): bloqueia acesso às rotas protegidas se não houver sessão válida e se o domínio não for permitido.
- **Validação extra em Edge** (`app/api/auth/validate/route.ts`): endpoint em runtime Edge que valida token e domínio; usado pelo hook de auth no client.

## 🔐 Login com Google (Workspace)

Se seu domínio usa **Google Workspace**, você pode habilitar “Entrar com Google” no Supabase:

1. No Supabase: **Authentication → Providers → Google** → habilite.
2. Configure o **Redirect URL** do Supabase (ex.: `http://localhost:3000` e sua URL de produção).
3. No Google Cloud Console, adicione os mesmos Redirect URIs (OAuth Client).

Este projeto já inicia o OAuth com `hd=grupomegalife.com` para direcionar/restringir contas do Workspace.

---

**Precisa de ajuda?** Consulte a [documentação do Supabase](https://supabase.com/docs)
