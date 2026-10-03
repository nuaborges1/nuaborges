'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Heart,
  Repeat2,
  Share2,
  Camera,
  Music,
  Send,
  X,
  Disc3,
  Quote,
  Sparkles,
  ArrowLeft,
  Check,
  Play,
  Pause,
  ExternalLink,
  Lock,
  Video,
  Volume2,
  VolumeX,
  Clock,
  Film,
  MessageCircle,
  Instagram,
} from 'lucide-react';
import { useBlogPosts, submitAsk } from '@/lib/blogStore';
import { BlogCategory, BlogPost, TumblrPostType } from '@/types/blog';
import { isLocalhost } from '@/lib/envGuard';
import NotFound from '@/app/not-found';
import { StoryCardModal } from '@/components/blog/StoryCardModal';

const CATEGORIES: { label: string; value: BlogCategory | 'all'; type?: TumblrPostType }[] = [
  { label: '// todos os posts', value: 'all' },
  { label: '📝 confissões (texto)', value: 'Confissões de Sexologia', type: 'text' },
  { label: '📷 polaroids 35mm', value: 'Bastidores 35mm', type: 'photo' },
  { label: '📹 fitas vhs (vídeo)', value: 'Vídeos & VHS', type: 'video' },
  { label: '“ ” citações', value: 'Confissões de Sexologia', type: 'quote' },
  { label: '♫ trilhas & vinil', value: 'Trilhas & Áudios', type: 'audio' },
  { label: '✉ pergunte à nua', value: 'Pergunte à Nua (Asks)', type: 'ask' },
];

