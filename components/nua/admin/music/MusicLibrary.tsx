/* Vinho maduro / Nua Borges */
'use client';

/**
 * components/admin/music/MusicLibrary.tsx
 *
 * Interface de administração da biblioteca de músicas.
 * - Upload de arquivos de áudio (MP3, WAV, M4A, OGG)
 * - Listagem com edição inline
 * - Ativar/Desativar faixas
 * - Remover faixas
 * - Configurações do player (autoplay, nome da playlist)
 */

import React, { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/lib/music';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { MusicTrack } from '@/lib/music';
import { getStoredSessionToken, getPublicApiUrl } from '@/lib/contentStore';
import { UploadModal } from './UploadModal';
import { TrackCard } from './TrackCard';
import { EditTrackModal } from './EditTrackModal';
import { PlayerConfigCard } from './PlayerConfigCard';
import { broadcastAdminUpdate } from '@/lib/adminSync';

export function MusicLibrary() {
  const { library, currentIndex, isPlaying, setTrack, reloadLibrary } = useMusicPlayer();
  const activeTracks = library.tracks.filter((t) => t.active);

  const [showUpload, setShowUpload] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MusicTrack | null>(null);
  useScrollLock(Boolean(showUpload || editingTrack || confirmDelete));
  const [actionError, setActionError] = useState('');
  const [configAutoplay, setConfigAutoplay] = useState(library.config.autoplay);
  const [configEnabled, setConfigEnabled] = useState(library.config.enabled);
  const [playlistTitle, setPlaylistTitle] = useState(library.config.playlistTitle || 'Sensual Lounge');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState('');

  // Sincroniza config local com biblioteca carregada
  useEffect(() => {
    setConfigAutoplay(library.config.autoplay);
    setConfigEnabled(library.config.enabled);
    setPlaylistTitle(library.config.playlistTitle || 'Sensual Lounge');
  }, [library.config]);

  const authHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getStoredSessionToken() || ''}`,
  });

  const handleToggleActive = async (track: MusicTrack) => {
    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/music/update`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({ id: track.id, active: !track.active }),
      });
      if (!res.ok) throw new Error();
      reloadLibrary();
      broadcastAdminUpdate('music', { source: 'panel' });
    } catch {
      setActionError('Não foi possível ativar ou desativar a faixa. Tente novamente em instantes.');
    }
  };

  const handleDelete = async (track: MusicTrack, deleteFile = true) => {
    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/music/update`, {
        method: 'DELETE',
        headers: authHeader(),
        body: JSON.stringify({ id: track.id, deleteFile }),
      });
      if (!res.ok) throw new Error();
      setConfirmDelete(null);
      reloadLibrary();
      broadcastAdminUpdate('music', { source: 'panel' });
    } catch {
      setActionError('Não foi possível remover a faixa.');
    }
  };

  const handleEdit = async (track: MusicTrack, data: { title: string; artist: string }) => {
    const apiUrl = getPublicApiUrl();
    const res = await fetch(`${apiUrl}/api/music/update`, {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify({ id: track.id, ...data }),
    });
    if (!res.ok) {
      throw new Error('Não foi possível salvar a edição.');
    }
    reloadLibrary();
    broadcastAdminUpdate('music', { source: 'panel' });
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigMsg('');
    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/music/config`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({
          autoplay: configAutoplay,
          enabled: configEnabled,
          playlistTitle: playlistTitle.trim() || 'Sensual Lounge',
        }),
      });
      if (!res.ok) throw new Error();
      setConfigMsg('Salvo!');
      reloadLibrary();
      broadcastAdminUpdate('music', { source: 'panel' });
      setTimeout(() => setConfigMsg(''), 2500);
    } catch {
      setConfigMsg('Erro ao salvar configurações.');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header da Biblioteca */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h2 className="text-white font-semibold text-xs">Biblioteca de Músicas</h2>
          <p className="text-zinc-500 text-[11px] mt-0.5">
            {library.tracks.length} faixas no total · {activeTracks.length} ativas
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span>+</span> Adicionar Música
        </button>
      </div>

      {/* Erro global */}
      {actionError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-rose-400 text-xs">{actionError}</p>
          <button
            onClick={() => setActionError('')}
            className="text-rose-400/60 text-sm ml-2 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Lista de Faixas */}
      {library.tracks.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-white/10 rounded-xl bg-[#101116]">
          <p className="text-zinc-300 text-xs font-medium">Nenhuma música adicionada</p>
          <p className="text-zinc-500 text-[11px] mt-0.5">
            Clique em "+ Adicionar Música" para enviar um arquivo
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {library.tracks.map((track, i) => (
            <TrackCard
              key={track.id}
              track={track}
              isCurrent={i === currentIndex && isPlaying}
              onEdit={() => setEditingTrack(track)}
              onToggleActive={() => handleToggleActive(track)}
              onDelete={() => setConfirmDelete(track)}
              onPlay={() => setTrack(i)}
            />
          ))}
        </div>
      )}

      {/* Configurações */}
      <PlayerConfigCard
        configEnabled={configEnabled}
        setConfigEnabled={setConfigEnabled}
        configAutoplay={configAutoplay}
        setConfigAutoplay={setConfigAutoplay}
        playlistTitle={playlistTitle}
        setPlaylistTitle={setPlaylistTitle}
        savingConfig={savingConfig}
        configMsg={configMsg}
        onSaveConfig={handleSaveConfig}
      />

      {/* Modais */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            reloadLibrary();
            broadcastAdminUpdate('music', { source: 'panel' });
          }}
        />
      )}

      {editingTrack && (
        <EditTrackModal
          track={editingTrack}
          onClose={() => setEditingTrack(null)}
          onSave={(data) => handleEdit(editingTrack, data)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overscroll-contain">
          <div className="bg-[#171821] border border-white/[0.08] rounded-xl w-full max-w-xs p-5 shadow-2xl">
            <h3 className="text-white font-semibold text-xs mb-1.5">Remover Música?</h3>
            <p className="text-zinc-400 text-xs mb-4">
              "<strong className="text-white">{confirmDelete.title}</strong>" será removida da
              biblioteca.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete, true)}
                className="h-8 px-4 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-xs font-semibold transition cursor-pointer"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
