import { useState, useEffect, useRef } from 'react';
import {
  sendNuaAiMessage,
  fetchNuaAiConversations,
  fetchConversationTurns,
  getStoredActiveConversationId,
  setStoredActiveConversationId,
} from '@/lib/nuaAi/client';
import { ConversationMeta } from '@/lib/nuaAi/types';
import { NUA_AI_CONFIG } from '@/lib/nuaAi/config';
import { getPublicApiUrl, getStoredSessionToken, optimizeAndStoreImage, getDraftContent, saveDraftContent } from '@/lib/contentStore';
import { draftForAi, rehydrateLibrary } from '@/lib/nuaAi/contentOps.mjs';
import { playAlertSound, unlockAudioContext } from '@/lib/audioAlerts';
import { LibraryImageItem } from '@/lib/types';
import { ChatMessage, ParsedTicketProposal, WELCOME_MESSAGE_NUA_AI } from './types';
import { parseTicketProposal } from './FormattedAiMessage';

interface UseNuaAiChatOptions {
  activeTab?: string;
  tabs?: Array<{ id: string; label: string; description?: string }>;
  onUploadNew?: (newImage: LibraryImageItem) => void;
}

export function useNuaAiChat({ activeTab, tabs = [], onUploadNew }: UseNuaAiChatOptions) {
  const [isLocal, setIsLocal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [viewHistoryList, setViewHistoryList] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<
    Array<{ id?: string; url: string; objectKey?: string; isVideo?: boolean; name?: string }>
  >([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [sentTickets, setSentTickets] = useState<Record<string, boolean>>({});
  const [sendingTicketId, setSendingTicketId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsLocal(NUA_AI_CONFIG.isEnabled());
  }, []);

  useEffect(() => {
    if (!isLocal) return;
    const handleOpen = (e: Event) => {
      const initial = (e as CustomEvent)?.detail?.initialPrompt;
      if (typeof initial === 'string' && initial.trim()) setInputMessage(initial);
      setIsOpen(true);
    };
    window.addEventListener('open_nua_ai', handleOpen);
    return () => window.removeEventListener('open_nua_ai', handleOpen);
  }, [isLocal]);

  useEffect(() => {
    if (!isLocal) return;
    const onResult = (e: Event) => {
      const d = (e as CustomEvent)?.detail;
      if (d && d.ok === false) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant_applyfail_${Date.now()}`,
            role: 'assistant',
            content: `Atenção: o painel **não** aplicou a alteração.\n${(d.errors || []).map((x: string) => `• ${x}`).join('\n')}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    };
    window.addEventListener('nua_ai_ops_result', onResult);
    return () => window.removeEventListener('nua_ai_ops_result', onResult);
  }, [isLocal]);

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

  useEffect(() => {
    if (!isLocal) return;
    if (isOpen && !viewHistoryList) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLocal, messages, isOpen, viewHistoryList]);

  const loadConversationsList = async () => {
    const list = await fetchNuaAiConversations();
    setConversations(list);
  };

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
    if (sendingTicketId === msgId || sentTickets[msgId]) return;
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

      let delivered = false;
      try {
        const resp = await fetch(`${apiUrl}/api/requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        delivered = resp.ok;
      } catch (err) {
        console.warn('POST /api/requests falhou:', err);
      }

      if (!delivered) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant_fail_${Date.now()}`,
            role: 'assistant',
            content: 'Não consegui enviar o pedido agora, então ele **não** foi encaminhado. Pode tentar de novo em instantes?',
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

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

      window.dispatchEvent(new CustomEvent('nua_request_created'));
      setSentTickets((prev) => ({ ...prev, [msgId]: true }));
      playAlertSound('new_request');

      if (!options?.silentInChat) {
        const confirmMsg: ChatMessage = {
          id: `assistant_confirm_${Date.now()}`,
          role: 'assistant',
          content: `**Pedido enviado para o Philippe!**\n\nEle já foi notificado e vai retornar com o andamento.\n\nSe quiser pensar ou criar mais alguma coisa, estou por aqui!`,
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
    const rawText = (textToSend || inputMessage).trim();
    if ((!rawText && attachedMedia.length === 0) || isLoading) return;

    const currentAttachments = [...attachedMedia];
    const attachedUrls = currentAttachments.map((m) => m.url);

    let displayContent = rawText;
    if (!displayContent && attachedUrls.length > 0) {
      displayContent = attachedUrls.length === 1
        ? 'Enviei 1 foto/vídeo para o acervo.'
        : `Enviei ${attachedUrls.length} fotos/vídeos para o acervo.`;
    }

    const isConfirmation =
      /^(?:manda|mande|envia|envie|encaminha|encaminhe|pode\s+mandar|pode\s+enviar|sim,?|confirmo|manda\s+bala|manda\s+ver|pode\s+ser|aprovado)(?:\s+(?:pra|para|ao|pro)\s+ele|\s+(?:pra|para|ao|pro)\s+philippe)?$/i.test(
        rawText
      );

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
      content: displayContent,
      mediaUrls: attachedUrls.length > 0 ? attachedUrls : undefined,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setAttachedMedia([]);
    setIsLoading(true);

    try {
      const activeTabLabel = tabs.find((t) => t.id === activeTab)?.label || activeTab;
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let promptToSend = rawText;
      if (attachedUrls.length > 0) {
        promptToSend = `${rawText ? rawText + '\n\n' : ''}[A Nua anexou ${attachedUrls.length} mídia(s); as URLs estão em uiContext.attachedMediaUrls. Use apenas conforme o pedido acima.]`;
      }

      const res = await sendNuaAiMessage({
        message: promptToSend,
        conversationId: activeConversationId,
        conversationHistory: historyPayload,
        // Base de escrita autoritativa: rascunho COMPLETO, com biblioteca.
        draftContent: (() => {
          try {
            return draftForAi(getDraftContent());
          } catch {
            return undefined;
          }
        })(),
        uiContext: {
          activeTab,
          activeTabLabel,
          tabs: tabs.map((t) => ({ id: t.id, label: t.label })),
          attachedMediaUrls: attachedUrls,
          attachedMediaItems: currentAttachments.map((m) => ({
            id: m.id,
            url: m.url,
            objectKey: m.objectKey,
            isVideo: Boolean(m.isVideo),
            name: m.name,
          })),
        },
      });

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
        sourcesUsed: res.sourcesUsed,
        actionExecuted: res.actionExecuted,
        proposal: res.proposal ?? undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      loadConversationsList();

      if (res.actionExecuted) {
        if (res.actionExecuted.type === 'replace_draft' && res.actionExecuted.data?.content) {
          try {
            const incoming = res.actionExecuted.data.content;
            const current = getDraftContent();
            // A biblioteca volta enxuta do servidor: reidratar com os campos
            // completos locais (variants etc.) para não perder qualidade de imagem.
            if (Array.isArray(incoming.library)) {
              incoming.library = rehydrateLibrary(incoming.library, current?.library);
            } else if (Array.isArray(current?.library)) {
              // Nunca aceitar um conteúdo sem biblioteca: isso apagaria o acervo local.
              incoming.library = current.library;
            }
            saveDraftContent(incoming);
          } catch {}
        }
        window.dispatchEvent(new CustomEvent('nua_draft_updated', { detail: res.actionExecuted }));
        playAlertSound('new_request');
      }

      const parsedTicket = parseTicketProposal(res.reply);
      if (parsedTicket) {
        const isAlreadyConfirmed =
          isConfirmation ||
          res.reply.toLowerCase().includes('encaminhado com sucesso') ||
          res.reply.toLowerCase().includes('enviado com sucesso');

        if (isAlreadyConfirmed) {
          handleConfirmSendTicket(assistantMsg.id, parsedTicket, { silentInChat: true });
        }
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Tive um probleminha para responder agora. Tenta de novo em alguns segundos!';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: message,
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

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setIsUploadingMedia(true);
    try {
      const newAttachments: Array<{ id?: string; url: string; objectKey?: string; isVideo?: boolean; name?: string }> = [];
      for (const file of files) {
        const newMedia = await optimizeAndStoreImage(file);
        if (newMedia?.url) {
          if (onUploadNew) {
            onUploadNew(newMedia);
          }
          newAttachments.push({
            id: newMedia.id,
            url: newMedia.url,
            objectKey: newMedia.objectKey,
            isVideo: Boolean(newMedia.isVideo || file.type.startsWith('video/')),
            name: newMedia.name || file.name,
          });
        }
      }
      if (newAttachments.length > 0) {
        setAttachedMedia((prev) => [...prev, ...newAttachments]);
        textareaRef.current?.focus();
      }
    } catch (err: any) {
      console.error('Erro ao enviar mídias no chat:', err);
      alert('Não foi possível processar o envio dos arquivos selecionados.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  return {
    isLocal,
    isOpen,
    setIsOpen,
    viewHistoryList,
    setViewHistoryList,
    galleryPickerOpen,
    setGalleryPickerOpen,
    activeConversationId,
    messages,
    inputMessage,
    setInputMessage,
    attachedMedia,
    setAttachedMedia,
    isUploadingMedia,
    isLoading,
    conversations,
    searchFilter,
    setSearchFilter,
    sentTickets,
    sendingTicketId,
    messagesEndRef,
    textareaRef,
    startNewConversation,
    selectPastConversation,
    handleConfirmSendTicket,
    handleSendMessage,
    handleKeyDown,
    handleFileUpload,
  };
}
