# Painel administrativo

Foram localizados App Router `app/admin`, roteador `AdminModuleRouter` e 139 componentes sob `components/nua/admin` (contagem estática em evidence/frontend-metrics.json). A lista abaixo é inventário de nomes e pontos de entrada; não significa execução funcional em Safari/Mac/iPhone.

Módulos identificáveis incluem Conteúdos/Packs e biblioteca, personalizados/pedidos, chamadas/agendamentos, financeiro, mídia/galeria, informações do site e SEO, sobre, contato, redes/canais, contrato, música, assistente IA, métricas e configurações. A disponibilidade e permissões por módulo devem ser cruzadas com `app/admin/components/AdminModuleRouter.tsx` e middleware.

Achados frontend encaminhados em revisão: tela de contrato contém registros/fallbacks hardcoded; diagnóstico mostra estados positivos estáticos; gestão de foco/teclado em modais precisa auditoria completa. Fluxo de sincronização que reporta sucesso sem armazenamento está em NUA-SEC-004. Personalizados e financeiro têm defeitos de resposta/persistência detalhados em pagamentos.

Métodos seguros: inspeção de código e testes sintéticos. Não foi efetuado login externo. Critérios pendentes: iPhone/Safari, teclado, foco, botões, loading e erro, persistência após reload e compatibilidade de cada papel.
