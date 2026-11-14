import { SiteContent } from '../types';

export function diffContentChanges(
  prev: SiteContent | null,
  next: SiteContent
): string[] {
  if (!prev) return ['Edição inicial de rascunho'];
  const changes: string[] = [];

  // Hero
  if (prev.hero?.title !== next.hero?.title) {
    changes.push(`Hero: título alterado para "${next.hero?.title?.substring(0, 40) || ''}"`);
  }
  if (prev.hero?.eyebrow !== next.hero?.eyebrow) {
    changes.push(`Hero: eyebrow alterado`);
  }
  if (prev.hero?.tagline !== next.hero?.tagline) {
    changes.push(`Hero: tagline alterada`);
  }
  if (prev.hero?.description !== next.hero?.description) {
    changes.push(`Hero: descrição alterada`);
  }
  if (prev.hero?.photos?.length !== next.hero?.photos?.length) {
    changes.push(`Hero: carrossel agora com ${next.hero?.photos?.length || 0} fotos`);
  }

  // Galeria
  if (prev.gallery?.photos?.length !== next.gallery?.photos?.length) {
    changes.push(`Galeria: fotos alteradas para ${next.gallery?.photos?.length || 0} itens`);
  }
  if (prev.gallery?.title !== next.gallery?.title) {
    changes.push(`Galeria: título alterado`);
  }

  // Sobre Mim
  if (prev.about?.headline !== next.about?.headline) {
    changes.push(`Sobre Mim: manchete alterada`);
  }
  if (prev.about?.paragraph1 !== next.about?.paragraph1 || prev.about?.paragraph2 !== next.about?.paragraph2) {
    changes.push(`Sobre Mim: texto da biografia editado`);
  }
  if (prev.about?.photoUrl !== next.about?.photoUrl) {
    changes.push(`Sobre Mim: foto de perfil alterada`);
  }

  // Canais
  if (prev.channels?.onlyfans?.description !== next.channels?.onlyfans?.description) {
    changes.push(`Canais: OnlyFans atualizado`);
  }
  if (prev.channels?.instagram?.description !== next.channels?.instagram?.description) {
    changes.push(`Canais: Instagram atualizado`);
  }

  // Contato
  if (prev.contact?.officialEmail !== next.contact?.officialEmail) {
    changes.push(`Contato: e-mail oficial alterado para "${next.contact?.officialEmail}"`);
  }

  // SEO
  if (prev.seo?.title !== next.seo?.title) {
    changes.push(`SEO: título da página alterado`);
  }
  if (prev.seo?.description !== next.seo?.description) {
    changes.push(`SEO: meta description editada`);
  }

  return changes.length > 0 ? changes : ['Ajuste de formatação / metadados'];
}
