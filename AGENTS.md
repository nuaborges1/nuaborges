# Regras Gerais do Repositório — Nua Borges

## 1. Proibição Estrita de Ícones `Sparkles`
- É TERMINANTEMENTE PROIBIDO importar ou utilizar o ícone `Sparkles` (`lucide-react` ou qualquer outra biblioteca).
- O design de Nua Borges é minimalista, luxuoso e autoral, com fundos escuros e acentos em tons de vinho definidos pelos tokens da interface. Rosa não faz parte da paleta atual. Ícones de faísca/estrelinhas barateiam e infantilizam a estética da marca.
- Substitutos obrigatórios conforme o contexto:
  - Personalizados / Pedidos sob medida: `Camera`, `Film`, `Sliders` ou `Crown`
  - VIP / Exclusividade: `Crown`, `Gem` ou `HeartOutlineIcon`
  - Destaques / Lançamentos: `Flame`, `Zap`, `CheckCircle2`
  - Inteligência / Automação: `Brain`, `Bot`, `Cpu`

## 2. Padrões de Design e UX
- Manter fundos escuros profundos (`#09090b`, `#0a0a0c`), tipografia refinada (`font-serif` Playfair Display, `font-sans` Plus Jakarta Sans), bordas sutis (`border-white/[0.08]`) e acentos em tons de vinho via tokens do tema (`adm-accent`). Preservar fundos e containers existentes ao ajustar a paleta.
- Modais e dropdowns devem ser limpos, objetivos e de alta fidelidade visual.
- Configurações e testes de sistema pertencem à tela/modal de Configurações, nunca poluindo listas operacionais ou dropdowns de notificações.

## 3. REGRA PERMANENTE E INEGOCIÁVEL DE BACKUP ANTES DO DEPLOY
- **SEM BACKUP INTEGRAL DO CÓDIGO-FONTE CONFIRMADO NO GIT REMOTO, SEM DEPLOY.**
- É estritamente proibido realizar qualquer publicação em produção ou homologação sem que **todo o ecossistema versionável NUA Borges** (site público, painel administrativo, APIs, Cloudflare Functions, migrações Supabase, documentação e componentes) esteja commitado e enviado ao repositório remoto privado `https://github.com/nuaborges1/nuaborges.git` na branch `nua-id`.
- Esta regra aplica-se permanentemente a **todas as formas de publicação**:
  - Central de Deploy Gráfica (`deploy_gui.py`).
  - Terminal / Scripts CLI (`npm run deploy:*`, `node tools/deployPages.mjs`).
  - Automações, assistentes ou agentes de IA.
- A validação é gerenciada pelo módulo centralizador `tools/enforceGitBackupGuard.mjs`, que obrigatoriamente:
  1. Roda o **Secret Shield** contra vazamento de `.env`, segredos do Mercado Pago, Supabase e chaves privadas.
  2. Adiciona todas as alterações do repositório (`git add .`).
  3. Gera o commit de backup padronizado com timestamp em Horário de Brasília.
  4. Faz o `git push origin nua-id`.
  5. Valida o hash commitado via `git ls-remote --exit-code origin refs/heads/nua-id`.
  6. Interrompe e aborta o deploy com erro caso ocorra qualquer falha no backup ou divergência remota.
