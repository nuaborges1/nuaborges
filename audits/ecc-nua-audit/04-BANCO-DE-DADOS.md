# Banco de dados e persistência

## Evidência disponível

O código implementa cliente Supabase em `functions/api/_supabaseClient.ts` e store em `functions/api/_supabaseStore.ts`; não foram encontradas migrações operacionais/schema exportado suficientes. Um SQL de base de conhecimento não define schema comercial. Sem credenciais nem acesso autorizado, nenhuma consulta ao banco foi feita. RLS, chaves, constraints, índices, backups, retenção e restauração seguem **não verificados**.

Entidades observadas no código: `site_content` (chaves publicadas/privadas), pedidos, personalizados, agendamentos, parcelas, contratos, conversas/propostas IA, vault, logs de auditoria e telemetria. Verifique referências de tabela e campos diretamente em `functions/api/_supabaseStore.ts`, `_supabaseClient.ts`, `appointments`, `payments` e `finance`. Há fallback em arquivos JSON para vários módulos; verificar qual persistência está configurada é pré-requisito para afirmar estado real.

## Achados relacionados

**NUA-DB-001 (P1):** algumas rotas tratam erro/ausência de store como sucesso, ou falha de leitura como status pago (provas sintéticas em pagamentos). Usuário pode receber confirmação sem commit. **NUA-DB-002 (P1):** marcador de webhook gravado antes de atualizar pedido impede retry após falha. **NUA-DB-003 (P1/risco):** agendamento requer unicidade transacional para evitar duas reservas do mesmo slot; fixture Map não comprova proteção real. **NUA-DB-004 (P2, não verificado):** JSON canônico inteiro pode sofrer lost update em gravações concorrentes; confirmar implementação e uso de version/ETag/transaction.

RLS e permissões não foram inferidas de chamadas server-side com service role. Confirmar cada tabela, grants e policies em export read-only antes de aprovar. Preços monetários, idempotency keys, chaves estrangeiras e cascade exigem validação de schema.

## Plano

1. Exportar schema/policies com acesso read-only autorizado.
2. Relacionar entidades e invariantes: unique provider event, order/provider ID, slot/data, estado/valor.
3. Fazer escrita concorrente e falhas apenas em staging descartável.
4. Documentar plano testado de backup e restauração.

Nenhuma migration ou operação de banco foi executada.
