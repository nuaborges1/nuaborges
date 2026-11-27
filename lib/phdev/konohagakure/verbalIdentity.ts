import type { ContainmentRecord } from '@/functions/api/_central/containment';
import type {
  OfficialProtocolId,
  OperationalBannerViewModel,
  ProtocolRuntimeState,
  SystemControlSnapshot,
} from './types';

/**
 * Identidade verbal centralizada do ambiente PHDEV (Konohagakure Edition).
 * Todas as frases são estáticas e mapeadas exclusivamente a estados reais comprovados.
 */
export const KONOHA_VERBAL_MESSAGES = {
  normalVerified: 'A vila está em paz.',
  insufficientInfo: 'A vila aguarda novas informações.',
  activeDefenseVerified: 'Kakashi está de prontidão.',
  threatBlocked: 'A primeira linha de defesa neutralizou a ameaça.',
  unauthorizedDenied: 'As barreiras de Minato impediram o acesso.',
  reconciliationDone: 'Cada centavo em seu devido lugar.',
  diagnosisStarted: 'Byakugan ativado.',
  checksApproved: 'Tobirama concluiu a preparação.',
  containmentConfirmed: 'A ameaça foi isolada.',
  recoveryInProgress: 'A vila está se recuperando.',
  baryonModeActive: 'Baryon Mode ativado.',
  criticalIncidentConfirmed: 'A vila está sob ataque. Protocolo Pain ativado.',
  madaraLockdownConfirmed: 'Madara — Infinite Tsukuyomi ativado.',
  kaguyaIsolationConfirmed: 'Kaguya — Amenominaka ativado.',
  emergencyAuthorityAuthenticated: 'A autoridade dos Seis Caminhos foi autenticada.',
  normalizationConfirmed: 'A paz foi restaurada.',
} as const;

export function getShinobiGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia, Shinobi.';
  if (hour >= 12 && hour < 18) return 'Boa tarde, Shinobi.';
  return 'Boa noite, Shinobi.';
}

export function formatBrTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(parsed));
  } catch {
    return value;
  }
}

export function getActiveContainments(snapshot: SystemControlSnapshot | null): ContainmentRecord[] {
  if (!snapshot?.containment) return [];
  return snapshot.containment.filter((record) => record.active === true);
}

export function getRecoveryPendingCount(snapshot: SystemControlSnapshot | null): number {
  const rec = snapshot?.recovery;
  if (!rec) return 0;
  return (
    Number(rec.vault?.needsIntervention || 0) +
    Number(rec.paidEmail?.needsIntervention || 0) +
    Number(rec.refunds?.needsIntervention || 0)
  );
}

/**
 * Deriva o banner principal (Peace / Waiting / Containment / Recovery / Pain)
 * exclusivamente a partir do snapshot real de `/api/control/system`.
 * PAIN não possui estado próprio — aparece somente quando há contenção crítica confirmada (MADARA ou KAGUYA).
 */
