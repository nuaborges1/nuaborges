'use client';

import { useState, useEffect, useCallback } from 'react';
import { BlogPost, BlogCategory, SubmittedAsk } from '@/types/blog';
import defaultPostsData from '@/data/blog-posts.json';

const BLOG_STORAGE_KEY = 'nua_diary_pages_v4';
const BLOG_CHANGE_EVENT = 'nua_diary_change_event';

const ASKS_STORAGE_KEY = 'nua_user_submitted_asks_v1';
const ASKS_CHANGE_EVENT = 'nua_asks_change_event';

const SEED_POSTS: BlogPost[] = defaultPostsData as BlogPost[];

const SEED_ASKS: SubmittedAsk[] = [
  {
    id: 'ask-seed-1',
    question: 'Nua, como você começou a desarmar a vergonha na hora H com alguém novo?',
    askerName: 'Anônimo',
    anonymous: true,
    createdAt: '2026-09-28T14:30:00.000Z',
    answered: true,
    answeredPostId: 'post-5',
  },
  {
    id: 'ask-seed-2',
    question: 'Você acha que a masturbação frequente pode atrapalhar a sensibilidade ou é só um mito moralista?',
    askerName: 'Anônimo',
    anonymous: true,
    createdAt: '2026-09-29T21:15:00.000Z',
    answered: false,
  },
  {
    id: 'ask-seed-3',
    question: 'Nua, como conversar com o parceiro sobre fantasias e fetiches sem medo de ser julgada como "estranha"?',
    askerName: 'Camila R.',
    anonymous: false,
    createdAt: '2026-09-30T01:10:00.000Z',
    answered: false,
  },
];

/**
 * Lê todos os posts gravados no localStorage ou faz fallback para os dados de seed.
 */
export function getAllBlogPosts(): BlogPost[] {
  if (typeof window === 'undefined') {
    return SEED_POSTS;
  }

  try {
    const raw = localStorage.getItem(BLOG_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(SEED_POSTS));
      return SEED_POSTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Se não tiver os novos formatos do Tumblr ou post de vídeo, atualiza com os novos dados
      const hasVideo = parsed.some((p: any) => p.postType === 'video');
      if (!parsed[0].postType || !parsed[0].locationTime || !hasVideo) {
        localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(SEED_POSTS));
        return SEED_POSTS;
      }
      return parsed;
    }
    return SEED_POSTS;
  } catch (err) {
    console.warn('[BlogStore] Falha ao ler posts locais:', err);
    return SEED_POSTS;
  }
}

/**
 * Retorna apenas posts com status 'published: true' ordenados por data de criação descrescente.
 */
export function getPublishedBlogPosts(): BlogPost[] {
  const all = getAllBlogPosts();
  return all
    .filter((post) => post.published)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Busca post específico pelo slug.
 */
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  const all = getAllBlogPosts();
  return all.find((post) => post.slug === slug);
}

/**
 * Salva (cria ou atualiza) um post no armazenamento local.
 */
export function saveBlogPost(post: BlogPost): void {
  if (typeof window === 'undefined') return;

  try {
    const all = getAllBlogPosts();
    const existingIndex = all.findIndex((p) => p.id === post.id);

    const now = new Date().toISOString();
    const updatedPost: BlogPost = {
      ...post,
      updatedAt: now,
    };

    let nextPosts: BlogPost[];
    if (existingIndex >= 0) {
      nextPosts = [...all];
      nextPosts[existingIndex] = updatedPost;
    } else {
      nextPosts = [updatedPost, ...all];
    }

    if (updatedPost.featured) {
      nextPosts = nextPosts.map((p) =>
        p.id === updatedPost.id ? p : { ...p, featured: false }
      );
    }

    localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(nextPosts));
    window.dispatchEvent(new CustomEvent(BLOG_CHANGE_EVENT));
  } catch (err) {
    console.error('[BlogStore] Erro ao salvar post:', err);
  }
}

/**
 * Incrementa notas/curtidas do post e persiste localmente.
 */
export function likeBlogPost(id: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const all = getAllBlogPosts();
    const idx = all.findIndex((p) => p.id === id);
    if (idx >= 0) {
      const currentNotes = all[idx].notesCount ?? all[idx].likesCount ?? 0;
      const nextNotes = currentNotes + 1;
      all[idx] = { ...all[idx], notesCount: nextNotes, likesCount: nextNotes };
      localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent(BLOG_CHANGE_EVENT));
      return nextNotes;
    }
  } catch (err) {
    console.error('[BlogStore] Erro ao curtir:', err);
  }
  return 0;
}

