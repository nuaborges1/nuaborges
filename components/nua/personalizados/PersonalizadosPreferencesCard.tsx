'use client';

import React from 'react';
import {
  Crown,
  Zap,
  Send,
  Lock,
  MessageSquare,
  ShieldCheck,
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
  setDeliveryChannel: (v: DeliveryChannel) => void;
  briefing: string;
  setBriefing: (v: string) => void;
}

export function PersonalizadosPreferencesCard({
  settings,
  mentionName,
  setMentionName,
  express24h,
  setExpress24h,
  deliveryChannel,
  setDeliveryChannel,
  briefing,
  setBriefing,
}: PersonalizadosPreferencesCardProps) {
  return (
    <>
      {/* Card: Adicionais VIP */}
      {(settings.mentionNameEnabled || settings.express24hEnabled) && (
        <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.85)] space-y-6 transition-all duration-300 text-left">
          <div className="flex items-center gap-3.5 pb-6 border-b border-white/[0.06]">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#f4a7b9] shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                Diferenciais &amp; Opcionais de Gravação
              </h3>
              <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1">
                Personalizações e preferências extras para sua produção
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {settings.mentionNameEnabled && (
              <label
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between space-y-3.5 ${
                  mentionName
                    ? 'bg-[#f4a7b9]/10 border-[#f4a7b9]/60 text-white shadow-[0_0_24px_rgba(244,167,185,0.12)]'
                    : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base text-white font-normal block">
                      Dizer meu nome / dedicatória
                    </span>
                    <input
                      type="checkbox"
                      checked={mentionName}
                      onChange={(e) => setMentionName(e.target.checked)}
                      className="w-4 h-4 rounded text-[#f4a7b9] accent-[#f4a7b9] focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    Nua cita seu nome no vídeo ou grava áudio exclusivo com dedicatória.
                  </p>
                </div>
                <div className="pt-3 border-t border-white/[0.06] flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-500 font-normal">Valor adicional</span>
                  <span className="text-[#f4a7b9] font-medium text-sm">
                    +{formatCurrencyBrl(settings.mentionNamePrice)}
                  </span>
                </div>
              </label>
            )}

            {settings.express24hEnabled && (
              <label
                className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all duration-300 flex flex-col justify-between space-y-3.5 ${
                  express24h
                    ? 'bg-[#f4a7b9]/10 border-[#f4a7b9]/60 text-white shadow-[0_0_24px_rgba(244,167,185,0.12)]'
                    : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base text-white font-normal flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>Prioridade Express (24h)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={express24h}
                      onChange={(e) => setExpress24h(e.target.checked)}
                      className="w-4 h-4 rounded text-[#f4a7b9] accent-[#f4a7b9] focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">
                    Sua encomenda fura a fila e é gravada e entregue em até 24 horas.
                  </p>
                </div>
                <div className="pt-3 border-t border-white/[0.06] flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-500 font-normal">Taxa de urgência</span>
                  <span className="text-[#f4a7b9] font-medium text-sm">
                    +{formatCurrencyBrl(settings.express24hPrice)}
                  </span>
                </div>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Card: Canal de Entrega */}
      <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.85)] space-y-6 transition-all duration-300 text-left">
        <div className="flex items-center gap-3.5 pb-6 border-b border-white/[0.06]">
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#f4a7b9] shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
              Canal de Entrega Privativo
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1">
              Como prefere receber com total discrição os seus arquivos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {settings.deliveryMethods.telegram && (
            <button
              type="button"
              onClick={() => setDeliveryChannel('telegram')}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex items-start justify-between gap-3.5 ${
                deliveryChannel === 'telegram'
                  ? 'bg-[#f4a7b9]/10 border-[#f4a7b9]/60 text-white shadow-[0_0_24px_rgba(244,167,185,0.12)]'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#f4a7b9]" />
                  <span className="font-serif text-base text-white font-normal">Telegram VIP</span>
                </div>
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  Envio direto no seu chat privado com qualidade máxima original.
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  deliveryChannel === 'telegram'
                    ? 'border-[#f4a7b9] bg-[#f4a7b9] text-black'
                    : 'border-white/20 bg-black/40'
                }`}
              >
                {deliveryChannel === 'telegram' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          )}

          {settings.deliveryMethods.vault && (
            <button
              type="button"
              onClick={() => setDeliveryChannel('vault')}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex items-start justify-between gap-3.5 ${
                deliveryChannel === 'vault'
                  ? 'bg-[#f4a7b9]/10 border-[#f4a7b9]/60 text-white shadow-[0_0_24px_rgba(244,167,185,0.12)]'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#f4a7b9]" />
                  <span className="font-serif text-base text-white font-normal">Cofre no Site</span>
                </div>
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  Página secreta protegida por link único e senha de acesso.
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  deliveryChannel === 'vault'
                    ? 'border-[#f4a7b9] bg-[#f4a7b9] text-black'
                    : 'border-white/20 bg-black/40'
                }`}
              >
                {deliveryChannel === 'vault' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Card: Briefing & Detalhes */}
      <div className="rounded-[28px] bg-[#08080c] border border-white/[0.08] hover:border-white/15 p-6 sm:p-7 md:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.85)] space-y-6 transition-all duration-300 text-left">
        <div className="flex items-center gap-3.5 pb-6 border-b border-white/[0.06]">
          <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#f4a7b9] shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
              Instruções &amp; Preferências
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1">
              Conte detalhes do figurino, clima e estilo que você imagina
            </p>
          </div>
        </div>

        <div>
          <textarea
            rows={3}
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            placeholder="Ex: Gostaria de fotos com lingerie rendada preta, iluminação suave e no vídeo falar meu nome..."
            className="w-full rounded-2xl bg-black/60 border border-white/10 p-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Termos & Limites */}
        {settings.termsAndLimitsText && (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 leading-relaxed font-light text-left">
            <p className="font-semibold text-zinc-300 mb-1.5 flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#f4a7b9]" />
              <span>Diretrizes Éticas de Produção:</span>
            </p>
            <p className="text-xs leading-relaxed text-zinc-400">{settings.termsAndLimitsText}</p>
          </div>
        )}
      </div>
    </>
  );
}
