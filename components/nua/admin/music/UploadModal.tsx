/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useRef } from 'react';
import { fmtBytes, ACCEPTED_AUDIO_FORMATS, MAX_AUDIO_MB } from './musicUtils';
import { getStoredSessionToken, getPublicApiUrl } from '@/lib/contentStore';

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');

  // Tab 1: File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState('');
  const [fileArtist, setFileArtist] = useState('Nua Borges');

  // Tab 2: Link State
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkArtist, setLinkArtist] = useState('Nua Borges');
  const [linkCoverUrl, setLinkCoverUrl] = useState('');
  const [linkType, setLinkType] = useState<'spotify_track' | 'youtube_video' | 'external_audio'>('spotify_track');
  const [youtubeVideoId, setYoutubeVideoId] = useState('');
  const [fetchingOembed, setFetchingOembed] = useState(false);

  // Common State
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  const handleFile = (f: File) => {
    if (f.size > MAX_AUDIO_MB * 1024 * 1024) {
      setError(`Arquivo muito grande. Máximo: ${MAX_AUDIO_MB}MB.`);
      return;
    }
    setFile(f);
    setError('');
    if (!fileTitle) {
      setFileTitle(
        f.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // OEmbed Auto-Fill ao colar URL
  const handleFetchOembed = async (urlToFetch: string) => {
    if (!urlToFetch || !urlToFetch.startsWith('http')) return;
    setFetchingOembed(true);
    setError('');

    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/music/oembed?url=${encodeURIComponent(urlToFetch)}`);
      if (res.ok) {
        const data = await res.json() as any;
        if (data.success) {
          if (data.title) setLinkTitle(data.title);
          if (data.artist) setLinkArtist(data.artist);
          if (data.coverUrl) setLinkCoverUrl(data.coverUrl);
          if (data.type) setLinkType(data.type);
          if (data.youtubeVideoId) setYoutubeVideoId(data.youtubeVideoId);
        }
      }
    } catch {
      // Ignora falhas em silêncio para não travar a digitação
    } finally {
      setFetchingOembed(false);
    }
  };

  const handleLinkUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLinkUrl(val);
    if (val.length > 10 && val.startsWith('http')) {
      handleFetchOembed(val);
    }
  };

  const handleSaveLink = async () => {
    if (!linkUrl.trim() || !linkTitle.trim()) {
      setError('Preencha o título e a URL do link.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/music/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStoredSessionToken() || ''}`,
        },
        body: JSON.stringify({
          title: linkTitle.trim(),
          artist: linkArtist.trim(),
          externalUrl: linkUrl.trim(),
          url: linkUrl.trim(),
          type: linkType,
          youtubeVideoId: youtubeVideoId || null,
          coverUrl: linkCoverUrl || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${res.status}`);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar link.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file || !fileTitle.trim()) {
      setError('Preencha o título e selecione um arquivo.');
      return;
    }

    setUploading(true);
    setProgress(10);
    setError('');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
      const safeTitle = fileTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      const key = `audio/${safeTitle}-${Date.now()}.${ext}`;

      setProgress(20);

      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/api/music/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'audio/mpeg',
          'X-Object-Key': key,
          'X-Mime-Type': file.type || 'audio/mpeg',
          'X-Track-Title': fileTitle.trim().substring(0, 200),
          'X-Track-Artist': fileArtist.trim().substring(0, 200),
          'Authorization': `Bearer ${getStoredSessionToken() || ''}`,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#171821] border border-white/[0.08] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#14151b]">
          <h3 className="text-white font-semibold text-xs">Adicionar Mídia &amp; Música</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] text-xs leading-none transition cursor-pointer"
            aria-label="Fechar"
          >
            Fechar
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-white/[0.06] bg-[#121319] p-1.5 gap-1">
          <button
            onClick={() => { setActiveTab('file'); setError(''); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'file'
                ? 'bg-white/[0.08] text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
            }`}
          >
            Arquivo MP3 / Áudio
          </button>
          <button
            onClick={() => { setActiveTab('link'); setError(''); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'link'
                ? 'bg-white/[0.08] text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
            }`}
          >
            Spotify / YouTube Link
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5">
          {/* ABA 1: UPLOAD DE ARQUIVO MP3 */}
          {activeTab === 'file' && (
            <>
              <div
                ref={dropRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`relative border border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors bg-[#101116] ${
                  file ? 'border-[#843C52]/50 bg-[#843C52]/5' : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => document.getElementById('music-file-input')?.click()}
              >
                <input
                  id="music-file-input"
                  type="file"
                  accept={ACCEPTED_AUDIO_FORMATS}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                {file ? (
                  <div>
                    <p className="text-[#843C52] font-medium text-xs">{file.name}</p>
                    <p className="text-zinc-500 text-[10px] mt-1">{fmtBytes(file.size)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-zinc-300 text-xs font-medium">Arraste o arquivo de áudio aqui</p>
                    <p className="text-zinc-500 text-[10px] mt-0.5">
                      MP3, WAV, M4A, OGG • Máx. {MAX_AUDIO_MB}MB
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Título *</label>
                <input
                  type="text"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  placeholder="Nome da música"
                  maxLength={200}
                  className="w-full rounded-lg bg-[#0e0f14] border border-white/10 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52] transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Artista</label>
                <input
                  type="text"
                  value={fileArtist}
                  onChange={(e) => setFileArtist(e.target.value)}
                  placeholder="Nome do artista"
                  maxLength={200}
                  className="w-full rounded-lg bg-[#0e0f14] border border-white/10 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52] transition-colors"
                />
              </div>
            </>
          )}

          {/* ABA 2: LINK DO SPOTIFY / YOUTUBE / STREAMING */}
          {activeTab === 'link' && (
            <>
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 flex items-center justify-between">
                  <span>Link da Música / Vídeo *</span>
                  {fetchingOembed && <span className="text-[#843C52] text-[10px] animate-pulse">Buscando metadados...</span>}
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={handleLinkUrlChange}
                  placeholder="Cole a URL do Spotify, YouTube, Apple Music ou SoundCloud"
                  className="w-full rounded-lg bg-[#0e0f14] border border-white/10 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52] transition-colors"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Cole a URL e o título/capa serão preenchidos automaticamente.
                </p>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Título *</label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="Nome da faixa"
                  maxLength={200}
                  className="w-full rounded-lg bg-[#0e0f14] border border-white/10 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52] transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Artista</label>
                <input
                  type="text"
                  value={linkArtist}
                  onChange={(e) => setLinkArtist(e.target.value)}
                  placeholder="Nome do artista / canal"
                  maxLength={200}
                  className="w-full rounded-lg bg-[#0e0f14] border border-white/10 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#843C52] transition-colors"
                />
              </div>

              {linkCoverUrl && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-[#0e0f14] border border-white/[0.06]">
                  <img src={linkCoverUrl} alt="Capa da Mídia" className="w-10 h-10 object-cover rounded-md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-300 font-medium truncate">Capa Sincronizada</p>
                    <p className="text-[10px] text-zinc-500 truncate">{linkCoverUrl}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Erro */}
          {error && (
            <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Progress */}
          {uploading && (
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#843C52] rounded-full transition-all duration-300"
                style={{ width: `${progress || 60}%` }}
              />
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={activeTab === 'file' ? handleFileUpload : handleSaveLink}
            disabled={
              uploading ||
              (activeTab === 'file' && (!file || !fileTitle.trim())) ||
              (activeTab === 'link' && (!linkUrl.trim() || !linkTitle.trim()))
            }
            className="h-8 px-4 rounded-full bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Salvando...' : 'Adicionar Mídia'}
          </button>
        </div>
      </div>
    </div>
  );
}
