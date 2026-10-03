'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  PenSquare,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  Flame,
  RotateCcw,
  BookOpen,
  Save,
  Headphones,
  MapPin,
  Heart,
  Repeat2,
  Music,
  Camera,
  Quote,
  Send,
  Lock,
  Video,
  Inbox,
  Check,
  MessageCircle,
  Play,
  Instagram,
} from 'lucide-react';
import { BlogPost, BlogCategory, TumblrPostType, SubmittedAsk } from '@/types/blog';
import { useBlogPosts, useSubmittedAsks } from '@/lib/blogStore';
import { ConfirmModal } from './ConfirmModal';
import { StoryCardModal } from '@/components/blog/StoryCardModal';
import { VideoAskRecorderModal } from './VideoAskRecorderModal';

const CATEGORIES: Exclude<BlogCategory, 'Todos'>[] = [
  'Confissões de Sexologia',
  'Diário Noturno',
  'Bastidores 35mm',
  'Pergunte à Nua (Asks)',
  'Trilhas & Áudios',
  'Vídeos & VHS',
];

const TUMBLR_POST_TYPES: { type: TumblrPostType; label: string; icon: any }[] = [
  { type: 'text', label: '📝 Texto', icon: PenSquare },
  { type: 'photo', label: '📷 Foto 35mm', icon: Camera },
  { type: 'video', label: '📹 Vídeo / VHS', icon: Video },
  { type: 'quote', label: '“ ” Citação', icon: Quote },
  { type: 'audio', label: '♫ Áudio / Vinil', icon: Music },
  { type: 'ask', label: '✉ Ask Box', icon: Send },
];

const PRESET_COVERS = [
  { label: 'Capa Paris (Hero 1)', url: '/images/nua/hero/hero-1.jpg' },
  { label: 'Retrato Íntimo (Hero 2)', url: '/images/nua/hero/hero-2.jpg' },
  { label: 'Sobre Mim (About)', url: '/images/nua/about/about.jpg' },
  { label: 'Lingerie Fina (Galeria 1)', url: '/images/nua/gallery/gallery-1.png' },
  { label: 'Chiaroscuro (Galeria 2)', url: '/images/nua/gallery/gallery-2.png' },
  { label: 'Sombras de Luz (Galeria 3)', url: '/images/nua/gallery/gallery-3.png' },
  { label: 'Veludo Negro (Galeria 4)', url: '/images/nua/gallery/gallery-4.png' },
];

const PRESET_AUDIOS = [
  { label: 'After Dark (Lana vibe)', url: '/audio/after-dark.wav' },
  { label: 'Veludo & Desejo (Ambient)', url: '/audio/veludo-desejo.wav' },
];

