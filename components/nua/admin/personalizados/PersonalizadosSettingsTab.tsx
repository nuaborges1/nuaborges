/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  RefreshCw,
  Save,
  CheckCircle2,
} from 'lucide-react';
import {
  PersonalizadosSettings,
} from '@/lib/personalizadosCanonical';
import { PersonalizadosPhotoSettings } from './PersonalizadosPhotoSettings';
import { PersonalizadosVideoSettings } from './PersonalizadosVideoSettings';
import { SectionHeader } from '../ui/AdminPrimitives';

interface PersonalizadosSettingsTabProps {
  settings: PersonalizadosSettings;
  setSettings: React.Dispatch<React.SetStateAction<PersonalizadosSettings>>;
  savingSettings: boolean;
  onSaveSettings: (e?: React.FormEvent) => Promise<void>;
  onAddVideoOption: () => void;
  onRemoveVideoOption: (id: string) => void;
  simPhotoCount?: number;
  setSimPhotoCount?: (v: number) => void;
  simVideoId?: string;
  setSimVideoId?: (v: string) => void;
  simMentionName?: boolean;
  setSimMentionName?: (v: boolean) => void;
  simExpress24h?: boolean;
  setSimExpress24h?: (v: boolean) => void;
  simPriceDetails?: {
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
}: PersonalizadosSettingsTabProps) {
  return (
    <form id="admin-personalizados-precos" data-field="personalizados.settings" onSubmit={onSaveSettings} className="space-y-5 w-full">
      <SectionHeader
        title="Preços, Opções e Regras de Encomenda"
        description="Defina o valor unitário por foto, faixas de duração de vídeo, adicionais, canais de entrega e textos exibidos na página pública."
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <label className="inline-flex items-center gap-2.5 h-9 px-3.5 rounded-xl bg-[#14161d] border border-white/[0.08] hover:border-white/[0.15] text-xs text-zinc-200 cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
                className="w-3.5 h-3.5 accent-[#843C52] cursor-pointer"
              />
              <span>Receber encomendas no site</span>
            </label>

            {/* Indicador de Salvamento Automático (sem modais ou botões manuais obrigatórios) */}
            {savingSettings ? (
              <div className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-300">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#843C52]" />
                <span>Salvando...</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Salvo automaticamente</span>
              </div>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        {/* Coluna 1: Fotos, Opcionais de Gravação e Canais de Entrega */}
        <div className="space-y-5">
          <PersonalizadosPhotoSettings
            settings={settings}
            setSettings={setSettings}
            mode="pricing"
          />

          <PersonalizadosVideoSettings
            settings={settings}
            setSettings={setSettings}
            onAddVideoOption={onAddVideoOption}
            onRemoveVideoOption={onRemoveVideoOption}
            mode="rules"
          />
        </div>

        {/* Coluna 2: Faixas de Vídeo, Prazos e Textos da Página */}
        <div className="space-y-5">
          <PersonalizadosVideoSettings
            settings={settings}
            setSettings={setSettings}
            onAddVideoOption={onAddVideoOption}
            onRemoveVideoOption={onRemoveVideoOption}
            mode="pricing"
          />

          <PersonalizadosPhotoSettings
            settings={settings}
            setSettings={setSettings}
            mode="rules"
          />
        </div>
      </div>
    </form>
  );
}
