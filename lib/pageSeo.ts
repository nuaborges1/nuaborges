import type { Metadata } from 'next';
import { SITE_URL } from './site';

const siteName = 'Nua Borges';
export const homeUrl = new URL('/', SITE_URL).href;
export const authorId = new URL('/sobre#nua-borges', SITE_URL).href;
const defaultImage = '/images/nua/hero/hero-1.jpg';

export const privateRobots: Metadata['robots'] = { index: false, follow: false };

export const publicPages = {
  '/': {
    title: 'Nua Borges — Site oficial',
    description: 'Conheça Nua Borges, educadora sexual e sexóloga em formação. Explore seu trabalho autoral, o acervo e as experiências do site oficial.',
  },
  '/sobre': {
    title: 'Sobre Nua Borges',
    description: 'Conheça a trajetória de Nua Borges e a relação entre educação sexual, autoimagem e fotografia no seu trabalho.',
  },
  '/avulsos': {
    title: 'Ensaios e conteúdos avulsos',
    description: 'Explore os ensaios autorais de Nua Borges disponíveis sob demanda e veja o que cada produção inclui antes de escolher.',
  },
  '/acervo': {
    title: 'Acervo autoral',
    description: 'Conheça o acervo autoral de Nua Borges e as formas de acessar seus ensaios e produções fotográficas.',
  },
  '/chamadas': {
    title: 'Chamadas privativas em vídeo',
    description: 'Veja como funcionam as chamadas em vídeo com Nua Borges, conheça as modalidades disponíveis e consulte os horários.',
  },
  '/personalizados': {
    title: 'Fotos e vídeos personalizados',
    description: 'Entenda como encomendar uma produção personalizada com Nua Borges e como funcionam o pedido, o pagamento e a entrega.',
  },
  '/contato': {
    title: 'Contato e assessoria',
    description: 'Encontre os canais oficiais de contato de Nua Borges para propostas, parcerias e informações sobre seu trabalho.',
  },
  '/termos': {
    title: 'Termos de uso',
    description: 'Consulte os termos de uso do site oficial de Nua Borges.',
  },
  '/privacidade': {
    title: 'Política de privacidade',
    description: 'Saiba como o site oficial de Nua Borges trata dados pessoais e quais são os seus canais de contato.',
  },
};

export function publicImage(value?: string): string {
  try {
    const image = new URL(value || defaultImage, SITE_URL);
    const site = new URL(SITE_URL);
    const segments = decodeURIComponent(image.pathname).toLowerCase().split('/');
    if (
      image.protocol === 'https:' && !image.username && !image.password && !image.search && !image.hash &&
      (image.host === site.host || image.host === 'cdn.nuaborges.com.br') &&
      /^\/(images|media)\//i.test(image.pathname) &&
      !segments.some(segment => ['private', 'privado', 'cofre', 'signed', 'exclusive'].includes(segment))
    ) return image.href;
  } catch {
    // Usa uma imagem pública conhecida quando o endereço enviado não é válido.
  }
  return new URL(defaultImage, SITE_URL).href;
}

export function pageMetadata(path: string, title: string, description: string, image?: string): Metadata {
  const canonical = new URL(path, SITE_URL).href;
  const fullTitle = path === '/' || title.includes(siteName) ? title : `${title} | ${siteName}`;
  const imageUrl = publicImage(image);
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website', siteName, locale: 'pt_BR', url: canonical, title: fullTitle, description,
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [{ url: imageUrl, alt: title }] },
  };
}

export function publicPageMetadata(path: keyof typeof publicPages, image?: string): Metadata {
  const { title, description } = publicPages[path];
  return pageMetadata(path, title, description, image);
}
