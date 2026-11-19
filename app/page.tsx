/* Vinho maduro / Nua Borges */
'use client';

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
import { VipModal } from '@/components/nua/site/VipModal';
import { GalleryLightbox } from '@/components/nua/site/GalleryLightbox';
import { PageTransition, Reveal } from '@/components/nua/site/PageTransition';
import { GalleryItem, SITE_DATA } from '@/lib/data';
import { usePublishedContent } from '@/lib/contentStore';
import { buildHomeTitle, buildHomeDescription, pickOgImage, SITE_URL } from '@/lib/seo';

export default function HomePage() {
  const content = usePublishedContent();
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // SEO automático — atualiza metadata conforme conteúdo publicado
  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.classList.add('hydrated');

    const title = buildHomeTitle(content);
    const description = buildHomeDescription(content);
    const ogImage = pickOgImage(content);
    const ogImageFull = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;

    // Title
    document.title = title;

    // Helpers
    const setMeta = (selector: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', value);
    };

    // Description
    setMeta('meta[name="description"]', description);

    // Open Graph
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:image"]', ogImageFull);

    // Twitter/X
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    setMeta('meta[name="twitter:image"]', ogImageFull);
  }, [content]);

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
        <div className="min-h-screen bg-black text-white selection:bg-[#661C30] selection:text-white">
          <main suppressHydrationWarning>
            {/* HERO (Sem Mudanças) */}
            <Hero customHeroData={content.hero} />

            {/* 1. Lançamentos & Acervo Sob Demanda (Bento Grid Refinado Sem Preço) */}
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
                />
              </Reveal>
            )}

            {/* 4. Formas de Viver a Nua (3 Caminhos Visuais Refinados) */}
            <Reveal delay={60}>
              <HomeCaminhos />
            </Reveal>

            {/* 5. Dúvidas Discretas (FAQ Accordion Canônico Unificado) */}
            <Reveal delay={70}>
              <HomeFaq />
            </Reveal>
          </main>

          {/* Rodapé Institucional */}
          <Reveal delay={0}>
            <Footer
              customFooterData={content.footer}
              customInstitutionalData={content.institutional}
            />
          </Reveal>
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
