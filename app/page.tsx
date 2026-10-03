'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { GallerySection } from '@/components/GallerySection';
import { AboutSection } from '@/components/AboutSection';
import { LinksSection } from '@/components/LinksSection';
import { Footer } from '@/components/Footer';
import { ContactModal } from '@/components/ContactModal';
import { GalleryLightbox } from '@/components/GalleryLightbox';
import { PageTransition, Reveal } from '@/components/PageTransition';
import { GalleryItem, SITE_DATA } from '@/lib/data';
import { usePublishedContent } from '@/lib/contentStore';
import { buildHomeTitle, buildHomeDescription, pickOgImage, SITE_URL } from '@/lib/seo';

export default function HomePage() {
  const content = usePublishedContent();
  const [contactModalOpen, setContactModalOpen] = useState(false);
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
        .filter((p) => p.active !== false)
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
      {/* 1. Header — Global Fixed Navigation */}
      <Header
        onOpenContact={() => setContactModalOpen(true)}
        activeSection="inicio"
        customHeaderData={content.header}
      />

      <PageTransition>
        <div className="min-h-screen bg-black text-white selection:bg-[#f4a7b9] selection:text-black">
          <main suppressHydrationWarning>
            {/* 2. Hero — no reveal delay (above fold) */}
            <Hero customHeroData={content.hero} />

            {/* 3. Galeria */}
            <Reveal delay={0}>
              <GallerySection
                onSelectPhoto={handleOpenPhoto}
                isLightboxOpen={!!selectedPhoto}
                customGalleryData={content.gallery}
              />
            </Reveal>

            {/* 4. Sobre Mim */}
            <Reveal delay={60}>
              <AboutSection customAboutData={content.about} />
            </Reveal>

            {/* 5. Canais Oficiais */}
            <Reveal delay={80}>
              <LinksSection
                onOpenContact={() => setContactModalOpen(true)}
                customChannelsData={content.channels}
              />
            </Reveal>
          </main>

          {/* 6. Footer */}
          <Reveal delay={0}>
            <Footer
              customFooterData={content.footer}
              customInstitutionalData={content.institutional}
            />
          </Reveal>
        </div>
      </PageTransition>

      {/* Modals & Lightbox — Mounted via Portal to document.body */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        customContactData={content.contact}
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