export function deriveOperationalBanner(
  snapshot: SystemControlSnapshot | null,
  loadError: string | null,
  lastCheckedAt: string | null,
): OperationalBannerViewModel {
  if (!snapshot) {
    return {
      kind: 'waiting',
      tone: 'unknown',
      headline: KONOHA_VERBAL_MESSAGES.insufficientInfo,
      technicalSummary:
        loadError ||
        'Aguardando leitura autenticada de /api/control/system para comprovar integrações e contenções.',
      details: [
        { label: 'Estado', value: 'Não verificado' },
        { label: 'Fonte', value: '/api/control/system' },
      ],
      recommendedAction: {
        label: 'Abrir diagnóstico NEJI',
        section: 'protocol',
        protocolPageId: 'neji',
      },
    };
  }

  const activeContainments = getActiveContainments(snapshot);
  const madara = activeContainments.find((item) => item.protocol === 'madara');
  const kaguya = activeContainments.find((item) => item.protocol === 'kaguya');
  const itachi = activeContainments.find((item) => item.protocol === 'itachi');
  const criticalContainment = madara || kaguya;

  if (criticalContainment) {
    const activeNames = [madara ? 'MADARA' : null, kaguya ? 'KAGUYA' : null, itachi ? 'ITACHI' : null]
      .filter(Boolean)
      .join(' + ');
    const protocolCue =
      madara && kaguya
        ? `${KONOHA_VERBAL_MESSAGES.madaraLockdownConfirmed} ${KONOHA_VERBAL_MESSAGES.kaguyaIsolationConfirmed}`
        : madara
          ? KONOHA_VERBAL_MESSAGES.madaraLockdownConfirmed
          : KONOHA_VERBAL_MESSAGES.kaguyaIsolationConfirmed;
    const affectedSurface =
      criticalContainment.protocol === 'madara'
        ? 'Gateway, páginas públicas e mídia protegida'
        : criticalContainment.scopes.length > 0
          ? criticalContainment.scopes.join(', ')
          : 'Infraestrutura selecionada';

    return {
      kind: 'pain',
      tone: 'critical',
      headline: KONOHA_VERBAL_MESSAGES.criticalIncidentConfirmed,
      technicalSummary: `${protocolCue} Evidência registrada: ${criticalContainment.evidence}`,
      details: [
        { label: 'Incidente', value: criticalContainment.incidentId },
        { label: 'Gravidade', value: criticalContainment.protocol === 'kaguya' ? 'Crítica (Infraestrutura)' : 'Crítica (Aplicação)' },
        { label: 'Protocolo responsável', value: activeNames },
        { label: 'Superfície / Escopo', value: affectedSurface },
        { label: 'Registrado em', value: formatBrTimestamp(criticalContainment.changedAt) || criticalContainment.changedAt },
        { label: 'Estado atual', value: 'Contenção crítica ativa' },
      ],
      recommendedAction: {
        label: `Gerenciar ${criticalContainment.protocol.toUpperCase()}`,
        section: 'protocol',
        protocol: criticalContainment.protocol,
        protocolPageId: criticalContainment.protocol,
      },
    };
  }

  if (itachi) {
    return {
      kind: 'containment',
      tone: 'containment',
      headline: KONOHA_VERBAL_MESSAGES.containmentConfirmed,
      technicalSummary: `ITACHI (Tsukuyomi) ativo para o incidente ${itachi.incidentId}. Módulos pausados: ${itachi.scopes.join(', ') || 'nenhum escopo informado'}.`,
      details: [
        { label: 'Incidente', value: itachi.incidentId },
        { label: 'Protocolo', value: 'P06 — ITACHI' },
        { label: 'Escopo', value: itachi.scopes.join(', ') || 'Não informado' },
        { label: 'Registrado em', value: formatBrTimestamp(itachi.changedAt) || itachi.changedAt },
      ],
      recommendedAction: {
        label: 'Abrir protocolo ITACHI',
        section: 'protocol',
        protocol: 'itachi',
        protocolPageId: 'itachi',
      },
    };
  }

  const pendingRecovery = getRecoveryPendingCount(snapshot);
  if (pendingRecovery > 0 || snapshot.recovery?.refundsPaused) {
    return {
      kind: 'recovery',
      tone: 'recovery',
      headline: KONOHA_VERBAL_MESSAGES.recoveryInProgress,
      technicalSummary: `Existem ${pendingRecovery} pendência(s) acima do limite automático nas filas de recuperação (NARUTO).${snapshot.recovery?.refundsPaused ? ' Reconciliação de estornos pausada.' : ''}`,
      details: [
        { label: 'Cofre', value: String(snapshot.recovery?.vault?.needsIntervention ?? 'Indisponível') },
        { label: 'Confirmações', value: String(snapshot.recovery?.paidEmail?.needsIntervention ?? 'Indisponível') },
        { label: 'Estornos', value: snapshot.recovery?.refundsPaused ? 'Em quarentena' : String(snapshot.recovery?.refunds?.needsIntervention ?? 'Indisponível') },
        { label: 'Última rodada', value: formatBrTimestamp(snapshot.recovery?.at) || 'Sem registro' },
      ],
      recommendedAction: {
        label: 'Inspecionar filas NARUTO',
        section: 'protocol',
        protocolPageId: 'naruto',
      },
    };
  }

  const pendingChecks: string[] = [];
  if (snapshot.containment === null) pendingChecks.push('leitura do estado de contenção');
  if (!snapshot.integrations?.supabase?.connected) pendingChecks.push('conexão Supabase');
  if (snapshot.flags?.maintenanceMode) pendingChecks.push('modo manutenção ativo');
  if (!snapshot.integrations?.mercadoPagoCommercial?.connected) {
    pendingChecks.push(
      snapshot.integrations?.mercadoPagoCommercial?.configured
        ? 'conexão Mercado Pago comercial'
        : 'credencial Mercado Pago comercial',
    );
  }
  if (!snapshot.integrations?.backblazeB2?.configured) pendingChecks.push('configuração Backblaze B2');

  if (pendingChecks.length > 0) {
    return {
      kind: 'waiting',
      tone: 'warning',
      headline: KONOHA_VERBAL_MESSAGES.insufficientInfo,
      technicalSummary: `Verificações pendentes ou degradadas antes de declarar operação plena: ${pendingChecks.join('; ')}.`,
      details: [
        { label: 'Supabase', value: snapshot.integrations?.supabase?.connected ? 'Conectado' : 'Indisponível' },
        { label: 'Contenções', value: snapshot.containment === null ? 'Indisponível' : 'Nenhuma ativa' },
        { label: 'Políticas', value: `${snapshot.registeredPolicies ?? '—'} registradas` },
        { label: 'Verificado em', value: formatBrTimestamp(lastCheckedAt) || 'Agora' },
      ],
      recommendedAction: {
        label: 'Abrir diagnóstico NEJI',
        section: 'protocol',
        protocolPageId: 'neji',
      },
    };
  }

  return {
    kind: 'peace',
    tone: 'success',
    headline: KONOHA_VERBAL_MESSAGES.normalVerified,
    technicalSummary: `Todos os serviços monitorados respondem normalmente. Nenhuma contenção ativa, ${snapshot.registeredPolicies ?? 0} políticas no gateway e 0 pendências críticas de recuperação.`,
    details: [
      { label: 'Supabase', value: 'Conectado' },
      { label: 'Mercado Pago', value: 'Conectado' },
      { label: 'Backblaze B2', value: 'Configurado' },
      { label: 'Verificado em', value: formatBrTimestamp(lastCheckedAt) || 'Agora' },
    ],
  };
}