export default function TumblrNostalgiaBlogPage() {
  const [mounted, setMounted] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [rebloggedPosts, setRebloggedPosts] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Áudio tocando no feed (HTML5 Audio real)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState('00:00');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Vídeo tocando no feed
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Modal de Ask Box
  const [askModalOpen, setAskModalOpen] = useState(false);
  const [askQuestion, setAskQuestion] = useState('');
  const [askerName, setAskerName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [askSent, setAskSent] = useState(false);

  // Modal de Reblog com comentário autêntico
  const [reblogModalPost, setReblogModalPost] = useState<BlogPost | null>(null);
  const [reblogComment, setReblogComment] = useState('');

  // Modal de Notes
  const [activeNotesPost, setActiveNotesPost] = useState<BlogPost | null>(null);

  // Modal de Story do Instagram (9:16)
  const [storyModalPost, setStoryModalPost] = useState<BlogPost | null>(null);
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  const { posts, likePost } = useBlogPosts(true);

  useEffect(() => {
    setMounted(true);
    setIsLocal(isLocalhost());

    try {
      const storedLikes = localStorage.getItem('nua_user_likes_v3');
      if (storedLikes) {
        setLikedPosts(JSON.parse(storedLikes));
      }
      const storedReblogs = localStorage.getItem('nua_user_reblogs_v3');
      if (storedReblogs) {
        setRebloggedPosts(JSON.parse(storedReblogs));
      }
    } catch {}

    // Cleanup do áudio quando desmontar
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLike = (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (likedPosts[postId]) {
      showToast('Você já favoritou esta nota ♡');
      return;
    }

    likePost(postId);
    const updated = { ...likedPosts, [postId]: true };
    setLikedPosts(updated);
    try {
      localStorage.setItem('nua_user_likes_v3', JSON.stringify(updated));
    } catch {}
    showToast('Adicionado às suas notas favoritas ♡');
  };

  const handleStartReblog = (e: React.MouseEvent, post: BlogPost) => {
    e.preventDefault();
    e.stopPropagation();
    setReblogModalPost(post);
    setReblogComment('');
  };

  const handleConfirmReblog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reblogModalPost) return;

    const updated = { ...rebloggedPosts, [reblogModalPost.id]: true };
    setRebloggedPosts(updated);
    try {
      localStorage.setItem('nua_user_reblogs_v3', JSON.stringify(updated));
    } catch {}

    const commentSnippet = reblogComment.trim()
      ? ` com o comentário: "${reblogComment.trim().substring(0, 28)}..."`
      : '';
    showToast(`🔁 Reblogado no seu dashboard imaginário${commentSnippet} ♡`);
    setReblogModalPost(null);
  };

  const handleCopyPermalink = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/blog/${slug}`;
      navigator.clipboard.writeText(url);
      showToast('🔗 Permalink copiado para a área de transferência!');
    }
  };

  // Áudio Play/Pause funcional
  const handleToggleAudio = (postId: string, audioUrl?: string) => {
    const src = audioUrl || '/audio/after-dark.wav';

    if (playingAudioId === postId) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioId(null);
      showToast('Música pausada.');
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(src);
    audioRef.current = audio;
    audio.play().catch((err) => {
      console.warn('Playback error:', err);
      showToast('Erro ao iniciar áudio. Verifique se o arquivo está disponível.');
    });

    audio.ontimeupdate = () => {
      if (audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        setAudioProgress(pct);
        const mins = Math.floor(audio.currentTime / 60);
        const secs = Math.floor(audio.currentTime % 60);
        setCurrentTimeFormatted(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };

    audio.onended = () => {
      setPlayingAudioId(null);
      setAudioProgress(0);
    };

    setPlayingAudioId(postId);
    showToast('♫ Reproduzindo áudio analógico...');
  };

  // Envio de Ask real (conectado à store e ao Admin)
  const handleSendAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestion.trim()) return;

    submitAsk(askQuestion.trim(), askerName.trim() || 'Anônimo', isAnonymous);

    setAskSent(true);
    setTimeout(() => {
      setAskSent(false);
      setAskQuestion('');
      setAskerName('');
      setAskModalOpen(false);
      showToast('Sua confissão foi enviada para o caderno secreto da Nua ♡');
    }, 1800);
  };

  // Filtragem dos posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (selectedTag) {
        const matchesTag = post.tags?.some(
          (t) => t.toLowerCase() === selectedTag.toLowerCase()
        );
        if (!matchesTag) return false;
      }

      if (selectedFilter === 'all') return true;

      // Filtro especial por tipo do Tumblr
      if (selectedFilter === 'photo') return post.postType === 'photo';
      if (selectedFilter === 'video') return post.postType === 'video';
      if (selectedFilter === 'quote') return post.postType === 'quote';
      if (selectedFilter === 'audio') return post.postType === 'audio';
      if (selectedFilter === 'ask') return post.postType === 'ask';
      if (selectedFilter === 'text') return post.postType === 'text';

      return post.category === selectedFilter;
    });
  }, [posts, selectedFilter, selectedTag]);

  const totalNotes = useMemo(() => {
    return posts.reduce((acc, p) => acc + (p.notesCount || 0), 0);
  }, [posts]);

  if (mounted && !isLocal) {
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-[#070509] text-[#f8f6fa] selection:bg-[#f4a7b9] selection:text-black font-sans relative overflow-x-hidden">
      {/* Textura sutil de grão de filme vintage 35mm */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay z-50 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
        aria-hidden="true"
      />

      {/* Toast flutuante retrô */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#160f1c]/95 border border-[#f4a7b9]/40 text-white px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs tracking-wider flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="w-2 h-2 rounded-full bg-[#f4a7b9] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner de Ambiente Localhost */}
      <div className="bg-[#120a17] border-b border-[#f4a7b9]/25 text-[#f4a7b9] text-[11px] font-mono py-1.5 px-4 text-center tracking-wider flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] animate-ping" />
        <span>[ MODO LOCALHOST ] — DIÁRIO CONFIDENCIAL & TUMBLR PRIVADO (2012–2015 NOSTALGIA)</span>
      </div>

      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-[#070509]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[74rem] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 text-[#f4a7b9]" />
            <span>Voltar ao Site</span>
          </Link>

          <Link href="/blog" className="flex items-center gap-2 select-none group">
            <span className="font-script text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#f4a7b9] via-[#fce4ec] to-white group-hover:opacity-90 transition-opacity">
              nuaborges.tumblr
            </span>
            <span className="text-[10px] font-mono text-[#f4a7b9]/80 px-2 py-0.5 rounded-full border border-[#f4a7b9]/30 bg-[#f4a7b9]/10">
              ♡ dark romance
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAskModalOpen(true)}
              className="text-xs px-3.5 py-1.5 rounded-full border border-[#f4a7b9]/30 bg-[#f4a7b9]/10 hover:bg-[#f4a7b9]/20 text-[#f4a7b9] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer font-mono"
            >
              <Send className="w-3 h-3" />
              <span className="hidden sm:inline">Ask Nua</span>
            </button>
            <Link
              href="/admin"
              className="text-xs px-3.5 py-1.5 rounded-full border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all font-mono"
            >
              Admin & Inboxes
            </Link>
          </div>
        </div>
      </nav>

      {/* Container Principal: Sidebar Fixa + Feed Central */}
      <div className="max-w-[74rem] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* ============================================================== */}
          {/* SIDEBAR ESTILO "CUSTOM THEME" DO TUMBLR                       */}
          {/* ============================================================== */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
            <div className="bg-[#0e0914]/95 border border-white/[0.08] rounded-2xl p-6 sm:p-7 backdrop-blur-xl relative overflow-hidden shadow-2xl">
              {/* Glow sensual e caloroso no topo */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#f4a7b9]/10 rounded-full blur-3xl pointer-events-none" />

              {/* Perfil */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4 group">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[#f4a7b9]/50 shadow-[0_0_25px_rgba(244,167,185,0.25)] relative">
                    <Image
                      src="/images/nua/hero/hero-2.jpg"
                      alt="Nua Borges"
                      fill
                      sizes="112px"
                      className="object-cover object-top filter contrast-105 brightness-95 group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0e0914]" title="Escrevendo na madrugada" />
                </div>

                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
                  Nua Borges
                </h1>
                <p className="text-xs font-mono text-[#f4a7b9] tracking-wider mb-3">
                  @nuaborges • educadora sexual
                </p>

                {/* Bio Retrô Tumblr */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-zinc-300 leading-relaxed italic mb-5">
                  &ldquo;24. sexóloga em formação. meu corpo é meu manifesto. deixa de vergonha.&rdquo;
                </div>

                {/* Ticker de Status Vintage com Relógio Real */}
                <div className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-black/40 border border-white/[0.04] text-[11px] font-mono text-zinc-400 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] animate-pulse" />
                  <span>🌙 sp 02:40 • paris 07:40 • ouvindo vinil</span>
                </div>
              </div>

              {/* Menu de Navegação Monospace (Estilo Theme Tumblr) */}
              <div className="space-y-1 text-xs font-mono border-t border-white/[0.06] pt-5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2 px-2">
                  // navegação
                </div>
                {CATEGORIES.map((cat) => {
                  const isActive =
                    (cat.value === 'all' && selectedFilter === 'all' && !selectedTag) ||
                    (cat.type && selectedFilter === cat.type) ||
                    (!cat.type && selectedFilter === cat.value && !selectedTag);

                  return (
                    <button
                      key={cat.label}
                      onClick={() => {
                        setSelectedTag(null);
                        if (cat.type) {
                          setSelectedFilter(cat.type);
                        } else {
                          setSelectedFilter(cat.value);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-[#f4a7b9]/15 text-[#f4a7b9] border border-[#f4a7b9]/30 font-medium'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {isActive && <span className="text-[10px] text-[#f4a7b9]">●</span>}
                    </button>
                  );
                })}
              </div>

              {/* Botão de Ask Me Anything */}
              <div className="mt-6 pt-5 border-t border-white/[0.06]">
                <button
                  onClick={() => setAskModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#f4a7b9]/20 to-[#e06287]/20 border border-[#f4a7b9]/40 hover:border-[#f4a7b9] text-[#fce4ec] text-xs font-mono tracking-wider transition-all shadow-[0_0_20px_rgba(244,167,185,0.15)] flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <Send className="w-3.5 h-3.5 text-[#f4a7b9] group-hover:rotate-12 transition-transform" />
                  <span>// ask me anything (anônimo)</span>
                </button>
              </div>

              {/* Mini Cassete / Player Funcional na Sidebar */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-b from-[#180e22] to-[#0c0712] border border-[#f4a7b9]/25 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleAudio('sidebar-track', '/audio/after-dark.wav')}
                    className="w-10 h-10 rounded-lg bg-black/80 border border-white/[0.08] flex items-center justify-center relative overflow-hidden flex-shrink-0 hover:border-[#f4a7b9] transition-colors cursor-pointer"
                    title={playingAudioId === 'sidebar-track' ? 'Pausar' : 'Ouvir After Dark'}
                  >
                    <Disc3
                      className={`w-6 h-6 text-[#f4a7b9] ${
                        playingAudioId === 'sidebar-track' ? 'animate-[spin_4s_linear_infinite]' : ''
                      }`}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                      <span>now playing</span>
                      {playingAudioId === 'sidebar-track' && (
                        <span className="text-emerald-400 font-bold animate-pulse">● live</span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-white truncate">
                      After Dark — Trilha Íntima
                    </div>
                    <div className="text-[10px] font-mono text-[#f4a7b9]/80 flex items-center justify-between">
                      <span>vinil 33 rpm</span>
                      <span>{playingAudioId === 'sidebar-track' ? currentTimeFormatted : '03:30'}</span>
                    </div>
                  </div>
                </div>

                {playingAudioId === 'sidebar-track' && (
                  <div className="mt-2.5 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full bg-[#f4a7b9] transition-all duration-300"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Estatísticas Retrô e Crédito do Tema */}
              <div className="mt-6 pt-4 border-t border-white/[0.06] space-y-2 text-[11px] font-mono text-zinc-500">
                <div className="flex items-center justify-between">
                  <span>{posts.length} posts</span>
                  <span>{totalNotes.toLocaleString('pt-BR')} notes</span>
                  <span>archive &apos;26</span>
                </div>
                <div className="text-[10px] text-zinc-600 text-center pt-1">
                  theme: dark romance v2.6 by nua
                </div>
              </div>
            </div>
          </aside>

          {/* ============================================================== */}
          {/* FEED CENTRAL DE POSTS POLIMÓRFICOS DO TUMBLR                  */}
          {/* ============================================================== */}
          <main className="lg:col-span-8 space-y-8">
            {/* Tag ativa (se houver filtro por tag) */}
            {selectedTag && (
              <div className="bg-[#120a17] border border-[#f4a7b9]/30 rounded-xl p-4 flex items-center justify-between text-xs font-mono text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="text-[#f4a7b9]">Filtrando por tag:</span>
                  <span className="text-white font-bold bg-[#f4a7b9]/20 px-2 py-0.5 rounded">
                    #{selectedTag}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar filtro</span>
                </button>
              </div>
            )}

            {filteredPosts.length === 0 ? (
              <div className="bg-[#0e0914]/80 border border-white/[0.08] rounded-2xl p-12 text-center backdrop-blur-xl">
                <p className="text-sm font-mono text-zinc-400 mb-3">
                  Nenhum post encontrado nesta categoria.
                </p>
                <button
                  onClick={() => {
                    setSelectedFilter('all');
                    setSelectedTag(null);
                  }}
                  className="text-xs font-mono text-[#f4a7b9] underline cursor-pointer"
                >
                  Voltar para todos os posts
                </button>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const isLiked = likedPosts[post.id];
                const isReblogged = rebloggedPosts[post.id];
                const currentNotes = (post.notesCount || 0) + (isLiked ? 1 : 0);

                return (
                  <article
                    key={post.id}
                    className="bg-[#0e0914]/90 border border-white/[0.08] hover:border-[#f4a7b9]/30 rounded-2xl backdrop-blur-xl transition-all duration-300 overflow-hidden shadow-2xl relative group"
                  >
                    {/* Top Bar do Post: Avatar + Handle + Tipo + Carimbo de Data */}
                    <div className="p-5 sm:p-6 pb-0 flex items-center justify-between border-b border-white/[0.04]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-[#f4a7b9]/40 relative">
                          <Image
                            src={post.author.avatar || '/images/nua/hero/hero-2.jpg'}
                            alt={post.author.name}
                            fill
                            sizes="36px"
                            className="object-cover object-top"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white tracking-wide">
                              {post.author.name}
                            </span>
                            <span className="text-[10px] font-mono text-[#f4a7b9] uppercase px-1.5 py-0.2 rounded bg-[#f4a7b9]/10 border border-[#f4a7b9]/25">
                              [ {post.postType} ]
                            </span>
                          </div>
                          {post.locationTime && (
                            <p className="text-[11px] font-mono text-zinc-500">
                              {post.locationTime}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Carimbo de Data Analógica */}
                      <div className="text-right">
                        <div className="text-[11px] font-mono text-[#f4a7b9]/90 tracking-wider">
                          &apos;{new Date(post.createdAt).toLocaleDateString('pt-BR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\//g, ' ')}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          {new Date(post.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* ============================================================== */}
                    {/* CONTEÚDO POLIMÓRFICO CONFORME O TIPO DO TUMBLR               */}
                    {/* ============================================================== */}
                    <div className="p-5 sm:p-8">
                      {/* -------------------------------------------------------- */}
                      {/* TIPO 1: TEXT POST                                        */}
                      {/* -------------------------------------------------------- */}
                      {post.postType === 'text' && (
                        <div className="space-y-4">
                          <h2 className="font-serif text-xl sm:text-2xl font-bold text-white leading-snug group-hover:text-[#fce4ec] transition-colors">
                            <Link href={`/blog/${post.slug}`}>
                              {post.title}
                            </Link>
                          </h2>

                          {post.subtitle && (
                            <p className="text-xs sm:text-sm text-zinc-400 italic border-l-2 border-[#f4a7b9]/40 pl-3">
                              {post.subtitle}
                            </p>
                          )}

                          <div className="prose prose-invert prose-p:text-zinc-300 prose-p:leading-relaxed text-sm pt-2">
                            {post.content.split('\n\n').map((paragraph, idx) => {
                              if (paragraph.startsWith('>')) {
                                return (
                                  <blockquote
                                    key={idx}
                                    className="border-l-2 border-[#f4a7b9] pl-4 my-4 italic text-[#fce4ec] text-sm bg-white/[0.02] p-3 rounded-r-lg"
                                  >
                                    {paragraph.replace(/^>\s*/, '').replace(/"/g, '')}
                                  </blockquote>
                                );
                              }
                              if (paragraph.startsWith('###')) {
                                return (
                                  <h3 key={idx} className="font-serif text-base font-bold text-[#f4a7b9] mt-4 mb-2">
                                    {paragraph.replace(/^###\s*/, '')}
                                  </h3>
                                );
                              }
                              return (
                                <p key={idx} className={idx === 0 ? "first-letter:text-3xl first-letter:font-serif first-letter:text-[#f4a7b9] first-letter:mr-1.5 first-letter:float-left" : ""}>
                                  {paragraph}
                                </p>
                              );
                            })}
                          </div>

                          {post.signOff && (
                            <div className="pt-4 text-right">
                              <span className="font-script text-2xl sm:text-3xl text-[#f4a7b9]">
                                {post.signOff}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* -------------------------------------------------------- */}
                      {/* TIPO 2: PHOTO / 35MM POLAROID                            */}
                      {/* -------------------------------------------------------- */}
                      {post.postType === 'photo' && (
                        <div className="space-y-5">
                          <div className="relative p-3 sm:p-4 bg-[#140e1b] rounded-xl border border-white/[0.08] shadow-inner group/photo">
                            {/* Washi Tape retrô decorativa no topo */}
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-white/20 backdrop-blur-sm border-t border-b border-white/30 rotate-1 z-10" />

                            <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full rounded-lg overflow-hidden bg-black">
                              <Image
                                src={post.coverUrl || '/images/nua/hero/hero-1.jpg'}
                                alt={post.title}
                                fill
                                sizes="(max-width: 768px) 100vw, 680px"
                                className="object-cover filter contrast-[1.08] brightness-95 group-hover/photo:scale-102 transition-transform duration-700"
                              />
                              <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/40 pointer-events-none" />

                              <div className="absolute bottom-3 right-3 text-[#ff7a29] font-mono text-xs font-bold tracking-widest drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] select-none">
                                &apos;26 09 28
                              </div>
                            </div>

                            {post.polaroidCaption && (
                              <div className="pt-3 text-center">
                                <p className="font-script text-xl sm:text-2xl text-zinc-300">
                                  {post.polaroidCaption}
                                </p>
                              </div>
                            )}
                          </div>

                          <h2 className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
                            <Link href={`/blog/${post.slug}`}>
                              {post.title}
                            </Link>
                          </h2>

                          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                            {post.content}
                          </p>

                          {post.signOff && (
                            <div className="text-right">
                              <span className="font-script text-2xl text-[#f4a7b9]">
                                {post.signOff}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* -------------------------------------------------------- */}
                      {/* TIPO 3: VÍDEO POST (VHS / CINEMA ANALÓGICO)              */}
                      {/* -------------------------------------------------------- */}
                      {post.postType === 'video' && (
                        <div className="space-y-5">
                          {/* Player de Vídeo Retrô */}
                          <div className="relative rounded-2xl overflow-hidden bg-black border border-[#f4a7b9]/30 shadow-2xl group/video">
                            {/* Linhas de scanline estilo VHS vintage */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-40" />

                            <div className="relative aspect-video w-full">
                              {post.videoData?.videoUrl && playingVideoId === post.id ? (
                                <video
                                  src={post.videoData.videoUrl}
                                  controls
                                  autoPlay
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <>
                                  <Image
                                    src={post.videoData?.posterUrl || post.coverUrl || '/images/nua/hero/hero-1.jpg'}
                                    alt={post.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 680px"
                                    className="object-cover filter contrast-105 brightness-90 group-hover/video:scale-102 transition-transform duration-700"
                                  />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <button
                                      onClick={() => setPlayingVideoId(post.id)}
                                      className="w-16 h-16 rounded-full bg-[#f4a7b9] hover:bg-[#ffb6c7] text-black flex items-center justify-center shadow-[0_0_30px_rgba(244,167,185,0.6)] cursor-pointer hover:scale-110 transition-transform group-hover/video:scale-105"
                                      title="Assistir clipe"
                                    >
                                      <Play className="w-7 h-7 fill-black ml-1" />
                                    </button>
                                  </div>
                                </>
                              )}

                              {/* Badges Retrô sobre o vídeo */}
                              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                                <span className="bg-red-600/90 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  REC • VHS
                                </span>
                                <span className="bg-black/70 text-zinc-300 font-mono text-[10px] px-2 py-0.5 rounded">
                                  {post.videoData?.resolution || 'VHS 35mm • 24fps'}
                                </span>
                              </div>

                              <div className="absolute bottom-3 right-3 z-20 bg-black/80 text-[#ff7a29] font-mono text-xs px-2 py-0.5 rounded font-bold">
                                {post.videoData?.duration || '01:24'}
                              </div>
                            </div>
                          </div>

                          <h2 className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
                            <Link href={`/blog/${post.slug}`}>
                              {post.title}
                            </Link>
                          </h2>

                          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                            {post.content}
                          </p>

                          {post.signOff && (
                            <div className="text-right">
                              <span className="font-script text-2xl text-[#f4a7b9]">
                                {post.signOff}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* -------------------------------------------------------- */}
                      {/* TIPO 4: QUOTE POST                                       */}
                      {/* -------------------------------------------------------- */}
                      {post.postType === 'quote' && (
                        <div className="py-4 px-2 sm:px-6 relative">
                          <Quote className="w-12 h-12 text-[#f4a7b9]/25 absolute -top-2 -left-2" />
                          <blockquote className="font-serif italic text-xl sm:text-2xl sm:leading-relaxed text-white relative z-10">
                            &ldquo;{post.quoteData?.quote || post.content}&rdquo;
                          </blockquote>
                          <div className="mt-4 pt-4 border-t border-white/[0.06] text-right">
                            <cite className="not-italic text-xs font-mono text-[#f4a7b9] tracking-wider">
                              — {post.quoteData?.source || post.author.name}
                            </cite>
                          </div>
                        </div>
                      )}

                      {/* -------------------------------------------------------- */}
                      {/* TIPO 5: AUDIO POST (PLAYER FUNCIONAL DE VERDADE)         */}
                      {/* -------------------------------------------------------- */}
                      {post.postType === 'audio' && (
                        <div className="space-y-5">
                          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#170e22] via-[#100918] to-[#170e22] border border-[#f4a7b9]/30 relative overflow-hidden shadow-xl">
                            <div className="flex items-center gap-4 sm:gap-5">
                              {/* Vinil Girando */}
                              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/90 border-2 border-white/[0.1] shadow-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                                <Image
                                  src={post.audioData?.albumArt || post.coverUrl || '/images/nua/gallery/gallery-2.png'}
                                  alt="Album art"
                                  fill
                                  sizes="80px"
                                  className={`object-cover ${playingAudioId === post.id ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                                />
                                <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
                                <div className="w-5 h-5 rounded-full bg-[#170e22] border-2 border-[#f4a7b9] z-10" />
                              </div>

                              {/* Informações da Faixa */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Music className="w-3.5 h-3.5 text-[#f4a7b9]" />
                                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#f4a7b9]">
                                      audio post
                                    </span>
                                  </div>
                                  {playingAudioId === post.id && (
                                    <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                      <span>tocando agora ({currentTimeFormatted})</span>
                                    </div>
                                  )}
                                </div>

                                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                                  {post.audioData?.songTitle || 'Salvatore'}
                                </h3>
                                <p className="text-xs font-mono text-zinc-400 truncate">
                                  {post.audioData?.artist || 'Lana Del Rey'} • {post.audioData?.duration || '04:41'}
                                </p>

                                {/* Barra de progresso real */}
                                <div className="mt-3 flex items-center gap-3">
                                  <button
                                    onClick={() => handleToggleAudio(post.id, post.audioData?.audioUrl)}
                                    className="w-9 h-9 rounded-full bg-[#f4a7b9] hover:bg-[#ffb6c7] text-black flex items-center justify-center hover:scale-105 transition-transform cursor-pointer flex-shrink-0 shadow-[0_0_15px_rgba(244,167,185,0.4)]"
                                    title={playingAudioId === post.id ? 'Pausar' : 'Tocar faixa'}
                                  >
                                    {playingAudioId === post.id ? (
                                      <Pause className="w-4 h-4 fill-black" />
                                    ) : (
                                      <Play className="w-4 h-4 fill-black ml-0.5" />
                                    )}
                                  </button>

                                  <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden relative">
                                    <div
                                      className="h-full bg-gradient-to-r from-[#f4a7b9] to-[#e06287] rounded-full transition-all duration-200"
                                      style={{ width: `${playingAudioId === post.id ? audioProgress : 15}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <h2 className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
                            <Link href={`/blog/${post.slug}`}>
                              {post.title}
                            </Link>
                          </h2>

                          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                            {post.content}
                          </p>

                          {post.signOff && (
                            <div className="text-right">
                              <span className="font-script text-2xl text-[#f4a7b9]">
                                {post.signOff}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* -------------------------------------------------------- */}
                      {/* TIPO 6: ASK BOX / RESPOSTA DE PERGUNTA ANÔNIMA           */}
                      {/* -------------------------------------------------------- */}
                      {post.postType === 'ask' && (
                        <div className="space-y-5">
                          {/* Balão de Pergunta Clássico do Tumblr */}
                          <div className="relative p-4 sm:p-5 rounded-2xl bg-[#1b1422] border border-[#f4a7b9]/25 text-xs sm:text-sm text-zinc-200 shadow-md">
                            <div className="absolute -bottom-2 left-8 w-4 h-4 bg-[#1b1422] border-b border-r border-[#f4a7b9]/25 rotate-45" />

                            <div className="flex items-center gap-2 mb-2 text-[11px] font-mono text-[#f4a7b9]">
                              <span className="w-5 h-5 rounded-full bg-[#f4a7b9]/20 flex items-center justify-center font-bold text-[10px]">
                                ?
                              </span>
                              <span>{post.askData?.askerName || 'Anônimo'} perguntou:</span>
                            </div>

                            <p className="italic font-medium leading-relaxed text-white">
                              &ldquo;{post.askData?.question || post.subtitle}&rdquo;
                            </p>
                          </div>

                          {/* Resposta de Sexologia da Nua */}
                          <div className="pt-2 pl-4 sm:pl-6 border-l-2 border-[#f4a7b9]/40 space-y-3">
                            <div className="text-[11px] font-mono text-zinc-400">
                              {post.askData?.answeredAt || 'Respondido por Nua'}:
                            </div>

                            {/* Player de Resposta em Vídeo da Nua (se houver) */}
                            {post.videoData?.videoUrl && (
                              <div className="relative my-4 rounded-2xl overflow-hidden bg-black border border-[#f4a7b9]/30 shadow-2xl max-w-xs sm:max-w-sm group/askvideo">
                                {/* Scanlines retrô */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-30" />

                                <div className="relative aspect-[9/16] w-full bg-black">
                                  {playingVideoId === post.id ? (
                                    <video
                                      src={post.videoData.videoUrl}
                                      controls
                                      autoPlay
                                      playsInline
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <>
                                      <Image
                                        src={post.videoData?.posterUrl || post.coverUrl || '/images/nua/hero/hero-1.jpg'}
                                        alt={post.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 360px"
                                        className="object-cover filter contrast-105 brightness-90 group-hover/askvideo:scale-102 transition-transform duration-700"
                                      />
                                      <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center p-4 text-center">
                                        <button
                                          onClick={() => setPlayingVideoId(post.id)}
                                          className="w-16 h-16 rounded-full bg-[#f4a7b9] hover:bg-[#ffb6c7] text-black flex items-center justify-center shadow-[0_0_30px_rgba(244,167,185,0.6)] cursor-pointer hover:scale-110 transition-transform mb-3"
                                          title="Assistir resposta em vídeo"
                                        >
                                          <Play className="w-7 h-7 fill-black ml-1" />
                                        </button>
                                        <span className="text-[11px] font-mono font-bold text-white bg-black/75 px-3 py-1 rounded-full border border-white/20">
                                          Assistir Resposta em Vídeo (9:16)
                                        </span>
                                      </div>
                                    </>
                                  )}

                                  {/* Badge de Vídeo */}
                                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
                                    <span className="bg-red-600/90 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                      RESPOSTA • VÍDEO
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed space-y-3">
                              {post.content.split('\n\n').map((paragraph, idx) => (
                                <p key={idx}>{paragraph}</p>
                              ))}
                            </div>

                            {post.signOff && (
                              <div className="pt-2 text-right">
                                <span className="font-script text-2xl text-[#f4a7b9]">
                                  {post.signOff}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* -------------------------------------------------------- */}
                      {/* LACRE DE CERA VIP (UNDERGROUND ONLYFANS/PRIVACY)         */}
                      {/* -------------------------------------------------------- */}
                      {post.vipSeal?.enabled && (
                        <div className="mt-6 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#170a1a] via-[#100713] to-[#170a1a] border border-[#f4a7b9]/30 text-xs flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(244,167,185,0.08)]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#f4a7b9]/20 border border-[#f4a7b9] flex items-center justify-center text-[#f4a7b9] flex-shrink-0">
                              <Lock className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-serif font-bold text-sm text-white">
                                {post.vipSeal.title}
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-snug">
                                {post.vipSeal.description}
                              </p>
                            </div>
                          </div>
                          <a
                            href={post.vipSeal.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 rounded-full bg-[#f4a7b9] hover:bg-[#ffb6c7] text-black font-semibold text-xs tracking-wider transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-[0_0_15px_rgba(244,167,185,0.3)]"
                          >
                            <span>{post.vipSeal.buttonText}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* ============================================================== */}
                    {/* CASCATA DE TAGS NARRATIVAS (#RAMBLINGS)                       */}
                    {/* ============================================================== */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="px-5 sm:px-8 pb-4 flex flex-wrap gap-2 text-[11px] font-mono italic text-zinc-500">
                        {post.tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSelectedTag(tag)}
                            className="hover:text-[#f4a7b9] transition-colors cursor-pointer"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ============================================================== */}
                    {/* BARRA DE AÇÃO CLÁSSICA DO TUMBLR (NOTES, REBLOG, LIKE, SHARE) */}
                    {/* ============================================================== */}
                    <div className="px-5 sm:px-8 py-3.5 bg-black/40 border-t border-white/[0.04] flex items-center justify-between text-xs font-mono">
                      {/* Contador de Notes */}
                      <button
                        onClick={() => setActiveNotesPost(post)}
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 group"
                      >
                        <span className="group-hover:underline font-semibold text-white">
                          {currentNotes.toLocaleString('pt-BR')} notes
                        </span>
                      </button>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-3">
                        {/* Gerar Card para Instagram Stories */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setStoryModalPost(post);
                            setStoryModalOpen(true);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-[#f4a7b9] transition-colors cursor-pointer"
                          title="Gerar Card 9:16 para Instagram Stories"
                        >
                          <Instagram className="w-4 h-4" />
                        </button>

                        {/* Permalink */}
                        <button
                          onClick={(e) => handleCopyPermalink(e, post.slug)}
                          className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Copiar Permalink"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {/* Reblog */}
                        <button
                          onClick={(e) => handleStartReblog(e, post)}
                          className={`p-1.5 transition-colors cursor-pointer ${
                            isReblogged ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
                          }`}
                          title="Reblogar no dashboard"
                        >
                          <Repeat2 className="w-4 h-4" />
                        </button>

                        {/* Like Heart */}
                        <button
                          onClick={(e) => handleLike(e, post.id)}
                          className={`p-1.5 transition-all cursor-pointer flex items-center gap-1 ${
                            isLiked ? 'text-[#f4a7b9] scale-110' : 'text-zinc-400 hover:text-[#f4a7b9]'
                          }`}
                          title="Favoritar nota"
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#f4a7b9]' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </main>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: ASK ME ANYTHING (PERGUNTAS ANÔNIMAS DOS FÃS)           */}
      {/* ============================================================== */}
      {askModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120a18] border border-[#f4a7b9]/40 rounded-2xl max-w-lg w-full p-6 sm:p-7 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setAskModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#f4a7b9]/20 border border-[#f4a7b9] flex items-center justify-center text-[#f4a7b9]">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-white">
                  Pergunte à Nua (Ask Box)
                </h3>
                <p className="text-xs font-mono text-zinc-400">
                  Dúvidas sobre sexo, desejo, corpo ou vergonha.
                </p>
              </div>
            </div>

            {askSent ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-serif text-lg font-bold text-white">
                  Confissão enviada com carinho ♡
                </h4>
                <p className="text-xs font-mono text-zinc-300">
                  Sua pergunta foi entregue à caixa secreta da Nua. As respostas saem aqui no diário!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendAsk} className="space-y-4">
                <div>
                  <textarea
                    rows={4}
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    placeholder="O que você sempre quis saber ou desabafar sem julgamentos? Escreva livremente..."
                    className="w-full bg-black/50 border border-white/[0.1] focus:border-[#f4a7b9] rounded-xl p-3.5 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#f4a7b9] transition-all resize-none"
                    required
                  />
                </div>

                {!isAnonymous && (
                  <div>
                    <input
                      type="text"
                      value={askerName}
                      onChange={(e) => setAskerName(e.target.value)}
                      placeholder="Seu nome ou apelido..."
                      className="w-full bg-black/50 border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-zinc-700 text-[#f4a7b9] focus:ring-[#f4a7b9] bg-black/40"
                    />
                    <span>Perguntar anonimamente</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">100% confidencial</span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f4a7b9] to-[#e06287] hover:opacity-95 text-black font-semibold text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(244,167,185,0.3)] cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Enviar para a Nua</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REBLOG AUTÊNTICO COM COMENTÁRIO                         */}
      {/* ============================================================== */}
      {reblogModalPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120a18] border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setReblogModalPost(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-mono text-[#f4a7b9] mb-3">
              <Repeat2 className="w-4 h-4" />
              <span>Reblogar no seu Dashboard</span>
            </div>

            {/* Citação do post sendo reblogado */}
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.06] mb-4 text-xs font-mono text-zinc-400">
              <span className="text-white font-bold block mb-1">
                {reblogModalPost.author.name}:
              </span>
              <p className="line-clamp-2 italic font-serif">
                &ldquo;{reblogModalPost.title}&rdquo;
              </p>
            </div>

            <form onSubmit={handleConfirmReblog} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                  Adicionar seu comentário ao reblog (opcional):
                </label>
                <textarea
                  rows={3}
                  value={reblogComment}
                  onChange={(e) => setReblogComment(e.target.value)}
                  placeholder="Ex: precisava tanto ler isso hoje..."
                  className="w-full bg-black/50 border border-white/[0.1] focus:border-[#f4a7b9] rounded-xl p-3 text-xs text-white focus:outline-none resize-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#f4a7b9] hover:bg-[#ffb6c7] text-black font-semibold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(244,167,185,0.3)] cursor-pointer"
              >
                Confirmar Reblog 🔁
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: HISTÓRICO DE NOTES CLÁSSICO DO TUMBLR                   */}
      {/* ============================================================== */}
      {activeNotesPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120a18] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveNotesPost(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif font-bold text-base text-white mb-1">
              Atividade desta nota
            </h3>
            <p className="text-xs font-mono text-[#f4a7b9] mb-4">
              {((activeNotesPost.notesCount || 0) + (likedPosts[activeNotesPost.id] ? 1 : 0)).toLocaleString('pt-BR')} notes registradas
            </p>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 text-xs font-mono text-zinc-300">
              {likedPosts[activeNotesPost.id] && (
                <div className="flex items-center gap-2 text-[#f4a7b9] bg-[#f4a7b9]/10 p-2 rounded-lg">
                  <Heart className="w-3.5 h-3.5 fill-[#f4a7b9]" />
                  <span>Você curtiu esta nota agora mesmo.</span>
                </div>
              )}
              {rebloggedPosts[activeNotesPost.id] && (
                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-2 rounded-lg">
                  <Repeat2 className="w-3.5 h-3.5" />
                  <span>Você reblogou esta nota.</span>
                </div>
              )}
              <div className="flex items-center gap-2 p-1.5 border-b border-white/[0.04]">
                <Heart className="w-3 h-3 text-[#f4a7b9]" />
                <span>mariana_v curtiu esta nota</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 border-b border-white/[0.04]">
                <Repeat2 className="w-3 h-3 text-zinc-400" />
                <span>juliasilva reblogou e comentou: &ldquo;precisava ler isso hoje...&rdquo;</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 border-b border-white/[0.04]">
                <Heart className="w-3 h-3 text-[#f4a7b9]" />
                <span>carol.dark curtiu esta nota</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 border-b border-white/[0.04]">
                <Repeat2 className="w-3 h-3 text-zinc-400" />
                <span>marcelo_p reblogou esta nota</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 text-zinc-500 text-[10px]">
                <span>... e outras {(activeNotesPost.notesCount || 1000) - 4} pessoas interagiram com este post.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: GERADOR DE STORY 9:16 PARA INSTAGRAM                    */}
      {/* ============================================================== */}
      <StoryCardModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        post={storyModalPost}
      />
    </div>
  );
}
