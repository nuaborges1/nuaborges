# Resumo executivo

**Estado: auditoria local estática, parcialmente concluída; produção não verificada.** O repositório aponta para `99d77c4`, branch `main`, mas já continha centenas de alterações e arquivos não rastreados antes deste trabalho. Essa condição limita atribuição e comparação de mudanças; o inventário inicial está em `evidence/git-before.txt` e hashes em `evidence/source-before.json`.

Foram identificados **3 riscos P0** em código, com reproduções isoladas sintéticas: conteúdo pago endereçado por URL pública; webhook Stripe que aceita evento sem assinatura e marca pedido como pago; e webhook Mercado Pago sem validação criptográfica quando segredo configurado, conforme análise dos handlers. O alcance em produção depende de confirmar que esses arquivos/configurações correspondem ao deploy e às rotas ativas. A recomendação é revisão imediata de exposição, sem executar os fluxos em produção.

Outros defeitos concretos incluem checkout Stripe que aceita preço do cliente e falha por variável não definida; endpoint de personalizados que retorna campos privados por ID; falha de retry após gravar marcador de idempotência antes da persistência; e inconsistências de conciliação financeira. Ver [pagamentos](03-PAGAMENTOS-FINANCEIRO.md), [segurança](02-SEGURANCA.md) e [mídias](05-MIDIAS-CONTEUDOS.md).

Ambiente: Windows 11; Codex CLI 0.166.0-alpha.5.1; Node 26.12.1; npm 11.20.0; Git 2.55.0; Next 15.4.9; React 19.2.1; TypeScript 5.9.3; Cloudflare Pages Functions presentes; Supabase, Stripe, Mercado Pago, Backblaze B2 e Gemini aparecem em código/configuração. Não foi estabelecida conectividade real.

Rotas: 16 páginas App Router observadas; 77 arquivos de handlers API (não equivalem a 77 URLs distintas; métodos dinâmicos e catch-all exigem deploy para inventário final). Matriz parcial de gateway cobre 95 combinações de handler/método e cinco papéis (475 avaliações sintéticas), sem provar permissões internas nem o roteamento Cloudflare em produção.

Verificações seguras: TypeScript `tsc --noEmit` passou; testes unitários/estáticos selecionados passaram 25/25; provas sintéticas isoladas de segurança e pagamentos em `evidence/*-results.json`. Lint inicial varreu temporários do Wrangler; a execução delimitada está registrada à parte. Build e testes de integração externa foram bloqueados para evitar mutações, conexões e operações comerciais. Nenhum pagamento, e-mail, acesso autenticado externo ou escrita em produção foi feito.

Situação agregada preliminar dos achados: P0 3, P1 pelo menos 6, com consolidação e severidades em andamento nos relatórios por domínio. Não há base para declarar a aplicação segura nem fluxos comerciais operacionais em produção. As principais pendências são deploy ativo, configurações reais de gateway/armazenamento, políticas e esquema Supabase, headers efetivos, Safari/iPhone e observabilidade.

**Próxima ordem:** (A) confirmar exposição no deploy e conter entrega de conteúdo e callbacks financeiros; (B) corrigir validação/idempotência e autoridade de preços/estados; (C) corrigir autorização e persistência; (D) executar plano de estabilização e provas em staging autorizado. Nenhuma correção foi implementada.
