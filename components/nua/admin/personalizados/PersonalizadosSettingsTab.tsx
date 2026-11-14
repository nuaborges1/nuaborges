'use client';

import React from 'react';
import {
  Sliders,
  RefreshCw,
  Save,
} from 'lucide-react';
import {
  PersonalizadosSettings,
} from '@/lib/personalizadosCanonical';
import { PersonalizadosPhotoSettings } from './PersonalizadosPhotoSettings';
import { PersonalizadosVideoSettings } from './PersonalizadosVideoSettings';
import { PersonalizadosSimulatorCard } from './PersonalizadosSimulatorCard';

interface PersonalizadosSettingsTabProps {
  settings: PersonalizadosSettings;
  setSettings: React.Dispatch<React.SetStateAction<PersonalizadosSettings>>;
  savingSettings: boolean;
  onSaveSettings: (e?: React.FormEvent) => Promise<void>;
  onAddVideoOption: () => void;
  onRemoveVideoOption: (id: string) => void;
  simPhotoCount: number;
  setSimPhotoCount: (v: number) => void;
  simVideoId: string;
  setSimVideoId: (v: string) => void;
  simMentionName: boolean;
  setSimMentionName: (v: boolean) => void;
  simExpress24h: boolean;
  setSimExpress24h: (v: boolean) => void;
  simPriceDetails: {
    photosPrice: number;
    videoPrice: number;
    mentionPrice: number;
    expressPrice: number;
    subtotal: number;
    total: number;
  };
}

export function PersonalizadosSettingsTab({
  settings,
  setSettings,
  savingSettings,
  onSaveSettings,
  onAddVideoOption,
  onRemoveVideoOption,
  simPhotoCount,
  setSimPhotoCount,
  simVideoId,
  setSimVideoId,
  simMentionName,
  setSimMentionName,
  simExpress24h,
  setSimExpress24h,
  simPriceDetails,
}: PersonalizadosSettingsTabProps) {
  return (
    <form onSubmit={onSaveSettings} className="space-y-6">
      {/* Barra Superior de Status & Ações da Calculadora */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 flex items-center justify-center text-[#f4a7b9] shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-white">
                Parâmetros da Calculadora Pública
              </h3>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                  settings.enabled
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {settings.enabled ? 'Ativa no Site' : 'Pausada'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
              Valores e regras aplicados em tempo real na página pública de encomendas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Toggle de Ativação no Site */}
          <button
            type="button"
            onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
            className={`h-8 px-3 rounded-lg border text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
              settings.enabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/15'
                : 'bg-[#0e0f14] border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${settings.enabled ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            <span>{settings.enabled ? 'Ativa' : 'Oculta'}</span>
          </button>

          {/* Botão de Salvar Alterações */}
          <button
            type="submit"
            disabled={savingSettings}
            className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {savingSettings ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid Principal: Parâmetros (7 colunas) + Simulador ao Vivo (5 colunas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUNA ESQUERDA: PARÂMETROS E REGRAS (7 colunas) */}
        <div className="lg:col-span-7 space-y-6">
          <PersonalizadosPhotoSettings
            settings={settings}
            setSettings={setSettings}
          />

          <PersonalizadosVideoSettings
            settings={settings}
            setSettings={setSettings}
            onAddVideoOption={onAddVideoOption}
            onRemoveVideoOption={onRemoveVideoOption}
          />
        </div>

        {/* COLUNA DIREITA: SIMULADOR INTERATIVO AO VIVO (5 colunas) */}
        <PersonalizadosSimulatorCard
          settings={settings}
          simPhotoCount={simPhotoCount}
          setSimPhotoCount={setSimPhotoCount}
          simVideoId={simVideoId}
          setSimVideoId={setSimVideoId}
          simMentionName={simMentionName}
          setSimMentionName={setSimMentionName}
          simExpress24h={simExpress24h}
          setSimExpress24h={setSimExpress24h}
          simPriceDetails={simPriceDetails}
          savingSettings={savingSettings}
        />
      </div>
    </form>
  );
}
