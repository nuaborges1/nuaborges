# 📜 REGRAS PERMANENTES E MESTRAS DO ECOSSISTEMA NUA BORGES

Este é o documento oficial, primário e supremo de diretrizes técnicas, operacionais, de design, segurança e publicação do ecossistema NUA Borges.
**Quaisquer outros arquivos de instruções (GEMINI.md, .cursorrules, CLAUDE.md, etc.) devem estender este documento e respeitar suas regras estritamente.**

---

## 📌 HIERARQUIA DE PRIORIDADES
- **INEGOCIÁVEL:** Segurança, Privacidade, Integridade de Dados e Backup Obrigatório pré-deploy.
- **OBRIGATÓRIO:** Padrões de Design, Experiência da Cliente, Proibição de Mocks, Qualidade do Código e Validação.
- **RECOMENDADO:** Práticas de arquitetura e refatoração incremental com justificativa técnica.

---

## 1. REGRA DE OURO INEGOCIÁVEL: BACKUP ANTES DO DEPLOY
- **SEM BACKUP INTEGRAL DO CÓDIGO-FONTE CONFIRMADO DIRETO NO GIT REMOTO, SEM DEPLOY.**
- **Repositório Privado Oficial:** `https://github.com/nuaborges1/nuaborges.git` | **Remote:** `origin` | **Branch:** `nua-id`.
- **Mecanismos Obrigatórios:** `tools/enforceGitBackupGuard.mjs` & `tools/secretShield.mjs`.
- **Central de Deploy:** `C:\Users\Philippe\Desktop\Deploy_NuaBorges_antigo` (`deploy_gui.py`).
- **Aplica-se a todas as formas de publicação:** Central de Deploy Gráfica, CLI/Terminal (`npm run deploy:*`), scripts de automação ou agentes de IA.
- **Fluxo Inviolável:**
  1. Adquirir trava de concorrência global (`nua-deploy-global.lock`).
  2. Executar auditoria de segredos (Secret Shield & Gitleaks) contra vazamento de `.env`, tokens e chaves privadas.
  3. Adicionar todas as alterações do ecossistema (`git add .`).
  4. Gerar commit padronizado com timestamp em Horário de Brasília: `backup(pre-deploy): NUA Borges | YYYY-MM-DD HH:MM:SS`.
  5. Enviar para o repositório remoto (`git push origin nua-id`).
  6. Confirmar diretamente no servidor remoto via `git ls-remote --exit-code origin refs/heads/nua-id`.
  7. Somente após a confirmação remota, liberar o build e o deploy.
  8. Criar e enviar Tag Git de versão publicada (`deploy-<target>-<sha>-<timestamp>`).
- **Bloqueio Incondicional:** Qualquer falha em qualquer das etapas interrompe e aborta o deploy imediatamente.

---

## 2. PROIBIÇÃO ESTRITA DO ÍCONE `Sparkles` E IDENTIDADE VISUAL
- **Proibição Absoluta do Ícone `Sparkles`:** É TERMINANTEMENTE PROIBIDO importar ou utilizar o ícone `Sparkles` (`lucide-react` ou SVG equivalente) em qualquer arquivo do projeto. Estrelinhas/faíscas infantilizam e barateiam a marca.
- **Substitutos Contextualizados OBRIGATÓRIOS:**
  - Pedidos personalizados / fotos: `Camera`, `Film`, `Sliders`, `Crown`
  - VIP / Exclusivo: `Crown`, `Gem`, `HeartOutlineIcon`
  - Destaques / Lançamentos: `Flame`, `Zap`, `CheckCircle2`
  - Inteligência / Automação: `Brain`, `Bot`, `Cpu`
