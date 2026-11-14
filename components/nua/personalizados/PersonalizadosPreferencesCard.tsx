'use client';

import React from 'react';
import {
  Crown,
  Zap,
  Send,
  Lock,
  MessageSquare,
  ShieldCheck,
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
      {/* Card 3: Adicionais VIP */}
      <div className="rounded-[24px] bg-[#09090c] border border-white/[0.08] p-6 sm:p-7 shadow-lg space-y-4">
        <h3 className="text-white font-medium text-sm flex items-center gap-2">
          <Crown className="w-4 h-4 text-[#f4a7b9]" />
          <span>Diferenciais &amp; Adicionais Exclusivos</span>
        </h3>

        {settings.mentionNameEnabled && (
          <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={mentionName}
                onChange={(e) => setMentionName(e.target.checked)}
                className="w-4 h-4 rounded text-[#f4a7b9] accent-[#f4a7b9] focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="text-xs font-medium text-white block">
                  Dizer meu nome / dedicatória falada
                </span>
                <span className="text-[11px] text-zinc-400 font-light">
                  Nua Borges cita seu nome no vídeo ou grava áudio com dedicatória
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-[#f4a7b9] font-semibold whitespace-nowrap pl-2">
              +{formatCurrencyBrl(settings.mentionNamePrice)}
            </span>
          </label>
        )}

        {settings.express24hEnabled && (
          <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={express24h}
                onChange={(e) => setExpress24h(e.target.checked)}
                className="w-4 h-4 rounded text-[#f4a7b9] accent-[#f4a7b9] focus:ring-0 cursor-pointer"
              />
              <div>
                <span className="text-xs font-medium text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Entrega Prioritária Express (24h)</span>
                </span>
                <span className="text-[11px] text-zinc-400 font-light">
                  Sua encomenda fura a fila e entra em gravação imediata
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-[#f4a7b9] font-semibold whitespace-nowrap pl-2">
              +{formatCurrencyBrl(settings.express24hPrice)}
            </span>
          </label>
        )}
      </div>

      {/* Card 4: Canal de Entrega Preferido */}
      <div className="rounded-[24px] bg-[#09090c] border border-white/[0.08] p-6 sm:p-7 shadow-lg">
        <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
          <Send className="w-4 h-4 text-[#f4a7b9]" />
          <span>Como prefere receber seus arquivos?</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {settings.deliveryMethods.telegram && (
            <button
              type="button"
              onClick={() => setDeliveryChannel('telegram')}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                deliveryChannel === 'telegram'
                  ? 'bg-[#229ed9]/15 border-[#229ed9] text-white shadow-[0_0_15px_rgba(34,158,217,0.15)]'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white'
              }`}
            >
              <Send className="w-4 h-4 mx-auto mb-1 text-[#229ed9]" />
              <span className="text-xs font-medium block">Telegram</span>
              <span className="text-[10px] text-zinc-400">Qualidade máxima</span>
            </button>
          )}

          {settings.deliveryMethods.vault && (
            <button
              type="button"
              onClick={() => setDeliveryChannel('vault')}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                deliveryChannel === 'vault'
                  ? 'bg-[#f4a7b9]/15 border-[#f4a7b9] text-white shadow-[0_0_15px_rgba(244,167,185,0.15)]'
                  : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4 mx-auto mb-1 text-[#f4a7b9]" />
              <span className="text-xs font-medium block">Cofre no Site</span>
              <span className="text-[10px] text-zinc-400">100% anônimo</span>
            </button>
          )}
        </div>
      </div>

      {/* Card 5: Briefing & Detalhes */}
      <div className="rounded-[24px] bg-[#09090c] border border-white/[0.08] p-6 sm:p-7 shadow-lg space-y-4">
        <h3 className="text-white font-medium text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#f4a7b9]" />
          <span>Seu Briefing &amp; Desejos</span>
        </h3>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-light">
            Como você quer sua produção? (Figurino, clima, fetiche suave, detalhes):
          </label>
          <textarea
            rows={4}
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            placeholder="Ex: Gostaria de fotos com lingerie rendada preta, iluminação suave e no vídeo falar meu nome com carinho..."
            className="w-full rounded-xl bg-black/60 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#f4a7b9] transition-colors resize-none"
          />
        </div>

        {/* Termos & Limites */}
        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.06] text-xs text-zinc-400 leading-relaxed font-light">
          <p className="font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#f4a7b9]" />
            <span>Limites &amp; Ética de Gravação:</span>
          </p>
          <p>{settings.termsAndLimitsText}</p>
        </div>
      </div>
    </>
  );
}
