'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle,
  X,
  Send,
  Plus,
  History,
  Lightbulb,
  Search,
  BookOpen,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  Info,
  Check,
} from 'lucide-react';
import {
  sendNuaAiMessage,
  fetchNuaAiConversations,
  fetchConversationTurns,
  getStoredActiveConversationId,
  setStoredActiveConversationId,
} from '@/lib/nuaAi/client';
import { ConversationMeta, HistoryTurn } from '@/lib/nuaAi/types';
import { NUA_AI_CONFIG } from '@/lib/nuaAi/config';
import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';
import { playAlertSound, unlockAudioContext } from '@/lib/audioAlerts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sourcesUsed?: {
    memory: boolean;
    history: boolean;
    historyTitle?: string;
    scientific?: boolean;
    scientificCitation?: string;
    knowledge?: boolean;
  };
}

const WELCOME_MESSAGE_NUA_AI = `Oi, Nua! 🌸 Que bom ter você por aqui.

Eu sou a **Nua IA**, sua assistente inteligente e parceira estratégica em todo o seu universo criativo e digital.

Aqui você pode conversar comigo com total liberdade sobre:
- 🔬 **Sexologia & Educação Sexual**: Tire dúvidas teóricas, explore conceitos científicos, fisiologia, artigos e embasamentos técnicos para suas mentorias e posicionamento.
- ✨ **Criação & Roteiros**: Ideias autênticas de Reels, posts, carrosséis, newsletter, narrativas e temas envolventes para sua comunidade.
- 📍 **Seu Site & Painel Admin**: Pergunte onde editar fotos, textos, bio, redes ou como funciona qualquer cantinho da sua plataforma.
- 🛠️ **Solicitações de Melhorias para o Philippe**: Quer mudar algo no site, tem uma ideia nova ou notou algo no celular? É só me contar! Eu organizo o pedido e encaminho direto para a Central do Philippe para você.

Como posso te inspirar ou te ajudar hoje?`;

const QUICK_PROMPTS = [
  { label: '🔬 Sexologia & Ciência', text: 'Nua, me explica a diferença entre excitação e desejo responsivo segundo a ciência?' },
  { label: '💡 Ideia de Reel', text: 'Nua, me dá uma ideia de Reel autêntico e educativo para essa semana?' },
  { label: '📍 Onde mudo fotos?', text: 'Onde no painel administrativo eu consigo trocar as fotos da galeria?' },
  { label: '🛠️ Pedir ajuste ao Dev', text: 'Quero sugerir uma melhoria no visual da galeria para o celular.' },
];

export interface ParsedTicketProposal {
  type: string;
  title: string;
  section: string;
  details: string;
}

export function parseTicketProposal(content: string): ParsedTicketProposal | null {
  if (!content.includes('RESUMO DO PEDIDO PARA O PHILIPPE')) return null;

  const typeMatch = content.match(/[•\-*]?\s*Tipo:\s*(.+)/i);
  const whatMatch = content.match(/[•\-*]?\s*(?:O quê|O que|Título):\s*(.+)/i);
  const whereMatch = content.match(/[•\-*]?\s*Onde:\s*(.+)/i);
  const detailsMatch = content.match(/[•\-*]?\s*Detalhes:\s*(.+)/i);

  const type = typeMatch ? typeMatch[1].trim() : '💡 Melhoria';
  const title = whatMatch ? whatMatch[1].trim() : 'Solicitação da Nua Borges';
  const section = whereMatch ? whereMatch[1].trim() : 'Geral';
  const details = detailsMatch ? detailsMatch[1].trim() : content;

  return {
    type,
    title,
    section,
    details,
  };
}

