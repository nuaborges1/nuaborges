/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';

interface PlayerConfigCardProps {
  configEnabled: boolean;
  setConfigEnabled: (updater: (v: boolean) => boolean) => void;
  configAutoplay: boolean;
  setConfigAutoplay: (updater: (v: boolean) => boolean) => void;
  playlistTitle: string;
  setPlaylistTitle: (title: string) => void;
  savingConfig: boolean;
  configMsg: string;
  onSaveConfig: () => void;
}

export function PlayerConfigCard({
  configEnabled,
  setConfigEnabled,
  configAutoplay,
  setConfigAutoplay,
  playlistTitle,
  setPlaylistTitle,
  savingConfig,
  configMsg,
  onSaveConfig,
}: PlayerConfigCardProps) {
  return (
    <div className="rounded-xl bg-[#101116] border border-white/[0.06] p-4 sm:p-5 space-y-4">
      <p className="text-[10px] font-semibold text-[#843C52] uppercase tracking-wider font-mono">
        Configurações do Player
      </p>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white">Player ativo no site</p>
          <p className="text-[10px] text-zinc-500">Exibe ou oculta o player para visitantes</p>
        </div>
        <button
          type="button"
          onClick={() => setConfigEnabled((v) => !v)}
          className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${
            configEnabled ? 'bg-[#843C52]' : 'bg-zinc-700'
          }`}
          style={{ minWidth: '40px', height: '22px' }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform"
            style={{
              width: '18px',
              height: '18px',
              transform: configEnabled ? 'translateX(18px)' : 'translateX(0)',
            }}
          />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white">Autoplay ao entrar no site</p>
          <p className="text-[10px] text-zinc-500">
            Inicia automaticamente (bloqueado por padrão no navegador)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfigAutoplay((v) => !v)}
          className="relative rounded-full transition-colors cursor-pointer"
          style={{
            minWidth: '40px',
            height: '22px',
            background: configAutoplay ? '#843C52' : '#3f3f46',
          }}
        >
          <span
            className="absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform"
            style={{
              width: '18px',
              height: '18px',
              transform: configAutoplay ? 'translateX(18px)' : 'translateX(0)',
            }}
          />
        </button>
      </div>

      <div>
        <label className="text-[11px] text-zinc-400 mb-1 block">Nome da Playlist</label>
        <input
          type="text"
          value={playlistTitle}
          onChange={(e) => setPlaylistTitle(e.target.value)}
          maxLength={80}
          className="w-full rounded-lg bg-[#0e0f14] border border-white/10 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52] transition-colors"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onSaveConfig}
          disabled={savingConfig}
          className="h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
        >
          {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
        </button>
        {configMsg && (
          <span
            className={`text-xs ${
              configMsg.includes('Erro') ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {configMsg}
          </span>
        )}
      </div>
    </div>
  );
}
