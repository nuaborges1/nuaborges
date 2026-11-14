# Inventário e arquitetura

## Confirmado no repositório

- Next.js 15.4.9 / React 19.2.1 / Tailwind 4 e TypeScript.
- App Router em `app/`; 16 arquivos `page`.
- Cloudflare Pages Functions em `functions/`; 77 arquivos handlers API; saídas TOML para site/admin/admingeral.
- Supabase JS no backend; schema/policies não exportados.
- SDK AWS S3 e provider Backblaze em código; bucket real não consultado.
- Stripe SDK e APIs Stripe; Mercado Pago via HTTP; Gemini e-mail SMTP e telemetria em código.
- JSON em `data/` e stores de fallback indicam caminhos locais.

## Mapa

`app`/componentes → serviços client `lib/services` → endpoints Pages Functions → middleware/auth → Supabase/store JSON → Stripe/MP/B2/Gemini/SMTP. Entrega de mídia separada usa catch-all functions. Conteúdo e acessos também dependem de arquivos exportados/headers/redirects do Cloudflare. Esta é arquitetura derivada de import/config; os deployments efetivos permanecem pendentes.

Rotas públicas observadas: home, sobre, contato, contrato, termos, privacidade, chamadas/reserva, assistir/[slug], avulsos/[slug], acervo, personalizados/pedido. Administração: /admin e /admin/[module]. API enumerada em `rg --files functions/api`; autorização em `evidence/authorization.md`.

Entidades identificadas no uso: site_content, orders, personalizados, appointments, finance/installments, contract signatures, audit, music, media, telemetry, Nua IA conversations/proposals, vault. Não equivalem a schema comprovado.

Variáveis de ambiente observadas por nomes/funções: Stripe, Mercado Pago, Supabase, B2/S3, Gemini, SMTP, admin/contract session, URL pública. Seus valores foram deliberadamente omitidos; veja `.env.example` sem copiar valores de arquivos locais.
