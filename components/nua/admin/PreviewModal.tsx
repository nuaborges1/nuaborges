'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, Tablet, Monitor, Send } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { Header } from '@/components/nua/site/Header';
import { Hero } from '@/components/nua/site/Hero';
import { GallerySection } from '@/components/nua/site/GallerySection';
import { AboutSection } from '@/components/nua/site/AboutSection';
import { LinksSection } from '@/components/nua/site/LinksSection';
import { Footer } from '@/components/nua/site/Footer';
import { useScrollLock } from '@/hooks/useScrollLock';

interface PreviewModalProps {
  isOpen: boolean;
  content: SiteContent;
  onPublish: () => void;
  onClose: () => void;
}

export function PreviewModal({ isOpen, content, onPublish, onClose }: PreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const deviceWidths = {
    mobile: 'max-w-[390px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-[1240px]',
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col select-none overscroll-contain">
        {/* Top Control Bar */}
        <div className="bg-[#14151b] border-b border-white/[0.06] px-3.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2.5 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white text-xs sm:text-sm font-semibold tracking-wide truncate">
              Pré-visualização
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 hidden md:inline">
              Rascunho não publicado
            </span>
          </div>

          {/* Device Switcher */}
          <div className="flex items-center bg-[#171821] border border-white/[0.06] rounded-xl p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`h-7 px-2.5 sm:px-3 rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                device === 'mobile'
                  ? 'bg-white/[0.12] text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Visualização Celular (390px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Celular</span>
            </button>

            <button
              type="button"
              onClick={() => setDevice('tablet')}
              className={`h-7 px-2.5 sm:px-3 rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                device === 'tablet'
                  ? 'bg-white/[0.12] text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Visualização Tablet (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </button>

            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`h-7 px-2.5 sm:px-3 rounded-lg flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                device === 'desktop'
                  ? 'bg-white/[0.12] text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Visualização Desktop (1240px)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onPublish();
                onClose();
              }}
              className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Publicar no Site</span>
              <span className="sm:hidden">Publicar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.08] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Fechar pré-visualização"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Frame */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-[#0c0d12]/90">
          <div
            className={`w-full ${deviceWidths[device]} bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 flex flex-col min-h-full`}
          >
            {/* Header */}
            <Header onOpenContact={() => {}} activeSection="inicio" customHeaderData={content.header} />

            <main>
              {/* Hero */}
              <Hero customHeroData={content.hero} />

              {/* Galeria */}
              <GallerySection
                onSelectPhoto={() => {}}
                isLightboxOpen={false}
                customGalleryData={content.gallery}
              />

              {/* Sobre Mim */}
              <AboutSection customAboutData={content.about} />

              {/* Canais */}
              <LinksSection onOpenContact={() => {}} customChannelsData={content.channels} />
            </main>

            {/* Footer */}
            <Footer customFooterData={content.footer} />
          </div>
        </div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
