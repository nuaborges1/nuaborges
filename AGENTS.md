# 📜 REGRAS PERMANENTES E MESTRAS DO ECOSSISTEMA NUA BORGES

Este é o documento oficial, primário e supremo de diretrizes técnicas, operacionais, de design, segurança e publicação do ecossistema NUA Borges.
**Estas instruções aplicam-se ao site público, painel administrativo, backend, APIs, integrações, banco de dados e ferramentas de publicação. Quaisquer outros arquivos de instruções (GEMINI.md, .cursorrules, CLAUDE.md, etc.) devem estender este documento e respeitar suas regras estritamente.**

---

## 📌 HIERARQUIA DE PRIORIDADES
- **INEGOCIÁVEL:** Segurança, Privacidade, Integridade de Dados, RLS e Backup Obrigatório pré-deploy.
- **OBRIGATÓRIO:** Padrões de Design, Identidade Visual, Proibição do `Sparkles`, Experiência da Cliente, Proibição de Mocks, Qualidade do Código e Validação End-to-End.
- **RECOMENDADO:** Práticas de arquitetura e refatoração incremental com justificativa técnica.

---

## 1. DESENVOLVIMENTO E ATUAÇÃO DOS AGENTES
- **Investigar antes de editar:** Investigar o funcionamento atual e a causa raiz do problema antes de alterar qualquer arquivo.
- **Respeitar os modos de atuação:**
  - Quando solicitada apenas uma auditoria ou planejamento, **NÃO modificar arquivos, dados ou configurações**.
  - Quando a implementação estiver autorizada, **executar e validar diretamente, sem ciclos desnecessários de replanejamento**.
- **Preservação de Escopo:** Preservar funcionalidades existentes e a identidade visual aprovada. Não descartar trabalho local nem alterar regras de negócio fora do escopo.
- **Reutilização:** Reutilizar componentes e serviços existentes; evitar duplicações, acervos paralelos e soluções redundantes.
- **Proibição Estrita de Mocks em Produção:** Não utilizar mocks, dados fictícios, respostas simuladas, botões inoperantes ou indicadores falsos de sucesso em produção.
- **Proibição de Hardcode:** Não hardcodar conteúdo, preços, configurações ou informações que devam ser dinâmicas. O banco de dados e os serviços responsáveis devem ser a fonte de verdade.
- **Validação Real:** Validar operações reais de ponta a ponta quando possível. Um build bem-sucedido isoladamente não comprova funcionamento integral.
- **Transparência de Resultados:** Informar testes efetivamente executados, falhas, limitações e pendências. Nunca inventar ou simular resultados.
- **Escopo de Autorização:** Autorização para editar não implica autorização para publicar em produção ou modificar dados reais do banco.

---

## 2. IDENTIDADE VISUAL E PROIBIÇÃO DE SPARKLES
- **Estética Editorial de Luxo:** Minimalista, sofisticada, intimista, luxuosa e autoral.
- **Cores da Marca:** Fundos escuros profundos, como `#09090b` e `#0a0a0c`; bordas sutis, como `border-white/[0.08]`.
- **Paleta de Acento:** Acentos em tom de vinho através dos tokens existentes, incluindo `adm-accent`. **Rosa não faz parte da identidade visual.** Preservar cores semânticas necessárias para erros, alertas e sucesso.
- **Tipografia:** `Playfair Display` (`font-serif`) e `Plus Jakarta Sans` (`font-sans`).
- **Preservação de Containers:** Preservar fundos e containers existentes ao realizar ajustes exclusivamente de paleta.
- **Escopo Visual:** Não transformar polimento visual ou reorganização pontual em redesign completo não solicitado.
- **Padronização:** Padronizar cabeçalhos, margens, paddings, alinhamentos, botões, cards e estados de interface. Reduzir espaços vazios excessivos, containers redundantes e elementos que pareçam flutuar desconectados.
- **Microinterações:** Utilizar hovers, transições e microinterações sutis; evitar gradientes e glows exagerados.

### 🚫 Proibição Estrita do Ícone `Sparkles`
É TERMINANTEMENTE PROIBIDO importar ou utilizar o ícone `Sparkles`, seja de `lucide-react` ou de qualquer outra biblioteca, inclusive equivalentes decorativos de faíscas e estrelinhas em SVG. Faíscas/estrelinhas infantilizam e barateiam a sofisticação da marca.

**Substitutos Contextualizados Obrigatórios:**
| Contexto | Ícones Autorizados |
| :--- | :--- |
| **Personalizados / Pedidos** | `Camera`, `Film`, `Sliders`, `Crown` |
| **VIP e Exclusividade** | `Crown`, `Gem`, `HeartOutlineIcon` |
| **Destaques e Lançamentos** | `Flame`, `Zap`, `CheckCircle2` |
| **IA e Automação** | `Brain`, `Bot`, `Cpu` |

