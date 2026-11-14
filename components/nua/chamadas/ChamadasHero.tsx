'use client';

import React from 'react';
import { Video } from 'lucide-react';
import { PublicPageHero } from '@/components/nua/site/PublicPageHero';

export function ChamadasHero() {
  return (
    <PublicPageHero
      icon={Video}
      eyebrow="EXPERIÊNCIA PRIVATIVA & AO VIVO"
      title="Encontros em Vídeo Privativo"
      subtitle="Tempo de qualidade, intimidade autoral e conexão profunda em sala privativa segura. Escolha a modalidade, selecione data e horário de sua preferência."
    />
  );
}
