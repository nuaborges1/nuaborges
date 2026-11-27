'use client';

import React, { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  Download,
  ExternalLink,
  FileImage,
  Film,
  FolderArchive,
  HardDrive,
  Lock,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { mediaIdentity, normalizeObjectKey } from '@/lib/media/objectKeys.mjs';
import type { SiteContent } from '@/lib/types';
import { getPublicApiUrl } from '@/lib/contentStore';
import { formatBrTimestamp } from '@/lib/phdev/konohagakure/verbalIdentity';

interface ArchiveObjectItem {
  key: string;
  sourceKey: string;
  assetKey: string;
  eTag?: string | null;
  name?: string;
  url: string;
  downloadUrl?: string;
  size: number;
  uploadedAt: string | null;
  kind: 'video' | 'image' | 'audio' | 'other';
  isPrivate: boolean;
  isArchiveCopy: boolean;
  hasArchiveBackup: boolean;
}

type AssetUsage = 'unknown' | 'in_use' | 'orphan';
type DeleteAction = 'delete_objects' | 'delete_assets' | 'delete_duplicates';

interface ArchiveAsset extends ArchiveObjectItem {
  previewUrl: string | null;
  fullUrl: string;
  downloadUrl: string;
  variantCount: number;
  sha256: string | null;
  usage: AssetUsage;
  duplicateOf: string | null;
  duplicateCount: number;
}

const usageLabels: Record<AssetUsage, string> = {
  unknown: 'Vínculos não verificados',
  in_use: 'Em uso no site ou Cofre',
  orphan: 'Sem uso',
};

interface ArchiveApiResponse {
  success?: boolean;
  storageConfigured?: boolean;
  totalObjects?: number;
  archivedCopies?: number;
  totalBytes?: number;
  objects?: ArchiveObjectItem[];
  assets?: ArchiveAsset[];
  referencesVerified?: boolean;
}

interface UnifiedMediaEntry {
  id: string;
  b2Key?: string;
  asset?: ArchiveAsset;
  previewUrl?: string | null;
  title: string;
  url: string;
  downloadUrl: string;
  posterUrl?: string;
  kind: 'image' | 'video' | 'audio' | 'other';
  source: string;
  size?: number;
  isPrivate: boolean;
  isArchiveCopy?: boolean;
  hasArchiveBackup?: boolean;
  uploadedAt?: string | null;
}

interface PhdevMediaArchiveViewProps {
  content: SiteContent;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

/**
 * Biblioteca & Cofre de Mídia do PHDEV:
 * - Unifica TODOS os objetos físicos do Backblaze B2 + mídias do CMS da NUA (sem limitar a 7 placeholders).
 * - Permite preview autenticado, download direto (público, privado e `phdev-archive/`)
 *   e exclusão física real do Backblaze B2 (individual ou em massa) protegida por senha PHDEV.
 */
export function PhdevMediaArchiveView({ content }: PhdevMediaArchiveViewProps) {
  const [tab, setTab] = useState<'media' | 'packs' | 'storage'>('media');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'image' | 'video' | 'private' | 'archive' | 'duplicates'>('all');
  const [storageMode, setStorageMode] = useState<'assets' | 'raw'>('assets');
  const [archive, setArchive] = useState<ArchiveApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [deleteModalKeys, setDeleteModalKeys] = useState<string[] | null>(null);
  const [deleteAction, setDeleteAction] = useState<DeleteAction>('delete_assets');
  const [deleteArchiveCopy, setDeleteArchiveCopy] = useState(false);
  const [archiveError, setArchiveError] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [actionBanner, setActionBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const apiBase = getPublicApiUrl();

  const loadArchive = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setArchiveError(false);
    try {
      const res = await fetch(`${apiBase}/api/control/archive`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        signal,
      });
      if (!res.ok) throw new Error('Arquivo indisponível');
      const data: ArchiveApiResponse = await res.json();
      if (!signal?.aborted) setArchive(data);
    } catch {
      if (!signal?.aborted) {
        setArchive(null);
        setArchiveError(true);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const controller = new AbortController();
    void loadArchive(controller.signal);
    return () => controller.abort();
  }, [loadArchive]);

  const allPacks = useMemo(
    () => (Array.isArray(content.avulsos?.items) ? content.avulsos.items : []),
    [content.avulsos],
  );

  // Unifica TODOS os objetos físicos reais do Backblaze B2 + referências do SiteContent
  const unifiedMedia = useMemo<UnifiedMediaEntry[]>(() => {
    const map = new Map<string, UnifiedMediaEntry>();

    for (const asset of archive?.assets || []) {
      map.set(asset.key, {
        id: asset.key,
        b2Key: asset.key,
        asset,
        title: asset.name || asset.key,
        url: `${apiBase}${asset.fullUrl}`,
        downloadUrl: `${apiBase}${asset.downloadUrl}`,
        previewUrl: asset.previewUrl ? `${apiBase}${asset.previewUrl}` : null,
        posterUrl: asset.kind === 'video' && asset.previewUrl ? `${apiBase}${asset.previewUrl}` : undefined,
        kind: asset.kind,
        source: asset.isPrivate ? 'Backblaze B2 · Privado' : 'Backblaze B2 · Público',
        size: asset.size,
        isPrivate: asset.isPrivate,
        isArchiveCopy: asset.isArchiveCopy,
        hasArchiveBackup: asset.hasArchiveBackup,
        uploadedAt: asset.uploadedAt,
      });
    }

    // 2. Enriquece / adiciona referências do CMS (Packs, Galeria, Biblioteca, Capa, Sobre)
    const addCmsRef = (entry: {
      title: string;
      url: string;
      posterUrl?: string;
      kind: 'image' | 'video';
      source: string;
      isPrivate: boolean;
      uploadedAt?: string | null;
    }) => {
      if (!entry.url) return;
      const key = normalizeObjectKey(entry.url);
      const b2Key = key ? mediaIdentity(key).folder : undefined;
      if (b2Key && map.has(b2Key)) {
        const existing = map.get(b2Key)!;
        map.set(b2Key, {
          ...existing,
          title: entry.title || existing.title,
          source: entry.source,
          posterUrl: existing.posterUrl || entry.posterUrl,
        });
        return;
      }
      const id = key.startsWith('media/') ? b2Key! : entry.url;
      if (map.has(id)) return;
      map.set(id, {
        id,
        title: entry.title,
        url: entry.url,
        downloadUrl: entry.url,
        posterUrl: entry.posterUrl,
        kind: entry.kind,
        source: entry.source,
        isPrivate: entry.isPrivate,
        uploadedAt: entry.uploadedAt,
      });
    };

    for (const slide of Array.isArray(content.hero?.photos) ? content.hero.photos : []) {
      if (slide?.imageUrl) {
        addCmsRef({
          title: slide.title || 'Slide da Capa Principal',
          url: slide.imageUrl,
          kind: isVideoUrl(slide.imageUrl) ? 'video' : 'image',
          source: 'Vitrine · Capa',
          isPrivate: false,
        });
      }
    }
    if (content.about?.photoUrl) {
      addCmsRef({
        title: 'Foto Sobre Mim',
        url: content.about.photoUrl,
        kind: isVideoUrl(content.about.photoUrl) ? 'video' : 'image',
        source: 'Vitrine · Sobre',
        isPrivate: false,
      });
    }
    for (const item of Array.isArray(content.gallery?.photos) ? content.gallery.photos : []) {
      if (item?.imageUrl) {
        addCmsRef({
          title: item.title || item.caption || 'Foto da Galeria Pública',
          url: item.imageUrl,
          kind: isVideoUrl(item.imageUrl) ? 'video' : 'image',
          source: 'Galeria Pública',
          isPrivate: false,
        });
      }
    }
    for (const libItem of Array.isArray(content.library) ? content.library : []) {
      if (!libItem?.url) continue;
      addCmsRef({
        title: libItem.customName || libItem.name || 'Mídia da Biblioteca',
        url: libItem.url,
        posterUrl: libItem.posterUrl,
        kind: libItem.isVideo || isVideoUrl(libItem.url) ? 'video' : 'image',
        source:
          Array.isArray(libItem.albumIds) && libItem.albumIds.length > 0
            ? `Biblioteca · ${libItem.albumIds[0]}`
            : 'Biblioteca NUA',
        isPrivate: libItem.url.includes('private/'),
        uploadedAt: libItem.uploadedAt || null,
      });
    }
    for (const pack of allPacks) {
      if (pack.imageUrl) {
        addCmsRef({
          title: `Capa · ${pack.title}`,
          url: pack.imageUrl,
          kind: isVideoUrl(pack.imageUrl) ? 'video' : 'image',
          source: `Pack · ${pack.title}`,
          isPrivate: false,
        });
      }
      for (const sampleUrl of Array.isArray(pack.previewImages) ? pack.previewImages : []) {
        if (sampleUrl) {
          addCmsRef({
            title: `Amostra · ${pack.title}`,
            url: sampleUrl,
            kind: isVideoUrl(sampleUrl) ? 'video' : 'image',
            source: `Pack · ${pack.title}`,
            isPrivate: false,
          });
        }
      }
      for (const exclusiveUrl of Array.isArray(pack.exclusivePhotos) ? pack.exclusivePhotos : []) {
        if (exclusiveUrl) {
          addCmsRef({
            title: `Foto Privada · ${pack.title}`,
            url: exclusiveUrl,
            kind: isVideoUrl(exclusiveUrl) ? 'video' : 'image',
            source: `Cofre · ${pack.title}`,
            isPrivate: true,
          });
        }
      }
      for (const vid of Array.isArray(pack.videos) ? pack.videos : []) {
        if (vid?.url) {
          addCmsRef({
            title: vid.title || `Vídeo Privado · ${pack.title}`,
            url: vid.url,
            posterUrl: vid.posterUrl,
            kind: 'video',
            source: `Cofre · ${pack.title}`,
            isPrivate: true,
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const ta = a.uploadedAt ? Date.parse(a.uploadedAt) : 0;
      const tb = b.uploadedAt ? Date.parse(b.uploadedAt) : 0;
      return tb - ta;
    });
  }, [allPacks, apiBase, archive?.assets, content.about?.photoUrl, content.gallery?.photos, content.hero?.photos, content.library]);

  const packs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPacks.filter((pack) => {
      if (!q) return true;
      return `${pack.title || ''} ${pack.slug || ''} ${pack.description || ''}`.toLowerCase().includes(q);
    });
  }, [allPacks, query]);

  const filteredMedia = useMemo(() => {
    const q = query.trim().toLowerCase();
    return unifiedMedia.filter((item) => {
      if (kindFilter === 'image' && item.kind !== 'image') return false;
      if (kindFilter === 'video' && item.kind !== 'video') return false;
      if (kindFilter === 'private' && !item.isPrivate) return false;
      if (kindFilter === 'archive' && !item.isArchiveCopy && !item.hasArchiveBackup) return false;
      if (kindFilter === 'duplicates' && !item.asset?.duplicateCount) return false;
      if (!q) return true;
      return `${item.title} ${item.source} ${item.b2Key || item.url}`.toLowerCase().includes(q);
    });
  }, [kindFilter, query, unifiedMedia]);

  const assetsByKey = useMemo(() => new Map((archive?.assets || []).map(asset => [asset.key, asset])), [archive?.assets]);
  const duplicates = (archive?.assets || []).filter(asset => asset.duplicateOf);
  const cleanupCandidates = duplicates.filter(asset => asset.usage === 'orphan');
  const rawTable = tab === 'storage' && storageMode === 'raw';
  const storageObjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (storageMode === 'raw' ? archive?.objects || [] : archive?.assets || []).filter((obj) => {
      if (kindFilter === 'image' && obj.kind !== 'image') return false;
      if (kindFilter === 'video' && obj.kind !== 'video') return false;
      if (kindFilter === 'private' && !obj.isPrivate) return false;
      if (kindFilter === 'archive' && !obj.isArchiveCopy && !obj.hasArchiveBackup) return false;
      if (kindFilter === 'duplicates' && !assetsByKey.get(obj.assetKey)?.duplicateCount) return false;
      if (!q) return true;
      return `${obj.key} ${obj.sourceKey} ${obj.eTag || ''}`.toLowerCase().includes(q);
    });
  }, [archive, assetsByKey, kindFilter, query, storageMode]);

  const toggleSelectKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openDeleteModal = (keys: string[], action: DeleteAction = 'delete_assets') => {
    const valid = keys.filter(Boolean);
    if (valid.length === 0) return;
    setActionBanner(null);
    setDeletePassword('');
    setDeleteArchiveCopy(false);
    setDeleteAction(action);
    setDeleteModalKeys(valid);
  };

  const handleConfirmDelete = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!deleteModalKeys?.length || !deletePassword.trim() || deleting) return;
    setDeleting(true);
    setActionBanner(null);
    try {
      const response = await fetch(`${apiBase}/api/control/archive`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: deleteAction,
          keys: deleteModalKeys,
          deleteArchiveCopy,
          confirmationPassword: deletePassword,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || (!result.success && (!Array.isArray(result.deleted) || result.deleted.length === 0))) {
        throw new Error(result.error || 'Não foi possível apagar os arquivos do Backblaze B2.');
      }

      const deletedList: string[] = Array.isArray(result.deleted) ? result.deleted : [];
      const failedCount = Array.isArray(result.failures) ? result.failures.length : 0;
      setActionBanner({
        type: failedCount > 0 ? 'err' : 'ok',
        text:
          failedCount > 0
            ? `${deletedList.length} arquivo(s) apagado(s) do Backblaze B2, mas ${failedCount} falharam.`
            : `${deletedList.length} arquivo(s) apagado(s) fisicamente do Backblaze B2 com sucesso.`,
      });
      setSelectedKeys(new Set());
      setDeleteModalKeys(null);
      await loadArchive();
    } catch (err) {
      setActionBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Erro ao deletar do Backblaze B2.',
      });
    } finally {
      setDeletePassword('');
      setDeleting(false);
    }
  };

  const handleExportManifest = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      packsCount: allPacks.length,
      unifiedMediaCount: unifiedMedia.length,
      storageObjectsCount: archive?.totalObjects ?? 0,
      archivedCopiesCount: archive?.archivedCopies ?? 0,
      storageAssets: archive?.assets || [],
      storageObjects: archive?.objects || [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phdev-biblioteca-nua-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="phdev-media-archive" className="phdev-page-enter space-y-5">
      {/* Cabeçalho da Biblioteca PHDEV */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#38bdf8]/24 bg-[#0c0f18]/92 backdrop-blur-md p-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-[#38bdf8]/35 bg-[#38bdf8]/12 flex items-center justify-center text-[#38bdf8] shrink-0">
            <FolderArchive className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-sans text-base sm:text-lg font-semibold text-white tracking-tight">
              Biblioteca &amp; Cofre Backblaze B2 (PHDEV)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Todas as fotos, vídeos e packs do Backblaze B2 com preview, download direto e exclusão física sob seu controle.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadArchive()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-8 rounded-xl border border-white/14 bg-white/[0.06] hover:bg-white/[0.13] px-3 text-xs font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Atualizar B2</span>
          </button>
          <button
            type="button"
            onClick={handleExportManifest}
            className="inline-flex items-center gap-1.5 h-8 rounded-xl border border-[#38bdf8]/35 bg-[#38bdf8]/14 hover:bg-[#38bdf8]/24 px-3 text-xs font-medium text-sky-100 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Exportar manifesto</span>
          </button>
        </div>
      </div>

      {archiveError && <p role="alert" className="text-xs text-rose-200">Não foi possível carregar o Backblaze B2. Atualize para tentar novamente.</p>}
      {archive?.storageConfigured && !archive.referencesVerified && (
        <p role="status" className="text-xs text-amber-200">A exclusão está indisponível enquanto os vínculos com o site e o Cofre não forem confirmados.</p>
      )}
      {actionBanner && (
        <div
          role={actionBanner.type === 'err' ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 text-xs flex items-center justify-between gap-3 ${
            actionBanner.type === 'err'
              ? 'border-rose-500/40 bg-rose-950/40 text-rose-200'
              : 'border-emerald-500/40 bg-emerald-950/35 text-emerald-200'
          }`}
        >
          <span>{actionBanner.text}</span>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            aria-label="Fechar aviso"
            className="text-current opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPIs do Acervo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
            Mídias Totais
          </span>
          <span className="font-mono text-xl font-bold text-white mt-1 block">
            {unifiedMedia.length}
          </span>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
            Objetos Físicos B2
          </span>
          <span className="font-mono text-xl font-bold text-white mt-1 block">
            {archive?.totalObjects ?? '—'}
          </span>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
            Packs Cadastrados
          </span>
          <span className="font-mono text-xl font-bold text-white mt-1 block">
            {allPacks.length}
          </span>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0f18]/90 p-4">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
            Volume no Backblaze B2
          </span>
          <span className="font-mono text-xl font-bold text-white mt-1 block">
            {archive ? formatBytes(archive.totalBytes || 0) : '—'}
          </span>
          <span className="text-[10px] text-emerald-300/85 font-mono">
            {archive?.archivedCopies ? `${archive.archivedCopies} cópia(s) phdev-archive` : 'Bucket conectado'}
          </span>
        </div>
      </div>

      {/* Barra de seleção múltipla para exclusão em lote */}
      {selectedKeys.size > 0 && (
        <div className="rounded-xl border border-red-400/35 bg-red-950/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-red-100">
            {selectedKeys.size} {rawTable ? 'objeto(s)' : 'ativo(s)'} selecionado(s) do Backblaze B2
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedKeys(new Set())}
              className="h-7 rounded-lg border border-white/14 bg-black/45 px-2.5 text-[11px] text-zinc-200 hover:text-white cursor-pointer"
            >
              Limpar seleção
            </button>
            <button
              type="button"
              onClick={() => openDeleteModal(Array.from(selectedKeys))}
              className="inline-flex items-center gap-1.5 h-7 rounded-lg bg-red-600 hover:bg-red-500 px-3 text-[11px] font-semibold text-white cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Apagar selecionados do B2</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de abas e filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#0c0f18]/90 p-3">
        <div className="inline-flex flex-wrap items-center gap-1.5">
          {(
            [
              ['media', `Todas as Mídias (${filteredMedia.length})`, FileImage],
              ['packs', `Packs (${packs.length})`, Package],
              ['storage', `Tabela B2 (${storageObjects.length})`, HardDrive],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); setSelectedKeys(new Set()); }}
              className={`inline-flex items-center gap-1.5 h-8 rounded-xl px-3 text-xs font-medium transition-colors cursor-pointer ${
                tab === id
                  ? 'bg-[#38bdf8]/20 text-white border border-[#38bdf8]/40'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05] border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar arquivo, pasta ou pack..."
              aria-label="Buscar na biblioteca PHDEV"
              className="h-8 w-48 sm:w-56 rounded-lg border border-white/12 bg-black/50 pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#38bdf8]/50"
            />
          </div>

          {tab !== 'packs' && (
            <div className="inline-flex flex-wrap items-center rounded-lg border border-white/10 bg-black/45 p-0.5 text-[10.5px] font-mono">
              {(
                [
                  ['all', 'Todos'],
                  ['image', 'Fotos'],
                  ['video', 'Vídeos'],
                  ['private', 'Privados'],
                  ['archive', 'Retenção'],
                  ['duplicates', `Duplicatas (${duplicates.length})`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setKindFilter(id)}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    kindFilter === id ? 'bg-white/[0.14] text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {kindFilter === 'duplicates' && tab !== 'packs' && cleanupCandidates.length > 0 && (
        <button type="button" onClick={() => openDeleteModal(cleanupCandidates.map(asset => asset.key), 'delete_duplicates')}
          className="rounded-lg border border-red-400/35 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-200">
          Apagar duplicatas órfãs do B2 ({cleanupCandidates.length})
        </button>
      )}

      {/* Aba 1: Galeria Completa Unificada (B2 + CMS) com Seleção, Download e Delete do B2 */}
      {tab === 'media' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredMedia.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-white/[0.10] bg-[#0c0f18]/80 p-8 text-center text-xs text-zinc-400">
              {loading
                ? 'Carregando arquivos do Backblaze B2…'
                : 'Nenhuma mídia encontrada com os filtros atuais.'}
            </div>
          ) : (
            filteredMedia.map((item) => {
              const asset = item.asset;
              const canDelete = Boolean(item.b2Key && asset?.usage === 'orphan');
              const isSelected = Boolean(item.b2Key && selectedKeys.has(item.b2Key));
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border bg-[#0c0f18]/92 overflow-hidden flex flex-col transition-colors ${
                    isSelected ? 'border-red-400/60 ring-1 ring-red-400/35' : 'border-white/[0.08]'
                  }`}
                >
                  <div className="relative h-40 bg-black/75 overflow-hidden flex items-center justify-center">
                    {item.kind === 'video' ? (
                      item.posterUrl ? (
                        <img src={item.posterUrl} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                          <Film className="w-8 h-8 text-[#38bdf8]" aria-hidden="true" />
                          <span className="text-[10px] font-mono uppercase">Vídeo</span>
                        </div>
                      )
                    ) : item.kind === 'image' ? (
                      <img
                        src={item.previewUrl || item.url}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                        <HardDrive className="w-7 h-7 text-zinc-400" aria-hidden="true" />
                        <span className="text-[10px] font-mono uppercase">{item.kind}</span>
                      </div>
                    )}

                    {/* Seleção para deleção em massa */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => toggleSelectKey(item.b2Key!)}
                        aria-label={`Selecionar ${item.title}`}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/70 hover:bg-black/90 border border-white/20 flex items-center justify-center text-white cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-red-400" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-300" />
                        )}
                      </button>
                    )}

                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-mono ${
                          item.isArchiveCopy
                            ? 'border-emerald-400/45 bg-black/78 text-emerald-200'
                            : item.isPrivate
                              ? 'border-amber-400/40 bg-black/78 text-amber-200'
                              : 'border-white/15 bg-black/70 text-zinc-200'
                        }`}
                      >
                        {item.isPrivate && <Lock className="w-2.5 h-2.5" aria-hidden="true" />}
                        {item.isArchiveCopy ? 'Retenção B2' : item.isPrivate ? 'Privado' : 'Público'}
                      </span>
                      {item.hasArchiveBackup && !item.isArchiveCopy && <span className="rounded-full bg-black/80 px-2 py-0.5 text-[9.5px] text-emerald-200">Retenção B2</span>}
                    </div>
                  </div>

                  <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate" title={item.b2Key || item.title}>
                        {item.title}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-400 mt-0.5">
                        <span className="truncate">{item.source}</span>
                        {typeof item.size === 'number' && item.size > 0 && (
                          <span className="font-mono text-zinc-400 shrink-0">{asset && `${asset.variantCount} ${asset.variantCount === 1 ? 'variante' : 'variantes'} · `}{formatBytes(item.size)}</span>
                        )}
                      </div>
                      {asset && (
                        <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                          <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-zinc-300">{usageLabels[asset.usage]}</span>
                          {asset.duplicateCount > 0 && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-200" title={asset.duplicateOf || undefined}>
                              {asset.duplicateOf ? 'Duplicata' : 'Cópia a manter'}
                            </span>
                          )}
                        </div>
                      )}
                      {asset?.eTag && <p className="mt-1 truncate font-mono text-[10px] text-zinc-400" title={asset.eTag}>ETag {asset.eTag}</p>}
                      {asset?.sha256 && <p className="truncate font-mono text-[10px] text-zinc-400" title={asset.sha256}>SHA-256 {asset.sha256}</p>}
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/[0.06]">
                      <div className="flex items-center gap-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-white/12 bg-white/[0.05] hover:bg-white/[0.12] px-2 py-1 text-[10px] text-zinc-200 hover:text-white"
                        >
                          <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                          <span>Abrir</span>
                        </a>
                        <a
                          href={item.downloadUrl}
                          download
                          className="inline-flex items-center gap-1 rounded-md border border-[#38bdf8]/30 bg-[#38bdf8]/12 hover:bg-[#38bdf8]/22 px-2 py-1 text-[10px] text-sky-100"
                        >
                          <Download className="w-2.5 h-2.5" aria-hidden="true" />
                          <span>Baixar</span>
                        </a>
                      </div>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => openDeleteModal([item.b2Key!])}
                          title="Apagar fisicamente do Backblaze B2"
                          className="inline-flex items-center gap-1 rounded-md border border-red-400/30 bg-red-500/12 hover:bg-red-500/25 px-2 py-1 text-[10px] font-medium text-red-200 hover:text-white transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" aria-hidden="true" />
                          <span>Apagar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Aba 2: Packs da NUA */}
      {tab === 'packs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packs.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-white/[0.10] bg-[#0c0f18]/80 p-8 text-center text-xs text-zinc-400">
              Nenhum pack encontrado no conteúdo publicado.
            </div>
          ) : (
            packs.map((pack) => {
              const privateCount = (pack.exclusivePhotos?.length ?? 0) + (pack.videos?.length ?? 0);
              const previewCount = pack.previewImages?.length ?? 0;
              return (
                <article
                  key={pack.id || pack.slug}
                  className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/92 overflow-hidden flex flex-col"
                >
                  <div className="relative h-40 bg-black/60 overflow-hidden">
                    {pack.imageUrl ? (
                      <img src={pack.imageUrl} alt={pack.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Package className="w-8 h-8" aria-hidden="true" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f18] via-transparent to-transparent" />
                    <span className="absolute top-2.5 right-2.5 rounded-full border border-white/16 bg-black/70 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-mono text-white">
                      {pack.price || (typeof pack.numericPrice === 'number' ? `R$ ${pack.numericPrice.toFixed(2)}` : 'Pack')}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-white truncate">{pack.title}</h3>
                      <p className="text-[11px] font-mono text-zinc-500 truncate">/{pack.slug || pack.id}</p>
                      {pack.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{pack.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.07] text-[11px] font-mono text-zinc-300">
                      <span>{previewCount} amostra(s)</span>
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        <Lock className="w-3 h-3" aria-hidden="true" />
                        {privateCount} arquivo(s) privados
                      </span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {/* Aba 3: Tabela Completa de Objetos Físicos no Backblaze B2 */}
      {tab === 'storage' && (
        <section className="rounded-2xl border border-white/[0.08] bg-[#0c0f18]/92 p-5 space-y-3">
          <div className="flex flex-wrap gap-2" aria-label="Visualização da tabela do B2">
            {([['assets', 'Por ativo (agrupado)'], ['raw', 'Objetos brutos S3']] as const).map(([mode, label]) => (
              <button key={mode} type="button" aria-pressed={mode === storageMode}
                onClick={() => { setStorageMode(mode); setSelectedKeys(new Set()); }}
                className={`rounded-md border border-white/15 px-2.5 py-1.5 text-xs ${mode === storageMode ? 'bg-white/15 text-white' : 'text-zinc-400'}`}>
                {label}
              </button>
            ))}
          </div>
          {!archive?.storageConfigured ? (
            <p className="text-xs text-zinc-400">
              Storage Backblaze B2 não configurado neste ambiente. Assim que as credenciais{' '}
              <code className="font-mono text-zinc-300">B2_*</code> estiverem no ambiente, todos os arquivos físicos aparecerão listados aqui.
            </p>
          ) : storageObjects.length === 0 ? (
            <p className="text-xs text-zinc-400">Nenhum objeto físico encontrado para o filtro atual.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] font-mono uppercase text-zinc-400">
                    {!rawTable && <th className="py-2 pr-2 w-8">Sel.</th>}
                    <th className="py-2 pr-3">Objeto / Caminho B2</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Tamanho</th>
                    <th className="py-2 pr-3">Retenção</th>
                    <th className="py-2 pr-3">Modificado</th>
                    <th className="py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {storageObjects.map((obj) => {
                    const isSelected = selectedKeys.has(obj.key);
                    const asset = assetsByKey.get(obj.assetKey);
                    const canDelete = asset?.usage === 'orphan';
                    const dlUrl = obj.downloadUrl
                      ? obj.downloadUrl.startsWith('/')
                        ? `${apiBase}${obj.downloadUrl}`
                        : obj.downloadUrl
                      : `${apiBase}/api/control/archive?download=${encodeURIComponent(obj.key)}`;

                    return (
                      <tr key={obj.key} className="text-zinc-200">
                        {!rawTable && <td className="py-2.5 pr-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canDelete}
                            onChange={() => toggleSelectKey(obj.key)}
                            aria-label={`Selecionar ${obj.key}`}
                            className="h-3.5 w-3.5 rounded accent-red-500 cursor-pointer"
                          />
                        </td>}
                        <td className="py-2.5 pr-3 font-mono text-[11px] text-zinc-200 max-w-[340px] truncate" title={obj.key}>
                          {obj.key}
                          <p className="mt-1 text-[10px] text-zinc-400">{asset && usageLabels[asset.usage]}{asset?.duplicateCount ? ` · ${asset.duplicateOf ? 'Duplicata' : 'Cópia a manter'}` : ''}</p>
                          {obj.eTag && <p className="truncate text-[10px] text-zinc-400" title={obj.eTag}>ETag {obj.eTag}</p>}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-[10.5px] uppercase text-zinc-400">{obj.kind}</td>
                        <td className="py-2.5 pr-3 font-mono text-[11px] text-zinc-300 whitespace-nowrap">
                          {!rawTable && asset ? `${asset.variantCount} variantes · ` : ''}{formatBytes(obj.size)}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          {obj.hasArchiveBackup ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-mono text-emerald-200">
                              <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                              Espelhado
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                              Original B2
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-[10.5px] text-zinc-400 whitespace-nowrap">
                          {formatBrTimestamp(obj.uploadedAt) || '—'}
                        </td>
                        <td className="py-2.5 text-right whitespace-nowrap space-x-1.5">
                          <a
                            href={dlUrl}
                            download
                            className="inline-flex items-center gap-1 rounded-md border border-[#38bdf8]/30 bg-[#38bdf8]/12 hover:bg-[#38bdf8]/22 px-2 py-1 text-[10px] text-sky-100"
                          >
                            <Download className="w-2.5 h-2.5" aria-hidden="true" />
                            <span>Baixar</span>
                          </a>
                          {!rawTable && <button
                            type="button"
                            onClick={() => openDeleteModal([obj.key])}
                            disabled={!canDelete}
                            className="inline-flex items-center gap-1 rounded-md border border-red-400/35 bg-red-500/14 hover:bg-red-500/28 px-2 py-1 text-[10px] font-medium text-red-200 hover:text-white cursor-pointer"
                          >
                            <Trash2 className="w-2.5 h-2.5" aria-hidden="true" />
                            <span>Apagar B2</span>
                          </button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Modal de Confirmação de Exclusão Física do Backblaze B2 */}
      {deleteModalKeys && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="phdev-delete-b2-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#0d0f17] p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl border border-red-500/40 bg-red-500/15 flex items-center justify-center text-red-300 shrink-0">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 id="phdev-delete-b2-title" className="text-sm font-semibold text-white">
                    Apagar fisicamente do Backblaze B2
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    {deleteAction === 'delete_objects'
                      ? `Esta ação remove todas as versões de ${deleteModalKeys.length} objeto(s) selecionado(s).`
                      : `Esta ação remove todas as variantes e versões de ${deleteModalKeys.length} ativo(s) selecionado(s).`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalKeys(null)}
                aria-label="Fechar modal"
                className="rounded-lg p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-32 overflow-y-auto rounded-xl border border-white/[0.08] bg-black/50 p-2.5 space-y-1">
              {deleteModalKeys.map((k) => (
                <p key={k} className="font-mono text-[10.5px] text-zinc-300 truncate" title={k}>
                  • {k}
                </p>
              ))}
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-3">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteArchiveCopy}
                  onChange={(e) => setDeleteArchiveCopy(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-red-500 cursor-pointer"
                />
                <span>Apagar também eventual cópia em phdev-archive/</span>
              </label>

              <label className="grid gap-1.5 text-xs font-medium text-zinc-300">
                <span>Senha do PHDEV (confirmação obrigatória)</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Digite sua senha PHDEV..."
                  required
                  className="h-9 rounded-xl border border-white/15 bg-black/55 px-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-400/60"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeleteModalKeys(null)}
                  disabled={deleting}
                  className="h-9 rounded-xl border border-white/14 bg-white/[0.05] hover:bg-white/[0.10] px-4 text-xs text-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deleting || !deletePassword.trim()}
                  className="inline-flex items-center gap-1.5 h-9 rounded-xl bg-red-600 hover:bg-red-500 px-4 text-xs font-semibold text-white disabled:opacity-45 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{deleting ? 'Apagando…' : 'Confirmar exclusão no B2'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
