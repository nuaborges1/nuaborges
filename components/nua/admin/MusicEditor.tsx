'use client';

/**
 * MusicEditor — Painel completo de gerenciamento da biblioteca de músicas.
 * Inclui: biblioteca administrável, player de preview com aviso de testes/desenvolvimento.
 */

import React, { useState } from 'react';
import { AlertTriangle, Music, Radio } from 'lucide-react';
import { MusicPlayer } from '@/components/MusicPlayer';
import { MusicLibrary } from './music/MusicLibrary';

type Tab = 'library' | 'preview';

export function MusicEditor() {
  const [tab, setTab] = useState<Tab>('library');

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm space-y-4">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase font-mono block mb-1">
              TRILHA SONORA &amp; ÁUDIO AUTORAL
            </span>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm sm:text-base font-semibold text-white">
                Player de Áudio &amp; Música do Site
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-300 font-bold uppercase tracking-wider">
                DEV / BETA
              </span>
            </div>
            <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed max-w-xl">
              Biblioteca de trilha sonora no CDN próprio. Gerencie os arquivos masterizados e teste a reprodução contínua do player.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-medium font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Em Desenvolvimento</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>CDN Ativo</span>
            </span>
          </div>
        </div>

        {/* Banner de Aviso de Desenvolvimento e Possíveis Bugs */}
        <div className="rounded-xl bg-amber-500/[0.08] border border-amber-500/25 p-4 flex flex-col sm:flex-row items-start gap-3.5 text-amber-200">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-white">
                Player em Desenvolvimento Ativo (Versão Beta)
              </span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-500/30">
                AVISO DE BUGS &amp; INSTABILIDADES
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 font-light leading-relaxed">
              O player de streaming autoral está habilitado aqui no painel administrativo para testes e homologação de faixas. Como a arquitetura de áudio ainda está em desenvolvimento contínuo, <strong>podem ocorrer pequenos bugs de reprodução, oscilações no buffer de carregamento ou variações de volume</strong> em determinados navegadores.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#101116] border border-white/[0.06]">
          {([ ['library', 'Biblioteca de Faixas'], ['preview', 'Preview do Player (Beta)'] ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                tab === key
                  ? 'bg-white/[0.12] text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {tab === 'library' && (
          <MusicLibrary />
        )}

        {tab === 'preview' && (
          <div className="py-6 sm:py-8 flex flex-col items-center justify-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Preview em Tempo Real — Player Multimídia (Músicas e Vídeos Exclusivos)</span>
            </div>

            <div className="w-full max-w-[380px]">
              <MusicPlayer embedded={true} />
            </div>

            <div className="max-w-md text-center space-y-1 text-zinc-400">
              <p className="text-xs font-light">
                Player editorial com suporte a vídeos em 16:9, ambientação sonora suave e playlist contínua.
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">
                O player sincroniza automaticamente com o modo pílula e persiste a reprodução sem interrupções.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
