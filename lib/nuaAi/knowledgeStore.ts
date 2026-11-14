/**
 * NUA IA — Gerenciador de Conhecimento Consolidado (Camada 3 - KNOWLEDGE)
 * 
 * Fonte única de verdade sobre o site público da Nua Borges e o Admin da cliente.
 * 
 * Regras Estritas:
 * 1. O Admin Geral (admingeral) NÃO faz parte deste Knowledge.
 * 2. Conhecimento detalhado e granular: página → seção → componente → conteúdo → comportamento → Admin.
 * 3. Mapeamento explícito: Admin → aba → campo → efeito no site público.
 * 4. Textos reais e atualizados com versionamento.
 * 5. Conhecimento não significa controle: a IA explica e contextualiza, mas não executa alterações técnicas.
 * 6. Formatação rica em Markdown com elegância e emojis com bom gosto.
 */

import fs from 'node:fs';
import path from 'node:path';
import { KnowledgeItem, KnowledgeBase, SiteAdminKnowledgeBase } from './knowledgeTypes';
import { tryLocalKnowledgeResponse } from './localResponses';

export type { KnowledgeItem, KnowledgeBase, SiteAdminKnowledgeBase };
export { tryLocalKnowledgeResponse };

let cachedKnowledge: KnowledgeBase | null = null;
let lastKnowledgeMtime = 0;

let cachedSiteKnowledge: SiteAdminKnowledgeBase | null = null;
let lastSiteKnowledgeMtime = 0;

function resolveKnowledgePath(): string {
  return path.resolve(process.cwd(), 'nua-ai', 'knowledge', 'nua-knowledge.json');
}

function resolveSiteKnowledgePath(): string {
  return path.resolve(process.cwd(), 'nua-ai', 'knowledge', 'site-admin-knowledge.json');
}

/**
 * Carrega a base geral de branding com cache em RAM.
 */
