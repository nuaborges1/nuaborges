# Operação e recuperação do NUA Protocol

## HAGOROMO

O caminho de recuperação do PHDEV usa as contas pessoais dos provedores. Deve funcionar com o painel, suas sessões e o Supabase da aplicação indisponíveis. O monitoramento usa a sessão humana PHDEV e está disponível no pacote do painel em /monitoramento/. O procedimento emergencial usa os consoles externos.

| Componente | Caminho independente | Validação em homologação |
| --- | --- | --- |
| Cloudflare | Console externo com MFA e chave de segurança quando disponível. Manter um fator reserva e códigos de recuperação guardados separadamente da aplicação. | Entrar em navegador sem cookies da NUA. Identificar cada Pages, domínio, Worker e binding. Registrar SHA e ID de um deployment elegível para rollback. Conferir também previews e nomes pages.dev. |
| Supabase | Console externo com MFA e recuperação do próprio provedor. Registrar projeto, disponibilidade de backup e responsáveis pela restauração. | Restaurar uma cópia em projeto isolado. Validar RLS, grants, funções e amostra sintética da aplicação. Testar o acesso com MFA independentemente do painel da NUA. |
| Backblaze B2 | Console externo com MFA e chaves de aplicação restritas por bucket, prefixo e capacidades conforme a integração. | Revogar somente uma chave descartável de homologação. Confirmar continuidade das demais integrações. Verificar leitura de objeto recuperado e versões retidas. |
| Git | Conta do repositório privado com MFA e recuperação independente. | Confirmar referência remota, SHA recuperável e reprodução do build pelo procedimento de backup. |
| Mercado Pago e e-mail | Contas externas responsáveis pelas integrações, com autenticação reforçada quando oferecida. | Conferir a separação entre comercial, mensalidade e sandbox. Validar suspensão e recuperação da integração afetada. |

Registrar operador, incidente, horário, ação, ambiente e evidência sanitizada. Guardar fatores e códigos de recuperação fora do repositório, das sessões do navegador e do banco da aplicação.

O binding NUA_EMERGENCY_ACCESS_VERIFIED só deve receber true no ambiente cujo exercício foi concluído pelo PHDEV. Registros ativos permanecem em vigor nas instâncias e deploys que executam o controle. A versão escolhida para rollback precisa compreender o estado ativo ou receber proteção equivalente no provedor.

Referências [MFA da Cloudflare](https://developers.cloudflare.com/fundamentals/user-profiles/2fa/), [rollback do Pages](https://developers.cloudflare.com/pages/configuration/rollbacks/), [recuperação de conta Supabase](https://supabase.com/changelog/account-backup-sign-in), [backups Supabase](https://supabase.com/docs/guides/platform/backups) e [chaves Backblaze B2](https://www.backblaze.com/docs/en/cloud-storage-application-keys).

## Resposta e recuperação

1. **NEJI.** Abra um incidente com identificador próprio. Registre evidência verificável, superfície afetada e impacto. Consulte eventos do gateway, falhas das integrações, mudanças de versão e o resumo das filas no painel PHDEV.
2. **ITACHI.** Pause os módulos afetados nas Configurações PHDEV. Confirme a indisponibilidade do módulo e o funcionamento das demais superfícies. Verifique que pagamentos, reservas e direitos adquiridos continuam gravados.
3. **MADARA.** Acione com confirmação da senha PHDEV quando houver comprometimento da aplicação. Confirme resposta 503 nas páginas públicas atendidas pelo Pages, nas APIs normais e na mídia privada servida pela aplicação. Preserve a rota de controle e o login técnico. Recupere eventos bloqueados pela reconciliação após encerrar a contenção. Avalie separadamente recursos excluídos de Functions, caches e links emitidos por provedores.
4. **KAGUYA.** Delimite o componente afetado. A quarentena da aplicação atua nas rotas relacionadas. Pelo HAGOROMO, confirme o bloqueio no provedor se houver credencial comprometida ou acesso direto. Restrinja a integração afetada e preserve logs e backups. Ações externas críticas requerem aprovação específica. Valide o comportamento de links já emitidos.
5. **NARUTO.** O cron recupera avisos do Cofre, confirmações de pedidos e estornos a reconciliar. Cada fila limita a dez candidatos por execução, aplica espera progressiva com variação e sinaliza pendências após doze tentativas. A reconciliação de estorno consulta o provedor e conclui registros já confirmados. Essa fila fica pausada na quarentena financeira. Confira o horário e as contagens da última execução.
6. **Encerramento.** Valide a recuperação por superfície, registre a evidência e encerre somente o protocolo correspondente ao incidente. Verifique a operação em navegador independente e confira os demais controles ativos.

A classificação depende da evidência registrada pelo PHDEV. Ativação crítica automática e BARYON MODE dependem de instrumentação, recuperação comprovada e homologação próprias. O ensaio deve incluir persistência, concorrência, falha de leitura do estado e recuperação independente.

## Publicação

- Confirme o limitador de reautenticação antes de publicar. Em 26/11/2026, produção recebeu a migração isolada. Os dois projetos passaram na consulta de RLS e grants, e homologação bloqueou a sexta tentativa em transação revertida.
- Valide credenciais e bindings de homologação exclusivos, inclusive Mercado Pago Sandbox, webhook assinado, Backblaze, caixa de teste e cron. Use compras e reservas de teste.
- Valide os perfis NUA e PHDEV, o estorno parcial e a revogação de sessões em instâncias distintas. Registre respostas do gateway, resultado do provedor e efeitos persistidos.
- Confirme o backup Git remoto, a versão ativa de cada projeto e o procedimento de rollback descrito em AGENTS.md.
