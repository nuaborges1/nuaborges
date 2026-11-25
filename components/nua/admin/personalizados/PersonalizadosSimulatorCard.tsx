/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Eye,
  ExternalLink,
  Camera,
  Film,
  Zap,
  Save,
} from 'lucide-react';
import {
  PersonalizadosSettings,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';

interface PersonalizadosSimulatorCardProps {
  settings: PersonalizadosSettings;
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
  savingSettings: boolean;
}

export function PersonalizadosSimulatorCard({
  settings,
  simPhotoCount,
  setSimPhotoCount,
  simVideoId,
  setSimVideoId,
  simMentionName,
  setSimMentionName,
  simExpress24h,
  setSimExpress24h,
  simPriceDetails,
  savingSettings,
}: PersonalizadosSimulatorCardProps) {
  return (
    <div className="lg:col-span-5 sticky top-6 space-y-6">
      <div className="p-4 sm:p-5 rounded-xl bg-[#171821] border border-[#843C52]/30 shadow-sm space-y-5 relative overflow-hidden backdrop-blur-xl">
        {/* Glow de fundo */}
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-[#843C52]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Cabeçalho do Simulador */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#843C52]/15 border border-[#843C52]/30 flex items-center justify-center text-[#843C52]">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Simulador em Tempo Real
              </h4>
              <p className="text-[10px] text-zinc-400 font-light">
                Prévia exata da comanda gerada ao cliente
              </p>
            </div>
          </div>

          <Link
            href="/personalizados"
            target="_blank"
            className="text-[10px] text-[#843C52] hover:text-[#992b4a] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            title="Abrir página pública em nova aba"
          >
            <span>Ver no Site</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Controles de Simulação Interativos */}
        <div className="space-y-3.5 relative z-10 text-xs">
          {/* Slider de Fotos */}
          <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#843C52]" />
                <span>Ensaio ({simPhotoCount} fotos)</span>
              </span>
              <span className="font-mono text-[#843C52] font-bold">
                {formatCurrencyBrl(simPriceDetails.photosPrice)}
              </span>
            </div>

            <input
              type="range"
              min={settings.minPhotos || 1}
              max={settings.maxPhotos || 30}
              value={simPhotoCount}
              onChange={(e) => setSimPhotoCount(Number(e.target.value))}
              className="w-full accent-[#843C52] cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>Mín: {settings.minPhotos}</span>
              <span>{simPhotoCount} fotos selecionadas</span>
              <span>Máx: {settings.maxPhotos}</span>
            </div>
          </div>

          {/* Seletor de Vídeo */}
          {settings.videoEnabled && (
            <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-purple-400" />
                  <span>Vídeo Personalizado</span>
                </span>
                <span className="font-mono text-[#843C52] font-bold">
                  {simPriceDetails.videoPrice > 0
                    ? formatCurrencyBrl(simPriceDetails.videoPrice)
                    : 'Sem vídeo'}
                </span>
              </div>

              <select
                value={simVideoId}
                onChange={(e) => setSimVideoId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#843C52] cursor-pointer"
              >
                {settings.videoOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} — {v.price === 0 ? 'Sem custo' : formatCurrencyBrl(v.price)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Opcionais da Simulação */}
          <div className="space-y-2">
            {settings.mentionNameEnabled && (
              <label className="p-2.5 rounded-lg bg-[#101116] border border-white/[0.06] hover:border-white/15 flex items-center justify-between cursor-pointer transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={simMentionName}
                    onChange={(e) => setSimMentionName(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#843C52] cursor-pointer"
                  />
                  <span className="text-zinc-300 text-[11px]">Dizer meu nome / dedicatória</span>
                </div>
                <span className="font-mono text-[#843C52] font-semibold text-[11px]">
                  +{formatCurrencyBrl(settings.mentionNamePrice)}
                </span>
              </label>
            )}

            {settings.express24hEnabled && (
              <label className="p-2.5 rounded-lg bg-[#101116] border border-white/[0.06] hover:border-white/15 flex items-center justify-between cursor-pointer transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={simExpress24h}
                    onChange={(e) => setSimExpress24h(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-400 cursor-pointer"
                  />
                  <span className="text-zinc-300 text-[11px] flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Prioridade Express (24h)</span>
                  </span>
                </div>
                <span className="font-mono text-amber-400 font-semibold text-[11px]">
                  +{formatCurrencyBrl(settings.express24hPrice)}
                </span>
              </label>
            )}
          </div>

          {/* Resumo da Comanda Calculada */}
          <div className="p-3.5 rounded-lg bg-[#101116] border border-[#843C52]/25 space-y-2.5 pt-3">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-semibold">
              Comanda do Pedido Simulado:
            </span>

            <div className="space-y-1.5 text-[11px] text-zinc-300 pb-2.5 border-b border-white/[0.08]">
              <div className="flex justify-between">
                <span>{simPhotoCount} fotos ({formatCurrencyBrl(settings.pricePerPhoto)} un.)</span>
                <span className="font-mono text-white">{formatCurrencyBrl(simPriceDetails.photosPrice)}</span>
              </div>
              {simPriceDetails.videoPrice > 0 && (
                <div className="flex justify-between">
                  <span>Vídeo Exclusivo</span>
                  <span className="font-mono text-white">{formatCurrencyBrl(simPriceDetails.videoPrice)}</span>
                </div>
              )}
              {simMentionName && (
                <div className="flex justify-between text-[#843C52]">
                  <span>Menção Nominal</span>
                  <span className="font-mono">+{formatCurrencyBrl(settings.mentionNamePrice)}</span>
                </div>
              )}
              {simExpress24h && (
                <div className="flex justify-between text-amber-300">
                  <span>Urgência 24h</span>
                  <span className="font-mono">+{formatCurrencyBrl(settings.express24hPrice)}</span>
                </div>
              )}
            </div>

            <div className="flex items-baseline justify-between pt-0.5">
              <div>
                <span className="text-xs text-zinc-400 uppercase tracking-wider block font-semibold">
                  Total Estimado:
                </span>
                <span className="text-[10px] text-zinc-500 font-light">
                  Valor final no pagamento via Pix
                </span>
              </div>
              <span className="text-xl font-serif font-bold text-[#843C52]">
                {formatCurrencyBrl(simPriceDetails.total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
