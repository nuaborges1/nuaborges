/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';

interface PublicBackgroundProps {
  className?: string;
}

/**
 * PublicBackground — Background editorial oficial e centralizado de Nua Borges.
 * Padrão canônico idêntico ao da página /chamadas:
 * - Preto absoluto (#000000)
 * - Glow difuso vinho profundo (#661C30 com opacidade 0.04) centralizado no topo com blur de 160px
 * - Totalmente transparente a cliques e interações (pointer-events-none)
 */
export function PublicBackground({ className = '' }: PublicBackgroundProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
      <div
        className={`absolute top-20 left-1/2 -translate-x-1/2 w-[min(600px,100%)] h-[350px] bg-[#661C30]/[0.04] rounded-full blur-[160px] pointer-events-none ${className}`}
      />
    </div>
  );
}

export default PublicBackground;
