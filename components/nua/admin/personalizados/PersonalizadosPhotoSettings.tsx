'use client';

import React from 'react';
import {
  Camera,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import {
  PersonalizadosSettings,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';
import { AdminNumberStepper, AdminInput, AdminTextarea } from '@/components/nua/admin';

interface PersonalizadosPhotoSettingsProps {
  settings: PersonalizadosSettings;
  setSettings: React.Dispatch<React.SetStateAction<PersonalizadosSettings>>;
  mode?: 'pricing' | 'rules' | 'all';
}

export function PersonalizadosPhotoSettings({
  settings,
  setSettings,
  mode = 'all',
}: PersonalizadosPhotoSettingsProps) {
  return (
    <div className="space-y-5">
      {/* SEÇÃO 1: FOTOS EXCLUSIVAS */}
      {(mode === 'all' || mode === 'pricing') && (
        <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9]">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-wide">
                  Ensaio Fotográfico Exclusivo
                </h4>
                <p className="text-[11px] text-zinc-400 font-light">
                  Valor unitário e limites de quantidade por pedido.
                </p>
              </div>
            </div>
            <span className="font-mono text-xs text-zinc-200 font-semibold px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              {formatCurrencyBrl(settings.pricePerPhoto)} / foto
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AdminNumberStepper
              variant="card"
              label="Valor por Foto"
              prefix="R$"
              value={settings.pricePerPhoto}
              min={1}
              step={1}
              onChange={(pricePerPhoto) => setSettings({ ...settings, pricePerPhoto })}
            />

            <AdminNumberStepper
              variant="card"
              label="Mínimo de Fotos"
              unit="fotos"
              value={settings.minPhotos}
              min={1}
              max={settings.maxPhotos}
              step={1}
              onChange={(minPhotos) => setSettings({ ...settings, minPhotos })}
            />

            <AdminNumberStepper
              variant="card"
              label="Máximo de Fotos"
              unit="fotos"
              value={settings.maxPhotos}
              min={settings.minPhotos}
              step={5}
              onChange={(maxPhotos) => setSettings({ ...settings, maxPhotos })}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] text-xs text-zinc-400">
            <span>Valor mínimo total do pedido:</span>
            <AdminNumberStepper
              variant="inline"
              prefix="R$"
              value={settings.minOrderTotal}
              min={0}
              step={5}
              onChange={(minOrderTotal) => setSettings({ ...settings, minOrderTotal })}
            />
          </div>
        </div>
      )}

      {/* SEÇÃO: PRAZOS, TERMOS E APRESENTAÇÃO */}
      {(mode === 'all' || mode === 'rules') && (
        <>
          <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-3 pb-3.5 border-b border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-wide">
                  Prazos de Entrega &amp; Regras de Produção
                </h4>
                <p className="text-[11px] text-zinc-400 font-light">
                  Orientações e prazo estimado exibidos ao cliente antes do pagamento.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Prazo estimado regular de entrega
                </label>
                <AdminInput
                  value={settings.estimatedDeliveryText}
                  onChange={(e) =>
                    setSettings({ ...settings, estimatedDeliveryText: e.target.value })
                  }
                  placeholder="Ex: Em até 72 horas úteis após a confirmação do pagamento."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Limites e diretrizes de gravação
                </label>
                <AdminTextarea
                  rows={3}
                  value={settings.termsAndLimitsText}
                  onChange={(e) =>
                    setSettings({ ...settings, termsAndLimitsText: e.target.value })
                  }
                  placeholder="Diretrizes éticas e limites de produção artística..."
                />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-3 pb-3.5 border-b border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9]">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-wide">
                  Textos de Apresentação da Página
                </h4>
                <p className="text-[11px] text-zinc-400 font-light">
                  Título e descrição exibidos no topo da página pública de personalizados.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">Antetítulo</label>
                <AdminInput
                  value={settings.eyebrow}
                  onChange={(e) => setSettings({ ...settings, eyebrow: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">Título principal</label>
                <AdminInput
                  value={settings.title}
                  onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block">Subtítulo / descrição</label>
              <AdminInput
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
