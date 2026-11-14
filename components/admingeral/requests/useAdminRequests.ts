'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { playAlertSound, flashTabTitle, unlockAudioContext } from '@/lib/audioAlerts';
import { broadcastAdminUpdate, subscribeAdminUpdates } from '@/lib/adminSync';
import { Req, STATUS_LABEL } from './types';

interface UseAdminRequestsOptions {
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>;
  targetRequestId?: string | null;
  onResetTarget?: () => void;
}

export function useAdminRequests({
  fetchFromApi,
  targetRequestId,
  onResetTarget,
}: UseAdminRequestsOptions) {
  const [items, setItems] = useState<Req[]>([]);
  const [geminiOk, setGeminiOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newRequestModal, setNewRequestModal] = useState<Req | null>(null);
  const [soundActive, setSoundActive] = useState(false);

  const prevReqsRef = useRef<Map<string, Req>>(new Map());
  const isInitialLoadRef = useRef(true);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (targetRequestId) {
      setOpenId(targetRequestId);
      onResetTarget?.();
    }
  }, [targetRequestId, onResetTarget]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleTestSound = () => {
    unlockAudioContext();
    playAlertSound('new_request');
    setSoundActive(true);
    showToast('🔊 Som de notificação testado! Você ouvirá este alerta quando a cliente enviar novas solicitações.');
    setTimeout(() => setSoundActive(false), 3000);
  };

  const load = useCallback(async () => {
    try {
      const r = await fetchFromApi('/api/requests');
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      const currentList: Req[] = d.requests || [];
      setItems(currentList);
      setGeminiOk(!!d.geminiConfigured);
      setError('');

      if (!isInitialLoadRef.current) {
        const prevMap = prevReqsRef.current;
        for (const req of currentList) {
          if (!prevMap.has(req.id)) {
            playAlertSound('new_request');
            flashTabTitle('🔴 (1) NOVA SOLICITAÇÃO! - Central phdev');
            setNewRequestModal(req);
            break;
          } else {
            const prev = prevMap.get(req.id);
            if (prev && req.messages && prev.messages && req.messages.length > prev.messages.length) {
              const lastMsg = req.messages[req.messages.length - 1];
              if (lastMsg.role === 'client') {
                playAlertSound('new_message');
                showToast(`💬 Nova mensagem da cliente no pedido: "${req.title}"`);
              }
            }
          }
        }
      }

      const newMap = new Map<string, Req>();
      currentList.forEach((req) => newMap.set(req.id, req));
      prevReqsRef.current = newMap;
      isInitialLoadRef.current = false;
    } catch {
      setError('Não foi possível carregar as solicitações.');
    }
  }, [fetchFromApi]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    const unsubscribe = subscribeAdminUpdates('requests', () => load());
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [load]);

  const post = async (payload: any) => {
    setBusy(true);
    try {
      const r = await fetchFromApi('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setError(err.error || 'Falha na operação.');
      } else {
        if (payload.action === 'update' && payload.status === 'done') {
          showToast('🎉 Status alterado para: Concluída! O painel da cliente tocará o som de celebração e exibirá o modal comemorativo.');
        } else if (payload.action === 'update' && payload.status) {
          showToast(`Status atualizado para: ${STATUS_LABEL[payload.status] || payload.status}`);
        }
        broadcastAdminUpdate('requests', { source: 'panel' });
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopyPrompt = async (req: Req, e: React.MouseEvent) => {
    e.stopPropagation();
    const promptContent = req.aiAgentPrompt || req.technicalPlan;
    if (!promptContent) return;

    try {
      await navigator.clipboard.writeText(promptContent);
      setCopiedId(req.id);
      showToast('📋 Prompt de engenharia copiado! Cole no Claude Code, Antigravity ou Cursor.');
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
      showToast('⚠️ Erro ao copiar. Selecione e copie manualmente.');
    }
  };

  const metrics = useMemo(() => {
    const total = items.length;
    const novos = items.filter((i) => i.status === 'new').length;
    const emAnalise = items.filter((i) => i.status === 'analyzing').length;
    const emDev = items.filter((i) => i.status === 'in_progress' || i.status === 'planned').length;
    const concluidos = items.filter((i) => i.status === 'done').length;
    const criticos = items.filter((i) => i.priority === 'critical' || i.priority === 'high').length;
    return { total, novos, emAnalise, emDev, concluidos, criticos };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'in_progress') {
          if (item.status !== 'in_progress' && item.status !== 'planned') return false;
        } else if (statusFilter === 'high_priority') {
          if (item.priority !== 'critical' && item.priority !== 'high') return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = item.title?.toLowerCase().includes(q);
        const inText = item.originalText?.toLowerCase().includes(q);
        const inSummary = item.summary?.toLowerCase().includes(q);
        const inFiles = item.targetFiles?.some((f) => f.toLowerCase().includes(q));
        if (!inTitle && !inText && !inSummary && !inFiles) return false;
      }
      return true;
    });
  }, [items, statusFilter, searchQuery]);

  return {
    items,
    geminiOk,
    busy,
    openId,
    setOpenId,
    replyText,
    setReplyText,
    error,
    copiedId,
    toastMessage,
    newRequestModal,
    setNewRequestModal,
    soundActive,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    showToast,
    handleTestSound,
    load,
    post,
    handleCopyPrompt,
    metrics,
    filteredItems,
  };
}
