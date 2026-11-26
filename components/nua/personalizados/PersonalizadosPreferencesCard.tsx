/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import {
  Crown,
  Zap,
  MessageSquare,
  Check,
} from 'lucide-react';
import {
  PersonalizadosSettings,
  DeliveryChannel,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';

interface PersonalizadosPreferencesCardProps {
  settings: PersonalizadosSettings;
  mentionName: boolean;
  setMentionName: (v: boolean) => void;
  express24h: boolean;
  setExpress24h: (v: boolean) => void;
  deliveryChannel: DeliveryChannel;
  briefing: string;
  setBriefing: (v: string) => void;
}

export function PersonalizadosPreferencesCard({
  settings,
  mentionName,
  setMentionName,
  express24h,
  setExpress24h,
  briefing,
  setBriefing,
}: PersonalizadosPreferencesCardProps) {
  const hasAddons = settings.mentionNameEnabled || settings.express24hEnabled;

  return (
    <section
      aria-label="Diferenciais e instruções para a encomenda"
      className="rounded-[28px] bg-[#08080c] border border-white/[0.08] p-5 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-left"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 items-start">
        {hasAddons && (
          <div className="lg:col-span-5 lg:pr-8 lg:border-r lg:border-white/[0.08]">
            <div className="flex items-start gap-3 pb-5 border-b border-white/[0.06]">
              <div className="w-10 h-10 rounded-xl bg-[#661C30]/15 border border-[#7A293D]/30 flex items-center justify-center text-[#F5EEE9] shrink-0">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#F5EEE9]/80 block">
                  Opcionais
                </span>
                <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight mt-0.5">
                  Diferenciais de Gravação
                </h2>
                <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
                  Personalizações extras para sua produção
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 pt-5">
              {settings.mentionNameEnabled && (
                <label
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between gap-3 focus-within:ring-2 focus-within:ring-[#90364B] focus-within:ring-offset-2 focus-within:ring-offset-[#08080c] ${
                    mentionName
                      ? 'bg-[#661C30]/25 border-[#90364B]/70 text-white shadow-[0_0_24px_rgba(67,19,34,0.35)]'
                      : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={mentionName}
                    onChange={(e) => setMentionName(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-serif text-base text-[#F5EEE9] font-normal leading-snug">
                        Dizer meu nome / dedicatória
                      </span>
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          mentionName
                            ? 'border-[#90364B] bg-[#661C30] text-white'
                            : 'border-white/25 bg-black/40'
                        }`}
                      >
                        {mentionName && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-light leading-relaxed">
                      Nua cita seu nome no vídeo ou grava áudio exclusivo com dedicatória.
                    </p>
                  </div>
                  <div className="pt-2.5 border-t border-white/[0.06] flex justify-between items-center text-xs font-mono">
                    <span className="text-zinc-400 font-normal">Adicional</span>
                    <span className="text-[#F5EEE9]/80 font-medium">
                      +{formatCurrencyBrl(settings.mentionNamePrice)}
                    </span>
                  </div>
                </label>
              )}

              {settings.express24hEnabled && (
                <label
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between gap-3 focus-within:ring-2 focus-within:ring-[#90364B] focus-within:ring-offset-2 focus-within:ring-offset-[#08080c] ${
                    express24h
                      ? 'bg-[#661C30]/25 border-[#90364B]/70 text-white shadow-[0_0_24px_rgba(67,19,34,0.35)]'
                      : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={express24h}
                    onChange={(e) => setExpress24h(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-serif text-base text-[#F5EEE9] font-normal leading-snug flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-[#D8B888] shrink-0" />
                        <span>Prioridade Express (24h)</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          express24h
                            ? 'border-[#90364B] bg-[#661C30] text-white'
                            : 'border-white/25 bg-black/40'
                        }`}
                      >
                        {express24h && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-light leading-relaxed">
                      Sua encomenda fura a fila e é gravada e entregue em até 24 horas.
                    </p>
                  </div>
                  <div className="pt-2.5 border-t border-white/[0.06] flex justify-between items-center text-xs font-mono">
                    <span className="text-zinc-400 font-normal">Urgência</span>
                    <span className="text-[#F5EEE9]/80 font-medium">
                      +{formatCurrencyBrl(settings.express24hPrice)}
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        <div
          className={
            hasAddons
              ? 'lg:col-span-7 lg:pl-8 pt-6 border-t border-white/[0.08] lg:pt-0 lg:border-t-0 flex flex-col justify-between h-full'
              : 'lg:col-span-12'
          }
        >
          <div className="flex items-start gap-3 pb-5 border-b border-white/[0.06]">
            <div className="w-10 h-10 rounded-xl bg-[#661C30]/15 border border-[#7A293D]/30 flex items-center justify-center text-[#F5EEE9] shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#F5EEE9]/80 block">
                Briefing &amp; Roteiro
              </span>
              <h2 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight mt-0.5">
                Instruções &amp; Preferências
              </h2>
              <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
                Conte detalhes do figurino, clima, ângulos e estilo que você imagina para a gravação
              </p>
            </div>
          </div>

          <div className="pt-5">
            <textarea
              aria-label="Instruções para a produção"
              rows={Math.min(12, Math.max(7, briefing.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 48)), 0)))}
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder="Ex: Gostaria de fotos com lingerie rendada preta, iluminação suave e no vídeo falar meu nome..."
              className="w-full rounded-2xl bg-black/60 border border-white/10 p-4 text-sm sm:text-[15px] text-white placeholder-zinc-500 focus:outline-none focus:border-[#90364B] focus:ring-1 focus:ring-[#90364B]/40 transition-colors resize-y leading-relaxed"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
