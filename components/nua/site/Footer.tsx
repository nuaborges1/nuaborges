/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Instagram, Lock } from 'lucide-react';
import { SITE_DATA } from '@/lib/data';
import { SiteContent } from '@/lib/types';
import { isLocalhost } from '@/lib/envGuard';
import { CHAMADAS_PUBLIC_ENABLED } from '@/lib/featureFlags';

interface FooterProps {
  customFooterData?: SiteContent['footer'];
  customInstitutionalData?: SiteContent['institutional'];
}

export function Footer({ customFooterData, customInstitutionalData }: FooterProps) {
  const [, setIsLocal] = useState(false);

  useEffect(() => {
    setIsLocal(isLocalhost());
  }, []);

  const year = new Date().getFullYear();
  const brandName = customFooterData?.brandName || 'Nua Borges';
  const role = customFooterData?.role || SITE_DATA.creator.role;
  const concept = customFooterData?.concept || SITE_DATA.creator.concept;
  const copyrightText =
    customFooterData?.copyrightText ||
    `© ${year} ${brandName}. Todos os direitos reservados.`;
  const rawSignOff = customFooterData?.signOff || 'Deixa de vergonha';
  const signOff = rawSignOff.replace(/[\s♡]+$/, '').trim();

  const navLinks = [
    { label: 'Início', href: '/' },
    { label: 'Acervo VIP', href: '/acervo' },
    { label: 'Avulsos', href: '/avulsos' },
    { label: 'Chamadas', href: '/chamadas' },
    { label: 'Personalizados', href: '/personalizados' },
    { label: 'Sobre mim', href: '/sobre' },
    { label: 'Contato', href: '/contato' },
  ];

  const institutionalTitle = customInstitutionalData?.sectionTitle || 'Institucional';
  const rawInstitutionalLinks =
    customInstitutionalData?.links && customInstitutionalData.links.length > 0
      ? customInstitutionalData.links
      : [
          { id: 'def-termos', name: 'Termos de Uso', label: 'Termos de Uso', url: '/termos', active: true, order: 1 },
          { id: 'def-privacidade', name: 'Política de Privacidade', label: 'Política de Privacidade', url: '/privacidade', active: true, order: 2 },
        ];

  const activeInstitutionalLinks = rawInstitutionalLinks
    .filter((l) => l.active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <footer className="bg-black relative overflow-x-clip select-none border-t border-white/[0.06]" aria-label="Rodapé">
      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 py-8 sm:py-10">
        {/* Main Footer Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-center sm:items-start justify-between gap-6 sm:gap-8">
          
          {/* Brand & Concept Column */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5 max-w-sm">
            <Link
              href="/"
              prefetch={false}
              className="group inline-flex items-center gap-1.5 focus-visible:outline-none select-none"
              aria-label={`${brandName} — Voltar ao início`}
            >
              <span className="font-serif text-[14px] sm:text-[16px] tracking-[0.22em] sm:tracking-[0.26em] uppercase text-zinc-100 font-medium group-hover:text-white transition-all duration-300 whitespace-nowrap">
                {brandName}
              </span>
              <span className="text-[#90364B] text-[10px] sm:text-xs font-sans font-light not-italic opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300">
                ♡
              </span>
            </Link>
            <p className="text-zinc-400 text-xs sm:text-[13px] font-light leading-relaxed">
              {role}
              <span className="text-zinc-600 mx-1.5 hidden sm:inline">·</span>
              <br className="sm:hidden" />
              <span className="text-zinc-500">{concept}</span>
            </p>

            {/* Crédito discreto phdev.store (posicionado exatamente na coluna esquerda) */}
            <div className="mt-4 pt-3 border-t border-white/[0.05] w-full flex justify-center sm:justify-start">
              <a
                href="https://phdev.store"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors group text-[12px] font-light"
                title="phdev.store — Soluções Web & Software"
              >
                <span>Desenvolvido por</span>
                <span className="inline-flex items-center gap-1.5 text-zinc-400 group-hover:text-[#90364B] transition-colors">
                  <svg width="24" height="12" viewBox="0 0 34 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-zinc-400 group-hover:text-[#90364B] transition-colors">
                    <path d="M0 0H11C14 0 15.8 1.6 15.8 4.6C15.8 7.6 14 9.2 11 9.2H4.4V17H0V5.6H10.6C11.4 5.6 11.8 5.2 11.8 4.6C11.8 4 11.4 3.6 10.6 3.6H0V0Z" fill="currentColor"/>
                    <path d="M19 0H23.4V6.2H29.6V0H34V17H29.6V10.2H23.4V17H19V0Z" fill="currentColor"/>
                  </svg>
                  <strong className="font-semibold tracking-wider text-[11px] uppercase group-hover:text-white transition-colors">phdev.store</strong>
                </span>
              </a>
            </div>
          </div>

          {/* Navigation Links — Slugs limpos sem # */}
          <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left w-full sm:w-auto">
            <span className="text-zinc-500 text-[10px] font-semibold tracking-[0.25em] uppercase">
              Navegação
            </span>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-1.5 sm:flex-col sm:gap-2 sm:items-start" aria-label="Links do rodapé">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className="inline-flex items-center gap-2 text-zinc-400 hover:text-[#F5EEE9] text-xs sm:text-[13px] font-light transition-colors duration-200 py-0.5"
                >
                  <span>{item.label}</span>
                  {item.href === '/chamadas' && !CHAMADAS_PUBLIC_ENABLED && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#661C30]/20 border border-[#7A293D]/35 text-[#90364B] text-[9px] font-mono uppercase tracking-wider leading-none">
                      Em breve
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal Pages Column */}
          <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left w-full sm:w-auto">
            <span className="text-zinc-500 text-[10px] font-semibold tracking-[0.25em] uppercase">
              {institutionalTitle}
            </span>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-1.5 sm:flex-col sm:gap-2 sm:items-start" aria-label="Links institucionais e legais">
              {activeInstitutionalLinks.map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  className="text-zinc-400 hover:text-[#F5EEE9] text-xs sm:text-[13px] font-light transition-colors duration-200 py-0.5"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Platforms / Social links */}
          <div className="flex flex-col items-center sm:items-end gap-2.5 text-center sm:text-right w-full sm:w-auto">
            <span className="text-zinc-500 text-[10px] font-semibold tracking-[0.25em] uppercase">
              Plataformas
            </span>
            <div className="flex flex-wrap items-center justify-center sm:flex-col gap-2.5 sm:gap-2">
              <a
                href="https://www.instagram.com/nuaborges"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-300 hover:text-[#F5EEE9] hover:border-[#661C30]/40 transition-all text-xs font-light active:scale-95 touch-manipulation"
                aria-label="Instagram @nuaborges"
              >
                <Instagram className="w-3.5 h-3.5 text-[#90364B]" strokeWidth={1.8} />
                <span>@nuaborges</span>
              </a>

              <Link
                href="/acervo"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#661C30]/40 bg-[#661C30]/15 hover:bg-[#661C30] text-[#F5EEE9] hover:text-white transition-all text-xs font-medium active:scale-95 touch-manipulation shadow-[0_2px_10px_rgba(67,19,34,0.25)]"
                aria-label="OnlyFans de Nua Borges"
              >
                <Lock className="w-3 h-3 text-[#90364B] group-hover:text-white" strokeWidth={2.2} />
                <span>OnlyFans</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar divider & copyright */}
        <div className="border-t border-white/[0.05] mt-6 sm:mt-8 pt-4 sm:pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center text-xs">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-zinc-500 text-[11px] sm:text-xs font-light tracking-wide">
            <span>{copyrightText}</span>
            {activeInstitutionalLinks.map((item) => (
              <React.Fragment key={item.id}>
                <span className="hidden sm:inline text-zinc-700">•</span>
                <Link
                  href={item.url}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  className="hover:text-zinc-300 transition-colors"
                >
                  {item.label}
                </Link>
              </React.Fragment>
            ))}
          </div>
          <p className="text-zinc-400 text-[11px] sm:text-xs font-light flex items-center gap-1.5 font-serif italic">
            <span>{signOff}</span>
            <span className="text-[#90364B]">♡</span>
          </p>
        </div>

        {/* Honeypot Scraper Trap */}
        <a
          href="/api/traps/scraper"
          aria-hidden="true"
          tabIndex={-1}
          rel="nofollow noopener"
          style={{
            display: 'none',
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
        >
          Verification trap
        </a>
      </div>
    </footer>
  );
}
