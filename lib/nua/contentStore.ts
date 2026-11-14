'use client';

/**
 * Re-export canônico para unificar a store de conteúdo do site e do admin da Nua Borges.
 * Garante fonte única de verdade (Single Source of Truth) evitando divergência entre lib/ e lib/nua/.
 */
export * from '@/lib/contentStore';
