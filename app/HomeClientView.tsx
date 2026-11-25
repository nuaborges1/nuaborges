/* Vinho maduro / Nua Borges */
'use client';

import type { SiteContent } from '@/lib/types';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/nua/site/Header';
import { Hero } from '@/components/nua/site/Hero';
import { HomeLançamentos } from '@/components/nua/site/HomeLançamentos';
import { HomeManifesto } from '@/components/nua/site/HomeManifesto';
import { HomeBastidoresGallery } from '@/components/nua/site/HomeBastidoresGallery';
import { HomeCaminhos } from '@/components/nua/site/HomeCaminhos';
import { HomeFaq } from '@/components/nua/site/HomeFaq';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { VipBanner } from '@/components/nua/site/VipBanner';
import { VipModal } from '@/components/nua/site/VipModal';
import { GalleryLightbox } from '@/components/nua/site/GalleryLightbox';
import { PageTransition, Reveal } from '@/components/nua/site/PageTransition';
import { GalleryItem, SITE_DATA } from '@/lib/data';
import { usePublishedContent } from '@/lib/contentStore';

export function HomeClientView({ initialContent }: { initialContent?: Partial<SiteContent> }) {
  const content = usePublishedContent(initialContent);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add('hydrated');
  }, []);

  const activeGalleryPhotos: GalleryItem[] = useMemo(() => {
    if (content?.gallery?.photos && content.gallery.photos.length > 0) {
      return content.gallery.photos
        .filter((p) => p.active !== false && !p.isPendingPublish)
        .map((p, idx) => ({
          id: p.id || `gallery-${idx}`,
          title: p.title,
          session: '01',
          imageUrl: p.imageUrl,
          caption: p.caption,
          linkUrl: p.linkUrl,
          blurred: p.blurred,
          exclusive: false,
          orientation: 'vertical' as const,
        }));
    }
    return SITE_DATA.photos.gallery;
  }, [content?.gallery?.photos]);

  const handleOpenPhoto = (photo: GalleryItem, index: number) => {
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(index);
  };

  return (
    <>
      {/* 1. Header — Navegação Fixa Global */}
      <Header
        onOpenContact={() => setContactModalOpen(true)}
        activeSection="inicio"
        customHeaderData={content.header}
      />

      <PageTransition>
        <div className="min-h-screen w-full overflow-x-clip bg-black text-white selection:bg-[#661C30] selection:text-white">
          <main suppressHydrationWarning>
            {/* HERO */}
            <Hero customHeroData={content.hero} />

            {/* 1. Lançamentos & Acervo Sob Demanda */}
            <Reveal delay={0}>
              <HomeLançamentos customAvulsosData={content.avulsos} />
            </Reveal>

            {/* 2. Manifesto Curto com Foto Split */}
            <Reveal delay={30}>
              <HomeManifesto customAboutData={content.about} />
            </Reveal>

            {/* 3. Galeria de Bastidores (Horizontal Scroll) */}
            {content.gallery?.active !== false && (
              <Reveal delay={50}>
                <HomeBastidoresGallery
                  photos={activeGalleryPhotos}
                  onSelectPhoto={handleOpenPhoto}
                  eyebrow={content.gallery?.eyebrow}
                  title={content.gallery?.title}
                  subtitle={content.gallery?.subtitle}
                />
              </Reveal>
            )}

            {/* 4. Formas de Viver a Nua (3 Caminhos Visuais Refinados) */}
            <Reveal delay={60}>
              <HomeCaminhos />
            </Reveal>

            {/* 5. Lista VIP & Prévias (Captação controlada pelo painel) */}
            <Reveal delay={65}>
              <VipBanner
                onOpenVip={() => setVipModalOpen(true)}
                customVipData={content.vipClub}
              />
            </Reveal>

            {/* 6. Dúvidas Discretas (FAQ Accordion Canônico Unificado) */}
            <Reveal delay={70}>
              <HomeFaq customFaqs={content.faqs} />
            </Reveal>
          </main>

          {/* Rodapé Institucional */}
          <Footer
            customFooterData={content.footer}
            customInstitutionalData={content.institutional}
            customChannelsData={content.channels}
          />
        </div>
      </PageTransition>

      {/* Modals & Lightbox */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        customContactData={content.contact}
      />

      <VipModal
        isOpen={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
        customVipData={content.vipClub}
      />

      <GalleryLightbox
        photo={selectedPhoto}
        allPhotos={activeGalleryPhotos}
        currentIndex={selectedPhotoIndex}
        onClose={() => setSelectedPhoto(null)}
        onNavigate={(index) => {
          setSelectedPhotoIndex(index);
          setSelectedPhoto(activeGalleryPhotos[index] || null);
        }}
      />
    </>
  );
}