---

## 3. EXPERIÊNCIA DO PAINEL ADMINISTRATIVO
- **Linguagem Acessível:** A cliente não deve precisar de conhecimento técnico para operar o painel. Usar português simples, ações claras, ajuda contextual e feedback compreensível.
- **Design Mobile-First:** Priorizar mobile-first, acessibilidade e compatibilidade perfeita com Safari no MacBook e iPhone.
- **Coerência e Navegação:** Manter módulos e páginas coerentes entre si, com navegação clara e sem excesso de subdivisões.
- **Modais e Páginas:** Preferir páginas completas para fluxos complexos; reservar modais para ações pontuais. Modais e dropdowns devem ser limpos, previsíveis e responsivos.
- **Isolamento Técnico:** Configurações e testes técnicos pertencem às configurações, não às listas operacionais ou dropdowns de notificações.
- **Preservação do Sidebar:** Preservar o acesso à Mensalidade do site. **Não reintroduzir no sidebar os itens removidos a pedido da cliente**, como *Divulgação e Google* e *Acessos e senhas*.
- **Fluxos Rascunho vs. Publicação:** Nos fluxos de edição de conteúdo que utilizam rascunho e publicação, manter a distinção entre salvar e publicar. Bloquear publicação de alterações ainda não salvas e apresentar indicador de alterações pendentes sem interferir no trabalho.
- **Ajuda Contextual:** Disponibilizar ajuda contextual simples por módulo, conforme o padrão de tour e botão de ajuda definido para o painel.

---

## 4. SITE PÚBLICO E CONTEÚDO
- **Apresentação Institucional:** Manter o site público sem conteúdo explícito, voltado à apresentação, galeria, conteúdos próprios e chamadas VIP.
- **Navegação Minimalista:** Preservar a identidade da marca e uma navegação pública minimalista, sem elementos desnecessários.
- **SEO & Metadados:** Manter SEO, metadados Open Graph e dados estruturados coerentes com o conteúdo real.
- **Packs e Prévias:** Packs devem ter slugs consistentes, prévias protegidas conforme a configuração e miniaturas corretas. Detectar duração de vídeos automaticamente quando aplicável.
- **Regras do Acervo:** **Não exibir preço no Acervo sob demanda**, conforme a regra definida para essa vitrine.
- **Recursos BETA:** Player e IA em BETA não devem ser ativados em produção sem autorização explícita.

---

## 5. BIBLIOTECA DE MÍDIAS E UPLOADS
- **Biblioteca Centralizada:** Biblioteca centralizada e integrada aos seletores de mídia, galerias, packs e demais módulos. Não criar acervos paralelos ou duplicações desnecessárias.
- **Álbuns Visuais:** Usar álbuns visuais e permitir selecionar ou criar um álbum durante o upload.
- **Clareza de Uso:** Manter clara a diferença entre gerenciar o acervo e selecionar arquivos para uso em outro módulo.
- **Uploads Reais:** Permitir upload e seleção de mídias reais, com feedback de progresso e erros reais.
- **Otimização de Miniaturas:** Utilizar miniaturas otimizadas nas listagens, inclusive para vídeos, evitando carregar arquivos originais completos desnecessariamente.
- **Deduplicação e Vínculos:** Aplicar deduplicação por hash e preservar os vínculos existentes entre arquivos e conteúdos.
- **Proteção do Backblaze B2:** Não excluir fisicamente objetos do Backblaze B2 enquanto estiverem referenciados por conteúdos ou outros registros.
- **Segurança de URLs:** Não expor mídias privadas em URLs públicas ou caches inadequados.

---

## 6. CHAMADAS VIP
- **Modalidades e Duração:** Modalidades de duração definidas: **10, 15 e 60 minutos**, com preços administráveis.
- **Janela da Agenda:** Agenda limitada inicialmente a três meses, com período configurável pela cliente. Não apresentar calendário infinito.
- **Gestão de Horários:** Permitir abrir e fechar meses, bloquear dias de folga e gerenciar horários individualmente.
- **Sincronização:** Disponibilidade e Calendário devem compartilhar as mesmas regras e dados.
- **Múltiplas Chamadas:** Permitir múltiplas chamadas no mesmo dia sem bloquear o dia inteiro por uma única reserva. Exibir horários ainda disponíveis no dia atual, quando elegíveis.
- **Fluxo Público:** Modalidade, data, horário, pagamento e confirmação por e-mail.
- **Validação Backend:** Validar disponibilidade, preço e reserva no backend, evitando sobreposição e duplicidade.
- **Tratamento de Cancelamentos:** Cancelamentos pela criadora devem permitir motivo e tratamento seguro do estorno quando aplicável.
- **Simplicidade Operacional:** Manter a gestão simples, sem a necessidade de categorias artificiais como dias especiais.

