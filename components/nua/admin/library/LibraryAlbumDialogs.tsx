'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search, X } from 'lucide-react';
import { LibraryImageItem, MediaAlbum } from '@/lib/types';
import { isMediaVideo, resolveMediaVariant } from '@/lib/media';

interface AlbumFormProps {
  isOpen: boolean;
  album: MediaAlbum | null;
  onClose: () => void;
  onSave: (album: MediaAlbum) => void | Promise<void>;
}

export function LibraryAlbumFormDialog({ isOpen, album, onClose, onSave }: AlbumFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!isOpen) return;
    setName(album?.name || '');
    setDescription(album?.description || '');
    setError('');
  }, [isOpen, album]);

  if (!isOpen || !mounted) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Dê um nome para este álbum.');
      return;
    }
    try {
      await onSave({
      id: album?.id || `album_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: cleanName,
      description: description.trim() || undefined,
      coverMediaId: album?.coverMediaId,
      coverUrl: album?.coverUrl,
      mediaIds: album?.mediaIds || [],
      createdAt: album?.createdAt || new Date().toISOString(),
      });
      onClose();
    } catch {
      setError('Não foi possível salvar o álbum. Tente novamente em instantes.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#171821] p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="album-form-title">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="album-form-title" className="text-lg font-semibold text-white">{album ? 'Editar álbum' : 'Criar álbum'}</h2>
            <p className="mt-1 text-sm text-zinc-400">Use um nome fácil de reconhecer, como “Ensaio de verão”.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Fechar"><X size={18} /></button>
        </div>
        <label className="mb-3 block text-sm text-zinc-300">Nome do álbum
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#0e0f14] px-3 text-base text-white outline-none focus:border-[var(--color-adm-accent)]" />
        </label>
        <label className="block text-sm text-zinc-300">Descrição <span className="text-zinc-500">(opcional)</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-[#0e0f14] px-3 py-2 text-base text-white outline-none focus:border-[var(--color-adm-accent)]" />
        </label>
        {error && <p className="mt-2 text-sm text-rose-300" role="alert">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-zinc-200 hover:bg-white/10">Cancelar</button>
          <button type="submit" className="h-11 flex-1 rounded-xl bg-[var(--color-adm-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-adm-accent-hover)]">{album ? 'Salvar alterações' : 'Criar álbum'}</button>
        </div>
      </form>
    </div>,
    document.body
  );
}

interface AlbumMediaProps {
  isOpen: boolean;
  album: MediaAlbum | null;
  library: LibraryImageItem[];
  onClose: () => void;
  onSave: (mediaIds: string[]) => void | Promise<void>;
}

export function LibraryAlbumMediaDialog({ isOpen, album, library, onClose, onSave }: AlbumMediaProps) {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIds(album?.mediaIds || []);
      setError('');
    }
  }, [isOpen, album]);
  const visibleMedia = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? library.filter((item) => (item.customName || item.name || '').toLowerCase().includes(query)) : library;
  }, [library, search]);

  if (!isOpen || !mounted || !album) return null;
  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3 sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="flex max-h-[min(88vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#171821] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="album-media-title">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
          <div><h2 id="album-media-title" className="text-lg font-semibold text-white">Organizar fotos do álbum</h2><p className="mt-1 text-sm text-zinc-400">{album.name} · {selectedIds.length} selecionadas</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Fechar"><X size={18} /></button>
        </header>
        <div className="border-b border-white/10 p-4">
          <label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar mídia por nome" className="h-11 w-full rounded-xl border border-white/10 bg-[#0e0f14] pl-10 pr-3 text-base text-white outline-none focus:border-[var(--color-adm-accent)]" /></label>
          <div className="mt-2 flex gap-3 text-xs">
            <button type="button" onClick={() => setSelectedIds((current) => [...new Set([...current, ...visibleMedia.map((item) => item.id)])])} className="text-[var(--color-adm-accent-hover)] hover:underline">Selecionar resultados</button>
            <button type="button" onClick={() => setSelectedIds([])} className="text-zinc-400 hover:text-white">Limpar seleção</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {visibleMedia.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">{visibleMedia.map((item) => {
            const selected = selectedIds.includes(item.id);
            const preview = item.posterUrl || resolveMediaVariant(item, 'thumb');
            return <button key={item.id} type="button" aria-pressed={selected} onClick={() => toggle(item.id)} className={`relative overflow-hidden rounded-xl border text-left transition ${selected ? 'border-[var(--color-adm-accent)] ring-1 ring-[var(--color-adm-accent)]' : 'border-white/10 hover:border-white/25'}`}>
              <div className="relative aspect-[4/3] bg-black">{preview && <img src={preview} alt="" loading="lazy" className="h-full w-full object-cover" />}{isMediaVideo(item) && <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[11px] text-white">Vídeo</span>}{selected && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-adm-accent)] text-white"><Check size={14} /></span>}</div>
              <span className="block truncate px-2.5 py-2 text-xs text-zinc-200">{item.customName || item.name}</span>
            </button>;
          })}</div> : <p className="py-10 text-center text-sm text-zinc-400">Nenhuma mídia encontrada.</p>}
        </div>
        <footer className="flex gap-3 border-t border-white/10 p-4">
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-zinc-200 hover:bg-white/10">Cancelar</button>
          <div className="flex-1">
            {error && <p className="mb-1 text-xs text-rose-300" role="alert">{error}</p>}
            <button type="button" onClick={async () => { try { await onSave(selectedIds); onClose(); } catch { setError('Não foi possível salvar as mídias do álbum. Tente novamente em instantes.'); } }} className="h-11 w-full rounded-xl bg-[var(--color-adm-accent)] text-sm font-semibold text-white hover:bg-[var(--color-adm-accent-hover)]">Salvar seleção</button>
          </div>
        </footer>
      </section>
    </div>,
    document.body
  );
}
