# Nua Borges — Cloudflare Cron Worker (Lembretes de Chamadas VIP)

Este Worker leve é executado automaticamente a cada **15 minutos** (`*/15 * * * *`) pela Cloudflare e aciona `POST https://nuaborges.com.br/api/cron/appointment-reminders` autenticado via `CRON_SECRET`.

## Como publicar (apenas 1 vez)

1. Gere uma chave aleatória forte (ex: 32 bytes hex) e cadastre o mesmo valor em **dois lugares**:
   - No projeto Cloudflare Pages (`nuaborges.com.br` › Settings › Environment Variables): variável secreta `CRON_SECRET`.
   - Neste Worker:
     ```bash
     cd workers/reminders-cron
     npx wrangler secret put CRON_SECRET
     ```
2. Faça o deploy do Worker:
   ```bash
   npx wrangler deploy
   ```

## Comportamento dos Lembretes
- **Dia da chamada (`day_of`)**: enviado uma única vez a partir das 07:00 (Brasília) no dia da chamada confirmada e paga.
- **1 hora antes (`one_hour_before`)**: enviado entre 15 e 75 minutos antes do horário de início.
- **Sincronização automática**: chamadas canceladas, pendentes de pagamento ou concluídas são ignoradas; chamadas reagendadas geram nova chave de deduplicação para a nova data/horário.
