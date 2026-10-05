'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Instagram, Lock } from 'lucide-react';
import { HeartOutlineIcon } from './Icons';
import { SITE_DATA } from '@/lib/data';
import { SiteContent } from '@/lib/types';
import { isLocalhost } from '@/lib/envGuard';

interface FooterProps {
  customFooterData?: SiteContent['footer'];
  customInstitutionalData?: SiteContent['institutional'];
}

export function Footer({ customFooterData, customInstitutionalData }: FooterProps) {
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    setIsLocal(isLocalhost());
  }, []);

  const pathname = usePathname();
  const isHomePage = pathname === '/';
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
    { label: 'Início', href: isHomePage ? '#inicio' : '/#inicio' },
    { label: 'Galeria', href: isHomePage ? '#galeria' : '/#galeria' },
    { label: 'Sobre mim', href: isHomePage ? '#sobre-mim' : '/#sobre-mim' },
    { label: 'Canais', href: isHomePage ? '#links' : '/#links' },
    ...(isLocal ? [{ label: 'Blog', href: '/blog' }] : []),
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
    <footer className="bg-black relative select-none border-t border-white/[0.06]" aria-label="Rodapé">
      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 py-8 sm:py-10">
        {/* Main Footer Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-center sm:items-start justify-between gap-6 sm:gap-8">
          
          {/* Brand & Concept Column */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5 max-w-sm">
            <Link
              href={isHomePage ? '#inicio' : '/#inicio'}
              prefetch={false}
              className="group inline-flex items-center gap-1.5 focus-visible:outline-none select-none"
              aria-label={`${brandName} — Voltar ao início`}
            >
              <span className="font-serif text-[14px] sm:text-[16px] tracking-[0.22em] sm:tracking-[0.26em] uppercase text-zinc-100 font-medium group-hover:text-white transition-all duration-300 whitespace-nowrap">
                {brandName}
              </span>
              <span className="text-[#f4a7b9] text-[10px] sm:text-xs font-sans font-light not-italic opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                ♡
              </span>
            </Link>
            <p className="text-zinc-400 text-xs sm:text-[13px] font-light leading-relaxed">
              {role}
              <span className="text-zinc-600 mx-1.5 hidden sm:inline">·</span>
              <br className="sm:hidden" />
              <span className="text-zinc-500">{concept}</span>
            </p>
          </div>

          {/* Navigation Links */}
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
                  className="text-zinc-400 hover:text-[#f4a7b9] text-xs sm:text-[13px] font-light transition-colors duration-200 py-0.5"
                >
                  {item.label}
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
                  className="text-zinc-400 hover:text-[#f4a7b9] text-xs sm:text-[13px] font-light transition-colors duration-200 py-0.5"
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
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-300 hover:text-[#f4a7b9] hover:border-[#f4a7b9]/30 transition-all text-xs font-light active:scale-95 touch-manipulation"
                aria-label="Instagram @nuaborges"
              >
                <Instagram className="w-3.5 h-3.5 text-[#f4a7b9]" strokeWidth={1.8} />
                <span>@nuaborges</span>
              </a>

              <a
                href="https://onlyfans.com/nuaborges"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#f4a7b9]/30 bg-[#f4a7b9]/10 hover:bg-[#f4a7b9]/20 text-[#f4a7b9] transition-all text-xs font-medium active:scale-95 touch-manipulation"
                aria-label="OnlyFans de Nua Borges"
              >
                <Lock className="w-3 h-3 text-[#f4a7b9]" strokeWidth={2.2} />
                <span>OnlyFans</span>
              </a>
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
            <span className="text-[#f4a7b9]">♡</span>
          </p>
        </div>

        {/* Honeypot Scraper Trap: Oculto para humanos e leitores de tela; seguido apenas por scrapers automatizados */}
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