/**
 * Deriva o estado real de cada um dos 9 protocolos oficiais sem simular estados ou eventos.
 */
export function deriveProtocolRuntime(
  protocolId: OfficialProtocolId,
  snapshot: SystemControlSnapshot | null,
  isRefreshing: boolean,
): ProtocolRuntimeState {
  if (!snapshot) {
    return {
      tone: 'unknown',
      statusLabel: 'Não verificado',
      detail: 'Aguardando telemetria real de /api/control/system.',
      specialModeActive: false,
    };
  }

  const containments = snapshot.containment;
  const recentAudit = Array.isArray(snapshot.recentAudit) ? snapshot.recentAudit : [];
  const findContainment = (id: 'itachi' | 'madara' | 'kaguya') =>
    containments?.find((record) => record.protocol === id);

  switch (protocolId) {
    case 'kakashi': {
      const blockedCount = Number(snapshot.auditStats?.blocked || 0);
      const turnstileConfigured = Boolean(snapshot.integrations?.turnstile?.configured);
      const policiesCount = snapshot.registeredPolicies ?? 0;
      const verified = Boolean(snapshot.integrations?.supabase?.connected && policiesCount > 0);
      return {
        tone: verified ? 'success' : 'warning',
        statusLabel: verified ? 'Operacional' : 'Em observação',
        detail: `${policiesCount} políticas no gateway · Turnstile ${turnstileConfigured ? 'configurado' : 'não configurado'}${blockedCount > 0 ? ` · ${blockedCount} bloqueio(s)` : ''}.`,
        verbalCue:
          blockedCount > 0
            ? KONOHA_VERBAL_MESSAGES.threatBlocked
            : verified
              ? KONOHA_VERBAL_MESSAGES.activeDefenseVerified
              : undefined,
        specialModeActive: false,
        specialModeHint: 'Sharingan: defesa contínua de borda',
        lastActivity: recentAudit[0]?.createdAt || recentAudit[0]?.timestamp || null,
      };
    }

    case 'minato': {
      const authDenied = recentAudit.filter((ev) =>
        /FAIL|DENIED|UNAUTHORIZED|FORBIDDEN/i.test(String(ev.type || '')),
      ).length;
      const sessionBacked = Boolean(snapshot.integrations?.supabase?.connected);
      return {
        tone: sessionBacked ? 'success' : 'warning',
        statusLabel: sessionBacked ? 'Ativo (contínuo)' : 'Degradado',
        detail: `Separação NUA × PHDEV · admin_sessions ${sessionBacked ? 'ativo' : 'indisponível'}`,
        verbalCue: authDenied > 0 ? KONOHA_VERBAL_MESSAGES.unauthorizedDenied : undefined,
        specialModeActive: false,
        lastActivity: recentAudit.find((ev) => /AUTH|LOGIN/i.test(String(ev.type || '')))?.createdAt || null,
      };
    }

    case 'kakuzu': {
      const mp = snapshot.integrations?.mercadoPagoCommercial;
      const refundsPaused = Boolean(snapshot.recovery?.refundsPaused);
      const pendingRefunds = Number(snapshot.recovery?.refunds?.needsIntervention || 0);
      if (refundsPaused) {
        return {
          tone: 'containment',
          statusLabel: 'Em quarentena',
          detail: 'Reconciliação de estornos pausada por contenção financeira.',
          specialModeActive: false,
          lastActivity: snapshot.recovery?.at || null,
        };
      }
      if (mp?.connected) {
        return {
          tone: pendingRefunds > 0 ? 'warning' : 'success',
          statusLabel: pendingRefunds > 0 ? `${pendingRefunds} estorno(s) pendente(s)` : 'Verificado',
          detail: `Mercado Pago comercial conectado · Saldo real aguardando fonte confirmada · Pix mensalidade ${snapshot.integrations?.mensalidadeStaticPix?.configured ? 'configurado' : 'não configurado'}.`,
          verbalCue: pendingRefunds === 0 ? KONOHA_VERBAL_MESSAGES.reconciliationDone : undefined,
          specialModeActive: false,
          lastActivity: snapshot.recovery?.at || null,
        };
      }
      return {
        tone: 'unknown',
        statusLabel: mp?.configured ? 'Falha de conexão' : 'Não verificado',
        detail: mp?.configured
          ? 'Credencial configurada, mas consulta ao Mercado Pago falhou.'
          : 'Credencial Mercado Pago comercial ausente neste ambiente.',
        specialModeActive: false,
      };
    }

    case 'neji': {
      const eventsCount = recentAudit.length;
      return {
        tone: isRefreshing ? 'info' : 'success',
        statusLabel: isRefreshing ? 'Diagnosticando' : 'Monitorando',
        detail: `${eventsCount} evento(s) recentes · /monitoramento/ pronto`,
        verbalCue: isRefreshing ? KONOHA_VERBAL_MESSAGES.diagnosisStarted : undefined,
        specialModeActive: isRefreshing,
        specialModeHint: isRefreshing ? 'Byakugan ativo durante inspeção' : 'Byakugan sob demanda',
        lastActivity: recentAudit[0]?.createdAt || recentAudit[0]?.timestamp || null,
      };
    }

    case 'tobirama': {
      const ready = Boolean(snapshot.success && (snapshot.registeredPolicies ?? 0) > 0);
      return {
        tone: ready ? 'info' : 'unknown',
        statusLabel: ready ? 'Disponível' : 'Não verificado',
        detail: 'Export estático, trava de backup Git remoto e suíte de regressão sob controle manual.',
        verbalCue: ready ? KONOHA_VERBAL_MESSAGES.checksApproved : undefined,
        specialModeActive: false,
      };
    }

    case 'itachi': {
      if (containments === null) {
        return {
          tone: 'unknown',
          statusLabel: 'Indisponível',
          detail: 'Não foi possível ler o estado de contenção no Supabase.',
          specialModeActive: false,
        };
      }
      const record = findContainment('itachi');
      if (record?.active) {
        return {
          tone: 'containment',
          statusLabel: 'Contenção ativa',
          detail: `Incidente ${record.incidentId} · Pausados: ${record.scopes.join(', ') || 'nenhum'}.`,
          verbalCue: KONOHA_VERBAL_MESSAGES.containmentConfirmed,
          specialModeActive: true,
          specialModeHint: 'Tsukuyomi ativo',
          lastActivity: record.changedAt,
        };
      }
      return {
        tone: 'success',
        statusLabel: 'Inativo (pronto)',
        detail: '6 módulos pausáveis · pronto com senha PHDEV',
        specialModeActive: false,
        specialModeHint: 'Tsukuyomi em prontidão',
        lastActivity: record?.changedAt || null,
      };
    }

    case 'madara': {
      if (containments === null) {
        return {
          tone: 'unknown',
          statusLabel: 'Indisponível',
          detail: 'Leitura do estado de lockdown indisponível.',
          specialModeActive: false,
        };
      }
      const record = findContainment('madara');
      if (record?.active) {
        return {
          tone: 'critical',
          statusLabel: 'Lockdown ativo',
          detail: `Incidente ${record.incidentId} · Gateway e mídia em 503`,
          verbalCue: KONOHA_VERBAL_MESSAGES.madaraLockdownConfirmed,
          specialModeActive: true,
          specialModeHint: 'Infinite Tsukuyomi ativo',
          lastActivity: record.changedAt,
        };
      }
      return {
        tone: snapshot.emergencyAccessVerified ? 'info' : 'warning',
        statusLabel: snapshot.emergencyAccessVerified ? 'Pronto' : 'Trava HAGOROMO',
        detail: snapshot.emergencyAccessVerified
          ? 'Trava HAGOROMO validada · acionamento manual'
          : 'Requer NUA_EMERGENCY_ACCESS_VERIFIED ativo',
        specialModeActive: false,
        specialModeHint: 'Infinite Tsukuyomi inativo',
        lastActivity: record?.changedAt || null,
      };
    }

    case 'naruto': {
      const rec = snapshot.recovery;
      const pending = getRecoveryPendingCount(snapshot);
      if (!rec) {
        return {
          tone: 'unknown',
          statusLabel: 'Sem execução registrada',
          detail: 'Filas de Cofre, confirmações e estornos aguardando primeira rodada do cron. Baryon Mode não homologado.',
          specialModeActive: false,
          specialModeHint: 'Baryon Mode: inativo / não homologado',
        };
      }
      return {
        tone: pending > 0 ? 'recovery' : 'success',
        statusLabel: pending > 0 ? `${pending} pendência(s)` : 'Filas estáveis',
        detail: `Cofre: ${rec.vault?.needsIntervention ?? 0} · Confirmações: ${rec.paidEmail?.needsIntervention ?? 0} · Estornos: ${rec.refundsPaused ? 'pausado' : rec.refunds?.needsIntervention ?? 0}.`,
        verbalCue: pending > 0 ? KONOHA_VERBAL_MESSAGES.recoveryInProgress : undefined,
        specialModeActive: false,
        specialModeHint: 'Baryon Mode: inativo (requer homologação)',
        lastActivity: rec.at || null,
      };
    }

    case 'kaguya': {
      if (containments === null) {
        return {
          tone: 'unknown',
          statusLabel: 'Indisponível',
          detail: 'Leitura da quarentena de infraestrutura indisponível.',
          specialModeActive: false,
        };
      }
      const record = findContainment('kaguya');
      if (record?.active) {
        return {
          tone: 'critical',
          statusLabel: 'Quarentena ativa',
          detail: `Incidente ${record.incidentId} · Isolados na aplicação: ${record.scopes.join(', ')}.`,
          verbalCue: KONOHA_VERBAL_MESSAGES.kaguyaIsolationConfirmed,
          specialModeActive: true,
          specialModeHint: 'Amenominaka ativo',
          lastActivity: record.changedAt,
        };
      }
      return {
        tone: snapshot.emergencyAccessVerified ? 'info' : 'warning',
        statusLabel: snapshot.emergencyAccessVerified ? 'Pronto' : 'Trava HAGOROMO',
        detail: snapshot.emergencyAccessVerified
          ? '5 componentes isoláveis · quarentena pronta'
          : 'Requer NUA_EMERGENCY_ACCESS_VERIFIED ativo',
        specialModeActive: false,
        specialModeHint: 'Amenominaka inativo',
        lastActivity: record?.changedAt || null,
      };
    }
  }
}