- **Identidade Visual de Luxo Editorial:** Estética minimalista, intimista e autoral.
  - Fundos escuros profundos (`#09090b`, `#0a0a0c`).
  - Paleta de destaques em tons de vinho via tokens do tema (`adm-accent`). **Rosa é proibido.**
  - Tipografia: `Playfair Display` (serifa) e `Plus Jakarta Sans` (sans-serif).
  - Bordas sutis (`border-white/[0.08]`) e ausência de containers ou gradientes exagerados.
  - Nenhuma solicitação de ajuste visual autoriza redesign completo não solicitado.

---

## 3. EXPERIÊNCIA DA CLIENTE & UX DO PAINEL ADMINISTRATIVO
- A cliente opera o painel sem conhecimento técnico avançado.
- **Linguagem simples, objetiva e humanizada.**
- **Design Mobile-First:** Compatibilidade perfeita com Safari no MacBook e iPhone.
- **Minimização de Ruído Operacional:** Configurações técnicas e testes de sistema pertencem à modal de Configurações, nunca poluindo notificações ou telas cotidianas.
- **Feedback Real e Redução de Cliques:** Respostas visuais claras e imediatas para todas as ações.

---

## 4. DESENVOLVIMENTO, QUALIDADE E PROIBIÇÃO DE MOCKS EM PRODUÇÃO
- **Investigar antes de editar:** Compreender a arquitetura existente e a causa raiz antes de modificar código.
- **Tudo deve funcionar de verdade em produção:** É TERMINANTEMENTE PROIBIDO implementar mocks, dados fictícios, botões de fachada, estatísticas inventadas, fallbacks que escondam erros reais ou integrações puramente visuais.
- Reutilizar componentes e manter uma fonte única de verdade entre Frontend, Backend e Banco de Dados.

---

## 5. SEGURANÇA, PRIVACIDADE E PROTEÇÃO DE DADOS (OWASP & LGPD)
- **Princípio do Privilégio Mínimo & RLS:** Todas as tabelas do Supabase devem possuir políticas de Row Level Security (RLS) ativas.
- **Validação Estrita no Backend:** Nenhuma regra de segurança pode depender exclusivamente de verificações do Frontend.
- **Secret Shield & Higienização de Logs:** Jamais expor senhas, tokens do Mercado Pago, JWTs ou chaves do Backblaze B2/Supabase em arquivos versionados, respostas públicas ou logs.
- **Mídias do Vault e Backblaze B2:** Acesso restrito a URLs pré-assinadas com verificação rigorosa de posse do cliente no NUA ID.

---

## 6. INTEGRIDADE OPERACIONAL DO ECOSSISTEMA
- Informações compartilhadas entre NUA ID, Cofre, Clientes, Conteúdos/Packs, Personalizados, Chamadas VIP, Financeiro, Pagamentos, Reembolsos, E-mails e Central Dev devem ser mantidas rigorosamente sincronizadas, sem criar registros duplicados ou sistemas paralelos.

---

## 7. BANCO DE DADOS E SERVIÇOS EXTERNOS
- Todas as alterações estruturais do Supabase devem ser versionadas em arquivos de migração (`supabase/migrations/`).
- É proibido sem autorização explícita: exclusão de dados de produção, reset de clientes ou pedidos, exclusão física de mídias ou desativação de RLS.

---

## 8. COMPORTAMENTO OBRIGATÓRIO DOS AGENTES DE IA
- Respeitar a intenção do usuário (modo auditoria = não editar; modo planejamento = não implementar sem autorização; modo execução = implementar sem ciclos redundantes de re-planejamento).
- Nunca declarar funcionalidades como concluídas ou deploys realizados sem confirmação real comprovada.
- Transparência total em caso de bloqueios ou pendências.

---

## 9. FISCALIZAÇÃO AUTOMATIZADA
- As regras são fiscalizadas por módulos automatizados do projeto:
  - `tools/secretShield.mjs`: varredura de segredos pré-commit.
  - `tools/enforceGitBackupGuard.mjs`: validação de backup remoto pré-deploy.
  - `npm run typecheck` & `npm run test`: validação de tipos e integridade de regressão.
