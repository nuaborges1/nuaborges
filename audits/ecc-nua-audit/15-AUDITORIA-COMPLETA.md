# Auditoria técnica do ecossistema Nua Borges

**Estado: parcialmente concluída; diagnóstico exclusivamente local.** Este documento consolida conclusões e referencia evidências, sem modificar a implementação.

## Prioridades

1. **P0 mídia:** caminhos de mídia comercial não acionam proteção privada; prova local anônima 200 e cache público. Confirmar e conter no deploy.
2. **P0 Stripe:** webhook permite ausência de assinatura com segredo presente e muda pedido sintético para pago.
3. **P0 Mercado Pago:** handler precisa fail-closed e assinatura obrigatória; gateway público.
4. **P1 pagamentos:** preço controlado pelo cliente; checkout morre em `nowIso`; retry perdido, painel financeiro distorce e parcelas podem nascer pagas em falha.
5. **P1 privacidade/autorização:** handler de personalizados divulga campos privados por ID; token de contrato pode alcançar operações alheias ao escopo.

Cada P0 tem alta confiança no código/condição local e baixa certeza de exposição atual porque não se verificou o deploy. Veja [segurança](02-SEGURANCA.md), [pagamentos](03-PAGAMENTOS-FINANCEIRO.md), [persistência](04-BANCO-DE-DADOS.md) e [mídias](05-MIDIAS-CONTEUDOS.md).

## Inventário técnico

Fontes: Next/React/Tailwind, Pages Functions, S3 API de B2, Supabase client, Stripe, Mercado Pago, Gemini. Há store local JSON e arquivos de conteúdo. Detalhes: [inventário](01-INVENTARIO-ARQUITETURA.md). Páginas, admin, SEO e arquitetura: [painel](06-PAINEL-ADMINISTRATIVO.md), [site](07-SITE-PUBLICO-UI-UX.md), [SEO](08-SEO-PERFORMANCE.md), [qualidade](09-QUALIDADE-DE-CODIGO.md).

## Verificações

Typecheck PASS, lint 0 erros/5 avisos, 25 testes selecionados PASS; harnesses sintéticos registraram 8 provas comerciais e 7 cenários gateway/segurança. Isto não atesta integrações reais. [Matriz](12-MATRIZ-DE-RASTREABILIDADE.md) e [testes](10-TESTES-VERIFICACOES.md).

## Estado

Segurança: riscos críticos locais a confirmar em ambiente ativo; não declarada segura. Arquitetura: múltiplos stores e responsabilidades exigem consolidação baseada em evidências. Financeiro: não há fluxo de pagamento comprovadamente operacional; checkout reproduz falha. UI/UX/performance: análise estática parcial, sem observação em dispositivos. Código aplicação: hashes capturados antes; comparação final pendente.

## Correções

Aplicar fases A–G em [roadmap](11-PLANO-DE-CORRECOES.md) após confirmação de implantação e contenção. [Riscos residuais](14-RISCOS-RESIDUAIS.md). [Uso do ECC](13-USO-DO-ECC.md).
