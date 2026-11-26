'use client';

import { useEffect } from 'react';

const LAST_ORDER_KEY = 'nua_vault_last_order';

/**
 * Ponte de compatibilidade para links históricos (/cofre?order=... e /cofre#order=...&confirm=...).
 * Conduz o cliente diretamente à experiência unificada em /conta preservando:
 * - o contexto do pedido (?tab=biblioteca|personalizados&item=<order>)
 * - o token de confirmação de navegador estritamente no fragmento (#order=...&confirm=...)
 *   para nunca expô-lo em query strings, logs HTTP ou Referer.
 */
export default function CofreLegacyBridgePage() {
  useEffect(() => {
    try {
      const current = new URL(window.location.href);
      const fragment = new URLSearchParams(current.hash.replace(/^#/, ''));
      let rememberedOrder = '';
      try {
        rememberedOrder = sessionStorage.getItem(LAST_ORDER_KEY) || '';
        sessionStorage.removeItem(LAST_ORDER_KEY);
      } catch {}

      const order = (
        fragment.get('order') ||
        current.searchParams.get('order') ||
        current.searchParams.get('item') ||
        rememberedOrder
      ).trim();
      const confirmToken = (fragment.get('confirm') || '').trim();

      const target = new URL('/conta', window.location.origin);
      if (order) {
        const isCustom = /^(ped_|pers_)/i.test(order);
        target.searchParams.set('tab', isCustom ? 'personalizados' : 'biblioteca');
        target.searchParams.set('item', order);
      } else {
        target.searchParams.set('tab', 'biblioteca');
      }

      if (order && confirmToken) {
        target.hash = new URLSearchParams({ order, confirm: confirmToken }).toString();
      }

      window.location.replace(target.toString());
    } catch {
      window.location.replace('/conta?tab=biblioteca');
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <div className="w-7 h-7 rounded-full border-2 border-[#661C30] border-t-transparent animate-spin" />
        <p className="text-[11px] font-mono uppercase tracking-[0.2em]">
          Abrindo sua Área Privada...
        </p>
      </div>
    </div>
  );
}