export function getLoadedKnowledge(): KnowledgeBase {
  const filePath = resolveKnowledgePath();

  try {
    if (!fs.existsSync(filePath)) {
      return { version: '1.0', lastUpdated: new Date().toISOString(), items: [] };
    }
    const stats = fs.statSync(filePath);
    if (cachedKnowledge && stats.mtimeMs <= lastKnowledgeMtime) {
      return cachedKnowledge;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    cachedKnowledge = JSON.parse(raw);
    lastKnowledgeMtime = stats.mtimeMs;
    return cachedKnowledge!;
  } catch (err) {
    console.warn('[KnowledgeStore] Erro ao ler base nua-knowledge.json:', err);
    return cachedKnowledge || { version: '1.0', lastUpdated: new Date().toISOString(), items: [] };
  }
}

/**
 * Carrega a base dedicada e granular do site público e admin da cliente.
 */
export function getLoadedSiteKnowledge(): SiteAdminKnowledgeBase | null {
  const filePath = resolveSiteKnowledgePath();

  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const stats = fs.statSync(filePath);
    if (cachedSiteKnowledge && stats.mtimeMs <= lastSiteKnowledgeMtime) {
      return cachedSiteKnowledge;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    cachedSiteKnowledge = JSON.parse(raw);
    lastSiteKnowledgeMtime = stats.mtimeMs;
    return cachedSiteKnowledge;
  } catch (err) {
    console.warn('[KnowledgeStore] Erro ao ler base site-admin-knowledge.json:', err);
    return cachedSiteKnowledge;
  }
}

/**
 * Busca itens de conhecimento pertinentes tanto na base geral quanto no site/admin.
 */
export function searchKnowledge(query: string): KnowledgeItem[] {
  const kb = getLoadedKnowledge();
  const siteKb = getLoadedSiteKnowledge();
  const lower = query.toLowerCase();
  const matched: KnowledgeItem[] = [];

  // 1. Itens da base geral
  for (const item of kb.items) {
    if (item.status !== 'active') continue;
    if (
      lower.includes(item.category) ||
      lower.includes(item.title.toLowerCase()) ||
      item.content.toLowerCase().split(' ').some((w) => w.length > 4 && lower.includes(w))
    ) {
      matched.push(item);
    }
  }

  // 2. Itens granulares extraídos do site-admin-knowledge.json
  if (siteKb) {
    // Caso especial: Consulta específica sobre "explore o mundo" ou texto de convite/rodapé da capa
    if (lower.includes('explore') || lower.includes('mundo da nua') || (lower.includes('rodap') && lower.includes('capa')) || lower.includes('exploretext')) {
      matched.push({
        id: 'admin_map_hero_explore_text',
        category: 'admin_mapping',
        title: 'Mapeamento Admin: Texto de Convite do Rodapé da Capa (exploreText)',
        content: 'O texto "EXPLORE O MUNDO DA NUA ♥️" fica no rodapé da Capa (Hero) antes da galeria. Ele é 100% editável no Admin: acesse a aba "Início & Capa" no campo "Texto de Convite do Rodapé da Capa (Scroll)". Ao alterar, clique em "Publicar Alterações" no topo do painel.',
        confidence: 1.0,
        status: 'active',
        origin: 'site_admin_knowledge',
        updatedAt: siteKb.lastUpdated,
        version: 1,
      });
    }

    // Abas do Admin
    for (const tab of siteKb.clientAdmin.tabs) {
      const hasFieldMatch = tab.fields?.some((f: any) => {
        const name = typeof f === 'string' ? f : (f?.name || '');
        const label = typeof f === 'string' ? '' : (f?.label || '');
        const desc = typeof f === 'string' ? '' : (f?.description || '');
        const ph = typeof f === 'string' ? '' : (f?.placeholder || '');
        const target = `${name} ${label} ${desc} ${ph}`.toLowerCase();
        return lower.split(/\s+/).some((w) => w.length >= 4 && target.includes(w));
      });

      if (
        lower.includes(tab.id) ||
        lower.includes(tab.label.toLowerCase()) ||
        hasFieldMatch ||
        (lower.includes('aba') && tab.purpose.toLowerCase().split(' ').some((w) => w.length > 4 && lower.includes(w)))
      ) {
        matched.push({
          id: `tab_${tab.id}`,
          category: 'admin_tab',
          title: `Aba do Admin: ${tab.label}`,
          content: `Finalidade: ${tab.purpose}. Efeito no site: ${tab.effectOnSite}`,
          confidence: 1.0,
          status: 'active',
          origin: 'site_admin_knowledge',
          updatedAt: siteKb.lastUpdated,
          version: 1,
        });
      }
    }

    // Mapeamentos Admin -> Site
    for (const map of siteKb.adminToSiteMapping) {
      const isMapMatch =
        lower.includes(map.adminTab) ||
        lower.includes(map.siteLocation.toLowerCase()) ||
        lower.includes('onde') ||
        lower.includes('efeito') ||
        lower.includes('trocar') ||
        lower.includes('mudar') ||
        lower.includes('alterar') ||
        map.field.toLowerCase().split(/[\s/()]+/).some((w: string) => w.length >= 4 && lower.includes(w)) ||
        map.effect.toLowerCase().split(/\s+/).some((w: string) => w.length >= 5 && lower.includes(w));

      if (isMapMatch) {
        matched.push({
          id: `map_${map.adminTab}_${map.field.slice(0, 10)}`,
          category: 'admin_mapping',
          title: `Mapeamento Admin → Site (${map.adminTab})`,
          content: `No Admin (${map.adminTab} → ${map.field}): ${map.effect} Localização no site: ${map.siteLocation}.`,
          confidence: 0.95,
          status: 'active',
          origin: 'site_admin_knowledge',
          updatedAt: siteKb.lastUpdated,
          version: 1,
        });
      }
    }

    // FAQs catalogados
    if (siteKb.faqCatalog) {
      for (const faq of siteKb.faqCatalog) {
        const qLower = faq.question.toLowerCase();
        if (
          lower.split(/\s+/).filter((w) => w.length >= 4).some((w) => qLower.includes(w)) ||
          (lower.includes('explore') && qLower.includes('explore'))
        ) {
          matched.push({
            id: `faq_${faq.question.slice(0, 15).replace(/\s+/g, '_')}`,
            category: 'portal',
            title: `FAQ Admin: ${faq.question}`,
            content: faq.answer,
            confidence: 0.98,
            status: 'active',
            origin: 'site_admin_knowledge',
            updatedAt: siteKb.lastUpdated,
            version: 1,
          });
        }
      }
    }

    // Páginas do Site
    for (const page of siteKb.publicSite.pages) {
      if (
        lower.includes(page.route) ||
        lower.includes(page.name.toLowerCase()) ||
        (page.id === 'page_chamadas' && (lower.includes('chamada') || lower.includes('agenda'))) ||
        (page.id === 'page_termos' && (lower.includes('termos') || lower.includes('uso'))) ||
        (page.id === 'page_privacidade' && (lower.includes('privacidade') || lower.includes('lgpd'))) ||
        (page.id === 'page_contrato' && lower.includes('contrato'))
      ) {
        matched.push({
          id: `page_${page.id}`,
          category: 'site_page',
          title: `Página do Site: ${page.name} (${page.route})`,
          content: `${page.purpose}`,
          confidence: 0.95,
          status: 'active',
          origin: 'site_admin_knowledge',
          updatedAt: siteKb.lastUpdated,
          version: 1,
        });
      }
    }
  }

  return matched.slice(0, 5);
}
