'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lightbulb,
  Palette,
  Bug,
  Smartphone,
  HelpCircle,
  Wrench,
  FilePlus,
  Link as LinkIcon,
  Bot,
  User,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Check,
  Search,
  Volume2,
  Bell,
  X,
  ExternalLink,
} from 'lucide-react';
import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';
import { playAlertSound, flashTabTitle, unlockAudioContext } from '@/lib/audioAlerts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestedOptions?: string[];
}

interface RequestItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'new' | 'analyzing' | 'planned' | 'in_progress' | 'review' | 'done' | 'rejected';
  title: string;
  summary: string;
  originalText: string;
  category?: string;
  messages: { at: string; role: 'client' | 'admin'; text: string }[];
}

const CATEGORIES = [
  {
    id: 'idea',
    icon: Lightbulb,
    title: 'Tenho uma ideia',
    desc: 'Quero sugerir uma melhoria ou algo novo para o site.',
    badge: '💡 Ideia',
    color: 'border-purple-500/30 hover:border-purple-500/60 bg-purple-500/[0.04]',
    activeBorder: 'border-purple-400 bg-purple-500/15 ring-2 ring-purple-500/25',
  },
  {
    id: 'visual',
    icon: Palette,
    title: 'Quero mudar algo visual',
    desc: 'Alterar cores, tipografia, fotos, organização ou aparência.',
    badge: '🎨 Visual',
    color: 'border-[#f4a7b9]/30 hover:border-[#f4a7b9]/60 bg-[#f4a7b9]/[0.04]',
    activeBorder: 'border-[#f4a7b9] bg-[#f4a7b9]/15 ring-2 ring-[#f4a7b9]/25 shadow-lg shadow-[#f4a7b9]/10',
  },
  {
    id: 'mobile',
    icon: Smartphone,
    title: 'Algo está errado no celular',
    desc: 'Ajustes específicos de tela pequena, layout ou toque.',
    badge: '📱 Celular',
    color: 'border-sky-500/30 hover:border-sky-500/60 bg-sky-500/[0.04]',
    activeBorder: 'border-sky-400 bg-sky-500/15 ring-2 ring-sky-500/25',
  },
  {
    id: 'behavior',
    icon: Wrench,
    title: 'Quero mudar o funcionamento',
    desc: 'Quero que alguma parte do site se comporte de outra forma.',
    badge: '🔧 Funcionamento',
    color: 'border-amber-500/30 hover:border-amber-500/60 bg-amber-500/[0.04]',
    activeBorder: 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-500/25',
  },
  {
    id: 'bug',
    icon: Bug,
    title: 'Encontrei um problema',
    desc: 'Algo não está funcionando como deveria ou travou.',
    badge: '🐛 Problema',
    color: 'border-rose-500/30 hover:border-rose-500/60 bg-rose-500/[0.04]',
    activeBorder: 'border-rose-400 bg-rose-500/15 ring-2 ring-rose-500/25',
  },
  {
    id: 'page',
    icon: FilePlus,
    title: 'Quero criar uma nova página',
    desc: 'Uma página, seção de conteúdo ou projeto que ainda não existe.',
    badge: '📄 Nova Página',
    color: 'border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-500/[0.04]',
    activeBorder: 'border-indigo-400 bg-indigo-500/15 ring-2 ring-indigo-500/25',
  },
  {
    id: 'integration',
    icon: LinkIcon,
    title: 'Adicionar link ou integração',
    desc: 'Novo serviço, formulário, link de pagamento ou rede social.',
    badge: '🔗 Integração',
    color: 'border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/[0.04]',
    activeBorder: 'border-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-500/25',
  },
  {
    id: 'other',
    icon: HelpCircle,
    title: 'Não sei exatamente como explicar',
    desc: 'Quero apenas contar o que estou imaginando com minhas palavras.',
    badge: '❓ Ideia Livre',
    color: 'border-zinc-700/60 hover:border-zinc-500 bg-zinc-800/[0.2]',
    activeBorder: 'border-zinc-400 bg-zinc-800/40 ring-2 ring-zinc-500/25',
  },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ElementType; description: string }
> = {
  new: {
    label: 'Recebido pelo Desenvolvedor',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    icon: Clock,
    description: 'Seu pedido foi registrado e está na fila para o Philippe iniciar a triagem.',
  },
  analyzing: {
    label: 'Em Análise Técnica',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: Search,
    description: 'O Philippe está analisando o código e arquitetura para a melhor implementação.',
  },
  planned: {
    label: 'Planejado para o Site',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    icon: Clock,
    description: 'Aprovado tecnicamente e preparado para a fase de código.',
  },
  in_progress: {
    label: 'Em Desenvolvimento',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    icon: RefreshCw,
    description: 'O Philippe está programando e testando as alterações no site agora.',
  },
  review: {
    label: 'Pronto para Sua Revisão',
    badgeClass: 'bg-[#f4a7b9]/20 text-[#f4a7b9] border-[#f4a7b9]/40',
    icon: CheckCircle2,
    description: 'O ajuste já foi implementado! Dê uma olhada no site para conferir.',
  },
  done: {
    label: 'Concluído com Sucesso',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
    description: 'Finalizado, testado e publicado no seu site oficial.',
  },
  rejected: {
    label: 'Arquivado',
    badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    icon: AlertCircle,
    description: 'Item arquivado ou substituído por outra solução.',
  },
};

