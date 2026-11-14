export const VALID_TYPES = [
  'bug',
  'feature',
  'improvement',
  'idea',
  'question',
  'content',
  'other',
] as const;
export type RequestType = (typeof VALID_TYPES)[number];

export const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type RequestPriority = (typeof VALID_PRIORITIES)[number];

export const VALID_SCOPES = [
  'garantia',
  'franquia_suporte',
  'homologacao_ajuste',
  'fora_de_escopo_orcamento',
  'a_confirmar_pelo_dev',
] as const;
export type ContractScope = (typeof VALID_SCOPES)[number];

export interface ProjectPhaseContext {
  phase?: 'desenvolvimento' | 'homologacao' | 'garantia';
  roundsUsed?: number;
  supportHoursUsedThisMonth?: number;
}

/**
 * Lista de caminhos conhecidos do repositório.
 */
export const KNOWN_FILES = [
  'components/Hero.tsx',
  'components/admin/HeroEditor.tsx',
  'components/GallerySection.tsx',
  'components/GalleryLightbox.tsx',
  'components/admin/GalleryEditor.tsx',
  'components/AboutSection.tsx',
  'components/admin/AboutEditor.tsx',
  'components/LinksSection.tsx',
  'components/ContactModal.tsx',
  'components/admin/ContactEditor.tsx',
  'components/MusicPlayer.tsx',
  'components/Footer.tsx',
  'components/admin/LibraryEditor.tsx',
  'components/admin/SeoEditor.tsx',
  'app/layout.tsx',
  'app/page.tsx',
  'app/admin/page.tsx',
  'app/contrato/page.tsx',
  'lib/generateContractPdf.ts',
  'app/termos/page.tsx',
  'app/privacidade/page.tsx',
  'components/admin/ClientRequestsEditor.tsx',
  'components/admin/RequestsCenter.tsx',
  'app/admingeral/page.tsx',
  'lib/contentStore.ts',
  'lib/types.ts',
] as const;
