/**
 * ==============================================================================
 * APPEARANCE — NUA BORGES
 * ==============================================================================
 * Tipos e configurações de aparência visual do site.
 * Permite que a cliente personalize cores, fontes e ordem das seções
 * sem necessidade de conhecimento técnico.
 * ==============================================================================
 */

// ---------------------------------------------------------------------------
// 1. Paleta de Cores
// ---------------------------------------------------------------------------

export interface ColorPalette {
  /** Cor de destaque principal (botões, links, bordas ativas) */
  accent: string;
  /** Cor de fundo principal */
  background: string;
  /** Cor de fundo de cards e painéis secundários */
  surface: string;
  /** Cor de texto principal */
  textPrimary: string;
  /** Cor de texto secundário / subtítulos */
  textSecondary: string;
}

// ---------------------------------------------------------------------------
// 2. Presetes de Tema (combinações pré-definidas)
// ---------------------------------------------------------------------------

export type SiteThemePreset =
  | 'noir'        // Fundo preto, tons rosas/magenta
  | 'blush'       // Tons rosa claro e creme
  | 'midnight'    // Azul-escuro profundo com dourado
  | 'ivory'       // Branco e bege elegante
  | 'custom';     // Personalizado manualmente

export const THEME_PRESETS: Record<Exclude<SiteThemePreset, 'custom'>, ColorPalette> = {
  noir: {
    accent: '#e91e8c',
    background: '#0a0a0a',
    surface: '#141414',
    textPrimary: '#f5f5f5',
    textSecondary: '#a0a0a0',
  },
  blush: {
    accent: '#d4597a',
    background: '#fdf6f8',
    surface: '#fff0f4',
    textPrimary: '#2d1a22',
    textSecondary: '#7a4c5e',
  },
  midnight: {
    accent: '#c9a84c',
    background: '#0d0f1a',
    surface: '#13162a',
    textPrimary: '#f0ede6',
    textSecondary: '#8f8c84',
  },
  ivory: {
    accent: '#a07050',
    background: '#faf8f5',
    surface: '#f0ece6',
    textPrimary: '#1a1510',
    textSecondary: '#6b5e52',
  },
};

// ---------------------------------------------------------------------------
// 3. Estilo de Fonte
// ---------------------------------------------------------------------------

export type FontStylePreset =
  | 'elegant'     // Fontes serif refinadas
  | 'modern'      // Fontes sans-serif limpas
  | 'editorial'   // Mix editorial com serifa no título
  | 'minimal';    // Ultra minimalista

export const FONT_LABELS: Record<FontStylePreset, string> = {
  elegant: 'Elegante (Clássica)',
  modern: 'Moderno (Clean)',
  editorial: 'Editorial (Revisteiro)',
  minimal: 'Minimal (Simples)',
};

// ---------------------------------------------------------------------------
// 4. Ordem das Seções
// ---------------------------------------------------------------------------

export type SectionId =
  | 'hero'
  | 'gallery'
  | 'about'
  | 'channels'
  | 'contact';

export interface SectionOrderItem {
  id: SectionId;
  label: string;
  visible: boolean;
}

export const DEFAULT_SECTION_ORDER: SectionOrderItem[] = [
  { id: 'hero',     label: 'Apresentação',    visible: true },
  { id: 'gallery',  label: 'Galeria',         visible: true },
  { id: 'about',    label: 'Sobre Mim',       visible: true },
  { id: 'channels', label: 'Meus Links',      visible: true },
  { id: 'contact',  label: 'Contato',         visible: true },
];

// ---------------------------------------------------------------------------
// 5. Configuração Completa de Aparência
// ---------------------------------------------------------------------------

export interface SiteAppearance {
  /** Preset de tema escolhido */
  themePreset: SiteThemePreset;
  /** Paleta de cores (preenchida automaticamente pelo preset ou manualmente) */
  colors: ColorPalette;
  /** Estilo tipográfico */
  fontStyle: FontStylePreset;
  /** Ordem e visibilidade das seções */
  sectionOrder: SectionOrderItem[];
}

/** Valores padrão de aparência (tema noir — identidade visual da Nua) */
export const DEFAULT_APPEARANCE: SiteAppearance = {
  themePreset: 'noir',
  colors: THEME_PRESETS.noir,
  fontStyle: 'elegant',
  sectionOrder: DEFAULT_SECTION_ORDER,
};
