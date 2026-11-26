/* Vinho maduro / Nua Borges */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { HeartOutlineIcon } from '@/components/Icons';
import {
  FEEDBACK_COMPLETION,
  FEEDBACK_INTRO,
  FEEDBACK_PARTS,
  ISSUE_AREA_OPTIONS,
  ISSUE_REPEAT_OPTIONS,
  PART6_ACTIVITY_OPTIONS,
  YES_NO_MAYBE_OPTIONS,
  type FeedbackAttachment,
  type FeedbackIssueInput,
  type FeedbackQuestionDef,
} from '@/lib/prelaunchFeedback';

type SessionState =
  | 'loading'
  | 'available'
  | 'in_progress'
  | 'completed'
  | 'revoked'
  | 'closed'
  | 'invalid'
  | 'rate_limited'
  | 'error';

interface SavedDraft {
  step: number;
  answers: Record<string, string | number | string[]>;
  issues: FeedbackIssueInput[];
  firstName: string;
  lastName: string;
  updatedAt: string;
}

const TOTAL_FORM_STEPS = 9; // 1..8 partes + 9 identificação/revisão

function createEmptyIssue(): FeedbackIssueInput {
  return {
    area: 'Página inicial',
    whatTrying: '',
    whatHappened: '',
    whatExpected: '',
    happenedMoreThanOnce: 'not_tried',
    attachments: [],
  };
}

function extractCodeFromBrowserUrl(): string {
  if (typeof window === 'undefined') return '';
  const match = window.location.pathname.match(/^\/avaliacao\/([^/]+)\/?$/);
  if (match && match[1] && match[1] !== '_') {
    return decodeURIComponent(match[1]).trim();
  }
  const params = new URLSearchParams(window.location.search);
  return (params.get('codigo') || params.get('c') || '').trim();
}

function draftStorageKey(linkId: string): string {
  return `nua_prelaunch_draft_${linkId}`;
}

export interface PrelaunchFeedbackFormProps {
  initialCode?: string;
}