const SITE_SECTIONS = [
  {
    id: 'home_hero',
    icon: '📸',
    label: 'Capa / Início',
    title: 'Capa / Início',
    desc: 'Hero inicial, banner de destaque, foto de entrada e frase de impacto.',
    tag: 'Principal',
  },
  {
    id: 'gallery',
    icon: '🖼️',
    label: 'Galeria de Fotos',
    title: 'Galeria de Fotos',
    desc: 'Ensaio fotográfico, grade de imagens, visualizador e organização.',
    tag: 'Portfólio',
  },
  {
    id: 'about',
    icon: '🌸',
    label: 'Sobre / Biografia',
    title: 'Sobre / Biografia',
    desc: 'História, trajetória, texto institucional e fotos de perfil.',
    tag: 'Institucional',
  },
  {
    id: 'services',
    icon: '💎',
    label: 'Serviços & Pacotes',
    title: 'Serviços & Pacotes',
    desc: 'Lista de atendimentos, pacotes, investimentos e entregas.',
    tag: 'Comercial',
  },
  {
    id: 'blog',
    icon: '✍️',
    label: 'Blog & Artigos',
    title: 'Blog & Artigos',
    desc: 'Artigos, matérias, novidades de moda e estilo de vida.',
    tag: 'Conteúdo',
  },
  {
    id: 'new_page',
    icon: '📄',
    label: 'Criar Nova Página',
    title: 'Criar Nova Página',
    desc: 'Uma página totalmente inédita ou landing page para um projeto.',
    tag: 'Novo Recurso',
  },
  {
    id: 'whole_site',
    icon: '🌐',
    label: 'Todo o Site / Geral',
    title: 'Todo o Site / Geral',
    desc: 'Cabeçalho, rodapé, tema global ou ajustes gerais em todas as páginas.',
    tag: 'Geral',
  },
];

const QUICK_DETAIL_IDEAS = [
  '📱 Acontece mais no celular',
  '🎨 Quero mudar cores ou tons',
  '🖼️ Quero trocar as fotos ou a ordem',
  '✍️ Quero ajustar um texto específico',
  '⚡ Quero que abra mais rápido e suave',
  '🔍 Quero zoom ou toque melhor',
];

const getContextSuggestions = (section: string, category: string) => {
  const suggestions: string[] = [];

  if (category.includes('visual') || category.includes('Visual')) {
    suggestions.push('🎨 Quero mudar cores ou paleta');
    suggestions.push('🖼️ Quero trocar fotos ou a ordem');
    suggestions.push('✨ Quero um visual mais clean e minimalista');
    suggestions.push('🔍 Quero zoom suave ao tocar');
  } else if (category.includes('celular') || category.includes('Celular')) {
    suggestions.push('📱 O texto está cortando no celular');
    suggestions.push('⚡ As fotos demoram para carregar no 4G');
    suggestions.push('👆 O botão está pequeno para tocar');
    suggestions.push('📏 Quero ajustar o espaçamento vertical');
  } else if (category.includes('problema') || category.includes('Problema') || category.includes('bug')) {
    suggestions.push('❌ Um botão não está respondendo');
    suggestions.push('🖼️ Uma imagem não está abrindo');
    suggestions.push('🔗 O link leva para a página errada');
    suggestions.push('⚠️ Algo parece travado ou desalinhado');
  } else if (category.includes('página') || category.includes('Página')) {
    suggestions.push('📄 Quero uma página para ensaios especiais');
    suggestions.push('📑 Quero uma página institucional detalhada');
    suggestions.push('💌 Quero uma página exclusiva de contato');
  } else if (category.includes('integração') || category.includes('link')) {
    suggestions.push('💬 Quero colocar botão flutuante de WhatsApp');
    suggestions.push('📸 Quero conectar fotos do meu Instagram');
    suggestions.push('📅 Quero link para agendamento externo');
  }

  if (section.includes('Galeria')) {
    suggestions.push('🖼️ Quero grade de 3 fotos por linha');
    suggestions.push('🔄 Quero reorganizar a sequência dos ensaios');
  } else if (section.includes('Capa')) {
    suggestions.push('📸 Quero atualizar a foto principal da capa');
    suggestions.push('✍️ Quero trocar o título principal de boas-vindas');
  } else if (section.includes('Serviços')) {
    suggestions.push('💎 Quero atualizar os valores dos pacotes');
    suggestions.push('📋 Quero adicionar um novo tipo de ensaio');
  }

  if (suggestions.length < 4) {
    suggestions.push('💡 Tenho uma ideia inovadora para este ponto');
    suggestions.push('⚡ Quero que a navegação seja mais rápida e suave');
  }

  return Array.from(new Set(suggestions)).slice(0, 6);
};

