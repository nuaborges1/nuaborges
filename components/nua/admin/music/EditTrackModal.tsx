'use client';

import React, { useState } from 'react';
import type { MusicTrack } from '@/lib/music';

interface EditTrackModalProps {
  track: MusicTrack;
  onClose: () => void;
  onSave: (data: { title: string; artist: string }) => Promise<void>;
}

export function EditTrackModal({
  track,
  onClose,
  onSave,
}: EditTrackModalProps) {
  const [title, setTitle] = useState(track.title);
  const [artist, setArtist] = useState(track.artist);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Título obrigatório.');
      return;
    }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#171821] border border-white/[0.08] rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#14151b]">
          <h3 className="text-white font-semibold text-xs">Editar Faixa</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] text-sm leading-none transition cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="p-4 sm:p-5 space-y-3.5">
          <div>
            <label className="text-[11px] text-zinc-400 mb-1 block">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-[#0e0f14] border border-white/10 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-400 mb-1 block">Artista</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full rounded-lg bg-[#0e0f14] border border-white/10 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>
          {error && (
            <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
