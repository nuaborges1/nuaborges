# Plano de Implementação Definitivo: Refinamento Absoluto e Separação Módulos/Mídias — NUA Borges

Este plano reúne o melhor dos planejamentos anteriores: **pelo menos 10 melhorias detalhadas e específicas para cada uma das 13 abas ativas**, combinadas com a **separação estrita e independente dos três módulos operacionais** (`avulsos`, `personalizados`, `appointments`) e a **unificação da infraestrutura no Centro de Mídias (Library/Vault)**.

---

## 1. Arquitetura de Mídias e Separação de Módulos
- **Módulos Operacionais Independentes**:
  1. *Conteúdos & Packs (`avulsos`)*: Gestão de catálogo comercial, packs, preços e prévias.
  2. *Personalizados (`personalizados`)*: Gestão de encomendas individuais, briefing, orçamento e cofre do cliente.
  3. *Chamadas de Vídeo (`appointments`)*: Gestão de modalidades, agenda, reservas e sala privativa.
- **Infraestrutura Compartilhada**:
  - *Centro de Mídias (Library)*: Deduplicação por hash, extração real de duração de vídeo e upload sem erros 501/429.

---

## 2. As 13 Abas Ativas — 10 Melhorias Específicas em Cada Uma

### 1. Início & Capa (`hero`)
1. Seletor centralizado vinculado ao Centro de Mídias Unificado.
2. Pré-visualização em tempo real do card de capa.
3. Rótulos de formulário em linguagem natural e amigável.
4. Validação visual de campos obrigatórios ausentes.
5. Responsividade otimizada para viewports de 320px.
6. Indicador visual discreto de rascunho salvo.
7. Alinhamento e espaçamento padronizados no grid.
8. Dicas e tooltips descritivos sobre dimensões recomendadas.
9. Tratamento robusto de erros em falhas de rede.
10. Botão de reversão rápida para o estado padrão editorial.

### 2. Galeria do Site (`gallery`) — *Unificada com Centro de Mídias*
1. Seleção direta de mídias a partir do Centro de Mídias.
2. Reordenação fluida por interface drag-and-drop / setas.
3. Filtros instantâneos entre fotografias e produções em vídeo.
4. Exclusão segura com confirmação contextual personalizada.
5. Contador em tempo real de itens ativos na galeria pública.
6. Otimização de miniaturas WebP para máxima velocidade.
7. Estado vazio elegante com orientação para novos cadastros.
8. Edição de legendas direto na miniatura do card.
9. Bloqueio automático de uploads duplicados por hash.
10. Conformidade estrita com acessibilidade ARIA.

### 3. Sobre Mim (`about`)
1. Editor de texto enriquecido intuitivo para o manifesto autoral.
2. Vinculação simplificada com a foto biográfica oficial.
3. Contador dinâmico de caracteres para resumos.
4. Agrupamento lógico de dados biográficos e recados.
5. Visualizador em tempo real do bloco na home.
6. Retentativa automática em caso de instabilidade na API.
7. Remoção de bordas e sombras desnecessárias.
8. Preservação exata de quebras de parágrafo no site público.
9. Toasts de sucesso elegantes ao gravar as alterações.
10. Layout adaptado para leitura confortável em celulares.

### 4. Redes & Plataformas (`channels`)
1. Validação estrita de URLs para OnlyFans, Privacy, Instagram e Telegram.
2. Ícones padronizados (sem uso de Sparkles conforme GEMINI.md).
3. Interruptores (toggles) para ativar ou ocultar canais num clique.
4. Textos de botões customizáveis por plataforma.
5. Reordenação visual da prioridade dos links sociais.
6. Feedback visual imediato ao colar um link de perfil.
7. Estado vazio informativo caso nenhum canal esteja conectado.
8. Sanitização de entradas contra injeção de scripts.
9. Separação visual entre assinaturas pagas e redes gratuitas.
10. Design system unificado com o restante do painel.

### 5. Contato por E-mail (`contact`)
1. Gestão segura do e-mail oficial de recebimento de propostas.
2. Editor dinâmico da lista de assuntos do formulário público.
3. Botão de teste de disparo SMTP direto do painel.
4. Validação estrita de endereços de e-mail.
5. Instruções textuais claras para a administradora.
6. Histórico visual dos tópicos ativos no formulário.
7. Estatísticas de bloqueio de spam via Honeypot.
8. Confirmação visual elegante ao atualizar as diretrizes.
9. Layout responsivo para edição em tablets e celulares.
10. Atribuição correta de rótulos de acessibilidade nos inputs.

### 6. Cofre de Mídias (`library`) — *Centro Unificado*
1. Centralização de 100% das fotografias e vídeos da plataforma.
2. Deduplicação inteligente baseada em fingerprint de conteúdo.
3. Leitura automática de duração e resolução real de vídeos.
4. Suporte a upload em lote otimizado (sem erro 429).
5. Pesquisa instantânea por nome de arquivo e formato.
6. Modal seguro de visualização de mídia em tela cheia.
7. Exclusão com limpeza automática de arquivos órfãos no storage.
8. Indicador claro do consumo de espaço de armazenamento.
9. Organização por categorias/pastas lógicas.
10. Feedback de progresso real em porcentagem de upload.

