import { SiteContent } from '../types';
import { DEFAULT_PERSONALIZADOS_SETTINGS } from '../personalizadosCanonical';

export interface ModifiedSectionInfo {
  moduleId:
  | 'vitrine'
  | 'conteudos'
  | 'seo'
  | 'conexoes'
  | 'personalizados'
  | 'chamadas'
  | 'midias'
  | 'configuracoes';
  label: string;
  selector?: string;
  fieldId?: string;
}

function cleanContentObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanContentObject);
  }
  const copy: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_updatedAt' || k === '_version') continue;
    copy[k] = cleanContentObject(v);
  }
  return copy;
}

export function getModifiedSections(
  prev: SiteContent | null,
  next: SiteContent | null
): ModifiedSectionInfo[] {
  if (!prev || !next) return [];

  const clean = cleanContentObject;

  const sections: ModifiedSectionInfo[] = [];

  // Vitrine / Editar Meu Site (Hero, Galeria, Sobre, Header, Footer, VIP)
  if (prev.hero && next.hero) {
    if (clean(prev.hero.eyebrow) !== clean(next.hero.eyebrow)) {
      sections.push({
        moduleId: 'vitrine',
        label: 'Capa: Texto do Topo',
        selector: '[data-field="hero.eyebrow"]',
      });
    }
    if (clean(prev.hero.title) !== clean(next.hero.title)) {
      sections.push({
        moduleId: 'vitrine',
        label: 'Capa: Nome Principal',
        selector: '[data-field="hero.title"]',
      });
    }
    if (clean(prev.hero.tagline) !== clean(next.hero.tagline)) {
      sections.push({
        moduleId: 'vitrine',
        label: 'Capa: Boas-Vindas',
        selector: '[data-field="hero.tagline"]',
      });
    }
    if (clean(prev.hero.description) !== clean(next.hero.description)) {
      sections.push({
        moduleId: 'vitrine',
        label: 'Capa: Apresentação',
        selector: '[data-field="hero.description"]',
      });
    }
    if (JSON.stringify(clean(prev.hero.photos)) !== JSON.stringify(clean(next.hero.photos))) {
      sections.push({
        moduleId: 'vitrine',
        label: 'Fotos da Capa',
        selector: '[data-field="hero.photos"]',
      });
    }
  }

  // Galeria Pública (Somente novas fotos pendentes ou textos editoriais exigem publicação; ajustes administrativos salvam direto)
  const hasPendingGalleryPhotos = (next.gallery?.photos || []).some((p: any) => p.isPendingPublish);
  const isGalleryHeaderChanged =
    clean(prev.gallery?.title) !== clean(next.gallery?.title) ||
    clean(prev.gallery?.subtitle) !== clean(next.gallery?.subtitle) ||
    clean(prev.gallery?.eyebrow) !== clean(next.gallery?.eyebrow);

  if (hasPendingGalleryPhotos) {
    sections.push({
      moduleId: 'vitrine',
      label: 'Galeria: Nova Foto Aguardando Publicação',
      selector: '[data-field="gallery.section"]',
    });
  } else if (isGalleryHeaderChanged) {
    sections.push({
      moduleId: 'vitrine',
      label: 'Galeria: Textos da Seção',
      selector: '[data-field="gallery.section"]',
    });
  }

  // Sobre Mim
  if (prev.about && next.about) {
    if (clean(prev.about.headline) !== clean(next.about.headline)) {
      sections.push({
        moduleId: 'vitrine',
        label: 'Sobre Mim: Manchete',
        selector: '[data-field="about.headline"]',
      });
    }
    if (
      clean(prev.about.body) !== clean(next.about.body) ||
      clean(prev.about.paragraph1) !== clean(next.about.paragraph1) ||
      clean(prev.about.paragraph2) !== clean(next.about.paragraph2)
    ) {
      sections.push({
        moduleId: 'vitrine',
        label: 'Sobre Mim: Biografia',
        selector: '[data-field="about.bio"]',
      });
    }
    if (clean(prev.about.photoUrl) !== clean(next.about.photoUrl)) {
      sections.push({
        moduleId: 'vitrine',
        label: 'Sobre Mim: Foto de Perfil',
        selector: '[data-field="about.photoUrl"]',
      });
    }
  }

  // Clube VIP e Dúvidas Frequentes (FAQ)
  if (JSON.stringify(clean(prev.vipClub)) !== JSON.stringify(clean(next.vipClub))) {
    sections.push({
      moduleId: 'vitrine',
      label: 'Clube VIP',
      selector: '[data-field="vip.section"]',
    });
  }

  if (JSON.stringify(clean(prev.faqs)) !== JSON.stringify(clean(next.faqs))) {
    sections.push({
      moduleId: 'vitrine',
      label: 'Dúvidas Frequentes (FAQ)',
      selector: '#admin-hero-section',
    });
  }

  // Header / Footer
  if (
    JSON.stringify(clean(prev.header)) !== JSON.stringify(clean(next.header)) ||
    JSON.stringify(clean(prev.footer)) !== JSON.stringify(clean(next.footer))
  ) {
    sections.push({
      moduleId: 'vitrine',
      label: 'Links e Rodapé',
      selector: '[data-field="footer.section"]',
    });
  }

  // Fallback caso outro campo de vitrine tenha sido alterado e nenhum específico capturado
  const isVitrineChanged =
    JSON.stringify(clean(prev.hero)) !== JSON.stringify(clean(next.hero)) ||
    hasPendingGalleryPhotos ||
    isGalleryHeaderChanged ||
    JSON.stringify(clean(prev.about)) !== JSON.stringify(clean(next.about)) ||
    JSON.stringify(clean(prev.header)) !== JSON.stringify(clean(next.header)) ||
    JSON.stringify(clean(prev.footer)) !== JSON.stringify(clean(next.footer)) ||
    JSON.stringify(clean(prev.vipClub)) !== JSON.stringify(clean(next.vipClub)) ||
    JSON.stringify(clean(prev.faqs)) !== JSON.stringify(clean(next.faqs));

  if (isVitrineChanged && !sections.some((s) => s.moduleId === 'vitrine')) {
    sections.push({
      moduleId: 'vitrine',
      label: 'Editar Meu Site',
      selector: '#admin-hero-section',
    });
  }

  // Conteúdos & Packs (Somente novos packs para publicar ou textos editoriais)
  const isPacksHeaderChanged =
    clean(prev.avulsos?.title) !== clean(next.avulsos?.title) ||
    clean(prev.avulsos?.subtitle) !== clean(next.avulsos?.subtitle) ||
    clean(prev.avulsos?.eyebrow) !== clean(next.avulsos?.eyebrow);

  const prevPacks = prev.avulsos?.items || [];
  const nextPacks = next.avulsos?.items || [];
  const hasNewlyPublishedPack = nextPacks.some((nextItem: any) => {
    if (nextItem.active === false || nextItem.isDraft) return false;
    const prevItem = prevPacks.find((p: any) => p.id === nextItem.id);
    return !prevItem || prevItem.active === false || prevItem.isDraft;
  });

  if (hasNewlyPublishedPack) {
    sections.push({
      moduleId: 'conteudos',
      label: 'Conteúdos: Novo Pack para Publicar',
      selector: '[data-field="avulsos.section"]',
    });
  } else if (isPacksHeaderChanged) {
    sections.push({
      moduleId: 'conteudos',
      label: 'Conteúdos: Textos da Seção',
      selector: '[data-field="avulsos.section"]',
    });
  }

  // Divulgação e SEO
  if (prev.seo && next.seo) {
    if (clean(prev.seo.title) !== clean(next.seo.title)) {
      sections.push({
        moduleId: 'seo',
        label: 'SEO: Título',
        selector: '[data-field="seo.title"]',
      });
    }
    if (clean(prev.seo.description) !== clean(next.seo.description)) {
      sections.push({
        moduleId: 'seo',
        label: 'SEO: Descrição',
        selector: '[data-field="seo.description"]',
      });
    }
  }
  const isSeoChanged =
    JSON.stringify(clean(prev.seo)) !== JSON.stringify(clean(next.seo)) ||
    JSON.stringify(clean(prev.institutional)) !== JSON.stringify(clean(next.institutional));
  if (isSeoChanged && !sections.some((s) => s.moduleId === 'seo')) {
    sections.push({
      moduleId: 'seo',
      label: 'Divulgação & SEO',
      selector: '[data-field="seo.section"]',
    });
  }

  // Redes e Contato
  const isConexoesChanged =
    JSON.stringify(clean(prev.channels)) !== JSON.stringify(clean(next.channels)) ||
    JSON.stringify(clean(prev.contact)) !== JSON.stringify(clean(next.contact));
  if (isConexoesChanged) {
    sections.push({
      moduleId: 'conexoes',
      label: 'Redes & Contato',
      selector: '[data-field="conexoes.section"]',
    });
  }

  // Personalizados
  const prevPers = clean({
    ...DEFAULT_PERSONALIZADOS_SETTINGS,
    ...(prev.personalizados || {}),
    deliveryMethods: {
      ...DEFAULT_PERSONALIZADOS_SETTINGS.deliveryMethods,
      ...(prev.personalizados?.deliveryMethods || {}),
    },
  });
  const nextPers = clean({
    ...DEFAULT_PERSONALIZADOS_SETTINGS,
    ...(next.personalizados || {}),
    deliveryMethods: {
      ...DEFAULT_PERSONALIZADOS_SETTINGS.deliveryMethods,
      ...(next.personalizados?.deliveryMethods || {}),
    },
  });
  const isPersonalizadosChanged = JSON.stringify(prevPers) !== JSON.stringify(nextPers);
  if (isPersonalizadosChanged) {
    sections.push({
      moduleId: 'personalizados',
      label: 'Personalizados',
      selector: '[data-field="personalizados.settings"]',
    });
  }

  return sections;
}

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
  if (
    prev.about?.body !== next.about?.body ||
    prev.about?.paragraph1 !== next.about?.paragraph1 ||
    prev.about?.paragraph2 !== next.about?.paragraph2
  ) {
    changes.push(`Sobre Mim: texto da biografia editado`);
  }
  if (prev.about?.photoUrl !== next.about?.photoUrl) {
    changes.push(`Sobre Mim: foto de perfil alterada`);
  }

  // Conteúdos & Packs (Avulsos)
  const prevPacksCount = prev.avulsos?.items?.length || 0;
  const nextPacksCount = next.avulsos?.items?.length || 0;
  if (prevPacksCount !== nextPacksCount) {
    changes.push(`Packs: catálogo agora com ${nextPacksCount} itens (antes ${prevPacksCount})`);
  } else if (JSON.stringify(prev.avulsos) !== JSON.stringify(next.avulsos)) {
    changes.push(`Packs: informações ou mídias de pacotes autorais editadas`);
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

  // Personalizados
  const prevPersFull = {
    ...DEFAULT_PERSONALIZADOS_SETTINGS,
    ...(prev.personalizados || {}),
    deliveryMethods: {
      ...DEFAULT_PERSONALIZADOS_SETTINGS.deliveryMethods,
      ...(prev.personalizados?.deliveryMethods || {}),
    },
  };
  const nextPersFull = {
    ...DEFAULT_PERSONALIZADOS_SETTINGS,
    ...(next.personalizados || {}),
    deliveryMethods: {
      ...DEFAULT_PERSONALIZADOS_SETTINGS.deliveryMethods,
      ...(next.personalizados?.deliveryMethods || {}),
    },
  };
  if (JSON.stringify(cleanContentObject(prevPersFull)) !== JSON.stringify(cleanContentObject(nextPersFull))) {
    changes.push(`Personalizados: regras e preços configurados`);
  }

  return changes.length > 0 ? changes : ['Ajuste de formatação / metadados'];
}
