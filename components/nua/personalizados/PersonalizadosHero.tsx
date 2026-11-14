'use client';

import React from 'react';
import { Camera } from 'lucide-react';
import { PublicPageHero } from '@/components/nua/site/PublicPageHero';

interface PersonalizadosHeroProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export function PersonalizadosHero({ eyebrow, title, subtitle }: PersonalizadosHeroProps) {
  return (
    <PublicPageHero
      icon={Camera}
      eyebrow={eyebrow || 'PRODUÇÃO AUTORAL SOB MEDIDA'}
      title={title || 'Ateliê Privativo'}
      subtitle={subtitle || 'Encomende uma produção exclusiva de fotos e vídeos feita sob medida para você, com discrição absoluta e entrega personalizada.'}
    />
  );
}
