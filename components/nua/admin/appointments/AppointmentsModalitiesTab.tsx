'use client';

import React from 'react';
import { Plus, Clock, Edit2, Trash2 } from 'lucide-react';
import { AppointmentModality, formatCurrencyBrl } from '@/lib/appointmentsCanonical';

interface AppointmentsModalitiesTabProps {
  modalities: AppointmentModality[];
  onStartCreateModality: () => void;
  onStartEditModality: (mod: AppointmentModality) => void;
  onDeleteModality: (modId: string, modName: string) => void;
}

export function AppointmentsModalitiesTab({
  modalities,
  onStartCreateModality,
  onStartEditModality,
  onDeleteModality,
}: AppointmentsModalitiesTabProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-xs font-light">
          Configure as opções que os visitantes podem agendar no site.
        </p>
        <button
          type="button"
          onClick={onStartCreateModality}
          className="h-8 px-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar Modalidade</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modalities.map((mod) => (
          <div
            key={mod.id}
            className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-[#f4a7b9] font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {mod.durationMinutes} min
                </span>
                <span
                  className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${
                    mod.active
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/[0.06] text-zinc-500'
                  }`}
                >
                  {mod.active ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              <h3 className="text-base font-semibold text-white mb-1">{mod.name}</h3>
              <p className="text-zinc-400 text-xs font-light mb-3 leading-relaxed">
                {mod.description}
              </p>
              <div className="text-sm font-semibold text-[#f4a7b9] mb-4">
                {formatCurrencyBrl(mod.price)}
              </div>

              {mod.rules?.length > 0 && (
                <div className="border-t border-white/[0.06] pt-3 mb-4 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                    Regras:
                  </span>
                  {mod.rules.map((r, idx) => (
                    <div key={idx} className="text-[11px] text-zinc-400 flex items-start gap-1.5">
                      <span className="text-[#f4a7b9]">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onStartEditModality(mod)}
                className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs border border-white/[0.08] transition-colors cursor-pointer flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteModality(mod.id, mod.name)}
                className="h-7 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