---

## 7. NUA ID, CLIENTES E COFRE
- **Natureza Privada da Conta:** O sistema de contas é privado, destinado a compras, histórico e entregas; **não é uma rede social ou comunidade**.
- **Visão Única do Cliente:** Centralizar a visão operacional do cliente, relacionando pedidos, reservas, pagamentos, personalizados, entregas, acessos e atendimento sem duplicar registros.
- **Canal Oficial de Entrega:** O Cofre é o canal oficial de entrega dos conteúdos adquiridos. **Telegram não integra o fluxo de entrega aprovado.**
- **Acesso Transacional:** Após compra de Pack ou liberação de Personalizado, enviar e-mail transacional com acesso direto ao Cofre.
- **Validação de Posse no Backend:** Validar identidade e propriedade do conteúdo no backend. Não liberar acesso apenas com dados fornecidos pelo frontend.
- **Política de Sessão e Navegador:** Preservar o fluxo de autorização do navegador: primeiro acesso validado por e-mail, navegador autorizado por período definido e nova autorização ao utilizar navegador não reconhecido, conforme a política de sessão vigente.
- **Expiração de Sessões:** Respeitar a expiração de sessões e links temporários. O reconhecimento do navegador não deve substituir a autorização do servidor.
- **Códigos de Acesso Pós-Compra:** Proteger links e mídias contra reutilização indevida. Não apresentar antecipadamente códigos de acesso que só devem ser disponibilizados após a compra.
- **Proteção Real de Conteúdo:** Não tratar bloqueios de clique direito, download ou ferramentas do navegador como garantia exclusiva de proteção do conteúdo.

---

## 8. PAGAMENTOS E E-MAILS
- **Provedor Mercado Pago:** Mercado Pago é a integração de pagamento definida para os fluxos de clientes. **Não migrar para outro provedor sem autorização.**
- **Separação de Mensalidade:** A cobrança da mensalidade do site é separada das operações financeiras da cliente.
- **Validação Financeira:** Validar valores, status, identificação dos pedidos e permissões no backend.
- **Webhooks e Idempotência:** Verificar autenticidade dos webhooks e garantir idempotência, inclusive em pagamentos e estornos. Nunca liberar conteúdo exclusivamente com base em confirmação fornecida pelo navegador.
- **E-mails Transacionais Reais:** E-mails transacionais devem ser enviados de verdade, com validação no backend e tratamento de falhas.
- **Independência das Caixas de E-mail:** As caixas Hostinger e Yahoo devem permanecer independentes, sem misturar mensagens, pastas ou credenciais.
- **Funcionalidade da Caixa Integrada:** A caixa de e-mail integrada deve ser funcional: leitura, resposta, anexos, pastas e sincronização conforme os recursos implementados. Não esconder erros de conexão ou envio atrás de mensagens falsas de sucesso.

---

## 9. IA NAY
- **Nome Oficial:** O nome aprovado é **Nay**, não NUAIA.
- **Escopo de Atuação:** Sua função é de secretária e apoio em educação sexual, organização e textos curtos, dentro do escopo definido.
- **Limitações de Saúde:** Não oferecer diagnóstico médico nem substituir profissionais de saúde. Orientar a busca de atendimento profissional em situações de risco.
- **Privacidade de Dados:** Não conceder acesso desnecessário a dados sensíveis nem transformar a ferramenta em assistente generalista sem autorização.
- **Confiabilidade:** Utilizar fontes confiáveis e não inventar informações.
- **Isolamento de Recursos:** Manter as funcionalidades BETA restritas ao ambiente autorizado.

---

## 10. SEGURANÇA, PRIVACIDADE E DADOS (OWASP & LGPD)
- **Privilégio Mínimo & RLS:** Aplicar privilégio mínimo, autorização por recurso, validação no servidor e práticas pertinentes do OWASP e da LGPD.
- **Proteção de Superfície:** Proteger sessões administrativas, APIs, webhooks e operações críticas contra acessos indevidos, CSRF, XSS, injeções e abuso.
- **Secret Shield & Higienização:** Não armazenar segredos em código, bundles públicos, logs, documentação ou arquivos versionados.
- **Preservação do Supabase:** Preservar políticas RLS e permissões do Supabase; **não desativá-las para contornar problemas**.
- **Migrações Obrigatórias:** Versionar alterações estruturais do banco em migrações (`supabase/migrations/`). Não realizar exclusões, resets ou migrações destrutivas sem autorização explícita e escopo definido.
- **Proteção de Dados do Cliente:** Proteger dados pessoais de clientes e conteúdos privados. Higienizar logs e mensagens técnicas.
- **Arquitetura Vigente:** Preservar a arquitetura vigente: **Cloudflare Pages/Functions**, **Supabase PostgreSQL** e **Backblaze B2 para mídia**. Não reintroduzir serviços substituídos ou migrar infraestrutura sem autorização.