/**
 * Remove um post pelo ID.
 */
export function deleteBlogPost(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const all = getAllBlogPosts();
    const nextPosts = all.filter((p) => p.id !== id);
    localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(nextPosts));
    window.dispatchEvent(new CustomEvent(BLOG_CHANGE_EVENT));
  } catch (err) {
    console.error('[BlogStore] Erro ao deletar post:', err);
  }
}

/**
 * Restaura posts padrão.
 */
export function resetToDefaultBlogPosts(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(SEED_POSTS));
    window.dispatchEvent(new CustomEvent(BLOG_CHANGE_EVENT));
  } catch (err) {
    console.error('[BlogStore] Erro ao restaurar:', err);
  }
}

/* ============================================================== */
/* GESTÃO DE ASKS (PERGUNTAS ANÔNIMAS RECEBIDAS)                   */
/* ============================================================== */

export function getAllSubmittedAsks(): SubmittedAsk[] {
  if (typeof window === 'undefined') {
    return SEED_ASKS;
  }

  try {
    const raw = localStorage.getItem(ASKS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ASKS_STORAGE_KEY, JSON.stringify(SEED_ASKS));
      return SEED_ASKS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return SEED_ASKS;
  } catch (err) {
    console.warn('[BlogStore] Falha ao ler asks:', err);
    return SEED_ASKS;
  }
}

export function submitAsk(question: string, askerName: string = 'Anônimo', anonymous: boolean = true): SubmittedAsk {
  const newAsk: SubmittedAsk = {
    id: 'ask-' + Date.now(),
    question: question.trim(),
    askerName: anonymous ? 'Anônimo' : askerName.trim() || 'Anônimo',
    anonymous,
    createdAt: new Date().toISOString(),
    answered: false,
  };

  if (typeof window !== 'undefined') {
    try {
      const current = getAllSubmittedAsks();
      const updated = [newAsk, ...current];
      localStorage.setItem(ASKS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(ASKS_CHANGE_EVENT));
    } catch (err) {
      console.error('[BlogStore] Erro ao salvar ask:', err);
    }
  }

  return newAsk;
}

export function markAskAnswered(askId: string, answeredPostId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getAllSubmittedAsks();
    const updated = current.map((a) =>
      a.id === askId ? { ...a, answered: true, answeredPostId } : a
    );
    localStorage.setItem(ASKS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(ASKS_CHANGE_EVENT));
  } catch (err) {
    console.error('[BlogStore] Erro ao marcar ask como respondida:', err);
  }
}

export function deleteSubmittedAsk(askId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getAllSubmittedAsks();
    const updated = current.filter((a) => a.id !== askId);
    localStorage.setItem(ASKS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(ASKS_CHANGE_EVENT));
  } catch (err) {
    console.error('[BlogStore] Erro ao deletar ask:', err);
  }
}

/* ============================================================== */
/* HOOKS REATIVOS                                                 */
/* ============================================================== */

export function useBlogPosts(onlyPublished: boolean = true) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    const data = onlyPublished ? getPublishedBlogPosts() : getAllBlogPosts();
    setPosts(data);
    setLoading(false);
  }, [onlyPublished]);

  useEffect(() => {
    reload();

    const handleStorageChange = () => reload();
    window.addEventListener(BLOG_CHANGE_EVENT, handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(BLOG_CHANGE_EVENT, handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [reload]);

  return {
    posts,
    loading,
    reload,
    savePost: saveBlogPost,
    deletePost: deleteBlogPost,
    likePost: likeBlogPost,
    resetDefaults: resetToDefaultBlogPosts,
  };
}

export function useSubmittedAsks() {
  const [asks, setAsks] = useState<SubmittedAsk[]>([]);

  const reload = useCallback(() => {
    setAsks(getAllSubmittedAsks());
  }, []);

  useEffect(() => {
    reload();

    const handleAsksChange = () => reload();
    window.addEventListener(ASKS_CHANGE_EVENT, handleAsksChange);
    window.addEventListener('storage', handleAsksChange);

    return () => {
      window.removeEventListener(ASKS_CHANGE_EVENT, handleAsksChange);
      window.removeEventListener('storage', handleAsksChange);
    };
  }, [reload]);

  return {
    asks,
    submitAsk,
    markAskAnswered,
    deleteAsk: deleteSubmittedAsk,
    reload,
  };
}