export function PrelaunchFeedbackForm({ initialCode }: PrelaunchFeedbackFormProps) {
  const [code, setCode] = useState<string>('');
  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [linkId, setLinkId] = useState<string>('');
  const [retentionDays, setRetentionDays] = useState<number>(90);

  // 0 = apresentação, 1..8 = partes, 9 = nome/sobrenome + revisão, 10 = obrigado
  const [step, setStep] = useState<number>(0);
  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({});
  const [issues, setIssues] = useState<FeedbackIssueInput[]>([]);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [showReview, setShowReview] = useState<boolean>(false);

  const [uploadingIssueIdx, setUploadingIssueIdx] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const startedRef = useRef<boolean>(false);

  // 1. Resolve código e valida no backend
  useEffect(() => {
    const resolved = (initialCode || extractCodeFromBrowserUrl()).trim();
    setCode(resolved);

    if (!resolved) {
      setSessionState('invalid');
      setStatusMessage(
        'Este endereço de avaliação não está disponível. Use o endereço individual que a Nua enviou para você.'
      );
      return;
    }

    let active = true;
    fetch(`/api/prelaunch-feedback/session?code=${encodeURIComponent(resolved)}`, {
      method: 'GET',
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!active) return;
        const st = (data?.state || 'error') as SessionState;
        setSessionState(st);
        setStatusMessage(String(data?.message || ''));

        if ((st === 'available' || st === 'in_progress') && data?.linkId) {
          const id = String(data.linkId);
          setLinkId(id);
          if (typeof data.retentionDays === 'number') setRetentionDays(data.retentionDays);

          // Restaura progresso salvo neste navegador (somente enquanto o link não foi concluído)
          try {
            const rawDraft = localStorage.getItem(draftStorageKey(id));
            if (rawDraft) {
              const parsed = JSON.parse(rawDraft) as Partial<SavedDraft>;
              if (parsed.answers && typeof parsed.answers === 'object') setAnswers(parsed.answers);
              if (Array.isArray(parsed.issues)) setIssues(parsed.issues);
              if (typeof parsed.firstName === 'string') setFirstName(parsed.firstName);
              if (typeof parsed.lastName === 'string') setLastName(parsed.lastName);
              if (typeof parsed.step === 'number' && parsed.step >= 1 && parsed.step <= 9) {
                setHasSavedDraft(true);
              }
            }
          } catch {}
        }
      })
      .catch(() => {
        if (!active) return;
        setSessionState('error');
        setStatusMessage('Não conseguimos abrir sua avaliação agora. Tente recarregar a página em instantes.');
      });

    return () => {
      active = false;
    };
  }, [initialCode]);

  // 2. Salvamento automático local do progresso (nunca armazena o código bruto da URL)
  useEffect(() => {
    if (!linkId || step === 10) return;
    if (sessionState !== 'available' && sessionState !== 'in_progress') return;
    if (step === 0 && Object.keys(answers).length === 0 && issues.length === 0) return;

    try {
      const draft: SavedDraft = {
        step,
        answers,
        issues,
        firstName,
        lastName,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftStorageKey(linkId), JSON.stringify(draft));
    } catch {}
  }, [linkId, sessionState, step, answers, issues, firstName, lastName]);

  const markStartedOnServer = () => {
    if (startedRef.current || !code) return;
    startedRef.current = true;
    fetch('/api/prelaunch-feedback/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(() => {});
  };

  const handleBeginOrResume = () => {
    markStartedOnServer();
    if (hasSavedDraft && linkId) {
      try {
        const rawDraft = localStorage.getItem(draftStorageKey(linkId));
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft) as Partial<SavedDraft>;
          if (typeof parsed.step === 'number' && parsed.step >= 1 && parsed.step <= 9) {
            setStep(parsed.step);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
        }
      } catch {}
    }
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setAnswer = (id: string, value: string | number | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const togglePart6Activity = (val: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev.p6_atividades) ? (prev.p6_atividades as string[]) : [];
      const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val];
      return { ...prev, p6_atividades: next };
    });
  };

  const part6SelectedActivities = useMemo(() => {
    return Array.isArray(answers.p6_atividades) ? (answers.p6_atividades as string[]) : [];
  }, [answers.p6_atividades]);

  const currentPart = useMemo(() => {
    if (step < 1 || step > 8) return null;
    return FEEDBACK_PARTS.find((p) => p.part === step) || null;
  }, [step]);

  const visiblePartQuestions = useMemo(() => {
    if (!currentPart) return [];
    if (currentPart.gateQuestion && answers[currentPart.gateQuestion.id] === 'nao') {
      return [];
    }
    if (currentPart.part === 6) {
      if (part6SelectedActivities.length === 0) return [];
      return currentPart.questions.filter(
        (q) =>
          !q.showForActivities ||
          q.showForActivities.some((act) => part6SelectedActivities.includes(act))
      );
    }
    return currentPart.questions;
  }, [currentPart, answers, part6SelectedActivities]);

  const goToStep = (nextStep: number) => {
    setSubmitError(null);
    setUploadError(null);
    setStep(nextStep);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleUpdateIssue = (idx: number, patch: Partial<FeedbackIssueInput>) => {
    setIssues((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const handleAddIssue = () => {
    if (issues.length >= 15) return;
    setIssues((prev) => [...prev, createEmptyIssue()]);
  };

  const handleRemoveIssue = (idx: number) => {
    setIssues((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploadIssueImage = async (issueIdx: number, files: FileList | null) => {
    if (!files || files.length === 0 || !code) return;
    setUploadError(null);
    setUploadingIssueIdx(issueIdx);

    try {
      const currentAttachments = issues[issueIdx]?.attachments || [];
      const remainingSlots = Math.max(0, 3 - currentAttachments.length);
      const selected = Array.from(files).slice(0, remainingSlots);

      const uploaded: FeedbackAttachment[] = [];
      for (const file of selected) {
        if (file.size > 5 * 1024 * 1024) {
          setUploadError('Cada imagem pode ter no máximo 5 MB.');
          continue;
        }
        const form = new FormData();
        form.append('code', code);
        form.append('file', file);

        const res = await fetch('/api/prelaunch-feedback/upload', {
          method: 'POST',
          body: form,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok || !data?.attachment) {
          setUploadError(
            data?.error || 'Não foi possível anexar essa imagem. Use PNG, JPG ou WebP de até 5 MB.'
          );
          continue;
        }
        uploaded.push(data.attachment);
      }

      if (uploaded.length > 0) {
        handleUpdateIssue(issueIdx, {
          attachments: [...currentAttachments, ...uploaded],
        });
      }
    } catch {
      setUploadError('Não foi possível enviar a imagem agora. Você pode continuar mesmo sem ela.');
    } finally {
      setUploadingIssueIdx(null);
    }
  };

  const handleRemoveAttachment = (issueIdx: number, attId: string) => {
    const current = issues[issueIdx]?.attachments || [];
    handleUpdateIssue(issueIdx, {
      attachments: current.filter((a) => a.id !== attId),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    if (cleanFirst.length < 2) {
      setSubmitError('Por favor, escreva seu nome.');
      return;
    }
    if (cleanLast.length < 2) {
      setSubmitError('Por favor, escreva seu sobrenome.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const filledIssues = issues.filter((it) => it.whatTrying.trim() || it.whatHappened.trim());
      const res = await fetch('/api/prelaunch-feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          firstName: cleanFirst,
          lastName: cleanLast,
          answers,
          issues: filledIssues,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        // Limpa rascunho local imediatamente após envio definitivo
        if (linkId) {
          try {
            localStorage.removeItem(draftStorageKey(linkId));
          } catch {}
        }
        setStep(10);
        setSessionState('completed');
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      if (data?.code === 'ALREADY_COMPLETED') {
        if (linkId) {
          try {
            localStorage.removeItem(draftStorageKey(linkId));
          } catch {}
        }
        setSessionState('completed');
        setStatusMessage('Essa avaliação já foi enviada. Muito obrigada por participar!');
        return;
      }

      if (data?.code === 'COLLECTION_CLOSED') {
        setSessionState('closed');
        setStatusMessage('A etapa de avaliações do pré-lançamento já foi encerrada. Muito obrigada pelo carinho!');
        return;
      }

      setSubmitError(
        data?.error ||
          'Não foi possível enviar agora. Suas respostas continuam salvas aqui — tente novamente em instantes.'
      );
    } catch {
      setSubmitError(
        'Parece que sua conexão oscilou. Suas respostas continuam salvas aqui — tente enviar novamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestionField = (q: FeedbackQuestionDef) => {
    const val = answers[q.id];
    const explainKey = `${q.id}_explain`;
    const explainVal = String(answers[explainKey] || '');
    const showExplain =
      Array.isArray(q.explainOnValues) &&
      typeof val === 'string' &&
      q.explainOnValues.includes(val);

    return (
      <div
        key={q.id}
        className="rounded-2xl bg-[#13141c]/90 border border-white/[0.07] p-4 sm:p-5 space-y-3"
      >
        <div>
          <label className="block text-sm sm:text-[15px] font-medium text-white leading-snug">
            {q.label}
          </label>
          {q.helper && (
            <p className="text-xs text-zinc-400 mt-1">{q.helper}</p>
          )}
        </div>

        {q.kind === 'rating' && (
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap pt-1" role="radiogroup" aria-label={q.label}>
            {[1, 2, 3, 4, 5].map((n) => {
              const selected = val === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAnswer(q.id, n)}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                    selected
                      ? 'bg-[#843C52] border-[#b05a74] text-white shadow-md scale-[1.03]'
                      : 'bg-[#0c0d12] border-white/10 text-zinc-300 hover:border-[#843C52]/60 hover:text-white'
                  }`}
                >
                  {n}
                </button>
              );
            })}
            {typeof val === 'number' && (
              <button
                type="button"
                onClick={() => {
                  setAnswers((prev) => {
                    const next = { ...prev };
                    delete next[q.id];
                    return next;
                  });
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 ml-1 underline cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        )}

        {(q.kind === 'yes_no_maybe' || q.kind === 'choice') && (
          <div className="flex flex-wrap gap-2 pt-0.5" role="radiogroup" aria-label={q.label}>
            {(q.options || YES_NO_MAYBE_OPTIONS).map((opt) => {
              const selected = val === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAnswer(q.id, opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer border ${
                    selected
                      ? 'bg-[#843C52]/30 border-[#843C52] text-white'
                      : 'bg-[#0c0d12] border-white/10 text-zinc-300 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {q.kind === 'text' && (
          <input
            type="text"
            value={String(val || '')}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder={q.placeholder || 'Sua resposta (opcional)...'}
            maxLength={500}
            className="w-full rounded-xl bg-[#0c0d12] border border-white/10 focus:border-[#843C52] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors"
          />
        )}

        {q.kind === 'textarea' && (
          <textarea
            rows={3}
            value={String(val || '')}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder={q.placeholder || 'Escreva com tranquilidade (opcional)...'}
            maxLength={2500}
            className="w-full rounded-xl bg-[#0c0d12] border border-white/10 focus:border-[#843C52] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors resize-y leading-relaxed"
          />
        )}

        {showExplain && (
          <div className="pt-1">
            <textarea
              rows={2}
              value={explainVal}
              onChange={(e) => setAnswer(explainKey, e.target.value)}
              placeholder={q.explainPlaceholder || 'Se quiser, conte um pouco mais...'}
              maxLength={1200}
              className="w-full rounded-xl bg-[#0c0d12]/80 border border-[#843C52]/35 focus:border-[#843C52] px-3.5 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition-colors resize-y"
            />
          </div>
        )}
      </div>
    );
  };

  const progressPercent = step >= 1 && step <= TOTAL_FORM_STEPS
    ? Math.round((step / TOTAL_FORM_STEPS) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white font-sans selection:bg-[#843C52] selection:text-white relative overflow-x-hidden">
      {/* Iluminação ambiente editorial sutil */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[520px] h-[340px] bg-[#843C52]/[0.08] rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Cabeçalho discreto com assinatura da marca */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5">
            <span className="font-script text-4xl sm:text-[2.6rem] text-[#c77990] tracking-wide">
              Nua Borges
            </span>
            <HeartOutlineIcon className="w-5 h-5 text-[#c77990] mb-1" />
          </div>
          <p className="text-[11px] uppercase tracking-[0.26em] text-zinc-400 mt-1">
            Pré-lançamento · Convite Especial
          </p>
        </header>

        {/* Estado de carregamento */}
        {sessionState === 'loading' && (
          <div className="rounded-3xl bg-[#13141c]/90 border border-white/[0.08] p-10 text-center space-y-3">
            <Loader2 className="w-6 h-6 text-[#c77990] animate-spin mx-auto" />
            <p className="text-sm text-zinc-300">Preparando sua avaliação...</p>
          </div>
        )}

        {/* Estados encerrados / inválidos / bloqueados */}
        {['completed', 'revoked', 'closed', 'invalid', 'rate_limited', 'error'].includes(sessionState) &&
          step !== 10 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl bg-[#13141c]/95 border border-white/[0.08] p-7 sm:p-10 text-center space-y-4 shadow-2xl"
            >
              {sessionState === 'completed' && (
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
              )}
              <h1 className="font-serif text-2xl sm:text-3xl text-white font-medium">
                {sessionState === 'completed'
                  ? 'Avaliação já recebida'
                  : sessionState === 'closed'
                    ? 'Avaliações encerradas'
                    : 'Convite indisponível'}
              </h1>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-md mx-auto">
                {statusMessage ||
                  (sessionState === 'completed'
                    ? 'Essa avaliação já foi enviada. Muito obrigada por participar!'
                    : 'Este endereço não está disponível no momento.')}
              </p>
            </motion.div>
          )}

        {/* Tela de agradecimento após envio */}
        {step === 10 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-[#13141c]/95 border border-[#843C52]/35 p-8 sm:p-10 text-center space-y-4 shadow-2xl"
          >
            <div className="w-14 h-14 rounded-full bg-[#843C52]/25 border border-[#843C52]/50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-[#e09ab0]" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-white font-medium">
              {FEEDBACK_COMPLETION.title}
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-md mx-auto">
              {FEEDBACK_COMPLETION.message}
            </p>
          </motion.div>
        )}

        {/* Formulário ativo */}
        {(sessionState === 'available' || sessionState === 'in_progress') && step !== 10 && (
          <>
            {/* Barra de progresso nas etapas 1..9 */}
            {step >= 1 && step <= TOTAL_FORM_STEPS && (
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>
                    {step <= 8
                      ? `Parte ${step} de 8 · ${currentPart?.shortTitle || ''}`
                      : 'Etapa final · Identificação e revisão'}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.07] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#843C52] to-[#c77990] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* ETAPA 0: APRESENTAÇÃO */}
              {step === 0 && (
                <motion.section
                  key="intro"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-3xl bg-[#13141c]/95 border border-white/[0.08] p-6 sm:p-9 space-y-6 shadow-2xl"
                >
                  <div className="space-y-3">
                    <h1 className="font-serif text-2xl sm:text-3xl text-white font-medium leading-tight">
                      {FEEDBACK_INTRO.title}
                    </h1>
                    {FEEDBACK_INTRO.paragraphs.map((p, idx) => (
                      <p key={idx} className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed">
                        {p}
                      </p>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-1.5 text-xs text-zinc-300">
                    <p className="font-medium text-zinc-100">Como funciona:</p>
                    <p>• São 8 etapas curtas e você pode pular as áreas que não visitou.</p>
                    <p>• Suas respostas ficam salvas automaticamente neste navegador, caso queira continuar depois.</p>
                    <p>• Em outro aparelho, o que você já preencheu pode não aparecer.</p>
                    <p>• Não pedimos cadastro, senha nem e-mail — só seu nome e sobrenome ao final.</p>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleBeginOrResume}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 h-11 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-sm transition-all cursor-pointer shadow-lg shadow-[#843C52]/20"
                    >
                      <span>{hasSavedDraft ? 'Continuar de onde parei' : 'Começar avaliação'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.section>
              )}

              {/* ETAPAS 1..8: PARTES DA AVALIAÇÃO */}
              {step >= 1 && step <= 8 && currentPart && (
                <motion.section
                  key={`part-${currentPart.part}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="mb-2">
                    <h2 className="font-serif text-2xl sm:text-[26px] text-white font-medium">
                      {currentPart.title}
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                      {currentPart.subtitle}
                    </p>
                  </div>

                  {/* Pergunta inicial de pular (Partes 3, 4 e 5) */}
                  {currentPart.gateQuestion && (
                    <div className="rounded-2xl bg-[#161722] border border-[#843C52]/30 p-4 sm:p-5 space-y-3">
                      <p className="text-sm sm:text-[15px] font-medium text-white">
                        {currentPart.gateQuestion.label}
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() => setAnswer(currentPart.gateQuestion!.id, 'sim')}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition cursor-pointer ${
                            answers[currentPart.gateQuestion.id] === 'sim'
                              ? 'bg-[#843C52] border-[#b05a74] text-white'
                              : 'bg-[#0c0d12] border-white/10 text-zinc-200 hover:border-white/25'
                          }`}
                        >
                          {currentPart.gateQuestion.yesLabel}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnswer(currentPart.gateQuestion!.id, 'nao')}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition cursor-pointer ${
                            answers[currentPart.gateQuestion.id] === 'nao'
                              ? 'bg-white/15 border-white/30 text-white'
                              : 'bg-[#0c0d12] border-white/10 text-zinc-300 hover:border-white/25'
                          }`}
                        >
                          {currentPart.gateQuestion.noLabel}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Seleção de experiências realizadas na Parte 6 */}
                  {currentPart.part === 6 && (
                    <div className="rounded-2xl bg-[#161722] border border-[#843C52]/30 p-4 sm:p-5 space-y-3">
                      <p className="text-sm sm:text-[15px] font-medium text-white">
                        O que você chegou a fazer no site? (pode marcar mais de uma opção)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PART6_ACTIVITY_OPTIONS.map((opt) => {
                          const checked = part6SelectedActivities.includes(opt.value);
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => togglePart6Activity(opt.value)}
                              className={`text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border transition flex items-center gap-2.5 cursor-pointer ${
                                checked
                                  ? 'bg-[#843C52]/25 border-[#843C52] text-white font-medium'
                                  : 'bg-[#0c0d12] border-white/10 text-zinc-300 hover:border-white/25'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                  checked
                                    ? 'bg-[#843C52] border-[#843C52] text-white'
                                    : 'border-white/25'
                                }`}
                              >
                                {checked && <Check className="w-3 h-3" />}
                              </span>
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-zinc-400">
                        Não informe dados bancários, códigos de confirmação nem senhas em nenhuma resposta.
                      </p>
                    </div>
                  )}

                  {/* Perguntas das Partes 1..6 e 8 */}
                  {currentPart.part !== 7 && (
                    <>
                      {currentPart.gateQuestion && !answers[currentPart.gateQuestion.id] && (
                        <p className="text-xs text-zinc-400 px-1">
                          Escolha uma opção acima para ver as perguntas ou avançar para a próxima parte.
                        </p>
                      )}
                      {currentPart.gateQuestion && answers[currentPart.gateQuestion.id] === 'nao' && (
                        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 text-sm text-zinc-300">
                          Tudo bem! Você pode avançar direto para a próxima parte.
                        </div>
                      )}
                      {(!currentPart.gateQuestion || answers[currentPart.gateQuestion.id] === 'sim') && (
                        <div className="space-y-3.5">
                          {visiblePartQuestions.map(renderQuestionField)}
                        </div>
                      )}
                    </>
                  )}

                  {/* PARTE 7: Múltiplos relatos de problemas + anexos */}
                  {currentPart.part === 7 && (
                    <div className="space-y-4">
                      {issues.length === 0 ? (
                        <div className="rounded-2xl bg-[#13141c]/90 border border-white/[0.08] p-6 text-center space-y-3">
                          <p className="text-sm text-zinc-200">
                            Se deu tudo certo, você pode avançar direto. Se alguma coisa não funcionou como deveria, conte para a gente!
                          </p>
                          <button
                            type="button"
                            onClick={handleAddIssue}
                            className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white text-xs sm:text-sm font-semibold transition cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Contar um problema</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          {issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className="rounded-2xl bg-[#13141c]/95 border border-white/[0.08] p-4 sm:p-5 space-y-4"
                            >
                              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                                <span className="text-sm font-semibold text-white">
                                  Relato #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIssue(idx)}
                                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-red-300 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remover</span>
                                </button>
                              </div>

                              <div className="space-y-2">
                                <label className="block text-xs sm:text-sm font-medium text-zinc-200">
                                  Onde aconteceu?
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                  {ISSUE_AREA_OPTIONS.map((area) => (
                                    <button
                                      key={area}
                                      type="button"
                                      onClick={() => handleUpdateIssue(idx, { area })}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                                        issue.area === area
                                          ? 'bg-[#843C52]/30 border-[#843C52] text-white'
                                          : 'bg-[#0c0d12] border-white/10 text-zinc-300 hover:border-white/25'
                                      }`}
                                    >
                                      {area}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-xs sm:text-sm font-medium text-zinc-200">
                                  O que você estava tentando fazer?
                                </label>
                                <textarea
                                  rows={2}
                                  value={issue.whatTrying}
                                  onChange={(e) => handleUpdateIssue(idx, { whatTrying: e.target.value })}
                                  placeholder="Ex.: Tentei abrir as fotos de um Pack no celular..."
                                  className="w-full rounded-xl bg-[#0c0d12] border border-white/10 focus:border-[#843C52] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-xs sm:text-sm font-medium text-zinc-200">
                                  O que aconteceu?
                                </label>
                                <textarea
                                  rows={2}
                                  value={issue.whatHappened}
                                  onChange={(e) => handleUpdateIssue(idx, { whatHappened: e.target.value })}
                                  placeholder="Ex.: A tela ficou carregando e não abriu a imagem..."
                                  className="w-full rounded-xl bg-[#0c0d12] border border-white/10 focus:border-[#843C52] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-xs sm:text-sm font-medium text-zinc-200">
                                  O que você achava que deveria acontecer? <span className="text-zinc-500 font-normal">(opcional)</span>
                                </label>
                                <input
                                  type="text"
                                  value={issue.whatExpected || ''}
                                  onChange={(e) => handleUpdateIssue(idx, { whatExpected: e.target.value })}
                                  placeholder="Ex.: Achei que a imagem abriria maior na tela..."
                                  className="w-full rounded-xl bg-[#0c0d12] border border-white/10 focus:border-[#843C52] px-3.5 py-2 text-sm text-white placeholder-zinc-500 outline-none"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="block text-xs sm:text-sm font-medium text-zinc-200">
                                  Aconteceu mais de uma vez?
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {ISSUE_REPEAT_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() =>
                                        handleUpdateIssue(idx, { happenedMoreThanOnce: opt.value })
                                      }
                                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                                        issue.happenedMoreThanOnce === opt.value
                                          ? 'bg-[#843C52]/30 border-[#843C52] text-white'
                                          : 'bg-[#0c0d12] border-white/10 text-zinc-300 hover:border-white/25'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2 pt-1">
                                <label className="block text-xs sm:text-sm font-medium text-zinc-200">
                                  Quer mostrar uma imagem do problema? <span className="text-zinc-500 font-normal">(opcional, até 3 imagens)</span>
                                </label>
                                <p className="text-[11px] text-zinc-400">
                                  Por segurança, não envie imagens com senhas, códigos, dados bancários ou fotos pessoais privadas.
                                </p>

                                {issue.attachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {issue.attachments.map((att) => (
                                      <span
                                        key={att.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-xs text-zinc-200"
                                      >
                                        <span className="truncate max-w-[160px]">{att.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveAttachment(idx, att.id)}
                                          aria-label={`Remover ${att.name}`}
                                          className="text-zinc-400 hover:text-white cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {issue.attachments.length < 3 && (
                                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0c0d12] hover:bg-white/[0.04] border border-dashed border-white/20 text-xs text-zinc-200 cursor-pointer transition">
                                    {uploadingIssueIdx === idx ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-[#c77990]" />
                                    ) : (
                                      <ImagePlus className="w-4 h-4 text-[#c77990]" />
                                    )}
                                    <span>
                                      {uploadingIssueIdx === idx
                                        ? 'Enviando imagem...'
                                        : 'Escolher imagem do aparelho'}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp"
                                      multiple
                                      disabled={uploadingIssueIdx === idx}
                                      onChange={(e) => {
                                        handleUploadIssueImage(idx, e.target.files);
                                        e.target.value = '';
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          ))}

                          {uploadError && (
                            <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-3.5 py-2.5">
                              {uploadError}
                            </p>
                          )}

                          {issues.length < 15 && (
                            <button
                              type="button"
                              onClick={handleAddIssue}
                              className="w-full py-3 rounded-2xl border border-dashed border-[#843C52]/45 bg-[#843C52]/[0.07] hover:bg-[#843C52]/[0.14] text-sm font-medium text-[#f2c4d2] inline-flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Contar outro problema</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Barra de navegação entre partes */}
                  <div className="flex items-center justify-between gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => goToStep(step - 1)}
                      className="inline-flex items-center gap-1.5 px-4 h-11 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-200 text-sm font-medium transition cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => goToStep(step + 1)}
                      className="inline-flex items-center gap-2 px-6 h-11 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white text-sm font-semibold transition cursor-pointer shadow-md"
                    >
                      <span>{step === 8 ? 'Ir para a etapa final' : 'Continuar'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.section>
              )}

              {/* ETAPA 9: IDENTIFICAÇÃO FINAL + REVISÃO */}
              {step === 9 && (
                <motion.form
                  key="final-step"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <div className="rounded-3xl bg-[#13141c]/95 border border-white/[0.08] p-6 sm:p-8 space-y-5 shadow-2xl">
                    <div>
                      <h2 className="font-serif text-2xl sm:text-[26px] text-white font-medium">
                        Como podemos te chamar?
                      </h2>
                      <p className="text-sm text-zinc-400 mt-1">
                        Seu nome serve apenas para a Nua saber de quem é cada opinião. Não pedimos e-mail, telefone nem cadastro.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label htmlFor="fb-first-name" className="block text-xs font-medium text-zinc-200">
                          Nome *
                        </label>
                        <input
                          id="fb-first-name"
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Seu nome"
                          maxLength={60}
                          className="w-full rounded-xl bg-[#0c0d12] border border-white/10 focus:border-[#843C52] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="fb-last-name" className="block text-xs font-medium text-zinc-200">
                          Sobrenome *
                        </label>
                        <input
                          id="fb-last-name"
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Seu sobrenome"
                          maxLength={80}
                          className="w-full rounded-xl bg-[#0c0d12] border border-white/10 focus:border-[#843C52] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-start gap-3 text-xs text-zinc-300 leading-relaxed">
                      <ShieldCheck className="w-4 h-4 text-[#c77990] shrink-0 mt-0.5" />
                      <p>
                        Suas respostas e eventuais imagens enviadas serão usadas exclusivamente pela Nua e sua equipe para ajustar e melhorar o site antes do lançamento, ficando guardadas por até {retentionDays} dias com acesso restrito.
                      </p>
                    </div>

                    {/* Revisão expansível das respostas */}
                    <div className="rounded-2xl bg-[#0e0f15] border border-white/[0.07] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowReview((v) => !v)}
                        className="w-full px-4 py-3 flex items-center justify-between text-xs sm:text-sm font-medium text-zinc-200 hover:bg-white/[0.03] transition cursor-pointer"
                      >
                        <span>Revisar minhas respostas antes de enviar</span>
                        {showReview ? (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>

                      {showReview && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/[0.06] space-y-3 text-xs">
                          {FEEDBACK_PARTS.map((part) => {
                            const answeredCount =
                              part.part === 7
                                ? issues.filter((i) => i.whatTrying.trim() || i.whatHappened.trim()).length
                                : part.questions.filter((q) => {
                                    const v = answers[q.id];
                                    return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
                                  }).length;

                            return (
                              <div
                                key={part.part}
                                className="flex items-center justify-between gap-2 py-1.5 border-b border-white/[0.04] last:border-b-0"
                              >
                                <div>
                                  <span className="text-zinc-200 font-medium">
                                    Parte {part.part}: {part.title}
                                  </span>
                                  <span className="block text-zinc-400">
                                    {part.gateQuestion && answers[part.gateQuestion.id] === 'nao'
                                      ? 'Pulada (não visitou esta parte)'
                                      : part.part === 7
                                        ? `${answeredCount} problema(s) relatado(s)`
                                        : `${answeredCount} resposta(s) preenchida(s)`}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => goToStep(part.part)}
                                  className="text-[#d98ba3] hover:text-white underline shrink-0 cursor-pointer"
                                >
                                  Editar
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {submitError && (
                      <div
                        role="alert"
                        className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs sm:text-sm text-red-200"
                      >
                        {submitError}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => goToStep(8)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 px-4 h-11 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-200 text-sm font-medium transition cursor-pointer disabled:opacity-50"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 px-7 h-11 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white text-sm font-semibold transition cursor-pointer shadow-lg shadow-[#843C52]/25 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Enviar avaliação</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