export function FormattedText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className={`space-y-1.5 leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ');
        const cleanLine = isBullet ? trimmed.replace(/^[-•*]\s*/, '') : trimmed;
        const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-semibold text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-[#f4a7b9] mt-1 text-[10px] shrink-0 leading-none">●</span>
              <span className="flex-1">{renderedParts}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-zinc-200">
            {renderedParts}
          </p>
        );
      })}
    </div>
  );
}

export function ClientRequestsEditor() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Etapa atual do fluxo dinâmico: 1 (Onde no site), 2 (O que gostaria de fazer), 3 (Assistente IA pré-abastecido)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Seleções do fluxo
  const [selectedSection, setSelectedSection] = useState<string>('📸 Capa / Início');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tenho uma ideia');
  const [directDescription, setDirectDescription] = useState('');
  const [isSubmittingDirect, setIsSubmittingDirect] = useState(false);

  // No Passo 3: preferência de visualização ('chat' ou 'direct')
  const [step3Mode, setStep3Mode] = useState<'chat' | 'direct'>('chat');

  // Estados do fluxo conversacional Gemini (no Passo 3)
  const [chatCategory, setChatCategory] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [currentChatInput, setCurrentChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [enoughInformation, setEnoughInformation] = useState(false);
  const [aiTriage, setAiTriage] = useState<any | null>(null);
  const [isSubmittingChat, setIsSubmittingChat] = useState(false);

  // Alerta Modal de Conclusão de Solicitação (comemoração em tempo real)
  const [celebrationModal, setCelebrationModal] = useState<{
    id: string;
    title: string;
    summary?: string;
  } | null>(null);

  // Estados da lista de solicitações
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [audioFeedback, setAudioFeedback] = useState(false);

  // Referência para comparar mudanças de status anteriores e disparar sons
  const prevStatusesRef = useRef<Map<string, string>>(new Map());
  const isInitialLoadRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleTestAudio = () => {
    unlockAudioContext();
    playAlertSound('task_done');
    setAudioFeedback(true);
    showToast('🔊 Som testado com sucesso! Os alertas tocarão automaticamente quando o Philippe atualizar seus pedidos.');
    setTimeout(() => setAudioFeedback(false), 3000);
  };

  // Carrega e sincroniza as solicitações em tempo real (Polling a cada 4 segundos)
  const fetchRequests = useCallback(async () => {
    try {
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();
      const res = await fetch(`${apiUrl}/api/requests`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        const currentList: RequestItem[] = data.requests || [];
        setRequests(currentList);

        // Se NÃO for a primeira carga, verifica se algum pedido mudou para 'done' ou se recebeu nova mensagem
        if (!isInitialLoadRef.current) {
          currentList.forEach((req) => {
            const prevStatus = prevStatusesRef.current.get(req.id);
            if (prevStatus && prevStatus !== req.status) {
              if (req.status === 'done') {
                // 1. Toca som festivo
                playAlertSound('task_done');
                // 2. Faz a aba piscar
                flashTabTitle('🎉 SOLICITAÇÃO CONCLUÍDA! - Nua Borges');
                // 3. Abre modal de celebração
                setCelebrationModal({
                  id: req.id,
                  title: req.title,
                  summary: req.summary,
                });
              } else if (req.status === 'in_progress') {
                playAlertSound('status_progress');
                showToast(`⚡ O Philippe começou a programar seu pedido: "${req.title}"!`);
              }
            }
          });
        }

        // Atualiza o mapa de status anteriores
        const newMap = new Map<string, string>();
        currentList.forEach((req) => newMap.set(req.id, req.status));
        prevStatusesRef.current = newMap;
        isInitialLoadRef.current = false;
      }
    } catch (err) {
      console.error('[ClientRequests] Erro ao sincronizar solicitações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling contínuo a cada 4 segundos para receber atualizações do Philippe instantaneamente
  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 4000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatCategory && chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages, isAiThinking, chatCategory]);

  // ─── 1. ENVIO DIRETO DE TEXTO (Caso prefira escrever sem conversar) ─────────
  const handleSendDirectRequest = async () => {
    const text = directDescription.trim();
    if (!text || isSubmittingDirect) return;
    if (text.length < 5) {
      alert('Por favor, descreva com um pouco mais de detalhes o que você gostaria.');
      return;
    }

    unlockAudioContext();
    setIsSubmittingDirect(true);

    try {
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();
      const fullCategory = `${selectedCategory} • ${selectedSection}`;

      const res = await fetch(`${apiUrl}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'create',
          category: fullCategory,
          text: text,
        }),
      });

      if (res.ok) {
        playAlertSound('new_request');
        showToast('🎉 Solicitação enviada com sucesso para o Philippe! Ele já recebeu na Central dele.');
        setDirectDescription('');
        setCurrentStep(1);
        await fetchRequests();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Erro ao registrar solicitação.');
      }
    } catch {
      alert('Falha na conexão ao enviar solicitação.');
    } finally {
      setIsSubmittingDirect(false);
    }
  };

  // ─── 2. TRANSIÇÃO PARA O PASSO 3: CHATBOT PREVIAMENTE ABASTECIDO ───────────
  const handleGoToStep3 = (sec?: string, cat?: string) => {
    const finalSec = sec || selectedSection || '📸 Capa / Início';
    const finalCat = cat || selectedCategory || 'Tenho uma ideia';

    setSelectedSection(finalSec);
    setSelectedCategory(finalCat);
    setChatCategory(finalCat);
    setCurrentStep(3);

    // Mensagem de acolhimento do Assistente, JÁ PREVIAMENTE ABASTECIDO com as seleções
    const initialGreeting = `Olá Nua! ✨ Já registrei aqui a sua escolha:

• 📍 **Parte do site:** ${finalSec}
• 🎯 **Objetivo:** ${finalCat}

Como você gostaria que essa mudança ficasse no seu site? Pode me contar com suas próprias palavras com o nível de detalhes que quiser, ou tocar em uma das sugestões rápidas abaixo para começarmos!`;

    setChatMessages([
      {
        role: 'assistant',
        content: initialGreeting,
      },
    ]);
    setEnoughInformation(false);
    setAiTriage(null);
    setCurrentChatInput('');
  };

  const handleSendChatMessage = async (textToSend?: string) => {
    const text = (textToSend || currentChatInput).trim();
    if (!text || isAiThinking) return;

    unlockAudioContext();
    const newHistory: Message[] = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(newHistory);
    setCurrentChatInput('');
    setIsAiThinking(true);

    try {
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();

      const apiHistory = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${apiUrl}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'interview',
          category: `${chatCategory || selectedCategory} • ${selectedSection}`,
          history: apiHistory.slice(0, -1),
          message: text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply,
            suggestedOptions: data.suggestedOptions,
          },
        ]);

        if (data.enoughInformation) {
          setEnoughInformation(true);
          setAiTriage(data.triage || null);
        }
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Entendi o que você precisa! Já estruturei as informações principais para o desenvolvedor. Podemos enviar?',
            suggestedOptions: ['Sim, pode enviar ao Philippe!', 'Quero adicionar mais um detalhe'],
          },
        ]);
        setEnoughInformation(true);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Compreendi perfeitamente. Deseja que eu envie agora para o Philippe?',
        },
      ]);
      setEnoughInformation(true);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleConfirmAndSendChat = async () => {
    if (isSubmittingChat) return;
    setIsSubmittingChat(true);

    try {
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();
      const userMsgs = chatMessages.filter((m) => m.role === 'user');
      let combinedText = userMsgs.map((m) => m.content).join(' \n');

      if (!combinedText.trim()) {
        if (currentChatInput.trim()) {
          combinedText = currentChatInput.trim();
        } else {
          combinedText = `Solicitação para ${selectedSection}: ${selectedCategory}`;
        }
      }

      const res = await fetch(`${apiUrl}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'create',
          category: `${chatCategory || selectedCategory} • ${selectedSection}`,
          text: combinedText,
          triage: aiTriage || undefined,
          conversation: chatMessages,
        }),
      });

      if (res.ok) {
        playAlertSound('new_request');
        showToast('🎉 Sua solicitação foi enviada com sucesso para a Central do Philippe!');
        setChatCategory(null);
        setChatMessages([]);
        setEnoughInformation(false);
        setAiTriage(null);
        setCurrentChatInput('');
        setCurrentStep(1);
        await fetchRequests();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Erro ao registrar solicitação.');
      }
    } catch {
      alert('Falha na conexão ao enviar solicitação.');
    } finally {
      setIsSubmittingChat(false);
    }
  };

  // Resposta em solicitação existente
  const handleSendReply = async (requestId: string) => {
    const text = (replyText[requestId] || '').trim();
    if (!text || sendingReply) return;

    unlockAudioContext();
    setSendingReply(requestId);
    try {
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();
      const res = await fetch(`${apiUrl}/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'message',
          id: requestId,
          text,
          role: 'client',
        }),
      });

      if (res.ok) {
        setReplyText((prev) => ({ ...prev, [requestId]: '' }));
        playAlertSound('new_message');
        await fetchRequests();
        showToast('Mensagem enviada para o Philippe!');
      } else {
        alert('Erro ao enviar mensagem.');
      }
    } catch {
      alert('Falha na conexão ao responder.');
    } finally {
      setSendingReply(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* MODAL DE CELEBRAÇÃO QUANDO O PHILIPPE CONCLUI UMA SOLICITAÇÃO */}
      <AnimatePresence>
        {celebrationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-emerald-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-[0_10px_50px_rgba(16,185,129,0.3)] relative overflow-hidden"
            >
              {/* Brilho decorativo no topo */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

              <button
                onClick={() => setCelebrationModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                  Novidade no Seu Site!
                </span>
                <h3 className="text-xl sm:text-2xl font-serif text-white">
                  Solicitação Concluída com Sucesso!
                </h3>
                <p className="text-zinc-300 text-xs sm:text-sm font-light leading-relaxed">
                  O Philippe acabou de finalizar e publicar no seu site oficial a solicitação:
                </p>
                <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-medium text-xs sm:text-sm">
                  "{celebrationModal.title}"
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCelebrationModal(null);
                    setOpenRequestId(celebrationModal.id);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Ver Detalhes do Pedido
                </button>
                <button
                  type="button"
                  onClick={() => setCelebrationModal(null)}
                  className="py-3 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs transition-all cursor-pointer"
                >
                  Maravilha, Entendido!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST DE FEEDBACK FLUTUANTE */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-900 border border-[#f4a7b9]/40 text-white text-xs shadow-2xl animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-[#f4a7b9]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── CABEÇALHO DA CENTRAL DA CLIENTE ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80">
        <div className="space-y-1">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.2em] uppercase flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" />
            Central de Solicitações Nua Borges
          </span>
          <h2 className="text-xl sm:text-2xl font-serif text-white">
            O que você gostaria de solicitar hoje?
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm font-light">
            Faça seu pedido diretamente para o Philippe com facilidade e rapidez.
          </p>
        </div>

        {/* Alerta Sonoro Discreto & Confiável */}
        <button
          type="button"
          onClick={handleTestAudio}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer shrink-0 border ${
            audioFeedback
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Clique para testar se os avisos sonoros de novas mensagens estão ativos no seu aparelho"
        >
          <Volume2 className="w-3.5 h-3.5 text-[#f4a7b9]" />
          <span>{audioFeedback ? 'Som testado ✓' : 'Avisos sonoros ativos'}</span>
        </button>
      </div>

      {/* ─── DICA DE OURO PROEMINENTE: MAIS DETALHES = MAIS PERFEITO ────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#f4a7b9]/15 via-zinc-900/70 to-purple-500/10 border border-[#f4a7b9]/30 flex items-start gap-3.5 shadow-lg shadow-[#f4a7b9]/5">
        <div className="p-2.5 rounded-xl bg-[#f4a7b9]/20 text-[#f4a7b9] shrink-0 mt-0.5">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white">
            💡 Dica da nossa equipe: Quanto mais detalhes você nos contar, mais perfeito fica!
          </h4>
          <p className="text-xs text-zinc-300 leading-relaxed font-light">
            Conte se é no celular ou no computador, qual texto ou foto específica gostaria de trocar, e como imagina o visual.
            Não precisa se preocupar com nada técnico — basta descrever com suas próprias palavras para ficar 100% fiel ao seu gosto!
          </p>
        </div>
      </div>

      {/* ─── PAINEL PRINCIPAL: FORMULÁRIO DINÂMICO INTERATIVO EM 3 PASSOS ───── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800/90 space-y-7 backdrop-blur-sm shadow-xl">
        
        {/* BARRA SUPERIOR DE PROGRESSO E ETAPAS (STEPPER) */}
        <div className="space-y-4 pb-2 border-b border-zinc-800/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f4a7b9] animate-pulse" />
              <span>Etapa {currentStep} de 3 — {currentStep === 1 ? 'Localização no Site' : currentStep === 2 ? 'Tipo de Mudança' : 'Assistente Inteligente'}</span>
            </span>

            {/* Ação rápida de reset se estiver no passo 2 ou 3 */}
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-zinc-400 hover:text-[#f4a7b9] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recomeçar do início</span>
              </button>
            )}
          </div>

          {/* Barra de Progresso Gradiente */}
          <div className="relative h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#f4a7b9] via-[#fabcc9] to-[#d4af37] transition-all duration-500 ease-out"
              style={{
                width: currentStep === 1 ? '33.3%' : currentStep === 2 ? '66.6%' : '100%',
              }}
            />
          </div>

          {/* Stepper Clicável */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Step 1 Button */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                currentStep === 1
                  ? 'bg-[#f4a7b9]/15 border-[#f4a7b9] text-white shadow-md shadow-[#f4a7b9]/10'
                  : currentStep > 1
                  ? 'bg-zinc-950/70 border-emerald-500/40 text-emerald-300 hover:border-emerald-500/60'
                  : 'bg-zinc-950/40 border-zinc-800 text-zinc-500'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  currentStep === 1
                    ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                    : currentStep > 1
                    ? 'bg-emerald-500 text-zinc-950 font-bold'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {currentStep > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider block opacity-70">Passo 1</span>
                <span className="text-xs font-semibold truncate block">
                  {currentStep > 1 ? selectedSection.replace(/^[^\s]+\s*/, '') : 'Onde no site?'}
                </span>
              </div>
            </button>

            {/* Step 2 Button */}
            <button
              type="button"
              onClick={() => {
                if (currentStep >= 2) setCurrentStep(2);
              }}
              disabled={currentStep < 2}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                currentStep === 2
                  ? 'bg-[#f4a7b9]/15 border-[#f4a7b9] text-white shadow-md shadow-[#f4a7b9]/10'
                  : currentStep > 2
                  ? 'bg-zinc-950/70 border-emerald-500/40 text-emerald-300 hover:border-emerald-500/60'
                  : 'bg-zinc-950/30 border-zinc-800/60 text-zinc-500 cursor-not-allowed opacity-60'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  currentStep === 2
                    ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                    : currentStep > 2
                    ? 'bg-emerald-500 text-zinc-950 font-bold'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {currentStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider block opacity-70">Passo 2</span>
                <span className="text-xs font-semibold truncate block">
                  {currentStep > 2 ? selectedCategory : 'O que deseja?'}
                </span>
              </div>
            </button>

            {/* Step 3 Button */}
            <button
              type="button"
              onClick={() => {
                if (currentStep !== 3) handleGoToStep3();
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                currentStep === 3
                  ? 'bg-[#f4a7b9]/15 border-[#f4a7b9] text-white shadow-md shadow-[#f4a7b9]/10'
                  : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-500'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  currentStep === 3
                    ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                3
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider block opacity-70">Passo 3</span>
                <span className="text-xs font-semibold truncate block">Assistente com IA</span>
              </div>
            </button>
          </div>
        </div>

        {/* CONTEÚDO DAS ETAPAS COM TRANSIÇÃO SUAVE */}
        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════════════════════════════
              PASSO 1: ONDE NO SITE VOCÊ QUER FAZER ESSA MUDANÇA?
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-serif text-white flex items-center gap-2">
                    <span className="text-[#f4a7b9]">1.</span>
                    <span>Em qual parte do site você quer fazer essa mudança?</span>
                  </h3>
                  <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                    Selecione uma área abaixo
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  Toque na área onde deseja realizar a alteração para que o Philippe e o assistente compreendam o contexto exato:
                </p>
              </div>

              {/* Grid de Cards de Seções do Site */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SITE_SECTIONS.map((sec) => {
                  const isSelected = selectedSection === sec.label;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        setSelectedSection(sec.label);
                        setCurrentStep(2);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#f4a7b9]/20 via-zinc-900 to-zinc-950 border-[#f4a7b9] shadow-lg shadow-[#f4a7b9]/15 ring-1 ring-[#f4a7b9]/50 -translate-y-0.5'
                          : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60 text-zinc-300 hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 w-full mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-2 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:scale-105 transition-transform shrink-0">
                            {sec.icon}
                          </span>
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-white block">
                              {sec.title}
                            </span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">
                              {sec.tag}
                            </span>
                          </div>
                        </div>

                        {/* Indicador de Seleção */}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? 'bg-[#f4a7b9] border-[#f4a7b9] text-zinc-950'
                              : 'border-zinc-700 bg-zinc-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      <p className="text-xs text-zinc-400 font-light leading-relaxed mt-1">
                        {sec.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Botões de Ação do Passo 1 */}
              <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-zinc-800/70">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSection('🌐 Todo o Site / Geral');
                    setCurrentStep(2);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Pular etapa (Aplicar ao site todo)
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-[0_4px_25px_rgba(244,167,185,0.35)] cursor-pointer hover:gap-3"
                >
                  <span>Avançar para o Tipo de Pedido</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              PASSO 2: O QUE VOCÊ GOSTARIA DE FAZER?
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Badge Contextual do Passo Anterior */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                  <span className="text-[10px] uppercase font-mono text-zinc-500">Área Escolhida:</span>
                  <strong className="text-white">{selectedSection}</strong>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] text-[#f4a7b9] hover:underline cursor-pointer ml-1"
                  >
                    (Trocar)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-serif text-white flex items-center gap-2">
                    <span className="text-[#f4a7b9]">2.</span>
                    <span>O que você gostaria de fazer?</span>
                  </h3>
                  <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                    Escolha a intenção da mudança
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  Selecione o objetivo da sua solicitação para orientar o assistente e o Philippe:
                </p>
              </div>

              {/* Grid das 8 Categorias / Intenções */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.title;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.title);
                        handleGoToStep3(selectedSection, cat.title);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                        isSelected
                          ? `${cat.activeBorder} -translate-y-0.5 text-white`
                          : `${cat.color} text-zinc-300 hover:-translate-y-0.5 hover:text-white`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 w-full mb-2">
                        <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 shrink-0">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-[#f4a7b9]' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? 'bg-[#f4a7b9] border-[#f4a7b9] text-zinc-950'
                              : 'border-zinc-700 bg-zinc-900'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs sm:text-sm font-semibold text-white block">
                          {cat.title}
                        </span>
                        <p className="text-[11px] text-zinc-400 font-light leading-relaxed line-clamp-2">
                          {cat.desc}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-800/40">
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {cat.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Botões de Ação do Passo 2 */}
              <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-zinc-800/70">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar ao Passo 1</span>
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleGoToStep3(selectedSection, 'Tenho uma ideia')}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-full text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Pular etapa
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGoToStep3(selectedSection, selectedCategory)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-[0_4px_25px_rgba(244,167,185,0.35)] cursor-pointer hover:gap-3"
                  >
                    <span>Avançar para o Assistente</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              PASSO 3: CHATBOT PREVIAMENTE ABASTECIDO COM AS INFORMAÇÕES
             ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="space-y-6"
            >
              {/* Header do Passo 3 com badges das escolhas pré-abastecidas */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-400 font-medium">Informações abastecidas:</span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 text-xs text-white">
                    <span>📍 <strong>{selectedSection}</strong></span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-xs text-purple-300">
                    <span>🎯 <strong>{selectedCategory}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-[#f4a7b9] hover:underline font-medium ml-1 cursor-pointer"
                  >
                    (Alterar escolhas)
                  </button>
                </div>

                {/* Alternador de Modo no Passo 3: Chatbot vs Texto Direto */}
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setStep3Mode('chat')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      step3Mode === 'chat'
                        ? 'bg-[#f4a7b9] text-zinc-950 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Assistente IA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep3Mode('direct')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      step3Mode === 'direct'
                        ? 'bg-[#f4a7b9] text-zinc-950 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Texto Direto</span>
                  </button>
                </div>
              </div>

              {/* ── SUB-MODO A: ASSISTENTE INTELIGENTE COM CHAT PRE-ABASTECIDO ── */}
              {step3Mode === 'chat' && (
                <div className="space-y-4">
                  {/* Janela de Mensagens com o Assistente */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/90 border border-zinc-800 max-h-[420px] overflow-y-auto space-y-4 scrollbar-thin">
                    {chatMessages.map((msg, idx) => {
                      const isAssistant = msg.role === 'assistant';
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                              isAssistant
                                ? 'bg-[#f4a7b9] text-zinc-950 shadow-md shadow-[#f4a7b9]/20'
                                : 'bg-zinc-800 text-zinc-200'
                            }`}
                          >
                            {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>

                          <div className="space-y-2 max-w-[85%]">
                            <div
                              className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                isAssistant
                                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-sm shadow-sm'
                                  : 'bg-[#f4a7b9]/20 border border-[#f4a7b9]/40 text-white rounded-tr-sm'
                              }`}
                            >
                              <FormattedText text={msg.content} />
                            </div>

                            {/* Opções rápidas sugeridas pelo assistente na resposta */}
                            {isAssistant && msg.suggestedOptions && msg.suggestedOptions.length > 0 && !enoughInformation && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {msg.suggestedOptions.map((opt, oIdx) => (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => handleSendChatMessage(opt)}
                                    className="px-3 py-1.5 rounded-full text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#f4a7b9] text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Sugestões Contextuais Dinâmicas (na 1ª mensagem do assistente) */}
                    {chatMessages.length === 1 && !enoughInformation && (
                      <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
                        <span className="text-[11px] text-[#f4a7b9] font-medium block">
                          💡 Sugestões rápidas para a sua seleção ({selectedSection}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {getContextSuggestions(selectedSection, selectedCategory).map((sug, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => handleSendChatMessage(sug)}
                              className="px-3 py-1 rounded-lg text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-[#f4a7b9]/60 text-zinc-300 hover:text-white transition-all cursor-pointer"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Indicador de Digitação da IA */}
                    {isAiThinking && (
                      <div className="flex items-center gap-2 text-xs text-[#f4a7b9] pl-10 font-mono">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Assistente pensando e preparando resposta...</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Confirmação do Chat quando finalizado pela IA */}
                  {enoughInformation && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 rounded-2xl bg-gradient-to-r from-[#f4a7b9]/15 via-zinc-900/80 to-indigo-500/10 border border-[#f4a7b9]/40 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-[#f4a7b9]">
                        <CheckCircle2 className="w-4 h-4" />
                        <h4 className="text-sm font-semibold">Tudo pronto para enviar ao Philippe!</h4>
                      </div>

                      {aiTriage && (
                        <div className="text-xs space-y-1.5 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                          <p><strong className="text-zinc-400">Título:</strong> {aiTriage.title}</p>
                          <p><strong className="text-zinc-400">Resumo:</strong> {aiTriage.summary}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-[11px] text-zinc-400">
                          Basta clicar em confirmar para que o Philippe receba instantaneamente na Central dele.
                        </span>

                        <button
                          type="button"
                          disabled={isSubmittingChat}
                          onClick={handleConfirmAndSendChat}
                          className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-[0_4px_20px_rgba(244,167,185,0.35)] cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isSubmittingChat ? 'Registrando...' : 'Confirmar e Enviar para o Philippe'}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Campo de Entrada do Chat e Botão de Envio */}
                  {!enoughInformation && (
                    <div className="space-y-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendChatMessage();
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={currentChatInput}
                          onChange={(e) => setCurrentChatInput(e.target.value)}
                          placeholder="Digite aqui o que você gostaria de mudar ou adicione detalhes..."
                          disabled={isAiThinking}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={isAiThinking || !currentChatInput.trim()}
                          className="px-5 py-3 rounded-2xl bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all disabled:opacity-50 cursor-pointer shrink-0 inline-flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Enviar Mensagem</span>
                        </button>
                      </form>

                      {/* Botão de Envio Direto ao Desenvolvedor (sempre acessível para a cliente) */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-zinc-500">
                          {chatMessages.filter(m => m.role === 'user').length > 0 
                            ? 'Sinta-se livre para enviar quando achar que já detalhou o suficiente.'
                            : 'Você também pode enviar diretamente agora mesmo:'}
                        </span>

                        <button
                          type="button"
                          disabled={isSubmittingChat}
                          onClick={handleConfirmAndSendChat}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-800 hover:bg-[#f4a7b9] hover:text-zinc-950 text-white font-medium text-xs transition-all border border-zinc-700 hover:border-[#f4a7b9] cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSubmittingChat ? 'Enviando...' : 'Enviar Solicitação para o Philippe'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── SUB-MODO B: TEXTO DIRETO COM TERMÔMETRO DE DETALHES ──────── */}
              {step3Mode === 'direct' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-300">
                        ✍️ Conte com suas palavras o que você gostaria que fosse feito:
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {directDescription.length} caracteres
                      </span>
                    </div>

                    <textarea
                      rows={5}
                      value={directDescription}
                      onChange={(e) => setDirectDescription(e.target.value)}
                      placeholder={`Exemplo: Na seção ${selectedSection}, gostaria de ${selectedCategory.toLowerCase()}. Pensei em algo bem visual, que fique lindo no celular e com cores harmônicas...`}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
                    />

                    {/* Termômetro Amigável de Detalhes */}
                    <div className="flex items-center justify-between px-2 text-[11px]">
                      <span
                        className={
                          directDescription.length > 70
                            ? 'text-emerald-400 font-medium'
                            : directDescription.length > 25
                            ? 'text-amber-300'
                            : 'text-zinc-500'
                        }
                      >
                        {directDescription.length > 70
                          ? '🌟 Excelente nível de detalhes! O Philippe vai conseguir fazer exatamente como você quer!'
                          : directDescription.length > 25
                          ? '✨ Bom nível de detalhes! Se puder contar mais algum detalhe, melhor ainda!'
                          : '💡 Quanto mais detalhes você nos contar, mais perfeito fica o resultado!'}
                      </span>
                    </div>

                    {/* Chips Rápidos de Ideias para Injetar com 1 Toque */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] text-zinc-400 font-light block">
                        Toque para adicionar detalhes comuns à sua mensagem:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_DETAIL_IDEAS.map((idea, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setDirectDescription((prev) => (prev ? `${prev} ${idea}` : idea));
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-[#f4a7b9]/50 transition-all cursor-pointer"
                          >
                            {idea}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Botão de Envio 1-Clique do Texto Direto */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={isSubmittingDirect || directDescription.trim().length < 5}
                      onClick={handleSendDirectRequest}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-[0_4px_25px_rgba(244,167,185,0.35)] disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingDirect ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Enviando para a Central do Philippe...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Enviar Solicitação para o Philippe</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Botão de Voltar ao Passo 2 */}
              <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar ao Passo 2 (Tipo de Mudança)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Recomeçar do início</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── BLOCO INFERIOR: SEUS PEDIDOS REGISTRADOS ────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-base font-medium text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#f4a7b9]" />
            <span>Seus Pedidos Registrados ({requests.length})</span>
          </h3>
          <button
            type="button"
            onClick={() => fetchRequests()}
            className="text-xs text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar Agora</span>
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="p-10 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 text-center space-y-2">
            <Lightbulb className="w-8 h-8 text-zinc-600 mx-auto" />
            <h4 className="text-sm font-medium text-zinc-300">Nenhum pedido enviado ainda</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Preencha o formulário acima para registrar sua primeira solicitação para o Philippe.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((item) => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;
              const StatusIcon = cfg.icon;
              const isOpen = openRequestId === item.id;
              const clientReplies = item.messages || [];

              return (
                <div
                  key={item.id}
                  className={`rounded-3xl border transition-all overflow-hidden ${
                    item.status === 'done'
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                      : 'bg-zinc-900/40 border-zinc-800/90 hover:border-zinc-700/80'
                  }`}
                >
                  {/* Cabeçalho do Card */}
                  <div
                    onClick={() => setOpenRequestId(isOpen ? null : item.id)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.badgeClass}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{cfg.label}</span>
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                      <p className="text-xs text-zinc-400 line-clamp-1">{item.summary}</p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                        <MessageSquare className="w-3 h-3" />
                        {clientReplies.length}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Corpo Expansível */}
                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 border-t border-zinc-800/80 space-y-4 text-xs">
                      {/* Descrição do status atual */}
                      <div
                        className={`p-3.5 rounded-2xl border space-y-1 ${
                          item.status === 'done'
                            ? 'bg-emerald-950/40 border-emerald-500/30'
                            : 'bg-zinc-950/70 border-zinc-800/80'
                        }`}
                      >
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">
                          Status Atual do Pedido
                        </span>
                        <p className="text-zinc-200 text-xs font-medium">{cfg.description}</p>
                      </div>

                      {/* Pedido inicial / resumo */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">
                          O que foi solicitado
                        </span>
                        <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-zinc-200 leading-relaxed">
                          <FormattedText text={item.summary || item.originalText} />
                        </div>
                      </div>

                      {/* Conversa / Mensagens */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">
                          Histórico de Mensagens ({clientReplies.length})
                        </span>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {clientReplies.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className={`p-3 rounded-2xl ${
                                m.role === 'client'
                                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 ml-4'
                                  : 'bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 text-white mr-4'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                                <span className="font-semibold text-[#f4a7b9]">
                                  {m.role === 'client' ? 'Você (Nua Borges)' : 'Philippe (Desenvolvedor)'}
                                </span>
                                {m.at && (
                                  <span>
                                    {new Date(m.at).toLocaleTimeString('pt-BR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                )}
                              </div>
                              <FormattedText text={m.text} className="text-xs" />
                            </div>
                          ))}
                        </div>

                        {/* Campo para responder / adicionar detalhe ao pedido */}
                        <div className="pt-2 flex gap-2">
                          <input
                            type="text"
                            placeholder="Adicionar mais um detalhe ou responder ao Philippe..."
                            value={replyText[item.id] || ''}
                            onChange={(e) =>
                              setReplyText((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendReply(item.id);
                            }}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
                          />
                          <button
                            type="button"
                            disabled={sendingReply === item.id || !replyText[item.id]?.trim()}
                            onClick={() => handleSendReply(item.id)}
                            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-[#f4a7b9] hover:text-zinc-950 text-white font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {sendingReply === item.id ? 'Enviando...' : 'Enviar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
