# Placeali — mapa de restaurantes de Uberlândia

Mapa com os restaurantes, uma página por estabelecimento (indexável pelo Google) e um painel `/admin`
para criar e gerenciar os restaurantes.

**Stack:** TanStack Start (React 19) · Supabase (Postgres + Auth) · MapLibre · Tailwind v4 · Nitro · deploy na Vercel

## Rodar

```bash
bun install        # atualiza o bun.lock (dependências não usadas foram removidas)
bun run dev
```

Variáveis em `.env`: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (a chave publishable é pública).
Nenhuma chave secreta é necessária — o app não usa a service role.

## Banco (Supabase)

- **Projeto novo:** aplique `supabase/migrations/20260513180000_schema.sql`.
- **Banco que já existe:** faça backup e rode `supabase/optional/cleanup_existing_db.sql`
  (apaga `analytics_events`, `restaurants_osm` e as colunas extras; cria o `slug`).

## Criar o administrador (obrigatório para segurança)

1. Supabase → Authentication → Providers → Email: **desligue "Allow new users to sign up"**.
2. Authentication → Users → *Add user* (e-mail e senha).
3. SQL Editor:
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'seu@email.com';
   ```

Só quem está em `user_roles` com papel `admin` consegue criar, editar ou excluir restaurantes (RLS).
Qualquer visitante só lê.

## Deploy na Vercel

1. Vercel → *Add New → Project* → importe este repositório.
2. Framework Preset: **TanStack Start** (ou deixe a detecção automática). Build Command: `bun run build` (ou `npm run build`). Não precisa de `vercel.json`.
3. Environment Variables (Production e Preview), copiando de `.env.example`:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
4. Deploy. Depois, no Supabase → Authentication → URL Configuration, adicione o domínio da Vercel em *Site URL* / *Redirect URLs*.

O build usa o plugin do Nitro (`vite.config.ts`), que gera a saída no formato da Vercel.

## Métricas e bots (sem código)

- Visitas por região: ative o **Vercel Web Analytics** (Analytics na aba do projeto) ou o Cloudflare Web Analytics se o domínio passar pela Cloudflare.
- Bots: use o **Vercel Firewall** (Security → Firewall) para desafiar tráfego fora do Brasil **liberando os bots de busca** (Googlebot etc.) e ative rate limiting.
