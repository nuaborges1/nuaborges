'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Download, Copy, Check, X, Sparkles, Instagram, Share2 } from 'lucide-react';
import { BlogPost, SubmittedAsk } from '@/types/blog';

interface StoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: BlogPost | null;
  ask?: SubmittedAsk | null;
  customAnswer?: string;
}

export function StoryCardModal({
  isOpen,
  onClose,
  post,
  ask,
  customAnswer,
}: StoryCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  if (!isOpen) return null;

  // Extrair os textos conforme o que foi passado (post ou ask direto)
  const questionText = ask ? ask.question : post?.askData?.question || '';
  const askerName = ask
    ? ask.anonymous
      ? 'Anônimo'
      : ask.askerName
    : post?.askData?.askerName || 'Anônimo';

  const answerText =
    customAnswer ||
    (post?.postType === 'ask'
      ? post.content
      : post?.postType === 'quote'
      ? post.quoteData?.quote || post.content
      : post?.subtitle || post?.content || '');

  const postTitle = post?.title || 'Confissão da Madrugada';

  const handleDownloadStoryImage = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // 2x para retina/alta resolução no Instagram
        backgroundColor: '#070509',
        useCORS: true,
        logging: false,
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `nua-story-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error('Falha ao exportar Story:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCaption = () => {
    const textToCopy = `"${questionText ? `P: ${questionText}\n\n` : ''}${answerText}"\n\nDeixa de vergonha ♡\n\nConfira a resposta completa no meu diário secreto (link na bio!)\n\n#nuaborges #deixadevergonha #sexologia #diariosecreto`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#100a16] border border-[#f4a7b9]/30 rounded-3xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho do Modal */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#f4a7b9]/20 border border-[#f4a7b9] flex items-center justify-center text-[#f4a7b9]">
            <Instagram className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-white">
              Gerador de Card para Instagram Stories
            </h3>
            <p className="text-xs font-mono text-zinc-400">
              Formato vertical 9:16 perfeito para repostar nos Stories ou carrossel.
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CARD VERTICAL 9:16 QUE SERÁ CONVERTIDO EM IMAGEM               */}
        {/* ============================================================== */}
        <div className="flex justify-center mb-6">
          <div
            ref={cardRef}
            className="w-[320px] h-[568px] sm:w-[340px] sm:h-[604px] bg-[#09060b] border border-white/[0.12] rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl select-none text-left"
          >
            {/* Glow quente rosa no fundo */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#f4a7b9]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#e06287]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Topo do Card: Identidade de Nua */}
            <div className="relative z-10">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-[#f4a7b9]/40 relative">
                    <Image
                      src="/images/nua/hero/hero-2.jpg"
                      alt="Nua Borges"
                      fill
                      sizes="32px"
                      className="object-cover object-top"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white tracking-wide">
                      Nua Borges
                    </div>
                    <div className="text-[10px] font-mono text-[#f4a7b9]">
                      @nuaborges • diário secreto
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  tumblr ask
                </span>
              </div>

              {/* Se for uma Ask: Balãozinho Clássico */}
              {questionText && (
                <div className="relative p-3.5 rounded-2xl bg-[#1b1422] border border-[#f4a7b9]/30 text-xs text-zinc-100 shadow-md mb-4">
                  <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-mono text-[#f4a7b9]">
                    <span className="w-4 h-4 rounded-full bg-[#f4a7b9]/20 flex items-center justify-center font-bold text-[9px]">
                      ?
                    </span>
                    <span>{askerName} perguntou em segredo:</span>
                  </div>
                  <p className="italic font-medium leading-snug text-white font-serif text-xs sm:text-sm">
                    &ldquo;{questionText}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Miolo do Card: Resposta ou Citação da Nua */}
            <div className="relative z-10 flex-1 flex flex-col justify-center py-2 space-y-2.5">
              {!questionText && (
                <h4 className="font-serif text-lg font-bold text-white leading-tight mb-1">
                  {postTitle}
                </h4>
              )}

              <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-serif italic border-l-2 border-[#f4a7b9]/50 pl-3 line-clamp-6">
                &ldquo;{answerText.length > 280 ? answerText.substring(0, 280) + '...' : answerText}&rdquo;
              </div>

              <div className="pt-2 text-right">
                <span className="font-script text-2xl text-[#f4a7b9] block leading-none">
                  Deixa de vergonha ♡
                </span>
              </div>
            </div>

            {/* Rodapé do Card: Simulador de Figurinha de Link do Instagram */}
            <div className="relative z-10 pt-3 border-t border-white/[0.08]">
              <div className="w-full py-2 px-3 rounded-full bg-white/[0.06] border border-white/[0.12] text-center flex items-center justify-center gap-1.5">
                <span className="text-[10px] font-mono text-zinc-300">
                  🔗 Ler resposta completa no diário • <strong className="text-[#f4a7b9]">Link na Bio</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ações do Modal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={handleDownloadStoryImage}
            disabled={downloading}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-[#f4a7b9] to-[#e06287] hover:opacity-95 text-black font-semibold text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(244,167,185,0.3)] cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Gerando Imagem...' : 'Baixar Imagem p/ Stories (.png)'}</span>
          </button>

          <button
            onClick={handleCopyCaption}
            className="py-3 px-4 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-white text-xs font-mono transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {copiedCaption ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Texto Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#f4a7b9]" />
                <span>Copiar Texto p/ Legenda</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