const PRESET_VIDEOS = [
  { label: 'Silhouette Noir (Paris)', url: 'https://assets.mixkit.co/videos/preview/mixkit-silhouette-of-a-woman-moving-in-a-dark-room-41974-large.mp4' },
  { label: 'Velas e Sombra (VHS)', url: 'https://assets.mixkit.co/videos/preview/mixkit-candle-lights-in-the-dark-42825-large.mp4' },
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function BlogEditor() {
  const { posts, savePost, deletePost, resetDefaults } = useBlogPosts(false);
  const { asks, deleteAsk, markAskAnswered } = useSubmittedAsks();

  const [activeTab, setActiveTab] = useState<'posts' | 'inbox' | 'edit'>('posts');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [currentAskId, setCurrentAskId] = useState<string | null>(null);
  const [rawTags, setRawTags] = useState<string>('');
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [askToDelete, setAskToDelete] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal de Story do Instagram (9:16)
  const [storyModalPost, setStoryModalPost] = useState<BlogPost | null>(null);
  const [storyModalAsk, setStoryModalAsk] = useState<SubmittedAsk | null>(null);
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  // Modal do Gravador de Vídeo para Asks
  const [videoRecorderAsk, setVideoRecorderAsk] = useState<SubmittedAsk | null>(null);
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const unreadAsksCount = asks.filter((a) => !a.answered).length;

  const handleStartCreate = (defaultType: TumblrPostType = 'text') => {
    const newPost: BlogPost = {
      id: 'post-' + Date.now(),
      slug: '',
      postType: defaultType,
      title: '',
      subtitle: '',
      category:
        defaultType === 'photo'
          ? 'Bastidores 35mm'
          : defaultType === 'video'
          ? 'Vídeos & VHS'
          : defaultType === 'audio'
          ? 'Trilhas & Áudios'
          : defaultType === 'ask'
          ? 'Pergunte à Nua (Asks)'
          : 'Confissões de Sexologia',
      coverUrl: '/images/nua/hero/hero-1.jpg',
      polaroidCaption: 'A madeira rangia a cada passo descalço.',
      locationTime: 'São Paulo, 02:40 AM • Madrugada fria',
      weatherMood: 'Velas acesas & jazz suave',
      signOff: 'Deixa de vergonha ♡',
      notesCount: 1420,
      tags: ['nuaborges', 'meu diario', 'deixa de vergonha', 'madrugada'],
      readingTimeMinutes: 3,
      published: true,
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        name: 'Nua Borges',
        avatar: '/images/nua/hero/hero-2.jpg',
        role: 'Educadora Sexual & Criadora',
      },
      content:
        'Escreva sua confissão da madrugada aqui...\n\n> "Uma citação marcante sobre o corpo e o desejo."\n\nDeixa de vergonha ♡',
      quoteData: {
        quote: 'A vergonha é a primeira fronteira que nos impõem desde meninas.',
        source: 'Nua Borges, Caderno de Paris',
      },
      audioData: {
        songTitle: 'Salvatore',
        artist: 'Lana Del Rey',
        albumArt: '/images/nua/gallery/gallery-2.png',
        duration: '04:41',
        audioUrl: '/audio/after-dark.wav',
      },
      videoData: {
        videoUrl: PRESET_VIDEOS[0].url,
        posterUrl: '/images/nua/hero/hero-1.jpg',
        caption: 'A fita magnética tem um calor que o digital nunca vai entender.',
        duration: '01:24',
        resolution: 'VHS 35mm • 24fps',
      },
      askData: {
        askerName: 'Anônimo',
        question: 'Nua, como você aprendeu a se despir da vergonha?',
        answeredAt: 'Respondido por Nua',
      },
      vipSeal: {
        enabled: true,
        title: 'Acesse as fotos e vídeos originais sem censura',
        description: 'No meu OnlyFans eu compartilho o ensaio completo em 4K e os bastidores.',
        buttonText: 'Acessar no OnlyFans',
        link: 'https://onlyfans.com/nuaborges',
      },
    };

    setEditingPost(newPost);
    setCurrentAskId(null);
    setRawTags(newPost.tags.join(', '));
    setActiveTab('edit');
  };

  const handleStartEdit = (post: BlogPost) => {
    setEditingPost({ ...post });
    setCurrentAskId(post.askData?.askId || null);
    setRawTags(post.tags ? post.tags.join(', ') : '');
    setActiveTab('edit');
  };

  // Responder uma pergunta vinda da Caixa de Asks
  const handleAnswerAsk = (ask: SubmittedAsk) => {
    const newPost: BlogPost = {
      id: 'post-' + Date.now(),
      slug: '',
      postType: 'ask',
      title: `Sobre a pergunta: "${ask.question.substring(0, 36)}..."`,
      subtitle: 'Uma dúvida real que recebi no Ask Box e resolvi acolher no diário.',
      category: 'Pergunte à Nua (Asks)',
      coverUrl: '/images/nua/hero/hero-2.jpg',
      locationTime: 'São Paulo, 01:15 AM • Respondendo Asks',
      weatherMood: 'Chá de camomila & velas',
      signOff: 'Deixa de vergonha ♡',
      notesCount: 2150,
      tags: ['ask nua', 'educacao sexual', 'perguntas dos fas', 'deixa de vergonha'],
      readingTimeMinutes: 3,
      published: true,
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        name: 'Nua Borges',
        avatar: '/images/nua/hero/hero-2.jpg',
        role: 'Educadora Sexual & Criadora',
      },
      askData: {
        askerName: ask.anonymous ? 'Anônimo' : ask.askerName,
        question: ask.question,
        answeredAt: 'Respondido por Nua',
        askId: ask.id,
      },
      content:
        'Acolha o que você está sentindo.\n\nEscreva aqui sua resposta com toda a empatia e profundidade de educadora sexual...\n\nDeixa de vergonha ♡',
    };

    setEditingPost(newPost);
    setCurrentAskId(ask.id);
    setRawTags(newPost.tags.join(', '));
    setActiveTab('edit');
    showToast(`Carregado ask de "${ask.askerName}" para resposta!`);
  };

  // Publicar resposta gravada em vídeo diretamente do estúdio
  const handlePublishVideoResponse = (data: {
    videoUrl: string;
    transcript: string;
    caption?: string;
  }) => {
    if (!videoRecorderAsk) return;

    const title = `Resposta em Vídeo: ${videoRecorderAsk.question.slice(0, 45)}...`;
    const newPost: BlogPost = {
      id: 'post-' + Date.now(),
      slug: generateSlug(`video-${videoRecorderAsk.question.slice(0, 30)}`),
      postType: 'ask',
      title,
      subtitle: 'Nua Borges responde em vídeo no diário secreto',
      category: 'Pergunte à Nua (Asks)',
      coverUrl: '/images/nua/hero/hero-1.jpg',
      content: data.transcript,
      locationTime: 'Estúdio Nua, Madrugada',
      weatherMood: 'Gravação íntima em vídeo vertical 9:16',
      signOff: 'Deixa de vergonha ♡',
      notesCount: 1680,
      tags: ['pergunte a nua', 'resposta em video', 'deixa de vergonha', 'sexologia'],
      readingTimeMinutes: 2,
      published: true,
      featured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        name: 'Nua Borges',
        avatar: '/images/nua/hero/hero-2.jpg',
        role: 'Educadora Sexual & Criadora',
      },
      videoData: {
        videoUrl: data.videoUrl,
        posterUrl: '/images/nua/hero/hero-1.jpg',
        caption: data.caption || `Resposta em vídeo para ${videoRecorderAsk.anonymous ? 'Anônimo' : videoRecorderAsk.askerName}`,
        duration: '01:15',
        resolution: '9:16 Vertical HD',
      },
      askData: {
        askerName: videoRecorderAsk.anonymous ? 'Anônimo' : videoRecorderAsk.askerName,
        question: videoRecorderAsk.question,
        answeredAt: 'Respondido por Nua em Vídeo',
        askId: videoRecorderAsk.id,
        responseFormat: 'video',
      },
      vipSeal: {
        enabled: true,
        title: 'Bastidores completos & Conversas sem censura',
        description: 'No OnlyFans você tem acesso aos ensaios na íntegra e conversa comigo no chat privado.',
        buttonText: 'Acessar no OnlyFans',
        link: 'https://onlyfans.com/nuaborges',
      },
    };

    savePost(newPost);
    markAskAnswered(videoRecorderAsk.id, newPost.id);
    showToast('Resposta em vídeo publicada com sucesso!');
    setVideoRecorderOpen(false);
    setVideoRecorderAsk(null);
    setActiveTab('posts');
  };

  const handleSaveCurrent = () => {
    if (!editingPost) return;

    if (!editingPost.title.trim()) {
      showToast('Por favor, informe ao menos um título ou frase para a nota.');
      return;
    }

    const generated = editingPost.slug.trim() || generateSlug(editingPost.title);
    const parsedTags = rawTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const postToSave: BlogPost = {
      ...editingPost,
      slug: generated,
      tags: parsedTags.length > 0 ? parsedTags : ['nuaborges', 'diario secreto'],
    };

    savePost(postToSave);

    // Se este post respondeu uma ask, marca a ask como respondida
    if (currentAskId) {
      markAskAnswered(currentAskId, postToSave.id);
    }

    showToast(`Nota "${postToSave.title}" salva e publicada no feed local ♡`);
    setActiveTab('posts');
    setEditingPost(null);
    setCurrentAskId(null);
  };

  const handleTogglePublished = (post: BlogPost) => {
    savePost({ ...post, published: !post.published });
    showToast(
      post.published
        ? `Nota "${post.title}" ocultada (rascunho).`
        : `Nota "${post.title}" publicada no feed!`
    );
  };

  const handleToggleFeatured = (post: BlogPost) => {
    savePost({ ...post, featured: !post.featured });
    showToast(
      post.featured
        ? `Nota "${post.title}" desfixada.`
        : `Nota "${post.title}" fixada no topo do feed!`
    );
  };

  const confirmDelete = () => {
    if (postToDelete) {
      deletePost(postToDelete.id);
      showToast(`Nota excluída do diário.`);
      setPostToDelete(null);
    }
  };

  const handleResetDefaults = () => {
    resetDefaults();
    setConfirmResetOpen(false);
    showToast('Diário restaurado com as notas originais do Tumblr!');
  };

  return (
    <div className="space-y-6">
      {/* Toast flutuante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#160f1c]/95 border border-[#f4a7b9]/40 text-white px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs tracking-wider flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="w-2 h-2 rounded-full bg-[#f4a7b9] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banner de Ambiente Localhost */}
      <div className="bg-[#120a17] border border-[#f4a7b9]/25 rounded-2xl p-4 text-xs font-mono text-[#fce4ec] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f4a7b9] animate-ping" />
          <span>
            <strong>PAINEL DO DIÁRIO TUMBLR (LOCALHOST):</strong> Suas notas, áudios, vídeos e asks estão 100% isolados de produção.
          </span>
        </div>
        <Link
          href="/blog"
          target="_blank"
          className="text-[#f4a7b9] hover:underline flex items-center gap-1 shrink-0 font-medium"
        >
          <span>Abrir Feed Retrô</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Navegação Superior de Abas do Admin */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b090e]/80 border border-white/[0.08] p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('posts');
              setEditingPost(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'posts'
                ? 'bg-[#f4a7b9]/20 text-[#f4a7b9] border border-[#f4a7b9]/30 font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Notas Publicadas ({posts.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('inbox');
              setEditingPost(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'inbox'
                ? 'bg-[#f4a7b9]/20 text-[#f4a7b9] border border-[#f4a7b9]/30 font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Caixa de Asks</span>
            {unreadAsksCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#f4a7b9] text-black text-[10px] font-bold">
                {unreadAsksCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStartCreate('text')}
            className="px-4 py-2 rounded-xl bg-[#f4a7b9] hover:bg-[#ffb6c7] text-black text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(244,167,185,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Publicação</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: LISTAGEM DE NOTAS PUBLICADAS                             */}
      {/* ============================================================== */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          <div className="bg-[#0b090e]/80 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-script text-3xl text-[#f4a7b9] block leading-none mb-1">
                  nuaborges.tumblr
                </span>
                <h2 className="font-serif text-2xl text-white font-normal">
                  Gerenciar Notas & Formatos do Tumblr
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 max-w-xl">
                  Crie posts em qualquer um dos 6 formatos clássicos: Texto, Foto 35mm, Vídeo VHS, Citação, Áudio vinil e Resposta de Ask anônima.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-mono transition-all cursor-pointer"
                  title="Restaurar posts originais"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Restaurar Exemplos</span>
                </button>
              </div>
            </div>

            {/* Botões Rápidos por Formato Tumblr */}
            <div className="mt-6 pt-6 border-t border-white/[0.06] flex flex-wrap gap-2.5">
              <span className="text-xs font-mono text-zinc-500 self-center mr-2">
                Criar direto como:
              </span>
              {TUMBLR_POST_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => handleStartCreate(t.type)}
                  className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <t.icon className="w-3.5 h-3.5 text-[#f4a7b9]" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Métricas Rápidas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/[0.06]">
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-white/[0.05]">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
                  Total de Notas
                </span>
                <span className="font-serif text-2xl text-white font-normal mt-0.5 block">
                  {posts.length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-white/[0.05]">
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400/90 font-semibold block">
                  Publicadas
                </span>
                <span className="font-serif text-2xl text-emerald-400 font-normal mt-0.5 block">
                  {posts.filter((p) => p.published).length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-white/[0.05]">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#f4a7b9] font-semibold block">
                  Perguntas Pendentes
                </span>
                <span className="font-serif text-2xl text-[#f4a7b9] font-normal mt-0.5 block">
                  {unreadAsksCount}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-white/[0.05]">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#f4a7b9] font-semibold block">
                  Notes Totais
                </span>
                <span className="font-serif text-2xl text-[#f4a7b9] font-normal mt-0.5 block">
                  {posts.reduce((acc, p) => acc + (p.notesCount || 0), 0).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          {/* Lista de Notas */}
          <div className="bg-[#0b090e]/80 border border-white/[0.08] rounded-3xl overflow-hidden backdrop-blur-sm">
            {posts.length === 0 ? (
              <div className="text-center py-16 px-4">
                <BookOpen className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="font-serif text-lg text-white mb-1">Seu diário ainda está vazio</h3>
                <p className="text-zinc-500 text-xs max-w-sm mx-auto mb-5 font-mono">
                  Clique no botão abaixo para postar sua primeira nota ou restaure os exemplos nostálgicos.
                </p>
                <button
                  type="button"
                  onClick={() => handleStartCreate('text')}
                  className="px-4 py-2 rounded-xl bg-[#f4a7b9] text-zinc-950 text-xs font-semibold"
                >
                  Escrever Primeira Nota
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Miniatura ou ícone do tipo */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden relative border border-white/[0.1] bg-black/60 shrink-0 flex items-center justify-center">
                        {post.coverUrl ? (
                          <Image
                            src={post.coverUrl}
                            alt={post.title}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : post.postType === 'video' ? (
                          <Video className="w-6 h-6 text-[#f4a7b9]" />
                        ) : post.postType === 'audio' ? (
                          <Music className="w-6 h-6 text-[#f4a7b9]" />
                        ) : post.postType === 'ask' ? (
                          <Send className="w-6 h-6 text-[#f4a7b9]" />
                        ) : (
                          <Quote className="w-6 h-6 text-[#f4a7b9]" />
                        )}
                        <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] font-mono text-[#f4a7b9] px-1 uppercase">
                          {post.postType}
                        </span>
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f4a7b9]/15 text-[#f4a7b9] font-bold border border-[#f4a7b9]/30 uppercase">
                            [ {post.postType} ]
                          </span>
                          <span className="text-xs text-zinc-400 font-mono">
                            {post.category}
                          </span>
                          {post.featured && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                              ★ Fixado
                            </span>
                          )}
                          {!post.published && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-700/40 text-zinc-400 font-medium">
                              Rascunho
                            </span>
                          )}
                        </div>

                        <h3 className="font-serif text-base text-white font-normal truncate max-w-md">
                          {post.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-500">
                          <span>
                            &apos;{new Date(post.createdAt).toLocaleDateString('pt-BR', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\//g, ' ')}
                          </span>
                          <span>•</span>
                          <span>{(post.notesCount || 0).toLocaleString('pt-BR')} notes</span>
                          {post.tags && post.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="italic text-zinc-400 truncate max-w-[200px]">
                                #{post.tags.slice(0, 3).join(' #')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(post)}
                        className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                          post.featured
                            ? 'border-[#f4a7b9]/40 bg-[#f4a7b9]/15 text-[#f4a7b9]'
                            : 'border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white'
                        }`}
                        title={post.featured ? 'Remover dos destaques' : 'Definir como destaque'}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStoryModalPost(post);
                          setStoryModalAsk(null);
                          setStoryModalOpen(true);
                        }}
                        className="p-2 rounded-xl border border-[#f4a7b9]/30 bg-[#f4a7b9]/10 text-[#f4a7b9] hover:bg-[#f4a7b9]/20 hover:text-white transition-colors cursor-pointer"
                        title="Gerar Card 9:16 para Instagram Stories"
                      >
                        <Instagram className="w-4 h-4" />
                      </button>

                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        className="p-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        title="Ver nota no feed"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleStartEdit(post)}
                        className="px-3.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-white text-xs font-mono transition-colors cursor-pointer"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => setPostToDelete(post)}
                        className="p-2 rounded-xl border border-red-950/40 bg-red-950/20 text-red-400 hover:bg-red-900/40 transition-colors cursor-pointer"
                        title="Excluir nota"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: CAIXA DE ASKS RECEBIDOS (PERGUNTAS ANÔNIMAS DOS FÃS)    */}
      {/* ============================================================== */}
      {activeTab === 'inbox' && (
        <div className="space-y-6">
          <div className="bg-[#0b090e]/80 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-script text-3xl text-[#f4a7b9] block leading-none mb-1">
                  Caixa de Perguntas
                </span>
                <h2 className="font-serif text-2xl text-white font-normal">
                  Perguntas Anônimas Recebidas (Asks)
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 max-w-xl">
                  Aqui chegam as confissões e dúvidas que seus seguidores enviaram pelo botão &ldquo;Ask Me Anything&rdquo;. Clique em &ldquo;Responder esta Pergunta&rdquo; para criar um post automático.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.06] text-xs font-mono text-zinc-400">
                <span>Total: {asks.length} perguntas</span> •{' '}
                <span className="text-[#f4a7b9]">{unreadAsksCount} pendentes</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0b090e]/80 border border-white/[0.08] rounded-3xl overflow-hidden backdrop-blur-sm">
            {asks.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Inbox className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="font-serif text-lg text-white mb-1">Sua caixa de entrada está vazia</h3>
                <p className="text-zinc-500 text-xs max-w-sm mx-auto font-mono">
                  Quando alguém enviar uma pergunta no feed do blog, ela aparecerá aqui instantaneamente.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {asks.map((ask) => (
                  <div
                    key={ask.id}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-0.5 rounded bg-[#f4a7b9]/15 text-[#f4a7b9] font-bold">
                          {ask.anonymous ? 'Anônimo' : ask.askerName}
                        </span>
                        <span className="text-zinc-500">
                          {new Date(ask.createdAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(ask.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {ask.answered ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Respondida</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#f4a7b9]/20 text-[#f4a7b9] font-medium animate-pulse">
                            Aguardando resposta
                          </span>
                        )}
                      </div>

                      <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] text-sm text-zinc-200 italic font-serif leading-relaxed">
                        &ldquo;{ask.question}&rdquo;
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setStoryModalAsk(ask);
                          setStoryModalPost(null);
                          setStoryModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl border border-[#f4a7b9]/30 bg-[#f4a7b9]/10 text-[#f4a7b9] hover:bg-[#f4a7b9]/20 hover:text-white transition-all text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                        title="Gerar Card 9:16 para Stories"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Story</span>
                      </button>

                      {/* Responder em Vídeo */}
                      <button
                        type="button"
                        onClick={() => {
                          setVideoRecorderAsk(ask);
                          setVideoRecorderOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-[#f4a7b9] hover:opacity-95 text-white font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(244,167,185,0.35)] cursor-pointer flex items-center gap-1.5"
                        title="Gravar resposta em vídeo 9:16 ou subir arquivo"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Vídeo (9:16)</span>
                      </button>

                      <button
                        onClick={() => handleAnswerAsk(ask)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f4a7b9] to-[#e06287] hover:opacity-95 text-black font-semibold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(244,167,185,0.3)] cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        <span>Responder</span>
                      </button>

                      <button
                        onClick={() => deleteAsk(ask.id)}
                        className="p-2 rounded-xl border border-red-950/40 bg-red-950/20 text-red-400 hover:bg-red-900/40 transition-colors cursor-pointer"
                        title="Excluir pergunta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: FORMULÁRIO DO EDITOR                                     */}
      {/* ============================================================== */}
      {activeTab === 'edit' && editingPost && (
        <div className="space-y-6">
          <div className="bg-[#0b090e]/80 border border-white/[0.08] rounded-3xl p-6 sm:p-9 backdrop-blur-sm shadow-xl">
            {/* Barra Superior do Formulário */}
            <div className="flex items-center justify-between pb-6 border-b border-white/[0.06] mb-8">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('posts');
                  setEditingPost(null);
                  setCurrentAskId(null);
                }}
                className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#f4a7b9]" />
                <span>Voltar para listagem</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setStoryModalPost(editingPost);
                    setStoryModalAsk(null);
                    setStoryModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#f4a7b9]/30 bg-[#f4a7b9]/10 hover:bg-[#f4a7b9]/20 text-[#f4a7b9] hover:text-white text-xs font-mono transition-all cursor-pointer"
                  title="Gerar Card para Stories"
                >
                  <Instagram className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Gerar Story</span>
                </button>

                {editingPost.slug && (
                  <Link
                    href={`/blog/${editingPost.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 hover:text-white text-xs font-mono transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Prévia</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleSaveCurrent}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#f4a7b9] hover:bg-[#f6b8c7] text-zinc-950 font-semibold text-xs tracking-wide transition-all shadow-[0_2px_14px_rgba(244,167,185,0.25)] cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar no Diário</span>
                </button>
              </div>
            </div>

            {/* Seletor de Tipo Tumblr */}
            <div className="mb-8 p-4 rounded-2xl bg-black/40 border border-white/[0.06]">
              <label className="block text-zinc-400 text-[11px] font-mono uppercase tracking-wider mb-2.5">
                Formato de Post do Tumblr
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                {TUMBLR_POST_TYPES.map((t) => {
                  const isSelected = editingPost.postType === t.type;
                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setEditingPost({ ...editingPost, postType: t.type })}
                      className={`p-3 rounded-xl border text-xs font-mono transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-[#f4a7b9]/20 border-[#f4a7b9] text-[#f4a7b9] font-bold shadow-[0_0_15px_rgba(244,167,185,0.2)]'
                          : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <t.icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campos Principais */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-zinc-400 text-[11px] font-mono uppercase tracking-wider mb-1.5">
                    Título da Nota *
                  </label>
                  <input
                    type="text"
                    value={editingPost.title}
                    onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                    placeholder="Ex: Paris na calada da noite..."
                    className="w-full bg-zinc-900/60 border border-white/[0.08] focus:border-[#f4a7b9] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] font-mono uppercase tracking-wider mb-1.5">
                    Categoria do Diário
                  </label>
                  <select
                    value={editingPost.category}
                    onChange={(e) =>
                      setEditingPost({
                        ...editingPost,
                        category: e.target.value as Exclude<BlogCategory, 'Todos'>,
                      })
                    }
                    className="w-full bg-zinc-900/60 border border-white/[0.08] focus:border-[#f4a7b9] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-zinc-900 text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subtítulo / Lead */}
              <div>
                <label className="block text-zinc-400 text-[11px] font-mono uppercase tracking-wider mb-1.5">
                  Subtítulo / Lead Poético
                </label>
                <input
                  type="text"
                  value={editingPost.subtitle || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, subtitle: e.target.value })}
                  placeholder="Um pensamento introdutório ou desabafo..."
                  className="w-full bg-zinc-900/60 border border-white/[0.08] focus:border-[#f4a7b9] rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none"
                />
              </div>

              {/* ================= CAMPOS ESPECÍFICOS POR TIPO ================= */}

              {/* SE VÍDEO / VHS */}
              {editingPost.postType === 'video' && (
                <div className="p-5 rounded-2xl bg-black/40 border border-[#f4a7b9]/25 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#f4a7b9]">
                    <Video className="w-4 h-4" />
                    <span>Configurações do Post de Vídeo / Fita VHS</span>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                      URL do Vídeo (MP4 direto ou link de streaming)
                    </label>
                    <input
                      type="text"
                      value={editingPost.videoData?.videoUrl || ''}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          videoData: {
                            videoUrl: e.target.value,
                            posterUrl: editingPost.videoData?.posterUrl || editingPost.coverUrl,
                            caption: editingPost.videoData?.caption || '',
                            duration: editingPost.videoData?.duration || '01:30',
                            resolution: editingPost.videoData?.resolution || 'VHS 35mm • 24fps',
                          },
                        })
                      }
                      placeholder="https://assets.mixkit.co/... ou /videos/sample.mp4"
                      className="w-full bg-zinc-900/60 border border-white/[0.08] focus:border-[#f4a7b9] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-zinc-400">
                    <span>Exemplos rápidos:</span>
                    {PRESET_VIDEOS.map((pv) => (
                      <button
                        key={pv.label}
                        type="button"
                        onClick={() =>
                          setEditingPost({
                            ...editingPost,
                            videoData: {
                              ...editingPost.videoData,
                              videoUrl: pv.url,
                            },
                          })
                        }
                        className="px-2 py-0.5 rounded border border-white/[0.1] hover:border-[#f4a7b9] hover:text-[#f4a7b9] cursor-pointer"
                      >
                        {pv.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                        Resolução / Estilo
                      </label>
                      <input
                        type="text"
                        value={editingPost.videoData?.resolution || 'VHS 35mm • 24fps'}
                        onChange={(e) =>
                          setEditingPost({
                            ...editingPost,
                            videoData: {
                              videoUrl: editingPost.videoData?.videoUrl || '',
                              posterUrl: editingPost.videoData?.posterUrl,
                              caption: editingPost.videoData?.caption,
                              duration: editingPost.videoData?.duration || '01:30',
                              resolution: e.target.value,
                            },
                          })
                        }
                        placeholder="VHS 35mm • 24fps ou 4K 60fps"
                        className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                        Duração do Vídeo
                      </label>
                      <input
                        type="text"
                        value={editingPost.videoData?.duration || '01:30'}
                        onChange={(e) =>
                          setEditingPost({
                            ...editingPost,
                            videoData: {
                              videoUrl: editingPost.videoData?.videoUrl || '',
                              posterUrl: editingPost.videoData?.posterUrl,
                              caption: editingPost.videoData?.caption,
                              duration: e.target.value,
                              resolution: editingPost.videoData?.resolution || 'VHS 35mm • 24fps',
                            },
                          })
                        }
                        placeholder="01:30"
                        className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SE QUOTE */}
              {editingPost.postType === 'quote' && (
                <div className="p-5 rounded-2xl bg-black/40 border border-[#f4a7b9]/25 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#f4a7b9]">
                    <Quote className="w-4 h-4" />
                    <span>Configurações do Post de Citação</span>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                      Frase Marcante (Quote)
                    </label>
                    <textarea
                      rows={3}
                      value={editingPost.quoteData?.quote || ''}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          quoteData: {
                            quote: e.target.value,
                            source: editingPost.quoteData?.source || 'Nua Borges',
                          },
                        })
                      }
                      placeholder="A vergonha é a primeira fronteira que nos impõem..."
                      className="w-full bg-zinc-900/60 border border-white/[0.08] focus:border-[#f4a7b9] rounded-xl p-3 text-sm text-white focus:outline-none resize-none font-serif italic"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                      Fonte da Citação (Autor / Livro / Caderno)
                    </label>
                    <input
                      type="text"
                      value={editingPost.quoteData?.source || ''}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          quoteData: {
                            quote: editingPost.quoteData?.quote || '',
                            source: e.target.value,
                          },
                        })
                      }
                      placeholder="Nua Borges — Caderno de Paris"
                      className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* SE AUDIO */}
              {editingPost.postType === 'audio' && (
                <div className="p-5 rounded-2xl bg-black/40 border border-[#f4a7b9]/25 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#f4a7b9]">
                    <Music className="w-4 h-4" />
                    <span>Configurações do Player Retrô do Tumblr (Vinil / MP3)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                        Nome da Música
                      </label>
                      <input
                        type="text"
                        value={editingPost.audioData?.songTitle || ''}
                        onChange={(e) =>
                          setEditingPost({
                            ...editingPost,
                            audioData: {
                              songTitle: e.target.value,
                              artist: editingPost.audioData?.artist || '',
                              albumArt: editingPost.audioData?.albumArt || '',
                              duration: editingPost.audioData?.duration || '03:40',
                              audioUrl: editingPost.audioData?.audioUrl || '/audio/after-dark.wav',
                            },
                          })
                        }
                        placeholder="Salvatore"
                        className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                        Artista
                      </label>
                      <input
                        type="text"
                        value={editingPost.audioData?.artist || ''}
                        onChange={(e) =>
                          setEditingPost({
                            ...editingPost,
                            audioData: {
                              songTitle: editingPost.audioData?.songTitle || '',
                              artist: e.target.value,
                              albumArt: editingPost.audioData?.albumArt || '',
                              duration: editingPost.audioData?.duration || '03:40',
                              audioUrl: editingPost.audioData?.audioUrl || '/audio/after-dark.wav',
                            },
                          })
                        }
                        placeholder="Lana Del Rey"
                        className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                        Duração
                      </label>
                      <input
                        type="text"
                        value={editingPost.audioData?.duration || ''}
                        onChange={(e) =>
                          setEditingPost({
                            ...editingPost,
                            audioData: {
                              songTitle: editingPost.audioData?.songTitle || '',
                              artist: editingPost.audioData?.artist || '',
                              albumArt: editingPost.audioData?.albumArt || '',
                              duration: e.target.value,
                              audioUrl: editingPost.audioData?.audioUrl || '/audio/after-dark.wav',
                            },
                          })
                        }
                        placeholder="04:41"
                        className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                      Arquivo de Áudio / Trilha Sonora (Toca de verdade no feed!)
                    </label>
                    <input
                      type="text"
                      value={editingPost.audioData?.audioUrl || '/audio/after-dark.wav'}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          audioData: {
                            songTitle: editingPost.audioData?.songTitle || 'Salvatore',
                            artist: editingPost.audioData?.artist || 'Lana Del Rey',
                            albumArt: editingPost.audioData?.albumArt || '',
                            duration: editingPost.audioData?.duration || '04:41',
                            audioUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="/audio/after-dark.wav ou URL de MP3"
                      className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                    <div className="flex gap-2 mt-1.5">
                      {PRESET_AUDIOS.map((pa) => (
                        <button
                          key={pa.label}
                          type="button"
                          onClick={() =>
                            setEditingPost({
                              ...editingPost,
                              audioData: {
                                ...editingPost.audioData,
                                songTitle: editingPost.audioData?.songTitle || 'Trilha',
                                artist: editingPost.audioData?.artist || 'Nua Borges',
                                albumArt: editingPost.audioData?.albumArt || '',
                                duration: editingPost.audioData?.duration || '03:30',
                                audioUrl: pa.url,
                              },
                            })
                          }
                          className="text-[10px] font-mono text-[#f4a7b9] hover:underline"
                        >
                          Usar {pa.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SE ASK BOX */}
              {editingPost.postType === 'ask' && (
                <div className="p-5 rounded-2xl bg-black/40 border border-[#f4a7b9]/25 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#f4a7b9]">
                    <Send className="w-4 h-4" />
                    <span>Configurações da Pergunta Respondida</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                        Quem Perguntou
                      </label>
                      <input
                        type="text"
                        value={editingPost.askData?.askerName || 'Anônimo'}
                        onChange={(e) =>
                          setEditingPost({
                            ...editingPost,
                            askData: {
                              askerName: e.target.value,
                              question: editingPost.askData?.question || '',
                              answeredAt: editingPost.askData?.answeredAt || 'Respondido por Nua',
                            },
                          })
                        }
                        placeholder="Anônimo"
                        className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                        Etiqueta de Resposta
                      </label>
                      <input
                        type="text"
                        value={editingPost.askData?.answeredAt || 'Respondido por Nua'}
                        onChange={(e) =>
                          setEditingPost({
                            ...editingPost,
                            askData: {
                              askerName: editingPost.askData?.askerName || 'Anônimo',
                              question: editingPost.askData?.question || '',
                              answeredAt: e.target.value,
                            },
                          })
                        }
                        placeholder="Respondido por Nua"
                        className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] font-mono uppercase mb-1">
                      Pergunta Enviada
                    </label>
                    <textarea
                      rows={3}
                      value={editingPost.askData?.question || ''}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          askData: {
                            askerName: editingPost.askData?.askerName || 'Anônimo',
                            question: e.target.value,
                            answeredAt: editingPost.askData?.answeredAt || 'Respondido por Nua',
                          },
                        })
                      }
                      placeholder="Nua, como você começou a desarmar a vergonha na hora H?..."
                      className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl p-3 text-xs text-white focus:outline-none resize-none italic"
                    />
                  </div>

                  {/* Resposta em Vídeo Opcional */}
                  <div className="pt-3 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-zinc-400 text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-[#f4a7b9]" />
                        <span>Vídeo da Resposta (Opcional - formato 9:16)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoRecorderAsk({
                            id: currentAskId || 'manual-ask',
                            question: editingPost.askData?.question || editingPost.subtitle || 'Dúvida recebida',
                            askerName: editingPost.askData?.askerName || 'Anônimo',
                            anonymous: true,
                            createdAt: new Date().toISOString(),
                          });
                          setVideoRecorderOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#f4a7b9]/20 hover:bg-[#f4a7b9]/30 text-[#f4a7b9] text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        <span>{editingPost.videoData?.videoUrl ? 'Regravar Vídeo' : 'Gravar / Subir Vídeo'}</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      value={editingPost.videoData?.videoUrl || ''}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          videoData: {
                            videoUrl: e.target.value,
                            posterUrl: editingPost.videoData?.posterUrl || editingPost.coverUrl,
                            duration: editingPost.videoData?.duration || '01:15',
                            resolution: '9:16 Vertical HD',
                          },
                        })
                      }
                      placeholder="URL do vídeo (ou use o botão Gravar / Subir Vídeo acima)"
                      className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Foto / Polaroid */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.06] space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
                    Fotografia Analógica / Capa
                  </label>
                  <span className="text-[10px] font-mono text-[#f4a7b9]">
                    {editingPost.postType === 'photo' ? 'Obrigatória para 35mm' : 'Opcional'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {PRESET_COVERS.map((preset) => {
                    const isSelected = editingPost.coverUrl === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setEditingPost({ ...editingPost, coverUrl: preset.url })}
                        className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#f4a7b9] scale-102 shadow-[0_0_12px_rgba(244,167,185,0.4)]'
                            : 'border-white/[0.08] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <Image src={preset.url} alt={preset.label} fill sizes="100px" className="object-cover" />
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-zinc-500 text-[10px] font-mono uppercase mb-1">
                    Legenda Manuscrita da Polaroid (Abaixo da Foto)
                  </label>
                  <input
                    type="text"
                    value={editingPost.polaroidCaption || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, polaroidCaption: e.target.value })}
                    placeholder="Ex: A madeira rangia a cada passo descalço ('26 09 28)."
                    className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-serif italic"
                  />
                </div>
              </div>

              {/* Texto Principal / Conteúdo da Confissão */}
              <div>
                <label className="block text-zinc-400 text-[11px] font-mono uppercase tracking-wider mb-1.5">
                  Texto Principal / Confissão da Madrugada
                </label>
                <textarea
                  rows={8}
                  value={editingPost.content}
                  onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                  placeholder="Escreva livremente aqui..."
                  className="w-full bg-zinc-900/60 border border-white/[0.08] focus:border-[#f4a7b9] rounded-xl p-4 text-xs sm:text-sm text-zinc-200 focus:outline-none transition-colors font-mono leading-relaxed"
                />
              </div>

              {/* Cascata de Tags (#ramblings) */}
              <div>
                <label className="block text-zinc-400 text-[11px] font-mono uppercase tracking-wider mb-1.5">
                  Tags Narrativas do Tumblr (Separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={rawTags}
                  onChange={(e) => setRawTags(e.target.value)}
                  placeholder="nuaborges, paris 35mm, sexologia sem tabu, deixa de vergonha, madrugadas"
                  className="w-full bg-zinc-900/60 border border-white/[0.08] focus:border-[#f4a7b9] rounded-xl px-4 py-2.5 text-xs text-zinc-200 focus:outline-none font-mono italic"
                />
                <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                  No feed, viram as clássicas tags clicáveis do Tumblr (#tag #tag).
                </span>
              </div>

              {/* Metadados Analógicos: Local, Clima & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-black/40 border border-white/[0.06]">
                <div>
                  <label className="block text-zinc-500 text-[10px] font-mono uppercase mb-1">
                    Local e Hora Analógica
                  </label>
                  <input
                    type="text"
                    value={editingPost.locationTime || ''}
                    onChange={(e) => setEditingPost({ ...editingPost, locationTime: e.target.value })}
                    placeholder="Paris, 03:14 AM • Marais"
                    className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 text-[10px] font-mono uppercase mb-1">
                    Assinatura Final
                  </label>
                  <input
                    type="text"
                    value={editingPost.signOff || 'Deixa de vergonha ♡'}
                    onChange={(e) => setEditingPost({ ...editingPost, signOff: e.target.value })}
                    placeholder="Deixa de vergonha ♡"
                    className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-script text-lg"
                  />
                </div>

                <div>
                  <label className="block text-zinc-500 text-[10px] font-mono uppercase mb-1">
                    Contador de Notes Inicial
                  </label>
                  <input
                    type="number"
                    value={editingPost.notesCount || 1000}
                    onChange={(e) =>
                      setEditingPost({ ...editingPost, notesCount: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-zinc-900/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Checkboxes de Publicação e Destaque */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs font-mono text-zinc-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPost.published}
                    onChange={(e) => setEditingPost({ ...editingPost, published: e.target.checked })}
                    className="rounded border-zinc-700 text-[#f4a7b9] focus:ring-[#f4a7b9] bg-black/40"
                  />
                  <span>Publicado no feed local</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPost.featured}
                    onChange={(e) => setEditingPost({ ...editingPost, featured: e.target.checked })}
                    className="rounded border-zinc-700 text-[#f4a7b9] focus:ring-[#f4a7b9] bg-black/40"
                  />
                  <span>Fixar no topo do feed</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão de Nota */}
      {postToDelete && (
        <ConfirmModal
          isOpen={true}
          title="Excluir nota do diário?"
          description={`Tem certeza que deseja apagar a nota "${postToDelete.title}"? Esta ação removerá a nota do armazenamento local.`}
          confirmText="Sim, Excluir"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPostToDelete(null)}
        />
      )}

      {/* Modal de Restauração */}
      {confirmResetOpen && (
        <ConfirmModal
          isOpen={true}
          title="Restaurar notas de exemplo?"
          description="Isso redefinirá todas as notas locais para a coleção original com vídeos VHS, fotos 35mm, áudio vinil, citações e asks."
          confirmText="Restaurar Exemplos"
          cancelText="Cancelar"
          variant="info"
          onConfirm={handleResetDefaults}
          onCancel={() => setConfirmResetOpen(false)}
        />
      )}

      {/* Modal do Gerador de Stories do Instagram (9:16) */}
      <StoryCardModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        post={storyModalPost}
        ask={storyModalAsk}
      />

      {/* Modal do Gravador de Vídeo para Asks (com Stories 9:16) */}
      <VideoAskRecorderModal
        isOpen={videoRecorderOpen}
        onClose={() => {
          setVideoRecorderOpen(false);
          setVideoRecorderAsk(null);
        }}
        ask={videoRecorderAsk}
        onPublish={handlePublishVideoResponse}
      />
    </div>
  );
}
