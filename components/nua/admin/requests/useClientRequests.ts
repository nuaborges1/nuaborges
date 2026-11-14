'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';
import { playAlertSound, flashTabTitle, unlockAudioContext } from '@/lib/audioAlerts';
import { isLocalhost } from '@/lib/env';
import {
  createClientRequest,
  fetchClientRequests,
  sendClientMessage,
} from '@/lib/services/nua/requestsService';
import { RequestItem } from './types';

export function useClientRequests() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebrationModal, setCelebrationModal] = useState<{
    id: string;
    title: string;
    summary?: string;
  } | null>(null);

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
    showToast('Som testado com sucesso! Os alertas tocarão automaticamente quando o Philippe atualizar seus pedidos.');
    setTimeout(() => setAudioFeedback(false), 3000);
  };

  const handleOpenNuaAi = () => {
    window.dispatchEvent(new CustomEvent('open_nua_ai'));
  };

  const fetchRequests = useCallback(async () => {
    try {
      let currentList: RequestItem[] = [];

      try {
        const res = await fetchClientRequests();
        if (res.success && res.requests) {
          currentList = res.requests as any;
        }
      } catch (err) {
        // Offline / local fallback
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
              flashTabTitle('PEDIDO CONCLUÍDO! - Nua Borges');
              setCelebrationModal({
                id: req.id,
                title: req.title,
                summary: req.summary,
              });
            } else if (req.status === 'in_progress') {
              playAlertSound('status_progress');
              showToast(`O Philippe começou a programar seu pedido: "${req.title}"!`);
            } else if (req.status === 'review') {
              playAlertSound('task_done');
              showToast(`O Philippe finalizou e deixou pronto para sua revisão: "${req.title}"!`);
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

  const handleSendManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setSubmittingManual(true);
    try {
      unlockAudioContext();
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

  const handleSendReply = async (requestId: string) => {
    const text = (replyText[requestId] || '').trim();
    if (!text || sendingReply) return;

    unlockAudioContext();
    setSendingReply(requestId);
    try {
      try {
        await sendClientMessage(requestId, text);
      } catch {}

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

  return {
    requests,
    loading,
    celebrationModal,
    setCelebrationModal,
    openRequestId,
    setOpenRequestId,
    replyText,
    setReplyText,
    sendingReply,
    toastMessage,
    setToastMessage,
    audioFeedback,
    isLocal,
    showManualModal,
    setShowManualModal,
    manualTitle,
    setManualTitle,
    manualText,
    setManualText,
    manualCategory,
    setManualCategory,
    submittingManual,
    handleTestAudio,
    handleOpenNuaAi,
    handleSendManualRequest,
    handleSendReply,
    fetchRequests,
  };
}
