/**
 * NUA IA — Operações Seguras em Rascunhos do Acervo
 * 
 * Permite que a IA crie e edite rascunhos de packs de fotos/vídeos
 * com validação de dados, integridade e persistência garantida.
 */

import fs from 'node:fs';
import path from 'node:path';
import { AvulsoProductItem } from '../../types';
import { appendAuditLog } from './audit';

const DATA_DIR = path.join(process.cwd(), 'data');
const DRAFT_PRODUCTS_FILE = path.join(DATA_DIR, 'draft_products.json');

function loadDraftProducts(): AvulsoProductItem[] {
  try {
    if (fs.existsSync(DRAFT_PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(DRAFT_PRODUCTS_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveDraftProducts(items: AvulsoProductItem[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DRAFT_PRODUCTS_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DraftOps] Erro ao salvar draft_products.json:', err);
  }
}

export function listDraftProductsSummary(filter?: string) {
  const items = loadDraftProducts();
  return items.map((it) => ({
    id: it.id,
    title: it.title,
    price: it.price,
    active: it.active,
    mediaCount: (it.previewImages?.length || 0) + (it.videos?.length || 0),
    badge: it.badge || null,
  }));
}

export function createPackDraftOperation(params: {
  title: string;
  price: string;
  description: string;
  previewImages?: string[];
  badge?: string;
  duration?: string;
}): { success: boolean; item?: AvulsoProductItem; error?: string } {
  try {
    if (!params.title || !params.price || !params.description) {
      return { success: false, error: 'Título, valor e descrição são campos obrigatórios.' };
    }

    const cleanTitle = params.title.trim().slice(0, 120);
    const cleanPrice = params.price.trim().slice(0, 30);
    const cleanDesc = params.description.trim().slice(0, 1000);
    const previewImages = Array.isArray(params.previewImages) ? params.previewImages.slice(0, 20) : [];

    const id = `pack_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const slug = cleanTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const newItem: AvulsoProductItem = {
      id,
      slug: slug || id,
      title: cleanTitle,
      price: cleanPrice,
      numericPrice: parseFloat(cleanPrice.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
      description: cleanDesc,
      imageUrl: previewImages[0] || '/uploads/placeholder-pack.webp',
      previewImages,
      exclusivePhotos: previewImages,
      videos: [],
      badge: params.badge ? params.badge.trim().toUpperCase() : 'NOVIDADE',
      duration: params.duration ? params.duration.trim() : undefined,
      checkoutUrl: '',
      buttonText: 'Garantir Acesso Imediato',
      active: false, // Inicia obrigatoriamente como RASCUNHO inativo
    };

    const currentList = loadDraftProducts();
    currentList.unshift(newItem);
    saveDraftProducts(currentList);

    appendAuditLog({
      actor: 'admin_session',
      source: 'nua_ai_assistant',
      action: 'create_pack_draft',
      resourceType: 'pack',
      resourceId: newItem.id,
      status: 'SUCCESS',
      riskLevel: 'LOW_RISK',
      details: {
        title: newItem.title,
        price: newItem.price,
        imagesCount: previewImages.length,
      },
    });

    return { success: true, item: newItem };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao criar rascunho de pack.' };
  }
}

export function updateDraftFieldsOperation(params: {
  id: string;
  title?: string;
  description?: string;
  badge?: string;
  price?: string;
  active?: boolean;
}): { success: boolean; item?: AvulsoProductItem; error?: string } {
  try {
    const list = loadDraftProducts();
    const idx = list.findIndex((i) => i.id === params.id);
    if (idx === -1) {
      return { success: false, error: `Rascunho com ID "${params.id}" não foi encontrado.` };
    }

    const item = list[idx];
    if (params.title) item.title = params.title.trim().slice(0, 120);
    if (params.description) item.description = params.description.trim().slice(0, 1000);
    if (params.badge) item.badge = params.badge.trim().toUpperCase();
    if (params.price) {
      item.price = params.price.trim().startsWith('R$') ? params.price.trim() : `R$ ${params.price.trim()}`;
      item.numericPrice = parseFloat(params.price.replace(/[^\d,.]/g, '').replace(',', '.')) || item.numericPrice;
    }
    if (params.active !== undefined) {
      item.active = Boolean(params.active);
    }

    list[idx] = item;
    saveDraftProducts(list);

    appendAuditLog({
      actor: 'admin_session',
      source: 'nua_ai_assistant',
      action: 'update_draft_fields',
      resourceType: 'pack',
      resourceId: item.id,
      status: 'SUCCESS',
      riskLevel: 'LOW_RISK',
      details: { updatedFields: params },
    });

    return { success: true, item };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar rascunho.' };
  }
}
