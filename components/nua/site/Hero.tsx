'use client';

import React from 'react';
import { SITE_DATA, HeroPhotoItem } from '@/lib/data';
import { SiteContent } from '@/lib/types';
import { useHeroCarousel } from './hero/useHeroCarousel';
import { HeroCinematicLayout } from './hero/HeroCinematicLayout';
import { HeroSplitLayout } from './hero/HeroSplitLayout';
import { useCopy } from '@/lib/copy';

interface HeroProps {
  onOpenExclusive?: () => void;
  customHeroPhoto?: string;
  customHeroData?: SiteContent['hero'];
}

export function Hero({ customHeroPhoto, customHeroData }: HeroProps) {
  const { cms } = useCopy();
  const photos: HeroPhotoItem[] = React.useMemo(() => {
    let list: Array<{ id?: string; title?: string; session?: string; imageUrl: string }> = [];
    if (customHeroData?.photos && customHeroData.photos.length > 0) {
      list = [...customHeroData.photos];
    } else {
      list = [...SITE_DATA.photos.heroPhotos];
    }

    if (customHeroPhoto && customHeroPhoto !== SITE_DATA.photos.hero) {
      list[0] = {
        id: 'hero-custom',
        title: 'Nua Borges',
        session: '01',
        imageUrl: customHeroPhoto,
      };
    }

    if (list.length === 0) {
      list = [
        { id: 'def-1', title: 'Nua Borges', session: '01', imageUrl: '/images/nua/hero/hero-1.jpg' },
      ];
    }

    return list.map((item, idx) => ({
      id: item.id || `hero-${idx}`,
      title: item.title || 'Nua Borges',
      session: item.session || `0${idx + 1}`,
      imageUrl: item.imageUrl,
    }));
  }, [customHeroPhoto, customHeroData]);

  const {
    setCurrentIndex,
    safeIndex,
    nextSlide,
    prevSlide,
    pauseTemporarily,
    touchHandlers,
  } = useHeroCarousel(photos);

  const eyebrow = cms(customHeroData?.eyebrow, 'hero.eyebrow', SITE_DATA.creator.eyebrow);
  const title = customHeroData?.title || 'Nua Borges';
  const tagline = cms(customHeroData?.tagline, 'hero.tagline', SITE_DATA.creator.tagline);
  const description = cms(customHeroData?.description, 'hero.description', SITE_DATA.creator.heroDescription);
  const ctaText = cms(customHeroData?.ctaText, 'hero.ctaText', 'Acessar Acervo Exclusivo');
  const rawCtaUrl = customHeroData?.ctaUrl?.trim();
  const ctaUrl =
    !rawCtaUrl ||
    rawCtaUrl === 'https://onlyfans.com/nuaborges' ||
    rawCtaUrl === 'https://onlyfans.com/nuaborges/'
      ? '/acervo'
      : rawCtaUrl;
  const exploreText = cms(customHeroData?.exploreText, 'hero.exploreText', 'EXPLORE O MUNDO DA NUA');
  const fullVerticalPhoto = customHeroData?.fullVerticalPhoto !== false;
  const cinematicCoverLayout = customHeroData?.cinematicCoverLayout !== false;
  const OFFICIAL_LOGO_URL = '/images/nua/logo-oficial.webp';
  const useLogo = customHeroData?.useLogo !== false;
  const logoUrl =
    !customHeroData?.logoUrl || customHeroData.logoUrl.startsWith('data:image')
      ? OFFICIAL_LOGO_URL
      : customHeroData.logoUrl;

  const handleDotClick = (idx: number) => {
    pauseTemporarily(3000);
    setCurrentIndex(idx);
  };

  if (cinematicCoverLayout) {
    return (
      <HeroCinematicLayout
        photos={photos}
        safeIndex={safeIndex}
        eyebrow={eyebrow}
        title={title}
        useLogo={useLogo}
        logoUrl={logoUrl}
        tagline={tagline}
        description={description}
        ctaText={ctaText}
        ctaUrl={ctaUrl}
        exploreText={exploreText}
        touchHandlers={touchHandlers}
        onDotClick={handleDotClick}
      />
    );
  }

  return (
    <HeroSplitLayout
      photos={photos}
      safeIndex={safeIndex}
      eyebrow={eyebrow}
      title={title}
      useLogo={useLogo}
      logoUrl={logoUrl}
      tagline={tagline}
      description={description}
      ctaText={ctaText}
      ctaUrl={ctaUrl}
      fullVerticalPhoto={fullVerticalPhoto}
      touchHandlers={touchHandlers}
      onPrevSlide={prevSlide}
      onNextSlide={nextSlide}
      onDotClick={handleDotClick}
    />
  );
}
