# NUA Protocol v1.0

## Primeira entrega | MINATO

O gateway de Cloudflare Pages exige uma capacidade explícita para cada política administrativa. O servidor valida a sessão, identifica o operador pelo sujeito assinado e pelo registro correspondente em admin_sessions, aplica a capacidade e, quando pertinente, delega a verificação do recurso ao handler.

| Identidade | Capacidades desta entrega |
|---|---|
| NUA | Clientes, pedidos, catálogo, conteúdo, agenda, atendimento, vendas, estorno comercial, visualização e pagamento da própria mensalidade. Autoriza e desconecta a própria conta Google do painel. |
| PHDEV | Controle técnico, auditoria, telemetria, reconciliação, diagnóstico de mídia, gestão das cobranças de manutenção, avaliações e configuração da identidade verbal experimental. |
| Monitoramento técnico | O navegador usa a sessão humana PHDEV. Credenciais de serviço seguem limitadas às automações autorizadas. |
| Cron | Autenticação de serviço para rotas de cron e reconciliação. Mutações humanas de reconciliação mantêm a verificação de origem. |
| Compradores e contrato | Sessões próprias, com autorização pelos handlers do respectivo domínio. |
| Desenvolvimento em loopback | Sessão de conveniência para o painel comercial da NUA. O perfil PHDEV exige login dedicado. O servidor Node local ainda possui handlers próprios. |

A credencial administrativa da NUA emite o sujeito nua_borges. A credencial dedicada ao PHDEV emite phdev. Sujeitos conhecidos de sessões antigas da NUA continuam válidos quando o registro durável coincide com o token. Uma sessão ausente, expirada, revogada ou cujo registro não possa ser consultado é rejeitada na API de Pages. Se o login não puder gravar o registro, devolve um erro sem emitir cookie. O logout confirma a operação no servidor antes de encerrar a sessão no painel.

Estorno comercial diferencia consulta, execução e reconciliação. A NUA confirma a própria senha e o valor antes de executar a devolução. O limite do cancelamento VIP, inclusive valor zero, é aplicado no servidor. O PHDEV pode reconciliar operações já registradas. Alterações de manutenção, contenção e revogação global de sessões exigem nova confirmação da senha PHDEV.

## Registro dos protocolos

| Protocolo | Responsabilidade | Estado nesta entrega |
|---|---|---|
| KAKASHI | Defesa da aplicação | Sessão persistida, revogação e proteção de origem da conciliação reforçadas. Demais controles dependem de validação por ambiente. |
| MINATO | Autorização | Matriz inicial aplicada no gateway de Pages, com separação da experiência administrativa. Cobertura por recurso e paridade do adaptador local ainda requerem trabalho. |
| KAKUZU | Integridade financeira | Confirmação de senha, estorno parcial VIP, reconciliação e relatório comercial com valores de origem identificada. O saldo do provedor depende de uma integração de liberações validada e aparece indisponível. |
| NEJI | Monitoramento | Registro de evidência e classificação pelo PHDEV. Indicadores das filas de recuperação no painel técnico. |
| TOBIRAMA | Engenharia | Regressões de autorização, financeiro e fluxo da conta. Migração isolada para o limitador de tentativas preparada. |
| NARUTO | Resiliência | O cron executa filas limitadas para Cofre, confirmações e estornos. Sinaliza intervenção ao atingir o limite. BARYON MODE depende de homologação própria. |
| ITACHI | Contenção seletiva | Contenção manual por módulo, revisão concorrente, evidência do incidente e aplicação no gateway. |
| MADARA | Contenção da aplicação | Controle manual no gateway, páginas públicas e mídia privada, condicionado à verificação independente de recuperação. |
| KAGUYA | Isolamento de infraestrutura | Quarentena na aplicação por componente. Isolamento efetivo no provedor exige procedimento externo. |
| HAGOROMO | Acesso técnico emergencial | Procedimento documentado. Exercício de acesso e recuperação ainda pendente nos provedores. |

ITACHI, MADARA e KAGUYA podem coexistir e são acionados conforme as evidências do incidente. O acesso emergencial HAGOROMO deve permanecer independente das sessões normais e ser comprovado antes de ativar contenções críticas.

## Verificação e publicação

O [guia de operação e recuperação](OPERATIONAL-RUNBOOKS.md) registra caminhos independentes, testes e condições de ativação.

- Em homologação, confirmar a presença da tabela admin_sessions e os segredos dedicados de NUA e PHDEV antes de testar login, consulta de sessão, logout e revogação entre instâncias.
- Exercitar as duas identidades com operações comerciais, rotas diretas, avaliações e suporte técnico. Usar pedidos sintéticos e credenciais sandbox para pagamentos.
- Verificar o domínio e as operações ainda utilizadas no console legado antes de migrar sua autenticação. Preservar a distinção entre credencial de serviço e acesso humano.
- Manter o controle de publicação existente, com backup Git anterior ao deploy e checagem dos destinos. Esta entrega local não altera os ambientes remotos.