---

## 11. REGRA DE OURO INEGOCIÁVEL: BACKUP GIT ANTES DO DEPLOY
**SEM BACKUP INTEGRAL, SEGURO E CONFIRMADO DIRETAMENTE NO GIT REMOTO, SEM DEPLOY.**

- **Repositório Privado Oficial:** `https://github.com/nuaborges1/nuaborges.git`
- **Remote:** `origin` | **Branch:** `nua-id`
- **Projeto Real:** `C:\Users\Philippe\Desktop\nuaborges\nuasite`
- **Central de Deploy:** `C:\Users\Philippe\Desktop\Deploy_NuaBorges_antigo`
- **Módulo Centralizador:** `tools/enforceGitBackupGuard.mjs`

A regra vale para produção, homologação, GUI, terminal, scripts oficiais, automações e agentes. Mesmo quando apenas o admin ou site público for publicado, o backup deve abranger **todo o código-fonte versionável do ecossistema NUA Borges**.

### 🔄 Fluxo Obrigatório
1. Adquirir trava global contra concorrência (`nua-deploy-global.lock`) e identificar a raiz real do repositório.
2. Validar branch, remote, privacidade do repositório e divergências com o remoto.
3. Auditar arquivos rastreados, não rastreados, ignorados indevidamente e commits locais ainda não enviados.
4. Executar **Secret Shield e Gitleaks**; verificar também os arquivos efetivamente preparados para commit. Falhas ou indisponibilidade das ferramentas bloqueiam a publicação.
5. Preparar todas as alterações versionáveis a partir da raiz, incluindo exclusões, sem enviar segredos ou dados privados.
6. Criar commit quando necessário, com mensagem `backup(pre-deploy): NUA Borges | YYYY-MM-DD HH:mm:ss`, no fuso `America/Sao_Paulo`. Não criar commits vazios desnecessários.
7. Executar `git push origin nua-id` e confirmar diretamente o SHA remoto com `git ls-remote --exit-code origin refs/heads/nua-id`, comparando-o ao SHA local esperado. Referências locais não bastam.
8. Realizar build e validações a partir de snapshot isolado do commit confirmado, preferencialmente com `git worktree`.
9. Autorizar publicação somente após todas as etapas anteriores terem sido aprovadas.
10. Registrar SHA, ambiente, identificador real do deployment Cloudflare e resultados por destino. HTTP 200 isoladamente não comprova a publicação correta.
11. Criar e enviar tags Git das publicações bem-sucedidas (`deploy-<target>-<sha>-<timestamp>`). Registrar separadamente falhas posteriores ao deploy, sem ocultar publicações parciais.

### ⛔ Restrições do Deploy
- **Sem Duplicação de Lógica:** A GUI Python deve consumir o mecanismo centralizado `tools/enforceGitBackupGuard.mjs`.
- **Backup Manual Acessível:** Disponibilizar a ação independente *Fazer backup agora*, sem iniciar deploy.
- **Proibido Bypasses:** Não criar atalhos para ignorar o backup, mesmo em situações urgentes.
- **Segredos Fora do Git:** Não versionar `.env` reais, credenciais de staging ou produção, chaves privadas, dados de clientes, dumps confidenciais, mídias privadas ou dependências reinstaláveis.
- **Inspeção Além do `.gitignore`:** O `.gitignore` não basta: verificar arquivos previamente rastreados e o histórico acessível em auditorias de segurança.
- **Higienização de Logs:** Não expor valores de segredos em logs. Em caso de exposição, indicar a necessidade de revogação/rotação sem reescrever o histórico automaticamente.
- **Sem Comandos Destrutivos:** Não utilizar force push, reset destrutivo, exclusão automática de trabalho ou resolução de conflitos com descarte de código sem autorização explícita.
- **Limites do Git:** Git protege o código-fonte, mas não substitui backups independentes do Supabase, Backblaze B2 e configurações externas.

---

## 12. VALIDAÇÃO E CONCLUSÃO
- Executar, conforme o impacto da tarefa, `typecheck`, `lint`, `build`, testes de integração, testes de ponta a ponta, verificações de segurança, persistência, permissões, responsividade e regressões.
- Verificar também conformidade visual e **ausência de novos usos de `Sparkles`**.
- Priorizar a **fiscalização automatizada** das regras críticas pelos mecanismos já existentes no projeto, especialmente segurança (`secretShield.mjs`) e backup pré-deploy (`enforceGitBackupGuard.mjs`).
- **Proibido Deploy para Testes:** Não realizar publicação em produção apenas para testar uma implementação sem autorização.
- **Relatório Transparente:** Ao finalizar, informar alterações, arquivos envolvidos, testes e resultados reais, pendências e situação do backup/deploy quando aplicável.
