'use client';

/**
 * MusicEditor — Painel completo de gerenciamento da biblioteca de músicas.
 * Inclui: biblioteca administrável, player de preview, configurações.
 */

import React, { useState } from 'react';
import { MusicPlayer } from '@/components/MusicPlayer';
import { MusicLibrary } from '@/components/admin/music/MusicLibrary';

type Tab = 'library' | 'preview';

export function MusicEditor() {
  const [tab, setTab] = useState<Tab>('library');

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-6 border-b border-zinc-800/80">
          <div>
            <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-wider uppercase block mb-1">
              TRILHA SONORA &amp; ÁUDIO
            </span>
            <h3 className="font-serif text-xl sm:text-2xl text-white font-medium">
              Música do Site
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 leading-relaxed max-w-xl">
              Faça upload de músicas para a biblioteca do site. Os arquivos são armazenados no CDN próprio — sem dependência do YouTube.
            </p>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-300 text-xs font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sistema próprio ativo</span>
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/[0.04] p-1 rounded-xl w-fit">
          {([ ['library', 'Biblioteca'], ['preview', 'Preview do Player'] ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === key
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
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
          <div className="py-8 sm:py-10 flex flex-col items-center justify-center">
            <div className="w-full max-w-[380px]">
              <MusicPlayer embedded={true} />
            </div>
            <span className="block text-[11px] text-zinc-500 mt-6 font-light text-center">
              Preview do player — clique em Play para testar com as músicas da biblioteca.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
