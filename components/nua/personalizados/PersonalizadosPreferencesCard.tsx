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
        <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3.5 border-b border-white/[0.05]">
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9] shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Diferenciais &amp; Opcionais de Gravação
              </h3>
              <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                Personalizações extras para sua produção
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {settings.mentionNameEnabled && (
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  mentionName
                    ? 'bg-[#18151c] border-[#f4a7b9]/40 text-white'
                    : 'bg-[#0e1015] border-white/[0.06] text-zinc-300 hover:border-white/15'
                }`}
              >
                <div className="space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white block">
                      Dizer meu nome / dedicatória
                    </span>
                    <input
                      type="checkbox"
                      checked={mentionName}
                      onChange={(e) => setMentionName(e.target.checked)}
                      className="w-4 h-4 rounded text-[#f4a7b9] accent-[#f4a7b9] focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                    Nua cita seu nome no vídeo ou grava áudio exclusivo com dedicatória.
                  </p>
                </div>
                <div className="pt-2 border-t border-white/[0.05] flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-500 font-normal">Valor adicional</span>
                  <span className="text-[#f4a7b9] font-semibold">
                    +{formatCurrencyBrl(settings.mentionNamePrice)}
                  </span>
                </div>
              </label>
            )}

            {settings.express24hEnabled && (
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  express24h
                    ? 'bg-[#18151c] border-[#f4a7b9]/40 text-white'
                    : 'bg-[#0e1015] border-white/[0.06] text-zinc-300 hover:border-white/15'
                }`}
              >
                <div className="space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Prioridade Express (24h)</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={express24h}
                      onChange={(e) => setExpress24h(e.target.checked)}
                      className="w-4 h-4 rounded text-[#f4a7b9] accent-[#f4a7b9] focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                    Sua encomenda fura a fila e é gravada e entregue em até 24 horas.
                  </p>
                </div>
                <div className="pt-2 border-t border-white/[0.05] flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-500 font-normal">Taxa de urgência</span>
                  <span className="text-[#f4a7b9] font-semibold">
                    +{formatCurrencyBrl(settings.express24hPrice)}
                  </span>
                </div>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Card: Canal de Entrega */}
      <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3.5 border-b border-white/[0.05]">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9] shrink-0">
            <Send className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Canal de Entrega Privativo
            </h3>
            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
              Como prefere receber com total discrição os seus arquivos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {settings.deliveryMethods.telegram && (
            <button
              type="button"
              onClick={() => setDeliveryChannel('telegram')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                deliveryChannel === 'telegram'
                  ? 'bg-[#18151c] border-[#f4a7b9]/40 text-white'
                  : 'bg-[#0e1015] border-white/[0.06] text-zinc-400 hover:border-white/15'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-[#f4a7b9]" />
                  <span className="text-xs font-semibold text-white">Telegram VIP</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                  Envio direto no seu chat privado com qualidade máxima original.
                </p>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  deliveryChannel === 'telegram'
                    ? 'border-[#f4a7b9] bg-[#f4a7b9] text-zinc-950'
                    : 'border-white/20 bg-transparent'
                }`}
              >
                {deliveryChannel === 'telegram' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </button>
          )}

          {settings.deliveryMethods.vault && (
            <button
              type="button"
              onClick={() => setDeliveryChannel('vault')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 ${
                deliveryChannel === 'vault'
                  ? 'bg-[#18151c] border-[#f4a7b9]/40 text-white'
                  : 'bg-[#0e1015] border-white/[0.06] text-zinc-400 hover:border-white/15'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#f4a7b9]" />
                  <span className="text-xs font-semibold text-white">Cofre no Site</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                  Página secreta protegida por link único e senha de acesso.
                </p>
              </div>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  deliveryChannel === 'vault'
                    ? 'border-[#f4a7b9] bg-[#f4a7b9] text-zinc-950'
                    : 'border-white/20 bg-transparent'
                }`}
              >
                {deliveryChannel === 'vault' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Card: Briefing & Detalhes */}
      <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3.5 border-b border-white/[0.05]">
          <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#f4a7b9] shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Instruções &amp; Preferências
            </h3>
            <p className="text-[11px] text-zinc-400 font-light mt-0.5">
              Conte detalhes do figurino, clima e estilo que você imagina
            </p>
          </div>
        </div>

        <div className="text-left">
          <textarea
            rows={3}
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            placeholder="Ex: Gostaria de fotos com lingerie rendada preta, iluminação suave e no vídeo falar meu nome..."
            className="w-full rounded-xl bg-[#0e1015] border border-white/[0.08] p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
          />
        </div>

        {/* Termos & Limites */}
        {settings.termsAndLimitsText && (
          <div className="p-3.5 rounded-xl bg-[#0e1015] border border-white/[0.04] text-xs text-zinc-400 leading-relaxed font-light text-left">
            <p className="font-semibold text-zinc-300 mb-1 flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#f4a7b9]" />
              <span>Diretrizes Éticas de Produção:</span>
            </p>
            <p className="text-[11px] leading-relaxed">{settings.termsAndLimitsText}</p>
          </div>
        )}
      </div>
    </>
  );
}
