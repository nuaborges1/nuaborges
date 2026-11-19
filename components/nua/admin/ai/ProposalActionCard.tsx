/* Vinho maduro / Nua Borges */
import React, { useMemo, useState } from 'react';
import { Check, Clock, RefreshCw, ShieldCheck } from 'lucide-react';
import { getPublicApiUrl, getStoredSessionToken } from '@/lib/contentStore';
import { broadcastAdminUpdate, type AdminUpdateScope } from '@/lib/adminSync';

interface ProposalActionCardProps {
  proposal: {
    proposalId: string;
    nonce: string;
    actionType: string;
    targetId: string;
    summary: string;
    proposedChanges: Record<string, any>;
  };
}

/** Nome amigável de cada tipo de alteração — nada de termos técnicos na tela. */
const ACTION_TITLES: Record<string, string> = {
  delete_media: 'Remover uma mídia da biblioteca',
  publish_site: 'Publicar o site',
  reschedule_appointment: 'Reagendar uma chamada',
  cancel_appointment: 'Cancelar uma chamada',
  update_appointment_settings: 'Agenda das chamadas VIP',
  mark_finance_paid: 'Dar baixa em uma parcela',
  revert_finance_payment: 'Reverter uma quitação',
  update_request_status: 'Atualizar uma solicitação',
  update_personalizado_settings: 'Preços dos personalizados',
  remove_music_track: 'Remover uma faixa da biblioteca',
};

const WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const REQUEST_STATUS: Record<string, string> = {
  new: 'Nova',
  analyzing: 'Em análise',
  planned: 'Planejada',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluída',
};

const PERSONALIZADO_LABELS: Record<string, string> = {
  pricePerPhoto: 'Preço por foto',
  minPhotos: 'Mínimo de fotos',
  maxPhotos: 'Máximo de fotos',
  minOrderTotal: 'Pedido mínimo',
  estimatedDeliveryText: 'Prazo de entrega',
  videoEnabled: 'Vídeo disponível',
};

/** Escopo de dados que precisa recarregar após cada tipo de alteração. */
const ACTION_SCOPES: Record<string, AdminUpdateScope> = {
  delete_media: 'media',
  publish_site: 'site',
  reschedule_appointment: 'appointments',
  cancel_appointment: 'appointments',
  update_appointment_settings: 'appointments',
  mark_finance_paid: 'finance',
  revert_finance_payment: 'finance',
  update_request_status: 'requests',
  update_personalizado_settings: 'personalizados',
  remove_music_track: 'music',
};

function formatDate(value: unknown): string {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const [year, month, day] = text.split('-');
  return `${day}/${month}/${year}`;
}

