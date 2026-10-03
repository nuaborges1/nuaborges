'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Share2,
  Heart,
  Check,
  Headphones,
  MapPin,
  Sparkles,
  Repeat2,
  Music,
  Quote,
  Send,
  Lock,
  ExternalLink,
  Play,
  Pause,
  Disc3,
  Video,
  Instagram,
} from 'lucide-react';
import { BlogPost } from '@/types/blog';
import { getBlogPostBySlug, getPublishedBlogPosts, likeBlogPost } from '@/lib/blogStore';
import { isLocalhost } from '@/lib/envGuard';
import NotFound from '@/app/not-found';
import { StoryCardModal } from '@/components/blog/StoryCardModal';

interface BlogPostClientProps {
  slug: string;
  initialPost: BlogPost | null;
}

export function BlogPostClient({ slug, initialPost }: BlogPostClientProps) {
  const [mounted, setMounted] = useState(false);
  const [isLocal, setIsLocal] = useState(false);
  const [post, setPost] = useState<BlogPost | null>(initialPost);
  const [isLiked, setIsLiked] = useState(false);
  const [isReblogged, setIsReblogged] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Áudio real
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Vídeo
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  // Modal de Story do Instagram (9:16)
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsLocal(isLocalhost());

    const livePost = getBlogPostBySlug(slug);
    if (livePost) {
      setPost(livePost);
    }

    try {
      const storedLikes = localStorage.getItem('nua_user_likes_v3');
      if (storedLikes) {
        const parsed = JSON.parse(storedLikes);
        if (livePost && parsed[livePost.id]) {
          setIsLiked(true);
        }
      }
      const storedReblogs = localStorage.getItem('nua_user_reblogs_v3');
      if (storedReblogs) {
        const parsed = JSON.parse(storedReblogs);
        if (livePost && parsed[livePost.id]) {
          setIsReblogged(true);
        }
      }
    } catch {}

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [slug]);

  const allPosts = useMemo(() => getPublishedBlogPosts(), []);
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = currentIndex >= 0 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (mounted && !isLocal) {
    return <NotFound />;
  }

  if (mounted && !post) {
    return <NotFound />;
  }

  if (!post) {
    return null;
  }

  const handleLike = () => {
    if (isLiked) {
      showToast('Você já favoritou esta nota ♡');
      return;
    }
    const nextCount = likeBlogPost(post.id);
    setIsLiked(true);
    setPost((prev) => (prev ? { ...prev, notesCount: nextCount, likesCount: nextCount } : prev));

    try {
      const storedLikes = localStorage.getItem('nua_user_likes_v3');
      const parsed = storedLikes ? JSON.parse(storedLikes) : {};
      parsed[post.id] = true;
      localStorage.setItem('nua_user_likes_v3', JSON.stringify(parsed));
    } catch {}
    showToast('Adicionado às suas notas favoritas ♡');
  };

  const handleReblog = () => {
    const nextState = !isReblogged;
    setIsReblogged(nextState);
    try {
      const storedReblogs = localStorage.getItem('nua_user_reblogs_v3');
      const parsed = storedReblogs ? JSON.parse(storedReblogs) : {};
      parsed[post.id] = nextState;
      localStorage.setItem('nua_user_reblogs_v3', JSON.stringify(parsed));
    } catch {}

    if (nextState) {
      showToast(`🔁 Reblogado no seu dashboard imaginário ♡`);
    } else {
      showToast('Reblog desfeito.');
    }
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      showToast('🔗 Permalink copiado para a área de transferência!');
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleToggleAudio = () => {
    const src = post.audioData?.audioUrl || '/audio/after-dark.wav';

    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingAudio(false);
      showToast('Música pausada.');
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.duration) {
          setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      };
      audioRef.current.onended = () => {
        setIsPlayingAudio(false);
        setAudioProgress(0);
      };
    }

    audioRef.current.play().catch((err) => {
      console.warn('Audio play failed:', err);
      showToast('Não foi possível reproduzir a faixa de áudio.');
    });
    setIsPlayingAudio(true);
    showToast(`♫ Tocando ${post.audioData?.songTitle || 'trilha sonora'}`);
  };

  const currentNotes = (post.notesCount || 0) + (isLiked ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#070509] text-[#f8f6fa] selection:bg-[#f4a7b9] selection:text-black flex flex-col font-sans relative">
      {/* Toast flutuante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#160f1c]/95 border border-[#f4a7b9]/40 text-white px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs tracking-wider flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="w-2 h-2 rounded-full bg-[#f4a7b9] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner de Ambiente Localhost */}
      <div className="bg-[#120a17] border-b border-[#f4a7b9]/25 text-[#f4a7b9] text-[11px] font-mono py-1.5 px-4 text-center tracking-wider flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] animate-ping" />
        <span>[ MODO LOCALHOST ] — PERMALINK TUMBLR RETRÔ (ISOLADO DO PÚBLICO)</span>
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#070509]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 text-[#f4a7b9]" />
            <span>Voltar ao Feed</span>
          </Link>

          <Link href="/blog" className="flex items-center gap-2 select-none group">
            <span className="font-script text-2xl text-transparent bg-clip-text bg-gradient-to-r from-[#f4a7b9] via-[#fce4ec] to-white group-hover:opacity-90">
              nuaborges.tumblr
            </span>
            <span className="text-[10px] font-mono text-[#f4a7b9]/80 px-2 py-0.5 rounded-full border border-[#f4a7b9]/30 bg-[#f4a7b9]/10">
              [ {post.postType} ]
            </span>
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#f4a7b9]" />
                <span className="hidden sm:inline">Permalink</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* O POST EM DESTAQUE (PERMALINK TUMBLR VIEW) */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full flex-1">
        <article className="bg-[#0e0914]/90 border border-white/[0.08] rounded-2xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Header do Post: Autor + Data Analógica */}
          <div className="flex items-center justify-between pb-6 mb-8 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#f4a7b9]/40 relative">
                <Image
                  src={post.author.avatar || '/images/nua/hero/hero-2.jpg'}
                  alt={post.author.name}
                  fill
                  sizes="44px"
                  className="object-cover object-top"
                />
              </div>
              <div>
                <div className="text-sm font-bold text-white tracking-wide">
                  {post.author.name}
                </div>
                <div className="text-xs font-mono text-[#f4a7b9]">
                  @nuaborges • {post.category}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono text-[#f4a7b9] tracking-wider">
                &apos;{new Date(post.createdAt).toLocaleDateString('pt-BR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\//g, ' ')}
              </div>
              {post.locationTime && (
                <div className="text-[11px] font-mono text-zinc-500">
                  {post.locationTime}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* RENDERIZADOR POLIMÓRFICO CONFORME O TIPO                      */}
          {/* ============================================================== */}

          {/* FORMATO 1: TEXT */}
          {post.postType === 'text' && (
            <div className="space-y-6">
              <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white leading-tight">
                {post.title}
              </h1>

              {post.subtitle && (
                <p className="text-sm sm:text-base text-zinc-400 italic border-l-2 border-[#f4a7b9]/40 pl-4 py-1">
                  {post.subtitle}
                </p>
              )}

              <div className="prose prose-invert prose-p:text-zinc-300 prose-p:leading-relaxed text-sm sm:text-base pt-4 space-y-4">
                {post.content.split('\n\n').map((paragraph, idx) => {
                  if (paragraph.startsWith('>')) {
                    return (
                      <blockquote
                        key={idx}
                        className="border-l-3 border-[#f4a7b9] pl-5 my-6 italic text-[#fce4ec] text-base bg-white/[0.02] p-4 rounded-r-xl"
                      >
                        {paragraph.replace(/^>\s*/, '').replace(/"/g, '')}
                      </blockquote>
                    );
                  }
                  if (paragraph.startsWith('###')) {
                    return (
                      <h2 key={idx} className="font-serif text-xl sm:text-2xl font-bold text-[#f4a7b9] mt-8 mb-3">
                        {paragraph.replace(/^###\s*/, '')}
                      </h2>
                    );
                  }
                  return (
                    <p key={idx} className={idx === 0 ? "first-letter:text-4xl first-letter:font-serif first-letter:text-[#f4a7b9] first-letter:mr-2 first-letter:float-left" : ""}>
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {/* FORMATO 2: PHOTO / 35MM */}
          {post.postType === 'photo' && (
            <div className="space-y-6">
              <div className="relative p-3 sm:p-5 bg-[#140e1b] rounded-2xl border border-white/[0.08] shadow-2xl">
                <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full rounded-xl overflow-hidden bg-black">
                  <Image
                    src={post.coverUrl || '/images/nua/hero/hero-1.jpg'}
                    alt={post.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 800px"
                    className="object-cover filter contrast-[1.08] brightness-95"
                  />
                  <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/40 pointer-events-none" />
                  <div className="absolute bottom-4 right-4 text-[#ff7a29] font-mono text-sm font-bold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none">
                    &apos;26 09 28
                  </div>
                </div>

                {post.polaroidCaption && (
                  <div className="pt-4 text-center">
                    <p className="font-script text-2xl sm:text-3xl text-zinc-200">
                      {post.polaroidCaption}
                    </p>
                  </div>
                )}
              </div>

              <h1 className="font-serif text-xl sm:text-3xl font-bold text-white pt-2">
                {post.title}
              </h1>

              <div className="text-sm sm:text-base text-zinc-300 leading-relaxed space-y-4">
                {post.content.split('\n\n').map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </div>
          )}

          {/* FORMATO 3: VÍDEO / VHS */}
          {post.postType === 'video' && (
            <div className="space-y-6">
              <div className="relative rounded-2xl overflow-hidden bg-black border border-[#f4a7b9]/30 shadow-2xl">
                <div className="relative aspect-video w-full">
                  {post.videoData?.videoUrl && isPlayingVideo ? (
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
                        priority
                        sizes="(max-width: 1024px) 100vw, 800px"
                        className="object-cover filter contrast-105 brightness-90"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <button
                          onClick={() => setIsPlayingVideo(true)}
                          className="w-16 h-16 rounded-full bg-[#f4a7b9] hover:bg-[#ffb6c7] text-black flex items-center justify-center shadow-[0_0_30px_rgba(244,167,185,0.6)] cursor-pointer hover:scale-110 transition-transform"
                          title="Assistir clipe"
                        >
                          <Play className="w-7 h-7 fill-black ml-1" />
                        </button>
                      </div>
                    </>
                  )}

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

              <h1 className="font-serif text-xl sm:text-3xl font-bold text-white">
                {post.title}
              </h1>

              <div className="text-sm sm:text-base text-zinc-300 leading-relaxed space-y-4">
                {post.content.split('\n\n').map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </div>
          )}

          {/* FORMATO 4: QUOTE */}
          {post.postType === 'quote' && (
            <div className="py-6 px-2 sm:px-8 space-y-6">
              <Quote className="w-16 h-16 text-[#f4a7b9]/30" />
              <blockquote className="font-serif italic text-2xl sm:text-4xl leading-relaxed text-white">
                &ldquo;{post.quoteData?.quote || post.content}&rdquo;
              </blockquote>
              <div className="pt-6 border-t border-white/[0.08] text-right">
                <cite className="not-italic text-sm font-mono text-[#f4a7b9] tracking-wider">
                  — {post.quoteData?.source || post.author.name}
                </cite>
              </div>
            </div>
          )}

          {/* FORMATO 5: AUDIO */}
          {post.postType === 'audio' && (
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#170e22] via-[#100918] to-[#170e22] border border-[#f4a7b9]/30 shadow-xl">
                <div className="flex items-center gap-5">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/90 border-2 border-white/[0.1] shadow-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <Image
                      src={post.audioData?.albumArt || post.coverUrl || '/images/nua/gallery/gallery-2.png'}
                      alt="Album art"
                      fill
                      sizes="96px"
                      className={`object-cover ${isPlayingAudio ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                    />
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
                    <div className="w-6 h-6 rounded-full bg-[#170e22] border-2 border-[#f4a7b9] z-10" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Music className="w-4 h-4 text-[#f4a7b9]" />
                      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#f4a7b9]">
                        tumblr audio player
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                      {post.audioData?.songTitle || 'Salvatore'}
                    </h2>
                    <p className="text-xs sm:text-sm font-mono text-zinc-400 truncate">
                      {post.audioData?.artist || 'Lana Del Rey'} • {post.audioData?.duration || '04:41'}
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={handleToggleAudio}
                        className="w-10 h-10 rounded-full bg-[#f4a7b9] hover:bg-[#ffb6c7] text-black flex items-center justify-center hover:scale-105 transition-transform cursor-pointer flex-shrink-0 shadow-[0_0_15px_rgba(244,167,185,0.4)]"
                      >
                        {isPlayingAudio ? (
                          <Pause className="w-5 h-5 fill-black" />
                        ) : (
                          <Play className="w-5 h-5 fill-black ml-0.5" />
                        )}
                      </button>

                      <div className="flex-1 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#f4a7b9] to-[#e06287] rounded-full transition-all duration-300"
                          style={{ width: `${isPlayingAudio ? audioProgress : 20}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <h1 className="font-serif text-xl sm:text-3xl font-bold text-white">
                {post.title}
              </h1>

              <div className="text-sm sm:text-base text-zinc-300 leading-relaxed space-y-4">
                {post.content.split('\n\n').map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </div>
          )}

          {/* FORMATO 6: ASK BOX */}
          {post.postType === 'ask' && (
            <div className="space-y-6">
              <div className="relative p-5 sm:p-6 rounded-2xl bg-[#1b1422] border border-[#f4a7b9]/30 text-sm text-zinc-200 shadow-md">
                <div className="absolute -bottom-2 left-8 w-4 h-4 bg-[#1b1422] border-b border-r border-[#f4a7b9]/30 rotate-45" />
                <div className="flex items-center gap-2 mb-2 text-xs font-mono text-[#f4a7b9]">
                  <span className="w-5 h-5 rounded-full bg-[#f4a7b9]/20 flex items-center justify-center font-bold text-[10px]">
                    ?
                  </span>
                  <span>{post.askData?.askerName || 'Anônimo'} perguntou:</span>
                </div>
                <p className="italic font-medium leading-relaxed text-white text-base">
                  &ldquo;{post.askData?.question || post.subtitle}&rdquo;
                </p>
              </div>

              <div className="pt-4 pl-4 sm:pl-6 border-l-2 border-[#f4a7b9]/40 space-y-4">
                <div className="text-xs font-mono text-zinc-400">
                  {post.askData?.answeredAt || 'Respondido por Nua'}:
                </div>

                {/* Player de Resposta em Vídeo da Nua (se houver) */}
                {post.videoData?.videoUrl && (
                  <div className="relative my-4 rounded-2xl overflow-hidden bg-black border border-[#f4a7b9]/30 shadow-2xl max-w-xs sm:max-w-sm group/askvideo">
                    {/* Scanlines retrô */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none z-10 opacity-30" />

                    <div className="relative aspect-[9/16] w-full bg-black">
                      {isPlayingVideo ? (
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
                              onClick={() => setIsPlayingVideo(true)}
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

                <div className="text-sm sm:text-base text-zinc-200 leading-relaxed space-y-4">
                  {post.content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Assinatura Manuscrita */}
          {post.signOff && (
            <div className="pt-8 text-right select-none">
              <span className="font-script text-3xl sm:text-4xl text-[#f4a7b9] block">
                {post.signOff}
              </span>
            </div>
          )}

          {/* Cascata de Tags (#ramblings) */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-wrap gap-2 text-xs font-mono italic text-zinc-500">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href="/blog"
                  className="hover:text-[#f4a7b9] transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Barra de Ação Tumblr */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-white">
              {currentNotes.toLocaleString('pt-BR')} notes
            </span>

            <div className="flex items-center gap-3">
              {/* Gerar Card para Instagram Stories */}
              <button
                onClick={() => setStoryModalOpen(true)}
                className="p-2 text-zinc-400 hover:text-[#f4a7b9] transition-colors cursor-pointer"
                title="Gerar Card 9:16 para Instagram Stories"
              >
                <Instagram className="w-4 h-4" />
              </button>

              <button
                onClick={handleShare}
                className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Compartilhar"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleReblog}
                className={`p-2 transition-colors cursor-pointer ${
                  isReblogged ? 'text-emerald-400' : 'text-zinc-400 hover:text-white'
                }`}
                title="Reblogar"
              >
                <Repeat2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleLike}
                className={`p-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isLiked ? 'text-[#f4a7b9] scale-105' : 'text-zinc-400 hover:text-[#f4a7b9]'
                }`}
                title="Favoritar nota"
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#f4a7b9]' : ''}`} />
                <span>{isLiked ? 'Favoritado' : 'Favoritar'}</span>
              </button>
            </div>
          </div>
        </article>

        {/* Lacre VIP Secreto */}
        {post.vipSeal?.enabled && (
          <section className="my-12 rounded-2xl border border-[#f4a7b9]/30 bg-gradient-to-b from-[#181119] via-[#0e0a10] to-[#070508] p-8 text-center relative overflow-hidden shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#f4a7b9]/20 border-2 border-[#f4a7b9] mx-auto mb-3 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#f4a7b9]" />
            </div>
            <h3 className="font-serif text-2xl text-white font-bold mb-2">
              {post.vipSeal.title}
            </h3>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto mb-6">
              {post.vipSeal.description}
            </p>
            <a
              href={post.vipSeal.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#ffb6c7] text-black font-semibold text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(244,167,185,0.3)]"
            >
              <span>{post.vipSeal.buttonText}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </section>
        )}

        {/* Navegação Anterior / Próximo Post */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          {prevPost ? (
            <Link
              href={`/blog/${prevPost.slug}`}
              className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition-all text-left group"
            >
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                ← Post Anterior
              </span>
              <span className="font-serif text-sm text-white group-hover:text-[#f4a7b9] transition-colors line-clamp-1">
                {prevPost.title}
              </span>
            </Link>
          ) : <div />}

          {nextPost ? (
            <Link
              href={`/blog/${nextPost.slug}`}
              className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition-all text-right group"
            >
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                Próximo Post →
              </span>
              <span className="font-serif text-sm text-white group-hover:text-[#f4a7b9] transition-colors line-clamp-1">
                {nextPost.title}
              </span>
            </Link>
          ) : <div />}
        </div>
      </main>

      {/* Footer Retrô */}
      <footer className="border-t border-white/[0.06] py-8 text-center text-xs font-mono text-zinc-600">
        <span className="font-script text-2xl text-zinc-400 block mb-1">
          Deixa de vergonha ♡
        </span>
        <span>nuaborges.tumblr • diário secreto</span>
      </footer>

      {/* Modal Gerador de Story 9:16 para Instagram */}
      <StoryCardModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        post={post}
      />
    </div>
  );
}
