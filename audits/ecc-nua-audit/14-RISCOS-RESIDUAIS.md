# Riscos residuais e bloqueios de verificação

- Deploys ativos, commit correspondente e routes Cloudflare não foram consultados.
- Stripe/Mercado Pago: credenciais, assinatura real, contas separadas, callbacks, produtos/preços e pagamentos não verificados.
- Supabase: schema, RLS, roles, policies, constraints, índices, dados e backups não verificados; banco não acessado.
- B2/CDN: ACL, objetos, cache e links ativos não verificados.
- Usuários e operações de produção, RPO/RTO e logs não verificados.
- iPhone/Safari/Mac, acessibilidade assistiva, responsividade e qualidade visual não testados em browser.
- SEO público, headers/robots/status efetivos não foram sondados.
- Build de produção não executado por efeitos de limpeza, sincronização e execução Wrangler identificados nos scripts.
- O working tree já tinha modificações e arquivos privados/fixtures. Comparação de hash de 664 arquivos cobre conteúdo pré-existente rastreável pelo rg; alterações concorrentes podem invalidar comparações. Os únicos arquivos criados pela auditoria ficam dentro de `audits/ecc-nua-audit`.
- Lint produziu 0 erros e 5 avisos em 543 arquivos; o relatório íntegro inclui caminhos de artefatos temporários e não deve ser compartilhado externamente sem saneamento.
- Agentes encerraram ao atingirem limite de uso, deixando alguns relatórios incompletos; achados deles foram transcritos e verificáveis parcialmente. A revisão independente foi limitada.
- Instalação ECC bloqueada pelo auto-review; hooks não executados. Marketplace registrado.

Para reduzir incerteza: revisar o build atualmente servido, obter schema/policies read-only e realizar verificações não destrutivas em staging com dados sintéticos.
