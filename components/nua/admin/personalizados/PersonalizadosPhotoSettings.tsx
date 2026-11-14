'use client';

import React from 'react';
import {
  Camera,
  Minus,
  Plus,
  ShieldCheck,
  Shield,
  Clock,
  Sliders,
} from 'lucide-react';
import {
  PersonalizadosSettings,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';

interface PersonalizadosPhotoSettingsProps {
  settings: PersonalizadosSettings;
  setSettings: React.Dispatch<React.SetStateAction<PersonalizadosSettings>>;
}

export function PersonalizadosPhotoSettings({
  settings,
  setSettings,
}: PersonalizadosPhotoSettingsProps) {
  return (
    <div className="space-y-6">
      {/* SEÇÃO 1: FOTOS EXCLUSIVAS */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-5 relative">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 flex items-center justify-center text-[#f4a7b9]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white tracking-wide">
                Ensaio Fotográfico Exclusivo
              </h4>
              <p className="text-[11px] text-zinc-400 font-light">
                Precificação de fotos individuais em alta resolução 4K.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-[#f4a7b9] font-bold">
            {formatCurrencyBrl(settings.pricePerPhoto)} / foto
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] space-y-2">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
              Valor Unitário da Foto
            </label>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-500 font-mono">R$</span>
              <input
                type="number"
                min="1"
                value={settings.pricePerPhoto}
                onChange={(e) =>
                  setSettings({ ...settings, pricePerPhoto: Math.max(1, Number(e.target.value)) })
                }
                className="w-full text-right font-mono text-xs font-bold text-white bg-transparent outline-none focus:text-[#f4a7b9]"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] space-y-2">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
              Mínimo de Fotos
            </label>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, minPhotos: Math.max(1, settings.minPhotos - 1) })
                }
                className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono text-xs font-bold text-white">
                {settings.minPhotos} fotos
              </span>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, minPhotos: settings.minPhotos + 1 })
                }
                className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] space-y-2">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
              Máximo de Fotos
            </label>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    maxPhotos: Math.max(settings.minPhotos, settings.maxPhotos - 5),
                  })
                }
                className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono text-xs font-bold text-white">
                {settings.maxPhotos} fotos
              </span>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, maxPhotos: settings.maxPhotos + 5 })
                }
                className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-500">
          <span>Pedido Mínimo Geral da Calculadora:</span>
          <div className="flex items-center gap-1.5 font-mono text-zinc-300 font-semibold">
            <span>R$</span>
            <input
              type="number"
              min="0"
              value={settings.minOrderTotal}
              onChange={(e) =>
                setSettings({ ...settings, minOrderTotal: Math.max(0, Number(e.target.value)) })
              }
              className="w-16 text-right bg-transparent border-b border-white/20 pb-0.5 outline-none focus:border-[#f4a7b9] text-xs font-mono text-white"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 5: PRAZOS E REGRAS ÉTICAS */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3.5 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white tracking-wide">
              Prazos Oficiais &amp; Termos Éticos
            </h4>
            <p className="text-[11px] text-zinc-400 font-light">
              Textos de consentimento e estimativa de entrega exibidos antes do pagamento.
            </p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-emerald-400" />
              Prazo Estimado Regular de Entrega:
            </label>
            <input
              type="text"
              value={settings.estimatedDeliveryText}
              onChange={(e) =>
                setSettings({ ...settings, estimatedDeliveryText: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9] transition-colors"
              placeholder="Ex: Em até 72 horas úteis após a confirmação do pagamento."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-emerald-400" />
              Limites &amp; Regras Éticas de Gravação (O que Nua NÃO grava):
            </label>
            <textarea
              rows={3}
              value={settings.termsAndLimitsText}
              onChange={(e) =>
                setSettings({ ...settings, termsAndLimitsText: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
              placeholder="Diretrizes éticas e limites de produção artística..."
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 6: TEXTOS DE APRESENTAÇÃO DA VITRINE */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
          <Sliders className="w-4 h-4 text-[#f4a7b9]" />
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
            Textos de Apresentação da Vitrine (/personalizados)
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-zinc-400">Antetítulo (Eyebrow):</label>
            <input
              type="text"
              value={settings.eyebrow}
              onChange={(e) => setSettings({ ...settings, eyebrow: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-zinc-400">Título Principal:</label>
            <input
              type="text"
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-zinc-400">Subtítulo / Descrição de Abertura:</label>
          <input
            type="text"
            value={settings.subtitle}
            onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#f4a7b9]"
          />
        </div>
      </div>
    </div>
  );
}
