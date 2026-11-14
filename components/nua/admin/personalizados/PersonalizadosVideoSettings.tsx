'use client';

import React from 'react';
import {
  Film,
  Clock,
  Trash2,
  Plus,
  Crown,
  Quote,
  Zap,
  Send,
  Lock,
  Check,
} from 'lucide-react';
import {
  PersonalizadosSettings,
} from '@/lib/personalizadosCanonical';

interface PersonalizadosVideoSettingsProps {
  settings: PersonalizadosSettings;
  setSettings: React.Dispatch<React.SetStateAction<PersonalizadosSettings>>;
  onAddVideoOption: () => void;
  onRemoveVideoOption: (id: string) => void;
}

export function PersonalizadosVideoSettings({
  settings,
  setSettings,
  onAddVideoOption,
  onRemoveVideoOption,
}: PersonalizadosVideoSettingsProps) {
  return (
    <div className="space-y-6">
      {/* SEÇÃO 2: VÍDEOS EXCLUSIVOS SOB MEDIDA */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white tracking-wide">
                Gravação de Vídeos Exclusivos
              </h4>
              <p className="text-[11px] text-zinc-400 font-light">
                Faixas de duração e valores cobrados para gravações em vídeo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setSettings((s) => ({ ...s, videoEnabled: !s.videoEnabled }))
            }
            className={`h-7 px-3 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              settings.videoEnabled
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                : 'bg-[#101116] border-white/10 text-zinc-500'
            }`}
          >
            {settings.videoEnabled ? 'Vídeos Habilitados' : 'Vídeos Desabilitados'}
          </button>
        </div>

        {settings.videoEnabled ? (
          <div className="space-y-2.5">
            {settings.videoOptions.map((opt, idx) => {
              const isBase = opt.durationMinutes === 0;
              return (
                <div
                  key={opt.id}
                  className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] hover:border-white/15 transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-xs font-semibold shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{isBase ? 'Apenas Fotos' : `${opt.durationMinutes} min`}</span>
                    </div>

                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => {
                        const next = [...settings.videoOptions];
                        next[idx].label = e.target.value;
                        setSettings({ ...settings, videoOptions: next });
                      }}
                      className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] font-medium"
                      placeholder="Nome exibido na opção..."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 shrink-0">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0e0f14] border border-white/10">
                      <span className="text-[10px] text-zinc-500 font-mono">R$</span>
                      <input
                        type="number"
                        min="0"
                        value={opt.price}
                        onChange={(e) => {
                          const next = [...settings.videoOptions];
                          next[idx].price = Math.max(0, Number(e.target.value));
                          setSettings({ ...settings, videoOptions: next });
                        }}
                        className="w-20 text-right font-mono text-xs font-bold text-white bg-transparent outline-none focus:text-[#f4a7b9]"
                      />
                    </div>

                    {!isBase && (
                      <button
                        type="button"
                        onClick={() => onRemoveVideoOption(opt.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remover esta duração"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={onAddVideoOption}
              className="w-full py-2.5 rounded-lg border border-dashed border-white/15 hover:border-[#f4a7b9]/40 text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer bg-white/[0.01] hover:bg-white/[0.03]"
            >
              <Plus className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>Adicionar Nova Faixa de Duração de Vídeo</span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic p-3.5 rounded-lg bg-[#101116] border border-white/[0.04]">
            A opção de incluir vídeos está desativada. Os clientes só poderão encomendar fotos.
          </p>
        )}
      </div>

      {/* SEÇÃO 3: DIFERENCIAIS & ADICIONAIS DE PRODUÇÃO */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-3.5 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white tracking-wide">
              Diferenciais &amp; Opcionais de Gravação
            </h4>
            <p className="text-[11px] text-zinc-400 font-light">
              Personalizações adicionais e taxa de urgência na fila de pedidos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Dizer Nome / Dedicatória */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-[#101116] border border-white/[0.06] hover:border-white/15 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Quote className="w-4 h-4 text-[#f4a7b9]" />
                <span className="text-xs font-semibold text-white">Dizer Nome / Dedicatória</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    mentionNameEnabled: !s.mentionNameEnabled,
                  }))
                }
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                  settings.mentionNameEnabled ? 'bg-[#f4a7b9]' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                    settings.mentionNameEnabled ? 'translate-x-4' : 'translate-x-0 bg-zinc-400'
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              Nua cita o nome do admirador no vídeo ou grava áudio exclusivo com dedicatória.
            </p>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Valor Adicional:</span>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-white bg-[#0e0f14] px-2.5 py-1 rounded-lg border border-white/10">
                <span className="text-zinc-500">R$</span>
                <input
                  type="number"
                  min="0"
                  value={settings.mentionNamePrice}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      mentionNamePrice: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-16 text-right bg-transparent outline-none focus:text-[#f4a7b9]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Prioridade Express 24h */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-[#101116] border border-white/[0.06] hover:border-white/15 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">Prioridade Express (24h)</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    express24hEnabled: !s.express24hEnabled,
                  }))
                }
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                  settings.express24hEnabled ? 'bg-amber-400' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
                    settings.express24hEnabled ? 'translate-x-4' : 'translate-x-0 bg-zinc-400'
                  }`}
                />
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              O pedido fura a fila regular de produção e é gravado e entregue no prazo de 24 horas.
            </p>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Taxa de Urgência:</span>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-white bg-[#0e0f14] px-2.5 py-1 rounded-lg border border-white/10">
                <span className="text-zinc-500">R$</span>
                <input
                  type="number"
                  min="0"
                  value={settings.express24hPrice}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      express24hPrice: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-16 text-right bg-transparent outline-none focus:text-amber-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 4: CANAIS DE ENTREGA DISPONÍVEIS */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-white/[0.06] shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-3.5 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white tracking-wide">
              Canais de Entrega Privativos
            </h4>
            <p className="text-[11px] text-zinc-400 font-light">
              Métodos de recebimento permitidos para escolha do cliente no checkout.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Telegram VIP */}
          <div
            onClick={() =>
              setSettings({
                ...settings,
                deliveryMethods: {
                  ...settings.deliveryMethods,
                  telegram: !settings.deliveryMethods.telegram,
                },
              })
            }
            className={`p-3.5 sm:p-4 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-3 ${
              settings.deliveryMethods.telegram
                ? 'bg-sky-500/[0.08] border-sky-500/30'
                : 'bg-[#101116] border-white/[0.06] opacity-60'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-white">Telegram VIP</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                Envio de mídias direto no chat privativo do cliente pelo Telegram.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 mt-0.5 ${
                settings.deliveryMethods.telegram
                  ? 'bg-sky-500 border-sky-400 text-black'
                  : 'border-white/20 bg-[#0e0f14]'
              }`}
            >
              {settings.deliveryMethods.telegram && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>

          {/* Cofre Secreto no Site */}
          <div
            onClick={() =>
              setSettings({
                ...settings,
                deliveryMethods: {
                  ...settings.deliveryMethods,
                  vault: !settings.deliveryMethods.vault,
                },
              })
            }
            className={`p-3.5 sm:p-4 rounded-lg border transition-all cursor-pointer flex items-start justify-between gap-3 ${
              settings.deliveryMethods.vault
                ? 'bg-[#f4a7b9]/[0.08] border-[#f4a7b9]/40'
                : 'bg-[#101116] border-white/[0.06] opacity-60'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#f4a7b9]" />
                <span className="text-xs font-semibold text-white">Cofre no Site (Link Secreto)</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                Área de download exclusiva protegida por token de segurança único.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 mt-0.5 ${
                settings.deliveryMethods.vault
                  ? 'bg-[#f4a7b9] border-[#f4a7b9] text-zinc-950'
                  : 'border-white/20 bg-[#0e0f14]'
              }`}
            >
              {settings.deliveryMethods.vault && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