function renderInlineFormatting(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/80 font-mono text-[10px] text-[#f4a7b9]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-zinc-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function FormattedAiMessage({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n');

        // Check if block is a blockquote
        if (lines.every((l) => l.trim().startsWith('>') || l.trim() === '')) {
          return (
            <div
              key={bIdx}
              className="border-l-2 border-[#f4a7b9] pl-3 py-1 bg-[#f4a7b9]/5 rounded-r-xl italic text-zinc-300 text-[11px] leading-relaxed my-1"
            >
              {lines.map((l, lIdx) => (
                <p key={lIdx}>{renderInlineFormatting(l.replace(/^>\s*/, ''))}</p>
              ))}
            </div>
          );
        }

        // Check if block is a list of bullets
        const isBulletList = lines.some((l) => /^\s*[-*•]\s+/.test(l));
        if (isBulletList) {
          return (
            <ul key={bIdx} className="space-y-1.5 my-1">
              {lines.map((l, lIdx) => {
                if (/^\s*[-*•]\s+/.test(l)) {
                  const cleaned = l.replace(/^\s*[-*•]\s+/, '');
                  return (
                    <li key={lIdx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] shrink-0 mt-1.5" />
                      <span className="flex-1">{renderInlineFormatting(cleaned)}</span>
                    </li>
                  );
                }
                return (
                  <li key={lIdx} className="leading-relaxed">
                    {renderInlineFormatting(l)}
                  </li>
                );
              })}
            </ul>
          );
        }

        // Check if block is an ordered list (1. , 2. )
        const isNumberedList = lines.some((l) => /^\s*\d+[\.)]\s+/.test(l));
        if (isNumberedList) {
          return (
            <ol key={bIdx} className="space-y-1.5 my-1">
              {lines.map((l, lIdx) => {
                const match = l.match(/^\s*(\d+)[\.)]\s+(.*)$/);
                if (match) {
                  return (
                    <li key={lIdx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-zinc-800 text-[9px] font-mono text-[#f4a7b9] border border-[#f4a7b9]/30 flex items-center justify-center shrink-0 mt-0.5">
                        {match[1]}
                      </span>
                      <span className="flex-1">{renderInlineFormatting(match[2])}</span>
                    </li>
                  );
                }
                return (
                  <li key={lIdx} className="leading-relaxed">
                    {renderInlineFormatting(l)}
                  </li>
                );
              })}
            </ol>
          );
        }

        // Check if line is a header ###
        if (block.startsWith('### ') || block.startsWith('## ')) {
          const headerText = block.replace(/^#{2,3}\s+/, '');
          return (
            <h4 key={bIdx} className="font-semibold text-white text-xs mt-2 mb-1 flex items-center gap-1.5">
              <span className="text-[#f4a7b9]">✦</span>
              <span>{renderInlineFormatting(headerText)}</span>
            </h4>
          );
        }

        // Regular paragraph
        return (
          <p key={bIdx} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInlineFormatting(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function NuaAiChatDrawer() {
  const [isLocal, setIsLocal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [viewHistoryList, setViewHistoryList] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [sentTickets, setSentTickets] = useState<Record<string, boolean>>({});
  const [sendingTicketId, setSendingTicketId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inicializa detecção estrita de localhost (ativo apenas em ambiente de desenvolvimento local)
  useEffect(() => {
    setIsLocal(NUA_AI_CONFIG.isEnabled());
  }, []);

  // Ouvinte global para abrir o drawer (ex: ao clicar no botão na aba Meus Pedidos)
  useEffect(() => {
    if (!isLocal) return;
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open_nua_ai', handleOpen);
    return () => window.removeEventListener('open_nua_ai', handleOpen);
  }, [isLocal]);

  // Inicializa conversa ativa ou carrega histórico recente
  useEffect(() => {
    if (!isLocal) return;
    const savedId = getStoredActiveConversationId();
    if (savedId) {
      setActiveConversationId(savedId);
      loadConversationMessages(savedId);
    } else {
      startNewConversation();
    }
    loadConversationsList();
  }, [isLocal]);

  // Rolagem suave automática ao receber nova mensagem
  useEffect(() => {
    if (!isLocal) return;
    if (isOpen && !viewHistoryList) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLocal, messages, isOpen, viewHistoryList]);

  // Se não estiver em localhost, não renderiza absolutamente nada em produção
  if (!isLocal) {
    return null;
  }

  // Carrega a lista de conversas passadas
  const loadConversationsList = async () => {
    const list = await fetchNuaAiConversations();
    setConversations(list);
  };

  // Carrega mensagens de uma conversa existente
  const loadConversationMessages = async (convId: string) => {
    setIsLoading(true);
    try {
      const turns = await fetchConversationTurns(convId);
      if (turns.length > 0) {
        setMessages(
          turns.map((t, idx) => ({
            id: `${convId}_${idx}`,
            role: t.role,
            content: t.content,
            timestamp: t.timestamp,
          }))
        );
      } else {
        // Mensagem de boas-vindas inicial se for conversa nova
        setMessages([
          {
            id: 'init',
            role: 'assistant',
            content: WELCOME_MESSAGE_NUA_AI,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages([
        {
          id: 'init',
          role: 'assistant',
          content: WELCOME_MESSAGE_NUA_AI,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    const newId = `conv_${Date.now()}`;
    setActiveConversationId(newId);
    setStoredActiveConversationId(newId);
    setMessages([
      {
        id: 'init',
        role: 'assistant',
        content: WELCOME_MESSAGE_NUA_AI,
        timestamp: new Date().toISOString(),
      },
    ]);
    setViewHistoryList(false);
  };

  const selectPastConversation = (conv: ConversationMeta) => {
    setActiveConversationId(conv.id);
    setStoredActiveConversationId(conv.id);
    loadConversationMessages(conv.id);
    setViewHistoryList(false);
  };

  const handleConfirmSendTicket = async (
    msgId: string,
    ticket: ParsedTicketProposal,
    options?: { silentInChat?: boolean }
  ) => {
    setSendingTicketId(msgId);
    try {
      unlockAudioContext();
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();
      const fullText = `[Pedido via Nua IA]\nÁrea: ${ticket.section}\nTipo: ${ticket.type}\nDetalhes: ${ticket.details}`;
      const fullCategory = `${ticket.type} • ${ticket.section}`;

      const lowerDetails = (ticket.details + ' ' + ticket.title + ' ' + ticket.section).toLowerCase();
      const targetFiles: string[] = [];
      if (lowerDetails.includes('comentário') || lowerDetails.includes('depoimento') || lowerDetails.includes('página') || lowerDetails.includes('pagina') || lowerDetails.includes('seção') || lowerDetails.includes('sessao')) {
        targetFiles.push('components/CommentsSection.tsx', 'lib/types.ts', 'components/Header.tsx');
      }
      if (lowerDetails.includes('capa') || lowerDetails.includes('hero') || lowerDetails.includes('scroll') || lowerDetails.includes('explore')) {
        targetFiles.push('components/Hero.tsx', 'components/admin/HeroEditor.tsx');
      }
      if (lowerDetails.includes('galeria') || lowerDetails.includes('foto') || lowerDetails.includes('lightbox')) {
        targetFiles.push('components/Gallery.tsx', 'components/admin/GalleryEditor.tsx');
      }
      if (lowerDetails.includes('sobre') || lowerDetails.includes('biografia') || lowerDetails.includes('manifesto')) {
        targetFiles.push('components/AboutSection.tsx', 'components/admin/AboutEditor.tsx');
      }
      if (lowerDetails.includes('contato') || lowerDetails.includes('email') || lowerDetails.includes('modal')) {
        targetFiles.push('components/ContactModal.tsx', 'components/admin/ContactEditor.tsx');
      }
      if (lowerDetails.includes('whatsapp')) {
        targetFiles.push('components/Header.tsx', 'components/Footer.tsx', 'components/ContactModal.tsx');
      }
      if (targetFiles.length === 0) {
        targetFiles.push('components/Header.tsx', 'components/Footer.tsx');
      }

      let triageType = 'feature';
      if (lowerDetails.includes('bug') || lowerDetails.includes('erro') || lowerDetails.includes('problema') || lowerDetails.includes('quebrou')) {
        triageType = 'bug';
      } else if (lowerDetails.includes('visual') || lowerDetails.includes('layout') || lowerDetails.includes('design') || lowerDetails.includes('bonita') || lowerDetails.includes('estética')) {
        triageType = 'visual';
      } else if (lowerDetails.includes('melhoria') || lowerDetails.includes('ajuste')) {
        triageType = 'improvement';
      }

      const technicalPlan = [
        `1. Arquitetura e Escopo: Implementar ${ticket.title} na área ${ticket.section} respeitando a identidade editorial de luxo da Nua Borges (#09090b, #f4a7b9).`,
        `2. Arquivos Alvo no Repositório: ${targetFiles.join(', ')}.`,
        `3. Estrutura e Responsividade: Desenvolver componente modular com responsividade mobile-first e microinterações elegantes.`,
        `4. Integração e Painel: Conectar a dados da plataforma e sincronizar com o Admin se aplicável.`,
        `5. Validação de Qualidade: Testar no celular, verificar acessibilidade e confirmar renderização perfeita.`,
      ].join('\n');

      const aiAgentPrompt = `Tarefa de Desenvolvimento na Plataforma Nua Borges:
Solicitante: Nua Borges (Cliente)
Título: ${ticket.title}
Tipo: ${triageType} | Prioridade: Média | Escopo: Garantia
Área do Projeto: ${ticket.section}

Descrição da Solicitação da Cliente:
${ticket.details}

Arquivos Alvo Sugeridos:
${targetFiles.map((f) => `- ${f}`).join('\n')}

Plano de Implementação Técnica:
${technicalPlan}

Diretrizes de Qualidade:
- Manter o design editorial de alto padrão (minimalista, sensualidade sofisticada sem vulgaridade).
- Preservar integridade do Next.js e compatibilidade com deploy no Cloudflare Pages.
- Testar e validar funcionalmente antes de marcar como pronto para revisão.`;

      const conversationMessages = messages.map((m) => ({
        at: m.timestamp || new Date().toISOString(),
        role: m.role === 'assistant' ? 'ia' : 'client',
        text: m.content,
      }));

      const payload = {
        action: 'create',
        text: fullText,
        category: fullCategory,
        triage: {
          title: ticket.title,
          summary: ticket.details,
          type: triageType,
          priority: 'medium',
          contractScope: 'garantia',
          targetFiles,
          technicalPlan,
          aiAgentPrompt,
        },
        conversation: conversationMessages,
      };

      try {
        await fetch(`${apiUrl}/api/requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn('POST /api/requests local fallback:', err);
      }

      // Persistência local para desenvolvimento e atualização imediata da aba Meus Pedidos e Admin Geral
      try {
        const localKey = 'nua_local_requests_v1';
        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
        const newReq = {
          id: `req_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'new',
          title: ticket.title,
          type: triageType,
          priority: 'medium',
          contractScope: 'garantia',
          summary: ticket.details,
          technicalPlan,
          targetFiles,
          aiAgentPrompt,
          originalText: fullText,
          category: fullCategory,
          history: [
            {
              at: new Date().toISOString(),
              event: 'created',
              detail: 'Solicitação criada via assistente Nua IA e despachada para o Philippe.',
            },
          ],
          messages: conversationMessages.length > 0 ? conversationMessages : [
            {
              at: new Date().toISOString(),
              role: 'client',
              text: fullText,
            },
          ],
        };
        existing.unshift(newReq);
        localStorage.setItem(localKey, JSON.stringify(existing));
      } catch {}

      // Dispara evento para atualizar a lista na aba Meus Pedidos
      window.dispatchEvent(new CustomEvent('nua_request_created'));

      setSentTickets((prev) => ({ ...prev, [msgId]: true }));
      playAlertSound('new_request');

      // Se não for silencioso no chat, adiciona mensagem explícita de confirmação da IA
      if (!options?.silentInChat) {
        const confirmMsg: ChatMessage = {
          id: `assistant_confirm_${Date.now()}`,
          role: 'assistant',
          content: `✅ **Pedido enviado com sucesso para o Philippe!**\n\nEle já foi notificado na Central de Atendimento. Você pode acompanhar o status, prazos e as respostas dele na aba **Meus Pedidos** aqui no seu painel administrativo.\n\nSe quiser pensar ou criar mais alguma coisa, estou por aqui! 🌸`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, confirmMsg]);
      }
    } catch (err) {
      console.error('Erro ao enviar pedido para o Philippe:', err);
    } finally {
      setSendingTicketId(null);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const isConfirmation =
      /^(?:manda|mande|envia|envie|encaminha|encaminhe|pode\s+mandar|pode\s+enviar|sim,?|confirmo|manda\s+bala|manda\s+ver|pode\s+ser|aprovado)(?:\s+(?:pra|para|ao|pro)\s+ele|\s+(?:pra|para|ao|pro)\s+philippe)?$/i.test(
        text
      );

    // Se o usuário digitou uma confirmação ("manda pra ele"), despacha qualquer proposta pendente na tela
    if (isConfirmation) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role === 'assistant') {
          const parsed = parseTicketProposal(m.content);
          if (parsed && !sentTickets[m.id]) {
            handleConfirmSendTicket(m.id, parsed, { silentInChat: true });
            break;
          }
        }
      }
    }

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await sendNuaAiMessage({
        message: text,
        conversationId: activeConversationId,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
        sourcesUsed: res.sourcesUsed,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      loadConversationsList();

      // Se a resposta contiver um ticket estruturado e tiver sido confirmada, despacha automaticamente
      const parsedTicket = parseTicketProposal(res.reply);
      if (parsedTicket) {
        const isAlreadyConfirmed =
          isConfirmation ||
          res.reply.includes('✅') ||
          res.reply.toLowerCase().includes('encaminhado com sucesso') ||
          res.reply.toLowerCase().includes('enviado com sucesso');

        if (isAlreadyConfirmed) {
          handleConfirmSendTicket(assistantMsg.id, parsedTicket, { silentInChat: true });
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'Tive um probleminha para responder agora. Tenta de novo em alguns segundos!',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <>
      {/* Botão Flutuante no Canto Inferior Direito */}
      <div className="fixed bottom-6 right-6 z-40 print:hidden">
        <motion.button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Abrir assistente Nua IA"
          className={`flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 cursor-pointer border ${
            isOpen
              ? 'bg-[#18181f] text-white border-zinc-700'
              : 'bg-[#121217]/95 hover:bg-[#181820] text-zinc-100 border-[#f4a7b9]/40 hover:border-[#f4a7b9] shadow-[0_10px_35px_rgba(244,167,185,0.15)] backdrop-blur-md'
          }`}
        >
          <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-[#f4a7b9]/15 border border-[#f4a7b9]/40 text-[#f4a7b9]">
            <MessageCircle className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="text-left hidden sm:block">
            <span className="font-serif text-xs font-semibold tracking-wide text-white block">
              Nua IA
            </span>
            <span className="text-[10px] text-[#f4a7b9] font-sans block leading-none">
              Assistente da Nua
            </span>
          </div>

          {isOpen ? (
            <X className="w-4 h-4 text-zinc-400 ml-1" />
          ) : (
            <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700 hidden sm:inline-block">
              Ajuda
            </span>
          )}
        </motion.button>
      </div>

      {/* Janela do Chat Flutuante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-22 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[82vh] bg-[#0d0d12]/95 backdrop-blur-xl border border-[#f4a7b9]/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-left"
          >
            {/* Cabeçalho da Nua IA */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#f4a7b9]/20 to-[#f4a7b9]/5 border border-[#f4a7b9]/40 flex items-center justify-center text-[#f4a7b9]">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-sm font-semibold text-white tracking-wide">
                      Nua IA
                    </h3>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Online
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight">
                    {viewHistoryList ? 'Conversas Anteriores' : 'Ideias, roteiros e estratégias da Nua'}
                  </p>
                </div>
              </div>

              {/* Botões de Ação do Cabeçalho */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewHistoryList(!viewHistoryList)}
                  title="Histórico de conversas"
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    viewHistoryList
                      ? 'bg-[#f4a7b9]/20 text-[#f4a7b9]'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <History className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={startNewConversation}
                  title="Nova conversa"
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-xl transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Fechar"
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/60 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conteúdo Principal: Visualização de Histórico vs Chat */}
            {viewHistoryList ? (
              /* Gaveta de Conversas Anteriores */
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Pesquisar conversas passadas..."
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9]/40"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs">
                      Nenhuma conversa encontrada.
                    </div>
                  ) : (
                    filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => selectPastConversation(conv)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                          conv.id === activeConversationId
                            ? 'bg-[#f4a7b9]/10 border-[#f4a7b9]/40 text-white'
                            : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-800/50 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif text-xs font-medium text-white truncate max-w-[240px]">
                            {conv.title}
                          </span>
                          <span className="text-[10px] text-zinc-500 shrink-0">
                            {new Date(conv.updatedAt || conv.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {conv.summary}
                        </p>
                      </button>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-zinc-800/60 mt-2">
                  <button
                    type="button"
                    onClick={startNewConversation}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#f4a7b9]/15 hover:bg-[#f4a7b9]/25 text-[#f4a7b9] border border-[#f4a7b9]/30 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Iniciar Nova Conversa</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Janela Ativa de Conversa */
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 text-zinc-100 rounded-br-none shadow-sm whitespace-pre-wrap'
                            : 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          msg.content
                        ) : (
                          <>
                            <FormattedAiMessage content={msg.content} />
                            {(() => {
                              const ticket = parseTicketProposal(msg.content);
                              if (!ticket) return null;
                              const isSent = !!sentTickets[msg.id];
                              const isSending = sendingTicketId === msg.id;

                              return (
                                <div className="mt-3 p-3.5 rounded-2xl bg-[#0b0b10] border border-[#f4a7b9]/40 shadow-[0_4px_20px_rgba(244,167,185,0.12)] space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          isSent ? 'bg-emerald-400' : 'bg-[#f4a7b9] animate-pulse'
                                        }`}
                                      />
                                      <span className="text-[10px] font-semibold text-white uppercase tracking-wider">
                                        {isSent ? 'Pedido Encaminhado ao Dev' : 'Pronto para Envio ao Philippe'}
                                      </span>
                                    </div>
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#f4a7b9]/15 text-[#f4a7b9] font-medium border border-[#f4a7b9]/25">
                                      {ticket.type}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-zinc-300 leading-relaxed space-y-1 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                                    <p className="font-semibold text-white truncate">🎯 {ticket.title}</p>
                                    <p className="text-zinc-400 text-[10px]">📍 Área: {ticket.section}</p>
                                  </div>

                                  <p className="text-[11px] text-zinc-300 font-light leading-snug">
                                    {isSent
                                      ? 'O Philippe já recebeu este pedido na Central dele! Você pode acompanhar o progresso na aba Meus Pedidos.'
                                      : 'Deseja que eu envie este pedido diretamente para a Central de Atendimento do Philippe agora?'}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      disabled={isSending || isSent}
                                      onClick={() => handleConfirmSendTicket(msg.id, ticket)}
                                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md cursor-pointer ${
                                        isSent
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                                          : 'bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 hover:shadow-lg hover:gap-2'
                                      }`}
                                    >
                                      {isSent ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                                          <span>Enviado com Sucesso ✓</span>
                                        </>
                                      ) : isSending ? (
                                        <>
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                          <span>Enviando para o Philippe...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Send className="w-3.5 h-3.5" />
                                          <span>Confirmar e Enviar para o Philippe</span>
                                        </>
                                      )}
                                    </button>

                                    {!isSent && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setInputMessage('Quero ajustar os seguintes detalhes antes de enviar: ');
                                          textareaRef.current?.focus();
                                        }}
                                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                                      >
                                        Ajustar detalhes
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>

                      {/* Badge quando recuperou histórico passado */}
                      {msg.sourcesUsed?.history && msg.sourcesUsed.historyTitle && (
                        <div className="flex items-center gap-1 text-[10px] text-[#f4a7b9] mt-1 px-1.5 py-0.5 rounded bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 font-sans">
                          <History className="w-3 h-3" />
                          <span>Lembrou de: "{msg.sourcesUsed.historyTitle}"</span>
                        </div>
                      )}

                      {/* Badge quando usou fonte científica curada */}
                      {msg.sourcesUsed?.scientific && (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mt-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-sans max-w-full">
                          <BookOpen className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            Fonte: {msg.sourcesUsed.scientificCitation || 'Evidência Científica Curada'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Indicador de Digitação */}
                  {isLoading && (
                    <div className="flex items-start">
                      <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-2xl rounded-bl-none flex items-center gap-1.5 text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] animate-bounce [animation-delay:0.4s]" />
                        <span className="text-[11px] text-zinc-400 ml-1.5">Pensando com carinho...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Sugestões Rápidas (Chips) se houver poucas mensagens */}
                {messages.length <= 2 && !isLoading && (
                  <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-zinc-800/40 bg-zinc-900/20">
                    {QUICK_PROMPTS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(chip.text)}
                        className="shrink-0 px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-[#f4a7b9]/15 border border-zinc-800 hover:border-[#f4a7b9]/40 text-[10px] text-zinc-300 hover:text-[#f4a7b9] transition-all cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Área de Entrada de Mensagem */}
                <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/50">
                  <div className="flex items-end gap-2 bg-[#09090c] border border-zinc-800 focus-within:border-[#f4a7b9]/50 rounded-2xl p-2 transition-all">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Converse com a Nua IA..."
                      className="flex-1 bg-transparent resize-none text-xs text-white placeholder-zinc-500 focus:outline-none px-2 py-1 max-h-24 custom-scrollbar"
                    />

                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isLoading}
                      className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ${
                        inputMessage.trim() && !isLoading
                          ? 'bg-[#f4a7b9] text-zinc-950 hover:bg-[#f7b8c7]'
                          : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Aviso de Regra / Rodapé */}
                  <div className="flex items-center justify-between mt-2 px-1 text-[9px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Info className="w-2.5 h-2.5" />
                      <span>Conhece a Nua, mas não altera o site.</span>
                    </span>
                    <span>Enter para enviar</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
