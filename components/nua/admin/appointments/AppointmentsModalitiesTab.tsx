/* Vinho maduro / Nua Borges — Tipos de Chamada e Preços Integrados */
'use client';

import React from 'react';
import { Plus, Clock, Edit2, Trash2, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { AppointmentModality, formatCurrencyBrl } from '@/lib/appointmentsCanonical';

interface AppointmentsModalitiesTabProps {
  modalities: AppointmentModality[];
  onStartCreateModality: () => void;
  onStartEditModality: (mod: AppointmentModality) => void;
  onDeleteModality: (modId: string, modName: string) => void;
  onSaveModalities?: (updatedList: AppointmentModality[]) => void;
}

export function AppointmentsModalitiesTab({
  modalities,
  onStartCreateModality,
  onStartEditModality,
  onDeleteModality,
  onSaveModalities,
}: AppointmentsModalitiesTabProps) {
  const handleToggleActive = (modId: string) => {
    if (!onSaveModalities) return;
    const updated = modalities.map((m) => (m.id === modId ? { ...m, active: !m.active } : m));
    onSaveModalities(updated);
  };

  const activeCount = modalities.filter((m) => m.active).length;

  return (
    <div className="space-y-6 text-left">
      {/* Cabeçalho com Instruções Claras */}
      <div className="p-5 rounded-xl bg-[#14151c] border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white tracking-tight">
              Tipos de Chamada e Preços no Site
            </h3>
            <span className="text-[11px] font-mono text-[#f4a7b9] bg-[#843C52]/15 border border-[#843C52]/30 px-2 py-0.5 rounded-full font-medium">
              {activeCount} de {modalities.length} visíveis no site
            </span>
          </div>
          <p className="text-zinc-400 text-xs font-light mt-1 max-w-2xl leading-relaxed">
            Configure as opções que aparecem para seus clientes na página pública de reservas. As alterações valem imediatamente para novas reservas e não alteram atendimentos já contratados.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartCreateModality}
          className="h-9 px-4 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Tipo de Chamada</span>
        </button>
      </div>

      {/* Grade de Cards das Opções de Chamada */}
      {modalities.length === 0 ? (
        <div className="p-10 rounded-xl bg-[#14151c] border border-dashed border-white/10 text-center space-y-2">
          <Clock className="w-6 h-6 text-zinc-500 mx-auto" />
          <div className="text-sm font-semibold text-white">
            Nenhum tipo de chamada cadastrado
          </div>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Clique em &ldquo;Adicionar Tipo de Chamada&rdquo; acima para configurar suas opções de atendimento.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modalities.map((mod) => (
          <div
            key={mod.id}
            className={`p-5 rounded-xl border flex flex-col justify-between shadow-sm transition-all ${
              mod.active
                ? 'bg-[#14151c] border-white/[0.08] hover:border-white/20'
                : 'bg-[#101116]/80 border-white/[0.04] opacity-75'
            }`}
          >
            <div>
              {/* Topo do card: Duração e Status */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
                <span className="text-xs font-mono text-[#f4a7b9] font-medium flex items-center gap-1.5 bg-[#843C52]/15 px-2.5 py-1 rounded-lg border border-[#843C52]/30">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{mod.durationMinutes} minutos</span>
                </span>
                <span
                  className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                    mod.active
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                      : 'bg-white/[0.04] text-zinc-500 border-white/[0.06]'
                  }`}
                >
                  {mod.active ? (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>Visível no site</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" />
                      <span>Oculto no site</span>
                    </>
                  )}
                </span>
              </div>

              {/* Título e Descrição */}
              <h4 className="text-base font-semibold text-white mb-1.5">{mod.name}</h4>
              <p className="text-zinc-400 text-xs font-light mb-4 leading-relaxed line-clamp-3">
                {mod.description || 'Sem descrição cadastrada.'}
              </p>

              {/* Valor Cobrado via PIX */}
              <div className="p-3 rounded-lg bg-[#0e0f14] border border-white/[0.05] mb-4">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                  Valor cobrado no site
                </span>
                <div className="text-lg font-bold text-white mt-0.5">
                  {formatCurrencyBrl(mod.price)}
                </div>
                <span className="text-[10px] text-zinc-400 font-light block mt-0.5">
                  Pagamento direto via PIX com aprovação automática.
                </span>
              </div>

              {/* Regras e Condições que o cliente vê */}
              {mod.rules?.length > 0 && (
                <div className="mb-4 space-y-1.5">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider block font-semibold">
                    Regras exibidas ao cliente:
                  </span>
                  <div className="space-y-1">
                    {mod.rules.map((r, idx) => (
                      <div key={idx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
                        <span className="text-[#843C52] shrink-0">•</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Card: Toggle e Ações */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mod.active}
                  onChange={() => handleToggleActive(mod.id)}
                  className="rounded bg-[#0e0f14] border-white/20 text-[#843C52] focus:ring-0 cursor-pointer w-4 h-4"
                />
                <span className="text-xs text-zinc-300 font-medium">
                  {mod.active ? 'Ativo no site' : 'Inativo (oculto)'}
                </span>
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onStartEditModality(mod)}
                  className="h-7 px-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-xs border border-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3 h-3 text-[#f4a7b9]" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteModality(mod.id, mod.name)}
                  title="Excluir este tipo de chamada"
                  className="h-7 w-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Box de Segurança e Informação Transparente */}
      <div className="p-4 rounded-xl bg-[#14151c] border border-white/[0.07] flex items-start gap-3 text-xs text-zinc-300 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-[#843C52] shrink-0 mt-0.5" />
        <div>
          <b className="text-white block mb-0.5">Regra de Segurança da Vitrine:</b>
          <span>
            Qualquer alteração em valores, títulos ou durações é aplicada instantaneamente para quem acessar o site a partir de agora. Clientes que já realizaram o pagamento ou que possuem chamadas agendadas continuam protegidos pelas condições contratadas no momento da reserva.
          </span>
        </div>
      </div>
    </div>
  );
}
