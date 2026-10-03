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

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useMusicPlayer } from '@/lib/music';
import type { MusicTrack } from '@/lib/music';

// ─── Utilitários ────────────────────────────────────────────────────────────

function fmt(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDuration(s?: number | null): string {
  if (!s || !isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

const ACCEPT = '.mp3,.wav,.m4a,.ogg,.flac,audio/*';
const MAX_MB = 60;

// ─── Modal de Upload ────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('Nua Borges');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFile = (f: File) => {
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo: ${MAX_MB}MB.`);
      return;
    }
    setFile(f);
    setError('');
    // Preenche título automaticamente com nome do arquivo (sem extensão)
    if (!title) {
      setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      setError('Preencha o título e selecione um arquivo.');
      return;
    }

    setUploading(true);
    setProgress(10);
    setError('');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const safeTitle = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      const key = `audio/${safeTitle}-${Date.now()}.${ext}`;

      setProgress(20);

      const res = await fetch('/api/music/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'audio/mpeg',
          'X-Object-Key': key,
          'X-Mime-Type': file.type || 'audio/mpeg',
          'X-Track-Title': title.trim().substring(0, 200),
          'X-Track-Artist': artist.trim().substring(0, 200),
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'nuaborges2026'}`,
        },
        body: file,
      });

      setProgress(80);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${res.status}`);
      }

      setProgress(100);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h3 className="text-white font-semibold text-sm">Adicionar Música</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none" aria-label="Fechar">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Drop Zone */}
          <div
            ref={dropRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file ? 'border-[#f4a7b9]/50 bg-[#f4a7b9]/5' : 'border-white/15 hover:border-white/30'
            }`}
            onClick={() => document.getElementById('music-file-input')?.click()}
          >
            <input
              id="music-file-input"
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div>
                <p className="text-[#f4a7b9] font-medium text-sm">{file.name}</p>
                <p className="text-zinc-500 text-xs mt-1">{fmt(file.size)}</p>
              </div>
            ) : (
              <div>
                <div className="text-3xl mb-2">🎵</div>
                <p className="text-white/70 text-sm font-medium">Arraste o arquivo aqui ou clique</p>
                <p className="text-zinc-500 text-xs mt-1">MP3, WAV, M4A, OGG • Máx. {MAX_MB}MB</p>
              </div>
            )}
          </div>

          {/* Título */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da música"
              maxLength={200}
              className="w-full bg-zinc-800/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#f4a7b9]/40 transition-colors"
            />
          </div>

          {/* Artista */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Artista</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Nome do artista"
              maxLength={200}
              className="w-full bg-zinc-800/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#f4a7b9]/40 transition-colors"
            />
          </div>

          {/* Erro */}
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Progress */}
          {uploading && (
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f4a7b9] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 text-sm hover:text-white hover:border-white/20 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !file || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#f4a7b9] text-black font-medium text-sm hover:bg-[#f4a7b9]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Enviando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de Faixa ─────────────────────────────────────────────────────────

function TrackCard({
  track,
  isCurrent,
  onEdit,
  onToggleActive,
  onDelete,
  onPlay,
}: {
  track: MusicTrack;
  isCurrent: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onPlay: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        isCurrent
          ? 'border-[#f4a7b9]/30 bg-[#f4a7b9]/5'
          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
      } ${!track.active ? 'opacity-50' : ''}`}
    >
      {/* Play button */}
      <button
        onClick={onPlay}
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors"
        aria-label={`Tocar ${track.title}`}
      >
        {isCurrent ? (
          <span className="text-[#f4a7b9] text-xs">♪</span>
        ) : (
          <svg width="9" height="9" viewBox="0 0 10 12" fill="currentColor" className="text-zinc-400 translate-x-[0.5px]">
            <path d="M1 0.5L9.5 6 1 11.5V0.5z" />
          </svg>
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isCurrent ? 'text-[#f4a7b9]' : 'text-white'}`}>
          {track.title}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">
          {track.artist}
          {track.duration ? ` · ${fmtDuration(track.duration)}` : ''}
          {track.sizeBytes ? ` · ${fmt(track.sizeBytes)}` : ''}
        </p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Ativo / Inativo */}
        <button
          onClick={onToggleActive}
          title={track.active ? 'Desativar' : 'Ativar'}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
            track.active ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-white/5 text-zinc-500 hover:bg-white/10'
          }`}
        >
          {track.active ? '✓' : '○'}
        </button>

        {/* Editar */}
        <button
          onClick={onEdit}
          title="Editar"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          ✎
        </button>

        {/* Deletar */}
        <button
          onClick={onDelete}
          title="Remover"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Modal de Edição ───────────────────────────────────────────────────────

function EditModal({
  track,
  onClose,
  onSave,
}: {
  track: MusicTrack;
  onClose: () => void;
  onSave: (data: { title: string; artist: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) { setError('Título obrigatório.'); return; }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), artist: artist.trim() });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h3 className="text-white font-semibold text-sm">Editar Faixa</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#f4a7b9]/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Artista</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#f4a7b9]/40 transition-colors"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 text-sm hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#f4a7b9] text-black font-medium text-sm hover:bg-[#f4a7b9]/90 transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────────────

export function MusicLibrary() {
  const { library, currentIndex, isPlaying, setTrack, reloadLibrary } = useMusicPlayer();
  const activeTracks = library.tracks.filter((t) => t.active);

  const [showUpload, setShowUpload] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MusicTrack | null>(null);
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
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || 'nuaborges2026'}`,
  });

  const handleToggleActive = async (track: MusicTrack) => {
    try {
      const res = await fetch('/api/music/update', {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({ id: track.id, active: !track.active }),
      });
      if (!res.ok) throw new Error();
      reloadLibrary();
    } catch {
      setActionError('Não foi possível alterar o status da faixa.');
    }
  };

  const handleDelete = async (track: MusicTrack, deleteFile = true) => {
    try {
      const res = await fetch('/api/music/update', {
        method: 'DELETE',
        headers: authHeader(),
        body: JSON.stringify({ id: track.id, deleteFile }),
      });
      if (!res.ok) throw new Error();
      setConfirmDelete(null);
      reloadLibrary();
    } catch {
      setActionError('Não foi possível remover a faixa.');
    }
  };

  const handleEdit = async (track: MusicTrack, data: { title: string; artist: string }) => {
    const res = await fetch('/api/music/update', {
      method: 'PUT',
      headers: authHeader(),
      body: JSON.stringify({ id: track.id, ...data }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Erro ao editar.');
    }
    reloadLibrary();
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setConfigMsg('');
    try {
      const res = await fetch('/api/music/config', {
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
      setTimeout(() => setConfigMsg(''), 2500);
    } catch {
      setConfigMsg('Erro ao salvar configurações.');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header da Biblioteca */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-sm">Biblioteca de Músicas</h2>
          <p className="text-zinc-500 text-xs mt-0.5">{library.tracks.length} faixas no total · {activeTracks.length} ativas</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f4a7b9] text-black text-xs font-semibold hover:bg-[#f4a7b9]/90 transition-colors"
        >
          <span>+</span> Adicionar Música
        </button>
      </div>

      {/* Erro global */}
      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-red-400 text-xs">{actionError}</p>
          <button onClick={() => setActionError('')} className="text-red-400/60 text-sm ml-2">×</button>
        </div>
      )}

      {/* Lista de Faixas */}
      {library.tracks.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
          <p className="text-4xl mb-3">🎵</p>
          <p className="text-zinc-400 text-sm font-medium">Nenhuma música adicionada</p>
          <p className="text-zinc-600 text-xs mt-1">Clique em "+ Adicionar Música" para enviar um arquivo</p>
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
      <div className="border border-white/[0.06] rounded-2xl p-4 space-y-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Configurações do Player</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white">Player ativo no site</p>
            <p className="text-[10px] text-zinc-500">Exibe ou oculta o player para visitantes</p>
          </div>
          <button
            onClick={() => setConfigEnabled((v) => !v)}
            className={`relative w-10 h-5.5 rounded-full transition-colors ${configEnabled ? 'bg-[#f4a7b9]' : 'bg-zinc-700'}`}
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
            <p className="text-[10px] text-zinc-500">Inicia automaticamente (bloqueado por padrão no navegador)</p>
          </div>
          <button
            onClick={() => setConfigAutoplay((v) => !v)}
            className={`relative rounded-full transition-colors`}
            style={{ minWidth: '40px', height: '22px', background: configAutoplay ? '#f4a7b9' : '#3f3f46' }}
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
          <label className="text-xs text-zinc-400 mb-1 block">Nome da Playlist</label>
          <input
            type="text"
            value={playlistTitle}
            onChange={(e) => setPlaylistTitle(e.target.value)}
            maxLength={80}
            className="w-full bg-zinc-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#f4a7b9]/40 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="px-4 py-2 rounded-xl bg-[#f4a7b9] text-black text-xs font-semibold hover:bg-[#f4a7b9]/90 transition-colors disabled:opacity-50"
          >
            {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
          </button>
          {configMsg && (
            <span className={`text-xs ${configMsg.includes('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>
              {configMsg}
            </span>
          )}
        </div>
      </div>

      {/* Modais */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            setShowUpload(false);
            reloadLibrary();
          }}
        />
      )}

      {editingTrack && (
        <EditModal
          track={editingTrack}
          onClose={() => setEditingTrack(null)}
          onSave={(data) => handleEdit(editingTrack, data)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-xs p-5 shadow-2xl">
            <h3 className="text-white font-semibold text-sm mb-2">Remover Música?</h3>
            <p className="text-zinc-400 text-xs mb-4">
              "<strong className="text-white">{confirmDelete.title}</strong>" será removida da biblioteca.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl border border-white/10 text-zinc-400 text-xs hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete, true)}
                className="flex-1 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs hover:bg-red-500/30 transition-colors"
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
