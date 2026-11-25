/* Vinho maduro / Nua Borges */
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
import { AdminNumberStepper, AdminSwitch } from '@/components/nua/admin';

interface PersonalizadosVideoSettingsProps {
  settings: PersonalizadosSettings;
  setSettings: React.Dispatch<React.SetStateAction<PersonalizadosSettings>>;
  onAddVideoOption: () => void;
  onRemoveVideoOption: (id: string) => void;
  mode?: 'pricing' | 'rules' | 'all';
}

export function PersonalizadosVideoSettings({
  settings,
  setSettings,
  onAddVideoOption,
  onRemoveVideoOption,
  mode = 'all',
}: PersonalizadosVideoSettingsProps) {
  return (
    <div className="space-y-5">
      {/* SEÇÃO: GRAVAÇÃO DE VÍDEOS EXCLUSIVOS */}
      {(mode === 'all' || mode === 'pricing') && (
        <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#843C52]">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-wide">
                  Gravação de Vídeos Exclusivos
                </h4>
                <p className="text-[11px] text-zinc-400 font-light">
                  Faixas de duração e valores cobrados para vídeos sob medida.
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0e1015] border border-white/[0.08] text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.videoEnabled}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, videoEnabled: e.target.checked }))
                }
                className="w-3.5 h-3.5 accent-[#843C52] cursor-pointer"
              />
              <span>Vídeos habilitados</span>
            </label>
          </div>

          {settings.videoEnabled ? (
            <div className="space-y-2.5">
              {settings.videoOptions.map((opt, idx) => {
                const isBase = opt.durationMinutes === 0;
                return (
                  <div
                    key={opt.id}
                    className="p-3 rounded-xl bg-[#0e1015] border border-white/[0.06] hover:border-white/[0.12] transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 flex-1">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-200 font-mono text-xs font-medium shrink-0 min-w-[96px] justify-center">
                        <Clock className="w-3 h-3 text-[#843C52]" />
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
                        className="w-full h-9 bg-[#14161d] border border-white/[0.08] rounded-lg px-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52] font-medium"
                        placeholder="Nome exibido na opção..."
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <AdminNumberStepper
                        variant="inline"
                        prefix="R$"
                        min={0}
                        step={10}
                        value={opt.price}
                        onChange={(price) => {
                          const next = [...settings.videoOptions];
                          next[idx].price = price;
                          setSettings({ ...settings, videoOptions: next });
                        }}
                      />

                      {!isBase && (
                        <button
                          type="button"
                          onClick={() => onRemoveVideoOption(opt.id)}
                          className="w-8 h-8 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
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
                className="w-full h-9 rounded-xl border border-dashed border-white/15 hover:border-[#843C52]/40 text-xs text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer bg-white/[0.01] hover:bg-white/[0.03]"
              >
                <Plus className="w-3.5 h-3.5 text-[#843C52]" />
                <span>Adicionar faixa de duração</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 p-3.5 rounded-xl bg-[#0e1015] border border-white/[0.04]">
              A opção de vídeo está desativada. Os clientes só poderão encomendar fotos.
            </p>
          )}
        </div>
      )}

      {/* SEÇÃO: DIFERENCIAIS + CANAIS DE ENTREGA */}
      {(mode === 'all' || mode === 'rules') && (
        <>
          <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-3 pb-3.5 border-b border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#843C52]">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-wide">
                  Diferenciais &amp; Opcionais de Gravação
                </h4>
                <p className="text-[11px] text-zinc-400 font-light">
                  Personalizações extras e prioridade de produção.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Card 1: Dizer Nome / Dedicatória */}
              <div className="p-4 rounded-xl bg-[#0e1015] border border-white/[0.06] space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Quote className="w-3.5 h-3.5 text-[#843C52]" />
                      <span className="text-xs font-semibold text-white">Dizer Nome / Dedicatória</span>
                    </div>
                    <AdminSwitch
                      checked={settings.mentionNameEnabled}
                      onChange={(mentionNameEnabled) =>
                        setSettings((s) => ({ ...s, mentionNameEnabled }))
                      }
                    />
                  </div>

                  <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                    Citar o nome do cliente no vídeo ou gravar áudio exclusivo com dedicatória.
                  </p>
                </div>

                <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">Valor adicional:</span>
                  <AdminNumberStepper
                    variant="inline"
                    prefix="R$"
                    min={0}
                    step={10}
                    value={settings.mentionNamePrice}
                    onChange={(mentionNamePrice) =>
                      setSettings((s) => ({ ...s, mentionNamePrice }))
                    }
                  />
                </div>
              </div>

              {/* Card 2: Prioridade Express 24h */}
              <div className="p-4 rounded-xl bg-[#0e1015] border border-white/[0.06] space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-[#843C52]" />
                      <span className="text-xs font-semibold text-white">Prioridade Express (24h)</span>
                    </div>
                    <AdminSwitch
                      checked={settings.express24hEnabled}
                      onChange={(express24hEnabled) =>
                        setSettings((s) => ({ ...s, express24hEnabled }))
                      }
                    />
                  </div>

                  <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                    Prioriza o pedido na fila para gravação e entrega em até 24 horas.
                  </p>
                </div>

                <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">Taxa de urgência:</span>
                  <AdminNumberStepper
                    variant="inline"
                    prefix="R$"
                    min={0}
                    step={10}
                    value={settings.express24hPrice}
                    onChange={(express24hPrice) =>
                      setSettings((s) => ({ ...s, express24hPrice }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-3 pb-3.5 border-b border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#843C52]">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white tracking-wide">
                  Canais de Entrega Disponíveis
                </h4>
                <p className="text-[11px] text-zinc-400 font-light">
                  Formas de recebimento que o cliente pode escolher no pedido.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  settings.deliveryMethods.telegram
                    ? 'bg-[#18151c] border-[#843C52]/35'
                    : 'bg-[#0e1015] border-white/[0.06] opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-[#843C52]" />
                    <span className="text-xs font-semibold text-white">Telegram VIP</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                    Envio direto no chat privado do cliente pelo Telegram.
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 mt-0.5 ${
                    settings.deliveryMethods.telegram
                      ? 'bg-[#843C52] border-[#843C52] text-white'
                      : 'border-white/20 bg-[#14161d]'
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
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  settings.deliveryMethods.vault
                    ? 'bg-[#18151c] border-[#843C52]/35'
                    : 'bg-[#0e1015] border-white/[0.06] opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-[#843C52]" />
                    <span className="text-xs font-semibold text-white">Cofre no Site</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                    Página exclusiva para baixar os arquivos, protegida por link secreto.
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 mt-0.5 ${
                    settings.deliveryMethods.vault
                      ? 'bg-[#843C52] border-[#843C52] text-white'
                      : 'border-white/20 bg-[#14161d]'
                  }`}
                >
                  {settings.deliveryMethods.vault && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
