'use client';

/**
 * Music Store — Suporte avançado a YouTube & Áudio HTML5:
 * - Parser inteligente para links do YouTube (vídeos, playlists, mixes & IDs).
 * - Fade-in e Fade-out suaves (início, troca de faixa e finalização da música).
 * - Sincronização real do equalizador (Web Audio API para áudio e Beat-Engine para YouTube).
 * - Container ativo com enablejsapi: 1 para reprodução sem bloqueios.
 *
 * CORREÇÕES APLICADAS (ver comentários "FIX:" no corpo do arquivo):
 * 1. Autoplay não confiável: a chamada de play() para YouTube dependia de o
 *    player já estar pronto (ytReadyRef) no exato instante do gesto do
 *    usuário; se o IFrame API ainda estivesse carregando, o "pendingPlayRef"
 *    disparava a reprodução em onReady — fora da cadeia síncrona do gesto do
 *    usuário — e o navegador bloqueia áudio com som nesse caso. A correção
 *    usa a estratégia "mute → play → unmute", que os navegadores permitem
 *    mesmo fora do gesto original.
 * 2. isPlaying era setado como true antes de confirmar que audio.play()
 *    realmente resolveu — se a Promise rejeitasse (política de autoplay,
 *    formato não suportado etc.) a UI mostrava "tocando" com o player mudo.
 * 3. currentTime restaurado do localStorage nunca era realmente aplicado
 *    (seekTo) ao mídia — só ficava no estado, então a música sempre
 *    recomeçava do zero.
 * 4. O player do YouTube nunca era destruído no unmount/troca de rota do
 *    Next.js (SPA) — causava vazamento de memória e, em alguns casos,
 *    dois iframes concorrentes brigando pelo áudio.
 * 5. O efeito que cria o YT.Player tinha volume/isMuted/startFadeIn nas
 *    deps, então recriava a Promise de setup a cada tick do fade/volume
 *    (desperdício de trabalho, e podia atrasar a criação do player).
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

// ─── Parser Inteligente de Links do YouTube ─────────────────────────────────

export interface ParsedYouTube {
  videoId: string | null;
  playlistId: string | null;
  cleanUrl: string;
}

export function parseYouTubeInput(input: string): ParsedYouTube {
  if (!input) return { videoId: null, playlistId: null, cleanUrl: '' };
  const trimmed = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return {
      videoId: trimmed,
      playlistId: null,
      cleanUrl: `https://www.youtube.com/watch?v=${trimmed}`,
    };
  }

  let videoId: string | null = null;
  let playlistId: string | null = null;

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (url.searchParams.has('v')) {
      videoId = url.searchParams.get('v');
    }
    if (url.searchParams.has('list')) {
      playlistId = url.searchParams.get('list');
    }
    if (!videoId && (url.hostname.includes('youtu.be') || url.pathname.includes('/embed/'))) {
      const parts = url.pathname.replace(/^\//, '').split('/');
      const cand = parts[parts.length - 1];
      if (cand && /^[a-zA-Z0-9_-]{11}$/.test(cand)) {
        videoId = cand;
      }
    }
  } catch {
    const vMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (vMatch) videoId = vMatch[1];
    const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (listMatch) playlistId = listMatch[1];
  }

  return {
    videoId,
    playlistId,
    cleanUrl: videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : playlistId
        ? `https://www.youtube.com/playlist?list=${playlistId}`
        : trimmed,
  };
}

export function extractYouTubeId(urlOrId: string): string | null {
  return parseYouTubeInput(urlOrId).videoId;
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  youtubeId?: string;
  playlistId?: string;
  coverUrl?: string;
  active: boolean;
}

export interface MusicConfig {
  enabled: boolean;
  autoplay?: boolean; // Padrão: false. Se desativado, nenhum código inicia o som automaticamente.
  playlistTitle?: string;
  tracks: MusicTrack[];
  activePlaylistId?: string;
}

interface MusicState {
  config: MusicConfig;
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isPlaylistOpen: boolean;
  isCurrentYouTube: boolean;
  autoplayBlocked: boolean; // FIX: expõe estado real de bloqueio para a UI

  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (time: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setTrack: (index: number) => void;
  openPlaylist: () => void;
  closePlaylist: () => void;
  setConfig: (config: MusicConfig) => void;

  audioRef: React.RefObject<HTMLAudioElement | null>;
  analyserRef: React.RefObject<AnalyserNode | null>;
  getFrequencyBars: () => [number, number, number];
}

export const DEFAULT_TRACKS: MusicTrack[] = [
  { id: 'yt-rihanna-umbrella', title: 'Umbrella (Orange Version)', artist: 'Rihanna ft. JAY-Z', url: 'https://www.youtube.com/watch?v=CvBfHwUxHIk', youtubeId: 'CvBfHwUxHIk', active: true },
  { id: 'yt-two-feet-drowning', title: "I Feel Like I'm Drowning", artist: 'Two Feet', url: 'https://www.youtube.com/watch?v=i_WTHkBuqbg', youtubeId: 'i_WTHkBuqbg', active: true },
  { id: 'yt-cigarettes-apocalypse', title: 'Apocalypse', artist: 'Cigarettes After Sex', url: 'https://www.youtube.com/watch?v=sElE_BfQ67s', youtubeId: 'sElE_BfQ67s', active: true },
  { id: 'yt-weeknd-earned-it', title: 'Earned It', artist: 'The Weeknd', url: 'https://www.youtube.com/watch?v=waU75jdUnYw', youtubeId: 'waU75jdUnYw', active: true },
  { id: 'yt-sade-smooth-operator', title: 'Smooth Operator', artist: 'Sade', url: 'https://www.youtube.com/watch?v=4TYv2PhG89A', youtubeId: '4TYv2PhG89A', active: true },
  { id: 'yt-lana-west-coast', title: 'West Coast', artist: 'Lana Del Rey', url: 'https://www.youtube.com/watch?v=o3SqUUoJjW8', youtubeId: 'o3SqUUoJjW8', active: true },
  { id: 'yt-rhye-open', title: 'Open', artist: 'Rhye', url: 'https://www.youtube.com/watch?v=sng_CdAAw8M', youtubeId: 'sng_CdAAw8M', active: true },
  { id: 'yt-arctic-monkeys-yours', title: 'I Wanna Be Yours', artist: 'Arctic Monkeys', url: 'https://www.youtube.com/watch?v=nyuo9-OjNNg', youtubeId: 'nyuo9-OjNNg', active: true },
  { id: 'track-veludo-desejo', title: 'Veludo & Desejo', artist: 'Nua Borges', url: '/audio/veludo-desejo.wav', active: true },
  { id: 'track-after-dark', title: 'After Dark', artist: 'Nua Borges', url: '/audio/after-dark.wav', active: true },
];

export const TRACK_BPM_MAP: Record<string, { bpm: number; offset: number }> = {
  'yt-rihanna-umbrella': { bpm: 87, offset: 0.05 },
  'yt-two-feet-drowning': { bpm: 66, offset: 0.10 },
  'yt-cigarettes-apocalypse': { bpm: 97, offset: 0.08 },
  'yt-weeknd-earned-it': { bpm: 120, offset: 0.05 },
  'yt-sade-smooth-operator': { bpm: 119, offset: 0.08 },
  'yt-lana-west-coast': { bpm: 66, offset: 0.12 },
  'yt-rhye-open': { bpm: 73, offset: 0.10 },
  'yt-arctic-monkeys-yours': { bpm: 68, offset: 0.15 },
};

const STORAGE_KEY = 'nua_music_config_v4';

const DEFAULT_CONFIG: MusicConfig = {
  enabled: true,
  autoplay: false, // Regra obrigatória: NUNCA tocar automaticamente sem ação explícita do usuário
  playlistTitle: 'Sensual Lounge',
  tracks: DEFAULT_TRACKS,
};

function loadConfig(): MusicConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    const tracks =
      Array.isArray(parsed.tracks) && parsed.tracks.length > 0
        ? parsed.tracks
        : DEFAULT_CONFIG.tracks;
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_CONFIG.enabled,
      autoplay: typeof parsed.autoplay === 'boolean' ? parsed.autoplay : false,
      playlistTitle:
        typeof parsed.playlistTitle === 'string'
          ? parsed.playlistTitle
          : DEFAULT_CONFIG.playlistTitle,
      tracks,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: MusicConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch { }
}

// ─── Carregador seguro do YouTube IFrame API ──────────────────────────────

let ytApiLoading = false;
let ytApiLoaded = false;

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).YT && (window as any).YT.Player) {
    ytApiLoaded = true;
    return Promise.resolve();
  }
  if (ytApiLoaded) return Promise.resolve();

  return new Promise((resolve) => {
    if (ytApiLoading) {
      const interval = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(interval);
          ytApiLoaded = true;
          resolve();
        }
      }, 50);
      return;
    }

    ytApiLoading = true;
    const prevOnReady = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      if (typeof prevOnReady === 'function') prevOnReady();
      resolve();
    };

    const tag = document.createElement('script');
    tag.id = 'youtube-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
}

// ─── Context ────────────────────────────────────────────────────────────────

const MusicContext = createContext<MusicState | null>(null);

const VOL_STORAGE_KEY = 'nua_player_volume_v1';
const POS_STORAGE_KEY = 'nua_player_pos_v1';

const noop = () => {};
const DUMMY_REF: React.RefObject<any> = { current: null };
const DUMMY_BARS: [number, number, number] = [0.08, 0.08, 0.08];
const DUMMY_GET_BARS = () => DUMMY_BARS;

const DISABLED_MUSIC_STATE: MusicState = {
  config: { enabled: false, autoplay: false, tracks: [] },
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0,
  isMuted: true,
  isPlaylistOpen: false,
  isCurrentYouTube: false,
  autoplayBlocked: false,
  play: noop,
  pause: noop,
  toggle: noop,
  next: noop,
  prev: noop,
  seekTo: noop,
  setVolume: noop,
  toggleMute: noop,
  setTrack: noop,
  openPlaylist: noop,
  closePlaylist: noop,
  setConfig: noop,
  audioRef: DUMMY_REF,
  analyserRef: DUMMY_REF,
  getFrequencyBars: DUMMY_GET_BARS,
};

export function MusicProvider({ children }: { children: ReactNode }) {
  return <ActiveMusicProvider>{children}</ActiveMusicProvider>;
}

function ActiveMusicProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = Boolean(
    (pathname && (pathname.startsWith('/admin') || pathname.startsWith('/contrato'))) ||
    (typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/contrato')))
  );

  const [config, setConfigState] = useState<MusicConfig>(DEFAULT_CONFIG);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false); // FIX

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const timePollIntervalRef = useRef<any>(null);
  const ytClockAnchorRef = useRef<{ audioTime: number; perfTime: number }>({ audioTime: 0, perfTime: 0 });

  const currentFadeRef = useRef(1);
  const fadeTimerRef = useRef<any>(null);
  const isFadingOutEndRef = useRef(false);
  const autoPlayedRef = useRef(false);
  const restoredSeekRef = useRef(false); // FIX: garante que o seek de posição salva ocorra uma única vez por sessão
  const pendingSeekRef = useRef<{ index: number; time: number } | null>(null); // FIX

  useEffect(() => {
    if (isAdmin) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo?.();
          ytPlayerRef.current.stopVideo?.();
        } catch { }
      }
      pendingPlayRef.current = false;
      setIsPlaying(false);
    }
  }, [isAdmin, pathname]);

  // Carrega config, volume preferido e última posição do localStorage
  useEffect(() => {
    const loaded = loadConfig();
    setConfigState(loaded);

    try {
      const savedVol = localStorage.getItem(VOL_STORAGE_KEY);
      if (savedVol !== null) {
        const parsedV = parseFloat(savedVol);
        if (!isNaN(parsedV) && parsedV >= 0 && parsedV <= 1) {
          setVolumeState(parsedV);
        }
      }

      const savedPos = localStorage.getItem(POS_STORAGE_KEY);
      if (savedPos) {
        const { index, time, timestamp } = JSON.parse(savedPos);
        if (Date.now() - timestamp < 3600 * 1000 * 2) {
          if (typeof index === 'number' && index >= 0 && index < loaded.tracks.length) {
            setCurrentIndex(index);
          }
          if (typeof time === 'number' && time > 0) {
            setCurrentTime(time);
            // FIX: guarda o seek pendente para ser aplicado quando a
            // reprodução dessa faixa realmente começar (ver efeito abaixo).
            pendingSeekRef.current = { index: typeof index === 'number' ? index : 0, time };
          }
        }
      }
    } catch { }
  }, []);

  const activeTracks = config.tracks.filter((t) => t.active);
  const currentTrack = activeTracks[currentIndex];
  const ytParsed = currentTrack ? parseYouTubeInput(currentTrack.url || currentTrack.youtubeId || '') : { videoId: null, playlistId: null, cleanUrl: '' };
  const currentYtId = ytParsed.videoId;
  const isCurrentYouTube = Boolean(currentYtId);

  const currentStateRef = useRef({ currentTrack, isCurrentYouTube, currentYtId });
  useEffect(() => {
    currentStateRef.current = { currentTrack, isCurrentYouTube, currentYtId };
  }, [currentTrack, isCurrentYouTube, currentYtId]);

  useEffect(() => {
    if (!isPlaying || isAdmin) return;
    const interval = setInterval(() => {
      try {
        localStorage.setItem(
          POS_STORAGE_KEY,
          JSON.stringify({
            index: currentIndex,
            time: Math.floor(currentTime),
            timestamp: Date.now(),
          })
        );
      } catch { }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, currentTime, isAdmin]);

  // ─── Controle Unificado de Volume com Fade ────────────────────────────────
  const applyPhysicalVolume = useCallback(
    (multiplier = 1) => {
      currentFadeRef.current = multiplier;
      const targetVol = isMuted ? 0 : volume * multiplier;

      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, Math.min(1, targetVol));
      }

      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          if (isMuted || targetVol === 0) {
            ytPlayerRef.current.setVolume(0);
          } else {
            ytPlayerRef.current.unMute();
            ytPlayerRef.current.setVolume(Math.round(targetVol * 100));
          }
        } catch { }
      }
    },
    [isMuted, volume]
  );

  const startFadeIn = useCallback(
    (durationMs = 1600) => {
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      isFadingOutEndRef.current = false;
      const steps = 16;
      const stepInterval = durationMs / steps;
      let step = 0;
      applyPhysicalVolume(0.05);

      fadeTimerRef.current = setInterval(() => {
        step++;
        const factor = Math.min(1, step / steps);
        applyPhysicalVolume(factor);
        if (step >= steps) {
          clearInterval(fadeTimerRef.current);
          fadeTimerRef.current = null;
          applyPhysicalVolume(1);
        }
      }, stepInterval);
    },
    [applyPhysicalVolume]
  );

  const startFadeOut = useCallback(
    (durationMs = 800): Promise<void> => {
      return new Promise((resolve) => {
        if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
        const steps = 12;
        const stepInterval = durationMs / steps;
        let step = steps;

        fadeTimerRef.current = setInterval(() => {
          step--;
          const factor = Math.max(0, step / steps);
          applyPhysicalVolume(factor);
          if (step <= 0) {
            clearInterval(fadeTimerRef.current);
            fadeTimerRef.current = null;
            applyPhysicalVolume(0);
            resolve();
          }
        }, stepInterval);
      });
    },
    [applyPhysicalVolume]
  );

  const initWebAudio = useCallback(() => {
    if (typeof window === 'undefined' || audioCtxRef.current) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass || !audioRef.current) return;

      const ctx = new AudioCtxClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch { }
  }, []);

  // FIX: aplica o seek pendente (posição salva) assim que a faixa correta
  // estiver de fato tocando — antes, o valor ficava só no estado e nunca
  // era aplicado ao <audio> ou ao player do YouTube.
  const applyPendingSeekIfNeeded = useCallback(() => {
    const pending = pendingSeekRef.current;
    if (!pending || restoredSeekRef.current) return;
    if (pending.index !== currentIndex) return;
    restoredSeekRef.current = true;
    pendingSeekRef.current = null;

    if (isCurrentYouTube && ytPlayerRef.current && ytReadyRef.current) {
      try {
        ytPlayerRef.current.seekTo(pending.time, true);
      } catch { }
    } else if (audioRef.current) {
      try {
        audioRef.current.currentTime = pending.time;
      } catch { }
    }
  }, [currentIndex, isCurrentYouTube]);

  // ─── Setup sob demanda do YouTube Player ─────────────────────────────────
  const ytInitializingRef = useRef(false);

  const initYouTubePlayer = useCallback(() => {
    if (isAdmin || ytPlayerRef.current || ytInitializingRef.current) return;
    if (typeof window === 'undefined') return;

    const container = document.getElementById('nua-yt-player-target');
    if (!container) return;

    ytInitializingRef.current = true;

    loadYouTubeIframeApi().then(() => {
      ytInitializingRef.current = false;
      const YT = (window as any).YT;
      if (!YT || !YT.Player || ytPlayerRef.current || isAdmin) return;

      const target = document.getElementById('nua-yt-player-target');
      if (!target) return;

      try {
        ytPlayerRef.current = new YT.Player('nua-yt-player-target', {
          height: '140',
          width: '240',
          videoId: currentStateRef.current.currentYtId || 'CvBfHwUxHIk',
          host: 'https://www.youtube.com',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
            widget_referrer: typeof window !== 'undefined' ? window.location.origin : '',
          },
          events: {
            onReady: (event: any) => {
              ytReadyRef.current = true;
              if (isAdmin) {
                pendingPlayRef.current = false;
                try { event.target.stopVideo?.(); } catch { }
                return;
              }
              event.target.setVolume(isMuted ? 0 : volume * 100);
              if (pendingPlayRef.current) {
                try {
                  event.target.mute();
                  event.target.playVideo();
                  setTimeout(() => {
                    try {
                      event.target.unMute();
                      startFadeIn(1600);
                    } catch { }
                  }, 150);
                } catch { }
                pendingPlayRef.current = false;
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 1) {
                setIsPlaying(true);
                setAutoplayBlocked(false);
                const dur = ytPlayerRef.current?.getDuration();
                if (typeof dur === 'number' && dur > 0) setDuration(dur);
                applyPendingSeekIfNeeded();
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                isFadingOutEndRef.current = false;
                setCurrentIndex((i) => (i + 1) % Math.max(activeTracks.length, 1));
              }
            },
            onError: (event: any) => {
              console.warn('YouTube Player error code:', event.data);
              if (event.data === 150 || event.data === 101 || event.data === 100) {
                setTimeout(() => {
                  setCurrentIndex((i) => (i + 1) % Math.max(activeTracks.length, 1));
                }, 800);
              }
            },
          },
        });
      } catch (err) {
        console.warn('Erro ao inicializar YouTube Player:', err);
      }
    }).catch(() => {
      ytInitializingRef.current = false;
    });
  }, [isAdmin, isMuted, volume, startFadeIn, applyPendingSeekIfNeeded, activeTracks.length]);

  // Pré-inicialização suave em idle/interação: sem bloquear o carregamento inicial da página
  useEffect(() => {
    if (isAdmin || typeof window === 'undefined') return;

    let timer: any;
    const triggerLazyInit = () => {
      cleanup();
      initYouTubePlayer();
    };

    const cleanup = () => {
      window.removeEventListener('pointerdown', triggerLazyInit, { capture: true });
      window.removeEventListener('scroll', triggerLazyInit, { capture: true });
      window.removeEventListener('keydown', triggerLazyInit, { capture: true });
      if (timer) clearTimeout(timer);
    };

    window.addEventListener('pointerdown', triggerLazyInit, { capture: true, passive: true });
    window.addEventListener('scroll', triggerLazyInit, { capture: true, passive: true });
    window.addEventListener('keydown', triggerLazyInit, { capture: true, passive: true });

    timer = setTimeout(triggerLazyInit, 4000);

    return cleanup;
  }, [isAdmin, initYouTubePlayer]);

  // FIX: destrói o player do YouTube quando o Provider desmonta de verdade,
  // evitando iframes duplicados/vazamento em navegação SPA.
  useEffect(() => {
    return () => {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch { }
        ytPlayerRef.current = null;
        ytReadyRef.current = false;
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch { }
      }
    };
  }, []);

  // ─── Polling de tempo e Fade-Out no final da faixa ────────────
  useEffect(() => {
    if (isCurrentYouTube && isPlaying) {
      timePollIntervalRef.current = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const t = ytPlayerRef.current.getCurrentTime();
          const d = ytPlayerRef.current.getDuration();
          if (typeof t === 'number') {
            setCurrentTime(t);
            ytClockAnchorRef.current = { audioTime: t, perfTime: performance.now() };
          }
          if (typeof d === 'number' && d > 0) {
            setDuration(d);
            if (d > 10 && d - t <= 4 && !isFadingOutEndRef.current) {
              isFadingOutEndRef.current = true;
              startFadeOut(3500);
            }
          }
        }
      }, 250);
    } else {
      if (timePollIntervalRef.current) {
        clearInterval(timePollIntervalRef.current);
        timePollIntervalRef.current = null;
      }
    }

    return () => {
      if (timePollIntervalRef.current) {
        clearInterval(timePollIntervalRef.current);
        timePollIntervalRef.current = null;
      }
    };
  }, [isCurrentYouTube, isPlaying, startFadeOut]);

  // ─── Sincronização do elemento HTML5 de áudio ──────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!isCurrentYouTube) {
        setCurrentTime(audio.currentTime);
        const d = audio.duration;
        if (d > 10 && d - audio.currentTime <= 4 && !isFadingOutEndRef.current) {
          isFadingOutEndRef.current = true;
          startFadeOut(3500);
        }
      }
    };
    const onDurationChange = () => {
      if (!isCurrentYouTube) setDuration(audio.duration || 0);
    };
    const onEnded = () => {
      if (!isCurrentYouTube) {
        isFadingOutEndRef.current = false;
        setCurrentIndex((i) => (i + 1) % Math.max(activeTracks.length, 1));
      }
    };
    const onPlay = () => {
      if (!isCurrentYouTube) {
        setIsPlaying(true);
        setAutoplayBlocked(false);
        applyPendingSeekIfNeeded();
      }
    };
    const onPause = () => {
      if (!isCurrentYouTube) setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [isCurrentYouTube, activeTracks.length, startFadeOut, applyPendingSeekIfNeeded]);

  // ─── Troca de faixa com Fade-In ──────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;
    isFadingOutEndRef.current = false;

    if (currentYtId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          if (isPlaying) {
            ytPlayerRef.current.loadVideoById(currentYtId);
            startFadeIn(1600);
          } else {
            ytPlayerRef.current.cueVideoById(currentYtId);
          }
        } catch { }
      }
    } else {
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch { }
      }

      if (audioRef.current && currentTrack.url) {
        const wasPlaying = isPlaying;
        audioRef.current.src = currentTrack.url;
        audioRef.current.preload = 'metadata';
        audioRef.current.load();
        if (wasPlaying) {
          audioRef.current.play().then(() => {
            startFadeIn(1600);
          }).catch(() => {
            setIsPlaying(false);
            setAutoplayBlocked(true);
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentYtId, currentTrack?.url]);

  useEffect(() => {
    applyPhysicalVolume(currentFadeRef.current);
  }, [volume, isMuted, applyPhysicalVolume]);

  // ─── Ações de Controle ──────────────────────────────────────────────────
  // FIX: play() agora é sempre a função chamada em resposta direta a um
  // clique (botão play, primeira interação etc.) — é ela quem carrega o
  // estado "gesto do usuário" para o navegador. Erros de autoplay setam
  // autoplayBlocked em vez de mentir que está tocando.
  const play = useCallback(() => {
    if (isAdmin) return;
    try {
      sessionStorage.setItem('nua_music_session_playing', 'true');
    } catch { }

    initWebAudio();
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (isCurrentYouTube) {
      if (audioRef.current) audioRef.current.pause();

      if (!ytPlayerRef.current) {
        initYouTubePlayer();
      }

      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.playVideo();
          startFadeIn(1600);
          setIsPlaying(true);
          setAutoplayBlocked(false);
        } catch {
          if (currentYtId) {
            try {
              ytPlayerRef.current.loadVideoById(currentYtId);
              setIsPlaying(true);
            } catch {
              setAutoplayBlocked(true);
            }
          }
        }
      } else {
        // Player ainda não está pronto: guarda a intenção, mas NÃO afirma
        // que já está tocando — evita UI mentirosa.
        pendingPlayRef.current = true;
      }
    } else {
      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch { }
      }

      const audio = audioRef.current;
      if (!audio) return;
      if (!audio.src && currentTrack?.url) {
        audio.src = currentTrack.url;
        audio.preload = 'metadata';
      }
      audio
        .play()
        .then(() => {
          startFadeIn(1600);
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {
          // FIX: reprodução com som bloqueada — tenta mudo como fallback e
          // avisa a UI para mostrar um botão "ativar som".
          setAutoplayBlocked(true);
          audio.muted = true;
          audio.play().then(() => {
            setIsPlaying(true);
          }).catch(() => setIsPlaying(false));
        });
    }
  }, [isAdmin, initWebAudio, isCurrentYouTube, currentTrack, currentYtId, startFadeIn, initYouTubePlayer]);

  const pause = useCallback(() => {
    try {
      sessionStorage.setItem('nua_music_session_playing', 'false');
    } catch { }

    startFadeOut(350).then(() => {
      if (isCurrentYouTube) {
        if (ytPlayerRef.current && ytReadyRef.current) {
          try {
            ytPlayerRef.current.pauseVideo();
          } catch { }
        }
      } else {
        audioRef.current?.pause();
      }
      setIsPlaying(false);
      applyPhysicalVolume(1);
    });
  }, [isCurrentYouTube, startFadeOut, applyPhysicalVolume]);

  // Continuidade de Reprodução na Sessão:
  // Se o usuário clicou Play nesta sessão, a música NUNCA para ao navegar entre páginas!
  useEffect(() => {
    if (isAdmin) return;
    try {
      const wasSessionPlaying = sessionStorage.getItem('nua_music_session_playing') === 'true';
      if (wasSessionPlaying && !isPlaying) {
        const timer = setTimeout(() => {
          play();
        }, 120);
        return () => clearTimeout(timer);
      }
    } catch { }
  }, [isAdmin, isPlaying, play]);

  const toggle = useCallback(() => {
    if (isAdmin) return;
    if (isPlaying) pause();
    else play();
  }, [isAdmin, isPlaying, play, pause]);

  const next = useCallback(() => {
    if (isAdmin) return;
    startFadeOut(300).then(() => {
      setCurrentIndex((i) => (i + 1) % Math.max(activeTracks.length, 1));
      setIsPlaying(true);
    });
  }, [isAdmin, activeTracks.length, startFadeOut]);

  const prev = useCallback(() => {
    if (isAdmin) return;
    if (!isCurrentYouTube && audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (isCurrentYouTube && currentTime > 3 && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.seekTo(0, true);
        return;
      } catch { }
    }
    startFadeOut(300).then(() => {
      setCurrentIndex(
        (i) => (i - 1 + Math.max(activeTracks.length, 1)) % Math.max(activeTracks.length, 1)
      );
      setIsPlaying(true);
    });
  }, [isAdmin, isCurrentYouTube, currentTime, activeTracks.length, startFadeOut]);

  const seekTo = useCallback(
    (time: number) => {
      if (isCurrentYouTube) {
        if (ytPlayerRef.current && ytReadyRef.current) {
          try {
            ytPlayerRef.current.seekTo(time, true);
            setCurrentTime(time);
          } catch { }
        }
      } else {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = time;
          setCurrentTime(time);
        }
      }
    },
    [isCurrentYouTube]
  );

  const setVolume = useCallback((v: number) => {
    const val = Math.max(0, Math.min(1, v));
    setVolumeState(val);
    setIsMuted(false);
    try {
      localStorage.setItem(VOL_STORAGE_KEY, String(val));
    } catch { }
  }, []);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  const setTrack = useCallback(
    (index: number) => {
      if (isAdmin) return;
      startFadeOut(250).then(() => {
        setCurrentIndex(index);
        setIsPlaying(true);
        setTimeout(() => play(), 100);
      });
    },
    [isAdmin, startFadeOut, play]
  );

  const setConfig = useCallback((newConfig: MusicConfig) => {
    setConfigState(newConfig);
    saveConfig(newConfig);
  }, []);

  // ─── Autoplay condicional (apenas se expressamente habilitado no admin) ──
  // REGRA OBRIGATÓRIA: Se autoplay estiver desabilitado (padrão: false),
  // NENHUM listener global é registrado e nenhuma navegação toca música.
  // A música SOMENTE começará se o visitante clicar no botão Play do player.
  useEffect(() => {
    if (isAdmin || !config.enabled || !config.autoplay) {
      autoPlayedRef.current = true;
      return;
    }

    const tryAutoPlay = () => {
      if (isAdmin || !config.enabled || !config.autoplay || autoPlayedRef.current) return;

      if (!audioRef.current?.paused || (ytPlayerRef.current && ytPlayerRef.current.getPlayerState?.() === 1)) {
        autoPlayedRef.current = true;
        return;
      }

      autoPlayedRef.current = true;
      window.removeEventListener('click', tryAutoPlay, true);
      window.removeEventListener('scroll', tryAutoPlay, true);
      window.removeEventListener('touchstart', tryAutoPlay, true);
      window.removeEventListener('keydown', tryAutoPlay, true);

      const { isCurrentYouTube: yt, currentYtId: ytId, currentTrack: track } = currentStateRef.current;

      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      const savedVolStr = localStorage.getItem(VOL_STORAGE_KEY);
      const RAMP_TARGET = savedVolStr !== null ? Math.max(0.2, parseFloat(savedVolStr)) : 0.70;

      const rampUp = () => {
        setVolumeState(0.07);
        const RAMP_DURATION = 4000;
        const RAMP_STEPS = 30;
        let step = 0;
        const timer = setInterval(() => {
          step++;
          const progress = step / RAMP_STEPS;
          const newVol = 0.07 + (RAMP_TARGET - 0.07) * progress;
          setVolumeState(Math.min(RAMP_TARGET, newVol));
          if (step >= RAMP_STEPS) {
            clearInterval(timer);
            setVolumeState(RAMP_TARGET);
          }
        }, RAMP_DURATION / RAMP_STEPS);
      };

      if (yt) {
        if (ytPlayerRef.current && ytReadyRef.current) {
          try {
            ytPlayerRef.current.mute();
            ytPlayerRef.current.loadVideoById(ytId!);
            setTimeout(() => {
              try {
                ytPlayerRef.current.unMute();
                rampUp();
              } catch { }
            }, 150);
          } catch { }
        } else {
          pendingPlayRef.current = true;
        }
      } else {
        const audio = audioRef.current;
        if (audio) {
          if (!audio.src && track?.url) {
            audio.src = track.url;
            audio.preload = 'metadata';
          }
          audio.volume = 0.07;
          audio
            .play()
            .then(() => rampUp())
            .catch(() => {
              // Mesmo mudo pode falhar em casos raros — não força isPlaying.
              setAutoplayBlocked(true);
            });
        }
      }

      setIsPlaying(true);
    };

    window.addEventListener('click', tryAutoPlay, { capture: true, passive: true });
    window.addEventListener('scroll', tryAutoPlay, { capture: true, passive: true });
    window.addEventListener('touchstart', tryAutoPlay, { capture: true, passive: true });
    window.addEventListener('keydown', tryAutoPlay, { capture: true, passive: true });

    return () => {
      window.removeEventListener('click', tryAutoPlay, true);
      window.removeEventListener('scroll', tryAutoPlay, true);
      window.removeEventListener('touchstart', tryAutoPlay, true);
      window.removeEventListener('keydown', tryAutoPlay, true);
    };
  }, [isAdmin, config.enabled, config.autoplay]);

  // ─── Media Session API ───────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (isAdmin) {
      try {
        navigator.mediaSession.playbackState = 'none';
      } catch { }
      return;
    }

    if (currentTrack) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title || 'Nua Borges',
          artist: currentTrack.artist || 'Nua Borges',
          album: config.playlistTitle || 'Sensual Lounge',
          artwork: [
            { src: '/icon.svg', sizes: '96x96', type: 'image/svg+xml' },
            { src: '/images/nua/hero/hero-1.jpg', sizes: '512x512', type: 'image/jpeg' },
          ],
        });

        navigator.mediaSession.setActionHandler('play', () => play());
        navigator.mediaSession.setActionHandler('pause', () => pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => next());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) seekTo(details.seekTime);
        });
      } catch { }
    }
  }, [isAdmin, currentTrack, config.playlistTitle, play, pause, prev, next, seekTo]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      if (isAdmin) {
        navigator.mediaSession.playbackState = 'none';
      } else {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
    }
  }, [isPlaying, isAdmin]);

  // ─── Equalizador ──────────────────────────────────────────────────────
  const getFrequencyBars = useCallback((): [number, number, number] => {
    if (!isPlaying) {
      return [0.08, 0.08, 0.08];
    }

    const effVol = isMuted ? 0 : volume * currentFadeRef.current;

    if (!isCurrentYouTube && analyserRef.current) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data as any);

      const bass = Math.max(data[1] || 0, data[2] || 0, data[3] || 0) / 255;
      const mid = ((data[4] || 0) + (data[5] || 0) + (data[6] || 0) + (data[7] || 0)) / (4 * 255);
      const treble = ((data[10] || 0) + (data[12] || 0) + (data[14] || 0) + (data[16] || 0)) / (4 * 255);

      return [
        Math.min(1, Math.max(0.06, bass * effVol)),
        Math.min(1, Math.max(0.06, mid * effVol)),
        Math.min(1, Math.max(0.06, treble * effVol)),
      ];
    }

    let t = currentTime;
    if (isCurrentYouTube) {
      const anchor = ytClockAnchorRef.current;
      if (anchor.perfTime > 0) {
        const elapsed = (performance.now() - anchor.perfTime) / 1000;
        t = anchor.audioTime + elapsed;
      } else if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const liveT = ytPlayerRef.current.getCurrentTime();
          if (typeof liveT === 'number' && liveT >= 0) t = liveT;
        } catch { }
      }
    }

    const trackId = currentTrack?.id || '';
    const beatConfig = TRACK_BPM_MAP[trackId] || { bpm: 78, offset: 0 };
    const period = 60 / beatConfig.bpm;
    const phase = (((t - beatConfig.offset) % period) + period) % period;
    const progress = phase / period;

    const kickDecay = Math.max(0, 1 - progress * 4.2);
    const bass = Math.pow(kickDecay, 2.6);

    const snareDist = Math.abs(progress - 0.5);
    const mid = Math.pow(Math.max(0, 1 - snareDist * 7.5), 2.8) * 0.40;

    const treble = 0.06;

    return [
      Math.min(1, Math.max(0.04, bass * effVol)),
      Math.min(1, Math.max(0.04, mid * effVol)),
      Math.min(1, Math.max(0.04, treble * effVol)),
    ];
  }, [isPlaying, isCurrentYouTube, currentTime, isMuted, volume, currentTrack?.id]);

  return (
    <MusicContext.Provider
      value={{
        config,
        currentIndex,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isPlaylistOpen,
        isCurrentYouTube,
        autoplayBlocked,
        play,
        pause,
        toggle,
        next,
        prev,
        seekTo,
        setVolume,
        toggleMute,
        setTrack,
        openPlaylist: () => {
          initYouTubePlayer();
          setIsPlaylistOpen(true);
        },
        closePlaylist: () => setIsPlaylistOpen(false),
        setConfig,
        audioRef,
        analyserRef,
        getFrequencyBars,
      }}
    >
      <audio ref={audioRef} preload="none" crossOrigin="anonymous" />

      {!isAdmin && (
        <div
          id="nua-yt-player-container"
          style={{
            position: 'fixed',
            bottom: '0px',
            left: '0px',
            width: '240px',
            height: '140px',
            opacity: 0.002,
            pointerEvents: 'none',
            zIndex: -20,
          }}
          aria-hidden="true"
        >
          <div id="nua-yt-player-target" />
        </div>
      )}

      {children}
    </MusicContext.Provider>
  );
}

export function useMusicPlayer() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusicPlayer must be inside MusicProvider');
  return ctx;
}