### 7. Conteúdos & Packs (`avulsos`) — *Módulo Independente 1*
1. Separação clara entre prévias públicas e cofre protegido.
2. Inclusão de mídias nos packs puxando do Centro Unificado.
3. Configuração de preços e slugs amigáveis.
4. Ocultação instantânea de um pack do catálogo.
5. Pré-visualização exata do card de venda na página pública.
6. Ficha técnica gerada automaticamente (fotos 4K + vídeos).
7. Clonagem de packs existentes com um clique.
8. Confirmação contextual antes de remover um pack comercial.
9. Abas internas limpas (Informações, Prévias, Cofre Protegido).
10. Formatação automática de valores monetários em Reais (R$).

### 8. Chamadas de Vídeo (`appointments`) — *Módulo Independente 2*
1. Gestão e precificação de modalidades de atendimento.
2. Valores validados rigorosamente no servidor.
3. Fila organizada de agendamentos confirmados e pendentes.
4. Filtros ágeis por data e status do compromisso.
5. Atalhos diretos para os canais de contato dos clientes.
6. Configuração de instruções para a sala privativa.
7. Ferramentas de cancelamento e reagendamento seguro.
8. Estados vazios educativos para dias sem reservas.
9. Alinhamento visual estrito com a identidade de luxo.
10. Alertas visuais e sonoros em tempo real para novos agendamentos.

### 9. Personalizados (`personalizados`) — *Módulo Independente 3*
1. Acompanhamento do fluxo de pedidos ("Em Gravação", "Pronto", "Entregue").
2. Anexação simplificada de arquivos finais no cofre do cliente.
3. Calculadora interativa de preços por quantidade de fotos/vídeos.
4. Filtros inteligentes por status e nome do admirador.
5. Entrega protegida via links seguros integrados.
6. Exibição destacada do briefing e desejos do cliente.
7. Identificação visual de pedidos com prioridade (Express 24h).
8. Transição ágil de estados com botões de ação rápida.
9. Notas e anotações internas para controle da produção.
10. Confirmação imediata ao concluir atualizações de pedido.

### 10. Divulgação & Google (`seo`)
1. Prévia em tempo real de resultados de busca do Google.
2. Visualização do card de compartilhamento para redes sociais.
3. Seletor de imagem de capa open graph direto da biblioteca.
4. Contadores de caracteres para títulos (60) e descrições (160).
5. Gestão simplificada de palavras-chave.
6. Validação contra caracteres inválidos em tags HTML.
7. Instruções e dicas amigáveis de otimização.
8. Botão de restauração para os textos editoriais padrão.
9. Sincronização automática com o sistema de rascunhos.
10. Layout totalmente adaptado para visualização em celulares.

### 11. Páginas Legais (`institutional`)
1. Editor dedicado para Termos de Uso e Política de Privacidade.
2. Customização do aviso de maioridade 18+.
3. Tipografia limpa e legível para documentos longos.
4. Alerta de segurança ao tentar fechar a aba com alterações não salvas.
5. Alinhamento com a fonte serifada editorial da marca.
6. Tratamento robusto de erros de salvamento no servidor.
7. Histórico e estrutura padronizada de seções legais.
8. Validação de preenchimento para evitar páginas em branco.
9. Foco total na experiência de leitura e edição.
10. Publicação instantânea sincronizada com o site público.

### 12. Mensalidades do Site (`finance`)
1. Visibilidade clara do status da hospedagem e suporte técnico.
2. Listagem organizada de faturas anteriores e vigentes.
3. Visualização e cópia rápida de códigos Pix para pagamento.
4. Alertas destacados para faturas com vencimento próximo.
5. Atalho de suporte direto com a equipe técnica.
6. Design corporativo sóbrio e sofisticado.
7. Sincronização automática com o servidor financeiro.
8. Estados vazios que indicam regularidade total.
9. Detalhamento transparente dos serviços contratados.
10. Proteção de acesso restrita estritamente a administradores.

### 13. Configurações de Alertas (`notifications`)
1. Ativação e teste de toque sonoro para novos pedidos.
2. Controle do piscar na aba do navegador.
3. Autorização e teste de notificações nativas do Windows.
4. Centralização total de preferências de alerta.
5. Indicadores visuais claros do estado de permissão do browser.
6. Botões dedicados de teste de som, aba e banner.
7. Persistência local segura no navegador da administradora.
8. Cards minimalistas com interruptores modernos.
9. Textos explicativos sobre o funcionamento dos avisos.
10. Sincronização perfeita com o gancho de pedidos em tempo real.

---

## 3. Critérios de Conclusão e Testes
- Validação de build local (`next build`) sem erros TypeScript.
- Verificação da responsividade de 320px a 1440px.
- Zero deploys em produção.