function formatMoney(value: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPaymentMethod(value: unknown): string {
  const method = String(value || '');
  if (method === 'pix') return 'Pix';
  if (method === 'credit_card') return 'Cartão de crédito';
  if (method === 'transferencia') return 'Transferência';
  if (method === 'manual') return 'Baixa manual';
  return method;
}

/** Traduz as mudanças propostas em frases simples, sem códigos ou chaves internas. */
function describeChanges(proposal: ProposalActionCardProps['proposal']): string[] {
  const changes: any = proposal.proposedChanges || {};
  const lines: string[] = [];

  switch (proposal.actionType) {
    case 'update_appointment_settings': {
      const settings: any = changes.settings || changes || {};

      if (changes.dateBlocked) {
        lines.push(`Bloquear data: ${formatDate(changes.dateBlocked)}${changes.reason ? ` (${changes.reason})` : ''}`);
      }
      if (changes.dateUnblocked) {
        lines.push(`Liberar data: ${formatDate(changes.dateUnblocked)}`);
      }

      const weekly = settings.weeklyHours;
      if (weekly && typeof weekly === 'object') {
        for (let day = 0; day <= 6; day += 1) {
          const schedule = weekly[day] ?? weekly[String(day)];
          if (!schedule?.enabled) continue;
          const ranges = Array.isArray(schedule.ranges) ? schedule.ranges : [];
          if (!ranges.length) continue;
          const hours = ranges
            .filter((range: any) => range?.start && range?.end)
            .map((range: any) => `${range.start} às ${range.end}`)
            .join(' e ');
          if (hours) lines.push(`${WEEKDAYS[day]}: ${hours}`);
        }
      }

      if (Array.isArray(settings.blockedDates) && settings.blockedDates.length) {
        lines.push(`Datas sem atendimento: ${settings.blockedDates.map(formatDate).join(', ')}`);
      }
      if (Number.isFinite(Number(settings.bufferMinutes))) {
        lines.push(`Intervalo entre chamadas: ${Number(settings.bufferMinutes)} minutos`);
      }
      if (Number.isFinite(Number(settings.minNoticeHours))) {
        lines.push(`Antecedência mínima: ${Number(settings.minNoticeHours)} horas`);
      }
      if (Number.isFinite(Number(settings.maxFutureDays))) {
        lines.push(`Agenda aberta pelos próximos ${Number(settings.maxFutureDays)} dias`);
      }

      if (Array.isArray(changes.modalities) && changes.modalities.length) {
        const list = changes.modalities
          .filter((item: any) => item?.name)
          .map((item: any) => {
            const duration = Number(item.durationMinutes);
            const price = formatMoney(item.price);
            return `${item.name}${duration ? ` (${duration} min)` : ''}${price ? ` — ${price}` : ''}`;
          });
        if (list.length) lines.push(`Modalidades: ${list.join('; ')}`);
      }
      break;
    }

    case 'reschedule_appointment': {
      if (changes.date) {
        lines.push(`Nova data: ${formatDate(changes.date)}${changes.startTime ? ` às ${changes.startTime}` : ''}`);
      }
      if (changes.reason) lines.push(`Motivo: ${changes.reason}`);
      break;
    }

    case 'cancel_appointment': {
      if (changes.reason) lines.push(`Motivo: ${changes.reason}`);
      break;
    }

    case 'mark_finance_paid': {
      if (changes.installmentNumber) lines.push(`Parcela: ${changes.installmentNumber} de 10`);
      if (changes.paidAmount) lines.push(`Valor: ${formatMoney(changes.paidAmount)}`);
      if (changes.method) lines.push(`Forma: ${formatPaymentMethod(changes.method)}`);
      break;
    }

    case 'revert_finance_payment': {
      if (changes.installmentNumber) lines.push(`Parcela: ${changes.installmentNumber} de 10`);
      lines.push('A parcela voltará para pendente.');
      break;
    }

    case 'delete_media': {
      if (changes.name) lines.push(`Arquivo: ${changes.name}`);
      if (Array.isArray(changes.usedIn) && changes.usedIn.length) {
        lines.push(`Hoje ela aparece em: ${changes.usedIn.join(', ')}`);
      }
      break;
    }

    case 'publish_site': {
      if (Number.isFinite(Number(changes.packs))) lines.push(`Packs publicados: ${changes.packs}`);
      if (Number.isFinite(Number(changes.photos))) lines.push(`Fotos na biblioteca: ${changes.photos}`);
      if (Number.isFinite(Number(changes.galleryPhotos))) {
        lines.push(`Fotos na galeria: ${changes.galleryPhotos}`);
      }
      if (Number.isFinite(Number(changes.heroSlides))) lines.push(`Destaques na capa: ${changes.heroSlides}`);
      break;
    }

    case 'update_request_status': {
      if (changes.status) {
        lines.push(`Novo andamento: ${REQUEST_STATUS[changes.status] || changes.status}`);
      }
      break;
    }

    case 'update_personalizado_settings': {
      for (const [key, label] of Object.entries(PERSONALIZADO_LABELS)) {
        const value = changes?.[key];
        if (value === undefined || value === null || value === '') continue;
        if (typeof value === 'boolean') {
          lines.push(`${label}: ${value ? 'sim' : 'não'}`);
        } else if (key === 'pricePerPhoto' || key === 'minOrderTotal') {
          lines.push(`${label}: ${formatMoney(value)}`);
        } else {
          lines.push(`${label}: ${value}`);
        }
      }
      break;
    }

    case 'remove_music_track': {
      lines.push('A faixa sairá da biblioteca musical do site.');
      break;
    }

    default:
      break;
  }

  return lines.slice(0, 8);
}

export function ProposalActionCard({ proposal }: ProposalActionCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const title = ACTION_TITLES[proposal.actionType] || 'Confirmar uma alteração';
  const details = useMemo(() => describeChanges(proposal), [proposal]);

  const handleApprove = async () => {
    setIsApproving(true);
    setFeedback(null);
    try {
      const apiUrl = getPublicApiUrl();
      const token = getStoredSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiUrl}/api/nua-ai/approve-action`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          proposalId: proposal.proposalId,
          nonce: proposal.nonce,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success === true) {
        setApproved(true);
        setFeedback({
          kind: 'success',
          text: data.message || 'Tudo certo! A alteração foi aplicada.',
        });

        // Avisa todas as áreas que dependem desses dados (mesma aba e outras abas)
        // somente depois da confirmação real do servidor.
        const scope = ACTION_SCOPES[proposal.actionType];
        if (scope) {
          broadcastAdminUpdate(scope, {
            actionType: proposal.actionType,
            proposalId: proposal.proposalId,
          });
        }

        if (data?.content) {
          window.dispatchEvent(
            new CustomEvent('nua_draft_updated', {
              detail: { type: 'replace_draft', data: { content: data.content } },
            })
          );
        } else if (proposal.actionType === 'publish_site') {
          window.dispatchEvent(
            new CustomEvent('nua_draft_updated', {
              detail: { type: 'published', version: data?.version ?? null, updatedAt: data?.updatedAt ?? null },
            })
          );
        } else {
          window.dispatchEvent(new CustomEvent('nua_draft_updated'));
        }
      } else {
        setFeedback({
          kind: 'error',
          text: data?.error || 'Não consegui aplicar a alteração agora. Nada foi modificado.',
        });
      }
    } catch {
      setFeedback({
        kind: 'error',
        text: 'Não consegui falar com o painel agora. Nada foi modificado — tente novamente.',
      });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="mt-3 p-3.5 rounded-xl bg-[#171821] border border-[#843C52]/30 shadow-xl space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#843C52] mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-[#843C52] uppercase tracking-wider">Só falta o seu ok</p>
            <p className="text-xs font-semibold text-white leading-snug">{title}</p>
          </div>
        </div>
        <span className="text-[10px] text-zinc-500 flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3" />
          10 min
        </span>
      </div>

      <p className="text-xs text-zinc-300 leading-relaxed">{proposal.summary}</p>

      {details.length > 0 && (
        <ul className="text-[11px] text-zinc-400 bg-[#0e0f14] p-2.5 rounded-lg border border-white/[0.06] space-y-1">
          {details.map((line, index) => (
            <li key={index} className="flex items-start gap-1.5 leading-snug">
              <span className="text-[#843C52] leading-snug">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={isApproving || approved}
          onClick={handleApprove}
          className={`h-8 px-4 rounded-full text-xs font-semibold transition shadow-sm flex items-center gap-1.5 ${
            approved
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
              : 'bg-[#843C52] hover:bg-[#f7bccb] text-white cursor-pointer'
          }`}
        >
          {approved ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Alteração aplicada</span>
            </>
          ) : isApproving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Aplicando...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Confirmar e aplicar</span>
            </>
          )}
        </button>
      </div>

      {feedback && (
        <p
          className={`text-[11px] leading-snug ${
            feedback.kind === 'success' ? 'text-emerald-300' : 'text-amber-300'
          }`}
        >
          {feedback.text}
        </p>
      )}

      {!approved && !feedback && (
        <p className="text-[10px] text-zinc-500 leading-snug">
          Nada muda até você confirmar. Se quiser ajustar algo, é só pedir para a Nay antes.
        </p>
      )}
    </div>
  );
}
