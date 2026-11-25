/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Link from 'next/link';
import { Instagram, Lock } from 'lucide-react';
import { SITE_DATA } from '@/lib/data';
import { SiteContent } from '@/lib/types';
import { usePublishedContent } from '@/lib/contentStore';
import { CHAMADAS_PUBLIC_ENABLED, NUA_ID_ENABLED } from '@/lib/featureFlags';
import { sanitizeUrl } from '@/lib/security';

interface FooterProps {
  customFooterData?: SiteContent['footer'];
  customInstitutionalData?: SiteContent['institutional'];
  customChannelsData?: SiteContent['channels'];
}

export function Footer({
  customFooterData,
  customInstitutionalData,
  customChannelsData,
}: FooterProps) {
  const publishedContent = usePublishedContent();

  const year = new Date().getFullYear();
  const brandName = customFooterData?.brandName || 'Nua Borges';
  const role = customFooterData?.role || SITE_DATA.creator.role;
  const concept = customFooterData?.concept || SITE_DATA.creator.concept;
  const copyrightText =
    customFooterData?.copyrightText ||
    `© ${year} ${brandName} · Todos os direitos reservados.`;
  const rawSignOff = customFooterData?.signOff || 'Deixa de vergonha';
  const signOff = rawSignOff.replace(/[\s♡]+$/, '').trim();

  const exploreLinks = [
    { label: 'Início', href: '/' },
    { label: 'Acervo VIP', href: '/acervo' },
    { label: 'Avulsos', href: '/avulsos' },
    { label: 'Chamadas VIP', href: '/chamadas' },
    { label: 'Personalizados', href: '/personalizados' },
  ];

  const rawInstitutionalLinks =
    customInstitutionalData?.links && customInstitutionalData.links.length > 0
      ? customInstitutionalData.links
      : [
          { id: 'def-termos', name: 'Termos de Uso', label: 'Termos de Uso', url: '/termos', active: true, order: 1 },
          { id: 'def-privacidade', name: 'Política de Privacidade', label: 'Política de Privacidade', url: '/privacidade', active: true, order: 2 },
        ];

  const FIXED_INFO_PATHS = new Set(['/sobre', '/contato', '/conta']);
  const normalizeFooterPath = (raw: string) => raw.trim().replace(/\/+$/, '') || '/';
  const seenInfoUrls = new Set<string>(FIXED_INFO_PATHS);
  const activeInstitutionalLinks = rawInstitutionalLinks
    .filter((l) => l.active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .filter((l) => {
      const safe = sanitizeUrl(l.url, '#');
      const key = safe.startsWith('/') ? normalizeFooterPath(safe).toLowerCase() : safe.toLowerCase();
      if (!key || key === '#' || seenInfoUrls.has(key)) return false;
      seenInfoUrls.add(key);
      return true;
    });
  const infoSectionTitle = customInstitutionalData?.sectionTitle?.trim() || 'Informações';

  const channels = customChannelsData ?? publishedContent?.channels;
  const hasExplicitInstagram = channels?.instagram !== undefined;
  const rawInstagramUrl = hasExplicitInstagram
    ? channels?.instagram?.url || ''
    : 'https://www.instagram.com/nuaborges';
  const instagramUrl = sanitizeUrl(rawInstagramUrl, '');
  const showInstagram = /^https?:\/\//.test(instagramUrl);
  const customIgTitle = channels?.instagram?.title?.trim();
  const instagramLabel =
    (customIgTitle && customIgTitle.toLowerCase() !== 'instagram' ? customIgTitle : '') ||
    channels?.instagram?.handle ||
    '@nuaborges';
  const onlyFansUrl = sanitizeUrl(channels?.onlyfans?.url, '');
  const showOnlyFans = channels?.onlyfans?.active !== false && /^https?:\/\//.test(onlyFansUrl);
  const onlyFansTitle = channels?.onlyfans?.title || 'OnlyFans';
  const privacyUrl = sanitizeUrl(channels?.privacy?.url || '', '');
  const showPrivacy = channels?.privacy?.active !== false && /^https?:\/\//.test(privacyUrl);
  const privacyTitle = channels?.privacy?.title || 'Privacy';
  const hasAnyPlatform = showInstagram || showOnlyFans || showPrivacy;

  const linkClassName =
    'group inline-flex items-center gap-2 text-zinc-400 hover:text-[#F5EEE9] text-[13px] font-light leading-snug transition-colors duration-200 motion-reduce:transition-none motion-reduce:duration-0 py-0.5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#C97A8D] focus-visible:outline-offset-4 focus-visible:text-[#F5EEE9] focus-visible:underline underline-offset-4';

  const headingClassName =
    'text-zinc-500 text-[10px] font-semibold tracking-[0.24em] uppercase leading-none';

  return (
    <footer
      className="bg-black relative overflow-x-clip select-none border-t border-white/[0.06]"
      aria-label="Rodapé"
    >
      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 pt-10 pb-7 sm:pt-12 sm:pb-8">
        {/* Composição principal em 4 áreas equilibradas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.85fr)] items-start gap-y-8 gap-x-8 lg:gap-x-10">
          {/* Coluna 1 — Identidade NUA Borges */}
          <div className="flex flex-col items-start text-left gap-2.5 max-w-[270px]">
            <Link
              href="/"
              prefetch={false}
              className="group inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:underline underline-offset-4 select-none"
              aria-label={`${brandName} — Voltar ao início`}
            >
              <span className="font-serif text-[14px] sm:text-[15px] tracking-[0.24em] uppercase text-zinc-100 font-medium group-hover:text-white transition-colors duration-200 whitespace-nowrap">
                {brandName}
              </span>
              <span
                aria-hidden="true"
                className="text-[#90364B] text-[11px] font-sans font-light not-italic opacity-90 group-hover:opacity-100 transition-opacity duration-200"
              >
                ♡
              </span>
            </Link>

            <div className="space-y-1 text-[13px] font-light leading-relaxed">
              <p className="text-zinc-400">{role}</p>
              <p className="text-zinc-500">{concept}</p>
            </div>
          </div>

          {/* Coluna 2 — Explore */}
          <div className="flex flex-col items-start text-left gap-3.5">
            <span className={headingClassName}>Explore</span>
            <nav className="flex flex-col items-start gap-2" aria-label="Explore">
              {exploreLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={linkClassName}
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

          {/* Coluna 3 — Informações */}
          <div className="flex flex-col items-start text-left gap-3.5">
            <span className={headingClassName}>{infoSectionTitle}</span>
            <nav className="flex flex-col items-start gap-2" aria-label={infoSectionTitle}>
              <Link href="/sobre" prefetch={false} className={linkClassName}>
                Sobre mim
              </Link>
              <Link href="/contato" prefetch={false} className={linkClassName}>
                Contato
              </Link>
              {activeInstitutionalLinks.map((item) => (
                <Link
                  key={item.id}
                  href={sanitizeUrl(item.url, '#')}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  className={linkClassName}
                >
                  {item.label}
                </Link>
              ))}
              {NUA_ID_ENABLED && (
                <Link
                  href="/conta"
                  prefetch={false}
                  className={linkClassName}
                >
                  <Lock
                    aria-hidden="true"
                    className="w-3 h-3 shrink-0 text-[#90364B]/80 group-hover:text-[#C97A8D] transition-colors duration-200"
                    strokeWidth={1.9}
                  />
                  <span>Acesso privado</span>
                </Link>
              )}
            </nav>
          </div>

          {/* Coluna 4 — Plataformas */}
          {hasAnyPlatform && (
          <div className="flex flex-col items-start text-left gap-3.5">
            <span className={headingClassName}>Plataformas</span>
            <nav className="flex flex-col items-start gap-2" aria-label="Plataformas">
              {showInstagram && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
                aria-label={instagramLabel.toLowerCase().includes('instagram') ? instagramLabel : `Instagram ${instagramLabel}`}
              >
                <Instagram
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0 text-[#90364B]/85 group-hover:text-[#C97A8D] transition-colors duration-200"
                  strokeWidth={1.8}
                />
                <span>{instagramLabel}</span>
              </a>
              )}

              {showOnlyFans && (
                <a
                  href={onlyFansUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClassName}
                  aria-label={`${onlyFansTitle} de ${brandName}`}
                >
                  <Lock
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0 text-[#90364B]/85 group-hover:text-[#C97A8D] transition-colors duration-200"
                    strokeWidth={1.8}
                  />
                  <span>{onlyFansTitle}</span>
                </a>
              )}

              {showPrivacy && (
                <a
                  href={privacyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClassName}
                  aria-label={`${privacyTitle} de ${brandName}`}
                >
                  <Lock
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0 text-[#90364B]/85 group-hover:text-[#C97A8D] transition-colors duration-200"
                    strokeWidth={1.8}
                  />
                  <span>{privacyTitle}</span>
                </a>
              )}
            </nav>
          </div>
          )}
        </div>

        {/* Barra inferior — Linha 1: Identidade institucional */}
        <div className="border-t border-white/[0.06] mt-8 sm:mt-10 pt-5 sm:pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
            <p className="text-zinc-500 text-xs font-light tracking-wide leading-none">
              {copyrightText}
            </p>
            <p className="text-zinc-400 text-xs font-light inline-flex items-center gap-1.5 font-serif italic leading-none">
              <span>{signOff}</span>
              <span aria-hidden="true" className="text-[#90364B] not-italic font-sans">
                ♡
              </span>
            </p>
          </div>

          {/* Barra inferior — Linha 2: Assinatura PHDEV.STORE centralizada */}
          <div className="mt-4 pt-1 flex justify-center">
            <a
              href="https://phdev.store"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 text-zinc-500 transition-colors duration-200 focus-visible:outline-none focus-visible:underline underline-offset-4 py-1"
              title="phdev.store — Soluções Web & Software"
              aria-label="Desenvolvido por PHDEV.STORE"
            >
              <span className="text-[11px] font-light tracking-wide text-zinc-500 group-hover:text-zinc-400 transition-colors duration-200">
                Desenvolvido por
              </span>
              <span className="inline-flex items-center gap-1.5 text-zinc-400 group-hover:text-[#C97A8D] transition-colors duration-200">
                <svg
                  width="20"
                  height="10"
                  viewBox="0 0 34 17"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <path
                    d="M0 0H11C14 0 15.8 1.6 15.8 4.6C15.8 7.6 14 9.2 11 9.2H4.4V17H0V5.6H10.6C11.4 5.6 11.8 5.2 11.8 4.6C11.8 4 11.4 3.6 10.6 3.6H0V0Z"
                    fill="currentColor"
                  />
                  <path
                    d="M19 0H23.4V6.2H29.6V0H34V17H29.6V10.2H23.4V17H19V0Z"
                    fill="currentColor"
                  />
                </svg>
                <span className="font-medium tracking-[0.14em] text-[10.5px] uppercase text-zinc-300/90 group-hover:text-[#C97A8D] transition-colors duration-200">
                  PHDEV.STORE
                </span>
              </span>
            </a>
          </div>
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
