'use client';

import React from 'react';
import { KONOHA_ASSETS } from '@/lib/phdev/konohagakure/protocols';

interface KonohaBackdropProps {
  criticalMode?: boolean;
  accentGlowHex?: string;
}

const TOP_LEAVES = [
  { src: KONOHA_ASSETS.effects.leafRed, cls: 'phdev-leaf-glide-a', style: { top: '8px', right: '6%', width: 28, height: 28, animationDelay: '0s' } },
  { src: KONOHA_ASSETS.effects.leafRed02, cls: 'phdev-leaf-glide-b', style: { top: '26px', right: '24%', width: 22, height: 22, animationDelay: '-3.4s' } },
  { src: KONOHA_ASSETS.effects.leafRed03, cls: 'phdev-leaf-glide-c', style: { top: '4px', right: '44%', width: 24, height: 24, animationDelay: '-7.1s' } },
  { src: KONOHA_ASSETS.effects.leafRed, cls: 'phdev-leaf-glide-b', style: { top: '48px', right: '12%', width: 19, height: 19, animationDelay: '-10.2s' } },
  { src: KONOHA_ASSETS.effects.leafRed02, cls: 'phdev-leaf-glide-a', style: { top: '18px', right: '60%', width: 18, height: 18, animationDelay: '-5.6s' } },
  { src: KONOHA_ASSETS.effects.leafRed03, cls: 'phdev-leaf-glide-c', style: { top: '62px', right: '34%', width: 16, height: 16, animationDelay: '-12.8s' } },
] as const;

const TOP_EMBERS = [
  { left: '14%', bottom: '28px', delay: '0s', size: 3 },
  { left: '29%', bottom: '42px', delay: '-2.1s', size: 2.5 },
  { left: '47%', bottom: '24px', delay: '-4.2s', size: 3.5 },
  { left: '64%', bottom: '36px', delay: '-1.3s', size: 3 },
  { left: '78%', bottom: '20px', delay: '-3.6s', size: 3.5 },
  { left: '91%', bottom: '34px', delay: '-5.2s', size: 2.5 },
] as const;

/**
 * Cenário panorâmico de Konohagakure ancorado EXCLUSIVAMENTE NO TOPO da área principal:
 * - Enquadramento preciso exibindo os 4 Hokages esculpidos e a lua carmesim no topo.
 * - Transição sedosa e invisível para o fundo escuro `#07080d` limpo no restante da interface.
 * - Folhas vermelhas e centelhas sutis integradas ao topo sem poluir a leitura abaixo.
 */
export function KonohaBackdrop({ criticalMode = false, accentGlowHex }: KonohaBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[340px] sm:h-[380px] overflow-hidden select-none"
    >
      {/* Paisagem panorâmica de Konoha enquadrada no topo (Hokages + lua vermelha) */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat transition-opacity duration-700"
        style={{
          backgroundImage: `url('${KONOHA_ASSETS.backgrounds.main}')`,
          backgroundPosition: 'center 24%',
          opacity: criticalMode ? 0.54 : 0.78,
        }}
      />

      {/* Bruma shinobi sutil deslizando no horizonte */}
      <div
        className="phdev-mist-drift absolute inset-x-0 top-[20%] h-[200px] blur-3xl"
        style={{
          background: criticalMode
            ? 'radial-gradient(ellipse 65% 55% at 55% 50%, rgba(185,28,28,0.30) 0%, transparent 72%)'
            : 'radial-gradient(ellipse 65% 55% at 55% 50%, rgba(99,102,241,0.14) 0%, rgba(225,59,71,0.10) 48%, transparent 74%)',
        }}
      />

      {/* Respiro luminoso da lua carmesim (ou aura sutil do protocolo aberto) */}
      <div
        className="phdev-sky-breath absolute -top-24 right-0 w-[560px] h-[300px] rounded-full blur-3xl"
        style={{
          background: criticalMode
            ? 'radial-gradient(circle, rgba(220,38,38,0.46) 0%, rgba(153,27,27,0.14) 55%, transparent 76%)'
            : accentGlowHex
              ? `radial-gradient(circle, ${accentGlowHex}3d 0%, rgba(185,37,48,0.10) 54%, transparent 76%)`
              : 'radial-gradient(circle, rgba(239,68,68,0.34) 0%, rgba(185,37,48,0.12) 52%, transparent 76%)',
        }}
      />

      {/* Máscara vertical de dissolução perfeita para o fundo `#07080d` (zero corte seco) */}
      <div
        className="absolute inset-0"
        style={{
          background: criticalMode
            ? 'linear-gradient(180deg, rgba(18,5,9,0.18) 0%, rgba(11,6,10,0.42) 38%, rgba(7,8,13,0.84) 76%, #07080d 100%)'
            : 'linear-gradient(180deg, rgba(7,8,13,0.14) 0%, rgba(7,8,13,0.34) 40%, rgba(7,8,13,0.82) 78%, #07080d 100%)',
        }}
      />

      {/* Vinheta suave na borda esquerda junto à sidebar */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(7,8,13,0.72) 0%, rgba(7,8,13,0.22) 18%, transparent 45%, rgba(7,8,13,0.30) 100%)',
        }}
      />

      {/* Folhas vermelhas planando na atmosfera do topo */}
      {TOP_LEAVES.map((leaf, index) => (
        <img
          key={index}
          src={leaf.src}
          alt=""
          className={`${leaf.cls} hidden sm:block absolute select-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]`}
          style={leaf.style}
        />
      ))}

      {/* Centelhas sutis subindo no horizonte */}
      {TOP_EMBERS.map((mote, index) => (
        <span
          key={index}
          className="phdev-ember-rise hidden md:block absolute rounded-full"
          style={{
            left: mote.left,
            bottom: mote.bottom,
            width: mote.size,
            height: mote.size,
            animationDelay: mote.delay,
            background: criticalMode ? '#f87171' : '#fb923c',
            boxShadow: criticalMode
              ? '0 0 8px 2px rgba(248,113,113,0.7)'
              : '0 0 8px 2px rgba(251,146,60,0.6)',
          }}
        />
      ))}
    </div>
  );
}
