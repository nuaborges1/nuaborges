'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  RotateCcw,
  Download,
  Check,
  Upload,
  Play,
  Pause,
  Square,
  Sparkles,
  Instagram,
  Send,
  Video,
  SwitchCamera,
  AlertCircle,
} from 'lucide-react';
import { SubmittedAsk } from '@/types/blog';

interface VideoAskRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  ask: SubmittedAsk | null;
  onPublish: (data: {
    videoUrl: string;
    transcript: string;
    caption?: string;
  }) => void;
}

export function VideoAskRecorderModal({
  isOpen,
  onClose,
  ask,
  onPublish,
}: VideoAskRecorderModalProps) {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Gravação
  const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'recorded'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // Upload
  const [uploadUrl, setUploadUrl] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState<string>('');

  // Texto de apoio / transcrição
  const [transcript, setTranscript] = useState('');
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);

  const videoStreamRef = useRef<HTMLVideoElement | null>(null);
  const previewPlaybackRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Iniciar câmera quando modal abrir em modo câmera
  useEffect(() => {
    if (isOpen && mode === 'camera' && recordingState !== 'recorded') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, mode, facingMode, recordingState]);

  // Limpeza de estado ao fechar
  const handleClose = () => {
    stopCamera();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setRecordingState('idle');
    setRecordedBlobUrl(null);
    setRecordedBlob(null);
    setUploadUrl('');
    setUploadFileName('');
    setTranscript('');
    onClose();
  };

  const startCamera = async () => {
    try {
      stopCamera();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoStreamRef.current) {
        videoStreamRef.current.srcObject = stream;
        videoStreamRef.current.play().catch(() => {});
      }
      setCameraPermission('granted');
    } catch (err) {
      console.warn('Câmera não disponível ou permissão negada:', err);
      setCameraPermission('denied');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.srcObject = null;
    }
  };

  // Alternar câmera frontal e traseira
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Iniciar contagem regressiva para gravar
  const handleStartCountdown = () => {
    setRecordingState('countdown');
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        startRecording();
      }
    }, 1000);
  };

  const startRecording = () => {
    if (!mediaStreamRef.current) return;

    recordedChunksRef.current = [];
    try {
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedBlobUrl(url);
        setRecordingState('recorded');
        stopCamera();
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Falha ao iniciar MediaRecorder:', err);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRetake = () => {
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
    }
    setRecordedBlob(null);
    setRecordedBlobUrl(null);
    setRecordingState('idle');
    setRecordingTime(0);
    startCamera();
  };

  // Upload manual de arquivo de vídeo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadUrl(url);
      setUploadFileName(file.name);
    }
  };

  // Download do arquivo de vídeo para Story (Instagram)
  const handleDownloadStoryVideo = () => {
    const activeUrl = recordedBlobUrl || uploadUrl;
    if (!activeUrl) return;

    const a = document.createElement('a');
    a.href = activeUrl;
    a.download = `nua-resposta-story-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Publicar resposta
  const handlePublishResponse = () => {
    const finalVideoUrl =
      mode === 'camera'
        ? recordedBlobUrl || '/images/nua/hero/hero-1.jpg'
        : uploadUrl || 'https://assets.mixkit.co/videos/preview/mixkit-silhouette-of-a-woman-moving-in-a-dark-room-41974-large.mp4';

    const defaultTranscript =
      transcript.trim() ||
      `Resposta em vídeo gravada por Nua Borges.\n\n"Quando me perguntam sobre despir a vergonha, eu sempre lembro que o corpo nunca foi o inimigo."\n\nDeixa de vergonha ♡`;

    onPublish({
      videoUrl: finalVideoUrl,
      transcript: defaultTranscript,
      caption: `Resposta para: ${ask ? ask.question : 'Pergunta anônima'}`,
    });

    handleClose();
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !ask) return null;

  const activeVideoUrl = mode === 'camera' ? recordedBlobUrl : uploadUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#100a16] border border-[#f4a7b9]/30 rounded-3xl max-w-4xl w-full p-5 sm:p-7 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-[#f4a7b9]/20 border border-[#f4a7b9] flex items-center justify-center text-[#f4a7b9]">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg sm:text-xl text-white">
              Estúdio de Resposta em Vídeo (Asks & Stories)
            </h3>
            <p className="text-xs font-mono text-zinc-400">
              Grave ou envie sua resposta em vídeo 9:16 com o balão do fã na tela.
            </p>
          </div>
        </div>

        {/* Balão do Ask em Destaque */}
        <div className="mb-5 p-4 rounded-2xl bg-[#1b1220] border border-[#f4a7b9]/30 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-300 shrink-0">
            {ask.anonymous ? '?' : ask.askerName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#f4a7b9]">
                {ask.anonymous ? 'anônimo' : ask.askerName}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">perguntou:</span>
            </div>
            <p className="font-serif text-sm sm:text-base text-zinc-100 italic leading-snug">
              &ldquo;{ask.question}&rdquo;
            </p>
          </div>
        </div>

        {/* Seletor de Modo: Câmera vs Upload */}
        <div className="flex items-center gap-2 mb-5 border-b border-white/[0.08] pb-3 text-xs font-mono">
          <button
            onClick={() => setMode('camera')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              mode === 'camera'
                ? 'bg-[#f4a7b9] text-black font-bold shadow-[0_0_15px_rgba(244,167,185,0.3)]'
                : 'text-zinc-400 hover:text-white bg-white/[0.04]'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Gravar na Câmera (Webcam / Celular)</span>
          </button>

          <button
            onClick={() => setMode('upload')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              mode === 'upload'
                ? 'bg-[#f4a7b9] text-black font-bold shadow-[0_0_15px_rgba(244,167,185,0.3)]'
                : 'text-zinc-400 hover:text-white bg-white/[0.04]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Subir Vídeo Gravado (iPhone / MP4)</span>
          </button>
        </div>

        {/* Conteúdo Principal: Duas Colunas (Vídeo 9:16 + Controles / Transcrição) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: O Player / Gravador 9:16 */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="w-[260px] sm:w-[280px] aspect-[9/16] bg-black rounded-3xl border-2 border-white/20 relative overflow-hidden shadow-2xl flex flex-col justify-between">
              {/* Scanlines / Granulação retrô */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20 z-20"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0, 0, 0, 0.4) 3px, rgba(0, 0, 0, 0.4) 6px)',
                }}
              />

              {/* Modo Câmera ao vivo */}
              {mode === 'camera' && recordingState !== 'recorded' && (
                <>
                  <video
                    ref={videoStreamRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    style={{
                      transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                    }}
                  />

                  {cameraPermission === 'denied' && (
                    <div className="absolute inset-0 z-30 bg-black/90 p-4 flex flex-col items-center justify-center text-center">
                      <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
                      <p className="text-xs text-white mb-2">Permissão de câmera não concedida ou dispositivo sem câmera.</p>
                      <button
                        onClick={startCamera}
                        className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs hover:bg-white/20"
                      >
                        Tentar Novamente
                      </button>
                      <button
                        onClick={() => setMode('upload')}
                        className="mt-2 text-xs text-[#f4a7b9] underline"
                      >
                        Subir arquivo de vídeo
                      </button>
                    </div>
                  )}

                  {/* Contagem regressiva */}
                  {recordingState === 'countdown' && (
                    <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center">
                      <span className="font-serif text-7xl font-bold text-[#f4a7b9] animate-ping">
                        {countdown}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Modo Vídeo Gravado ou Upload */}
              {((mode === 'camera' && recordingState === 'recorded') || mode === 'upload') && (
                <div className="absolute inset-0 z-0 bg-black">
                  {activeVideoUrl ? (
                    <video
                      ref={previewPlaybackRef}
                      src={activeVideoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                      onPlay={() => setIsPlayingRecorded(true)}
                      onPause={() => setIsPlayingRecorded(false)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                      <Video className="w-12 h-12 mb-2 text-zinc-600" />
                      <span className="text-xs font-mono">Nenhum vídeo selecionado</span>
                    </div>
                  )}
                </div>
              )}

              {/* OVERLAY: Balão do Ask na Tela do Vídeo (Teleprompter / Sticker) */}
              <div className="relative z-20 m-3 p-3 rounded-2xl bg-black/75 backdrop-blur-md border border-[#f4a7b9]/40 shadow-xl pointer-events-none">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#f4a7b9]" />
                  <span className="text-[10px] font-bold text-[#f4a7b9] uppercase tracking-wider">
                    {ask.anonymous ? 'Pergunta Anônima' : ask.askerName}
                  </span>
                </div>
                <p className="font-serif text-xs text-white leading-snug line-clamp-3">
                  &ldquo;{ask.question}&rdquo;
                </p>
              </div>

              {/* OVERLAY: Indicador REC / Timer */}
              <div className="relative z-20 mx-3 mb-3 flex items-center justify-between pointer-events-none">
                {recordingState === 'recording' && (
                  <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/50 px-3 py-1 rounded-full text-red-300 text-xs font-mono font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>REC {formatTimer(recordingTime)}</span>
                  </div>
                )}

                <div className="ml-auto text-[10px] font-mono text-white/80 bg-black/60 px-2 py-0.5 rounded-full">
                  9:16 Story
                </div>
              </div>
            </div>

            {/* Controles da Câmera abaixo do visor */}
            {mode === 'camera' && (
              <div className="mt-4 flex items-center gap-3">
                {recordingState === 'idle' && (
                  <>
                    <button
                      onClick={handleToggleFacingMode}
                      className="p-3 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white transition-all cursor-pointer"
                      title="Alternar Câmera Frontal / Traseira"
                    >
                      <SwitchCamera className="w-5 h-5" />
                    </button>

                    <button
                      onClick={handleStartCountdown}
                      disabled={cameraPermission === 'denied'}
                      className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all cursor-pointer disabled:opacity-50"
                    >
                      <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                      <span>Gravar Resposta</span>
                    </button>
                  </>
                )}

                {recordingState === 'recording' && (
                  <button
                    onClick={stopRecording}
                    className="px-6 py-3 rounded-full bg-zinc-100 hover:bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-black" />
                    <span>Parar Gravação ({formatTimer(recordingTime)})</span>
                  </button>
                )}

                {recordingState === 'recorded' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRetake}
                      className="px-4 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Regravar</span>
                    </button>

                    <button
                      onClick={handleDownloadStoryVideo}
                      className="px-4 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all cursor-pointer"
                      title="Baixar vídeo gravado para postar nos Stories do Instagram"
                    >
                      <Instagram className="w-4 h-4" />
                      <Download className="w-3.5 h-3.5" />
                      <span>Story (9:16)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Controles de Upload */}
            {mode === 'upload' && (
              <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-[280px]">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-mono flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#f4a7b9]" />
                  <span>{uploadFileName ? 'Trocar Arquivo' : 'Escolher Vídeo do Celular'}</span>
                </button>

                {uploadUrl && (
                  <button
                    onClick={handleDownloadStoryVideo}
                    className="w-full py-2 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>Baixar para Stories</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Coluna Direita: Informações, Transcrição e Publicação */}
          <div className="md:col-span-7 flex flex-col justify-between h-full space-y-5">
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs font-mono text-[#f4a7b9] mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Como funciona a publicação em vídeo:</span>
                </div>
                <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                  <li>
                    <strong className="text-zinc-200">No Blog:</strong> O fã verá o balão do Ask e o seu vídeo integrado com play/pause e a transcrição abaixo.
                  </li>
                  <li>
                    <strong className="text-zinc-200">No Instagram Stories:</strong> Use o botão <strong className="text-pink-400">Story (9:16)</strong> para baixar o vídeo gravado e postar direto nos Stories com o adesivo de link para o diário.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Fuga do Shadowban:</strong> Você fala à vontade de sexo e intimidade sem risco de derrubarem sua conta.
                  </li>
                </ul>
              </div>

              {/* Campo de Transcrição / Legenda do Blog */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-300 mb-1.5">
                  Notas da Nua / Transcrição para o Blog (opcional):
                </label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={`Escreva aqui o que você falou no vídeo ou as reflexões principais...\n\n"Quando me perguntam sobre despir a vergonha..."\n\nDeixa de vergonha ♡`}
                  rows={6}
                  className="w-full bg-[#181120] border border-white/[0.1] rounded-2xl p-4 text-xs font-serif text-white placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9] transition-all resize-none"
                />
                <p className="text-[10px] font-mono text-zinc-500 mt-1">
                  Este texto acompanhará o vídeo na página do post.
                </p>
              </div>

              {/* Sugestão de Preset de Vídeo (para testes em localhost caso não queira usar câmera agora) */}
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs font-mono flex items-center justify-between">
                <span className="text-purple-300 text-[11px]">
                  💡 Quer testar rápido sem câmera agora?
                </span>
                <button
                  onClick={() => {
                    setMode('upload');
                    setUploadUrl('https://assets.mixkit.co/videos/preview/mixkit-silhouette-of-a-woman-moving-in-a-dark-room-41974-large.mp4');
                    setUploadFileName('preset_vhs_paris.mp4');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-[10px] cursor-pointer"
                >
                  Usar Vídeo Modelo
                </button>
              </div>
            </div>

            {/* Rodapé de Ações */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-full border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white text-xs font-mono transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handlePublishResponse}
                disabled={!activeVideoUrl && recordingState !== 'recorded'}
                className="px-7 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#ffb6c7] active:scale-95 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(244,167,185,0.4)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>Publicar Resposta no Blog</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
