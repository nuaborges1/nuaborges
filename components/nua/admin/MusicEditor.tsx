'use client';

/**
 * MusicEditor — Painel completo de gerenciamento da biblioteca de músicas.
 * Inclui: biblioteca administrável, player de preview com aviso de testes/desenvolvimento.
 */

import React, { useState } from 'react';
import { Music, Radio } from 'lucide-react';
import { MusicPlayer } from '@/components/MusicPlayer';
import { MusicLibrary } from './music/MusicLibrary';
import { PageHeader, AdminTabs } from './ui/AdminPrimitives';

type Tab = 'library' | 'preview';

export function MusicEditor() {
  const [tab, setTab] = useState<Tab>('library');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Músicas do Site"
        subtitle="Gerencie as músicas que tocam no site e teste como o som aparece para quem visita."
        helpId="beta_player"
      >
        <AdminTabs
          activeId={tab}
          onChange={setTab}
          ariaLabel="Músicas do site"
          items={[
            { id: 'library', label: 'Biblioteca de Faixas', icon: Music },
            { id: 'preview', label: 'Testar Tocador', icon: Radio },
          ]}
        />
      </PageHeader>

      <div className="rounded-xl bg-[#14161d] border border-white/[0.06] p-4 sm:p-5 space-y-4">
        {/* Conteúdo */}
        {tab === 'library' && (
          <MusicLibrary />
        )}

        {tab === 'preview' && (
          <div className="py-6 sm:py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-full max-w-[380px]">
              <MusicPlayer embedded={true} />
            </div>

            <div className="max-w-md text-center space-y-1 text-zinc-400">
              <p className="text-xs font-light">
                Tocador do site com som ambiente suave e lista de músicas contínua.
              </p>
              <p className="text-[10px] text-zinc-500">
                A música continua tocando sem pausas enquanto a pessoa navega pelo site.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
