'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lightbulb,
  Bot,
  Send,
  Search,
  Volume2,
  Bell,
  X,
  Check,
  ArrowRight,
  MessageSquarePlus,
  Plus,
} from 'lucide-react';
import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';
import { playAlertSound, flashTabTitle, unlockAudioContext } from '@/lib/audioAlerts';
import { isLocalhost } from '@/lib/env';
import {
  createClientRequest,
  fetchClientRequests,
  approveClientPlan,
  sendClientMessage,
} from '@/lib/services/nua/requestsService';

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
        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-[#f4a7b9] shrink-0 mt-1">•</span>
              <span className="flex-1">{trimmed.replace(/^[•\-]\s*/, '')}</span>
            </div>
          );
        }
        return <p key={idx}>{line}</p>;
      })}
    </div>
  );
}

export function ClientRequestsEditor() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'review' | 'done'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
  const [isLocal, setIsLocal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualCategory, setManualCategory] = useState('Melhoria Geral');
  const [submittingManual, setSubmittingManual] = useState(false);

  useEffect(() => {
    setIsLocal(isLocalhost());
  }, []);

  // Referência para comparar mudanças de status anteriores e disparar sons
  const prevStatusesRef = useRef<Map<string, string>>(new Map());
  const isInitialLoadRef = useRef(true);

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

  const handleOpenNuaAi = () => {
    window.dispatchEvent(new CustomEvent('open_nua_ai'));
  };

  const handleSendManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setSubmittingManual(true);
    try {
      unlockAudioContext();
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();
      const title = manualTitle.trim() || manualText.trim().slice(0, 60);

      const result = await createClientRequest({
        text: manualText.trim(),
        title,
        category: manualCategory,
        triage: {
          title,
          summary: manualText.trim().slice(0, 300),
          type: 'improvement',
          priority: 'medium',
          contractScope: 'garantia',
          source: 'manual',
          targetFiles: ['components/Header.tsx'],
        },
      });
      if (!result.success) {
        throw new Error(result.error || 'Falha ao enviar solicitação.');
      }

      const createdItem = result.request;

      try {
        const localKey = 'nua_local_requests_v1';
        const list: RequestItem[] = JSON.parse(localStorage.getItem(localKey) || '[]');
        if (createdItem) {
          list.unshift(createdItem as any);
          localStorage.setItem(localKey, JSON.stringify(list));
        }
      } catch {}

      setManualTitle('');
      setManualText('');
      setShowManualModal(false);
      playAlertSound('task_done');
      showToast('Solicitação registrada com sucesso! Philippe foi notificado.');
      await fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar solicitação.');
    } finally {
      setSubmittingManual(false);
    }
  };

  // Carrega e sincroniza as solicitações em tempo real (Polling a cada 4 segundos + localStorage fallback)
  const fetchRequests = useCallback(async () => {
    try {
      let currentList: RequestItem[] = [];

      try {
        const res = await fetchClientRequests();
        if (res.success && res.requests) {
          currentList = res.requests as any;
        }
      } catch (err) {
        // Modo offline ou local
      }

      // Mescla com pedidos armazenados localmente para desenvolvimento e feedback instantâneo
      try {
        const localKey = 'nua_local_requests_v1';
        const localList: RequestItem[] = JSON.parse(localStorage.getItem(localKey) || '[]');
        if (localList.length > 0) {
          const map = new Map<string, RequestItem>();
          currentList.forEach((r) => map.set(r.id, r));
          localList.forEach((r) => {
            if (!map.has(r.id)) {
              map.set(r.id, r);
            }
          });
          currentList = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
      } catch {}

      setRequests(currentList);

      // Se NÃO for a primeira carga, verifica se algum pedido mudou de status
      if (!isInitialLoadRef.current) {
        currentList.forEach((req) => {
          const prevStatus = prevStatusesRef.current.get(req.id);
          if (prevStatus && prevStatus !== req.status) {
            if (req.status === 'done') {
              playAlertSound('task_done');
              flashTabTitle('🎉 PEDIDO CONCLUÍDO! - Nua Borges');
              setCelebrationModal({
                id: req.id,
                title: req.title,
                summary: req.summary,
              });
            } else if (req.status === 'in_progress') {
              playAlertSound('status_progress');
              showToast(`⚡ O Philippe começou a programar seu pedido: "${req.title}"!`);
            } else if (req.status === 'review') {
              playAlertSound('task_done');
              showToast(`✨ O Philippe finalizou e deixou pronto para sua revisão: "${req.title}"!`);
            }
          }
        });
      }

      const newMap = new Map<string, string>();
      currentList.forEach((req) => newMap.set(req.id, req.status));
      prevStatusesRef.current = newMap;
      isInitialLoadRef.current = false;
    } catch (err) {
      console.error('[ClientRequests] Erro ao sincronizar solicitações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling contínuo a cada 4 segundos e escuta de eventos da Nua IA
  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 4000);

    const handleRequestCreated = () => {
      fetchRequests();
    };

    window.addEventListener('nua_request_created', handleRequestCreated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('nua_request_created', handleRequestCreated);
    };
  }, [fetchRequests]);

  // Resposta da cliente em solicitação existente
  const handleSendReply = async (requestId: string) => {
    const text = (replyText[requestId] || '').trim();
    if (!text || sendingReply) return;

    unlockAudioContext();
    setSendingReply(requestId);
    try {
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();
      let sentRemote = false;

      try {
        sentRemote = await sendClientMessage(requestId, text);
      } catch {}

      // Atualiza também no localStorage
      try {
        const localKey = 'nua_local_requests_v1';
        const list: RequestItem[] = JSON.parse(localStorage.getItem(localKey) || '[]');
        const target = list.find((r) => r.id === requestId);
        if (target) {
          target.messages = target.messages || [];
          target.messages.push({
            at: new Date().toISOString(),
            role: 'client',
            text,
          });
          target.updatedAt = new Date().toISOString();
          localStorage.setItem(localKey, JSON.stringify(list));
        }
      } catch {}

      setReplyText((prev) => ({ ...prev, [requestId]: '' }));
      playAlertSound('new_message');
      await fetchRequests();
      showToast('Mensagem enviada para o Philippe!');
    } catch {
      alert('Falha na conexão ao responder.');
    } finally {
      setSendingReply(null);
    }
  };

  // Filtragem dos pedidos
  const filteredRequests = requests.filter((req) => {
    if (statusFilter === 'open') {
      if (!['new', 'analyzing', 'planned'].includes(req.status)) return false;
    } else if (statusFilter === 'in_progress') {
      if (req.status !== 'in_progress') return false;
    } else if (statusFilter === 'review') {
      if (req.status !== 'review') return false;
    } else if (statusFilter === 'done') {
      if (!['done', 'rejected'].includes(req.status)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = req.title.toLowerCase().includes(q);
      const matchSummary = (req.summary || '').toLowerCase().includes(q);
      const matchCategory = (req.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSummary && !matchCategory) return false;
    }

    return true;
  });

  const countOpen = requests.filter((r) => ['new', 'analyzing', 'planned'].includes(r.status)).length;
  const countProgress = requests.filter((r) => r.status === 'in_progress').length;
  const countReview = requests.filter((r) => r.status === 'review').length;
  const countDone = requests.filter((r) => r.status === 'done').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
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
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

              <button
                onClick={() => setCelebrationModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
                  ✦ Pedido Concluído com Sucesso ✦
                </span>
                <h3 className="text-xl sm:text-2xl font-serif text-white">
                  "{celebrationModal.title}"
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 font-light leading-relaxed">
                  O desenvolvedor Philippe concluiu, testou e publicou as alterações solicitadas no seu site oficial!
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setCelebrationModal(null)}
                  className="px-8 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  Perfeito! Fechar aviso
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST FLUTUANTE DE NOTIFICAÇÃO EM TEMPO REAL */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-zinc-900/95 border border-[#f4a7b9]/40 text-white text-xs shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-md"
          >
            <div className="p-2 rounded-xl bg-[#f4a7b9]/20 text-[#f4a7b9] shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <p className="flex-1 leading-relaxed text-zinc-200">{toastMessage}</p>
            <button
              onClick={() => setToastMessage(null)}
              className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CABEÇALHO DO PAINEL DE PEDIDOS ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80">
        <div className="space-y-1">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.2em] uppercase flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Acompanhamento & Atendimento
          </span>
          <h2 className="text-xl sm:text-2xl font-serif text-white">
            Meus Pedidos ao Desenvolvedor
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm font-light">
            Consulte o status em tempo real, veja as respostas do Philippe e acompanhe cada melhoria do seu site.
          </p>
        </div>

        {/* Alerta Sonoro Discreto & Confiável */}
        <button
          type="button"
          onClick={handleTestAudio}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-medium transition-all cursor-pointer shrink-0 border ${
            audioFeedback
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Clique para testar se os avisos sonoros de atualizações de pedidos estão funcionando no seu aparelho"
        >
          <Volume2 className="w-3.5 h-3.5 text-[#f4a7b9]" />
          <span>{audioFeedback ? 'Som testado ✓' : 'Avisos sonoros ativos'}</span>
        </button>
      </div>

      {/* ─── BANNER: COMO ENVIAR PEDIDOS AO DESENVOLVEDOR ─────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#f4a7b9]/15 via-zinc-900/80 to-purple-500/10 border border-[#f4a7b9]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg shadow-[#f4a7b9]/5">
        <div className="flex items-start gap-3.5 max-w-2xl">
          <div className="p-2.5 rounded-2xl bg-[#f4a7b9]/20 text-[#f4a7b9] shrink-0 mt-0.5 border border-[#f4a7b9]/30">
            {isLocal ? <Bot className="w-5 h-5" /> : <MessageSquarePlus className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">
              Precisa de uma nova alteração ou tem uma ideia para o site?
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed font-light">
              {isLocal ? (
                <>
                  Envie sua solicitação conversando com a <strong>Nua IA</strong> pelo chat assistente.
                  Ela organiza os detalhes do que você precisa e, com a sua confirmação, encaminha o pedido para o Philippe iniciar a implementação.
                </>
              ) : (
                <>
                  Envie sua solicitação diretamente para o Philippe acompanhar, responder e implementar no seu site oficial.
                </>
              )}
            </p>
          </div>
        </div>

        {isLocal ? (
          <button
            type="button"
            onClick={handleOpenNuaAi}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer shrink-0"
          >
            <Bot className="w-4 h-4" />
            <span>Abrir Nua IA</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Solicitação</span>
          </button>
        )}
      </div>

      {/* ─── MODAL DE NOVA SOLICITAÇÃO (EM PRODUÇÃO QUANDO O CHAT NUA IA NÃO ESTÁ ATIVO) ─── */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[#f4a7b9] text-[10px] font-mono tracking-widest uppercase font-semibold">
                  Solicitação ao Desenvolvedor
                </span>
                <h3 className="text-xl font-serif text-white">Nova Solicitação</h3>
                <p className="text-xs text-zinc-400">
                  Descreva o que você gostaria de mudar, adicionar ou ajustar no seu site.
                </p>
              </div>

              <form onSubmit={handleSendManualRequest} className="space-y-3.5 pt-2">
                <div>
                  <label className="block text-zinc-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                    Título ou Assunto (Opcional)
                  </label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Ex: Trocar foto da capa, ajuste no texto de contato..."
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#f4a7b9]"
                  >
                    <option value="Melhoria Geral">💡 Ideia / Melhoria Geral</option>
                    <option value="Visual & Design">🎨 Visual & Aparência</option>
                    <option value="Ajuste no Celular">📱 Ajuste no Celular</option>
                    <option value="Texto ou Foto">📸 Textos ou Fotos</option>
                    <option value="Problema ou Bug">🐛 Problema ou Dúvida</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                    O que precisa ser feito? *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Explique com suas palavras os detalhes do que você deseja que seja alterado..."
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingManual || !manualText.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {submittingManual ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar Solicitação</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── FILTROS DE STATUS E BARRA DE BUSCA ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Chips de Filtro */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Todos ({requests.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'open'
                ? 'bg-sky-400 text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>Em Fila / Análise</span>
            {countOpen > 0 && (
              <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 text-[10px] flex items-center justify-center font-mono">
                {countOpen}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'in_progress'
                ? 'bg-amber-400 text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>Em Desenvolvimento</span>
            {countProgress > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] flex items-center justify-center font-mono">
                {countProgress}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('review')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'review'
                ? 'bg-[#f4a7b9] text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>Revisão</span>
            {countReview > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#f4a7b9]/20 text-[#f4a7b9] text-[10px] flex items-center justify-center font-mono">
                {countReview}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('done')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'done'
                ? 'bg-emerald-400 text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>Concluídos</span>
            {countDone > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center justify-center font-mono">
                {countDone}
              </span>
            )}
          </button>
        </div>

        {/* Busca e Atualizar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nos pedidos..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-full text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9]/50"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchRequests()}
            title="Atualizar lista agora"
            className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── LISTA DOS PEDIDOS REGISTRADOS ────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="p-12 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 text-[#f4a7b9] flex items-center justify-center mx-auto">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-medium text-zinc-200">
              {searchQuery ? 'Nenhum pedido encontrado para esta busca' : 'Nenhum pedido nesta categoria'}
            </h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? 'Tente buscar com outras palavras ou limpe o campo de busca.'
                : 'Quando você registrar uma solicitação com a Nua IA, o andamento e as respostas do Philippe aparecerão aqui.'}
            </p>
          </div>
        ) : (
          filteredRequests.map((item) => {
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.badgeClass}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        <span>{cfg.label}</span>
                      </span>

                      {item.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-400 border border-zinc-700/70 font-mono">
                          {item.category}
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-500 font-mono ml-auto sm:ml-0">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
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
          })
        )}
      </div>
    </div>
  );
}
