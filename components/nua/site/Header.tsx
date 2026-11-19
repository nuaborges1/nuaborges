/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Instagram, Lock, Menu, User, X as CloseIcon } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { isLocalhost } from '@/lib/envGuard';
import { useScrollLock } from '@/hooks/useScrollLock';
import { CHAMADAS_PUBLIC_ENABLED, NUA_ID_ENABLED } from '@/lib/featureFlags';

interface HeaderProps {
  onOpenExclusive?: () => void;
  onOpenContact?: () => void;
  activeSection?: string;
  customHeaderData?: SiteContent['header'];
}

export function Header({ activeSection, customHeaderData }: HeaderProps) {
  const brandName = customHeaderData?.brandName || 'Nua Borges';
  const showInstagram = customHeaderData?.showInstagram !== false;
  const showOnlyFans = customHeaderData?.showOnlyFans !== false;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [, setIsLocal] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const pathname = usePathname();

  // Resolva a rota/seção ativa com base no pathname limpo (sem #)
  const resolveActiveSection = React.useCallback((): string => {
    if (activeSection) return activeSection;
    if (pathname === '/') return 'inicio';
    if (pathname.startsWith('/acervo')) return 'acervo';
    if (pathname.startsWith('/avulsos') || pathname.startsWith('/assistir')) return 'avulsos';
    if (pathname.startsWith('/chamadas')) return 'chamadas';
    if (pathname.startsWith('/personalizados')) return 'personalizados';
    if (pathname.startsWith('/sobre')) return 'sobre';
    if (pathname.startsWith('/contato')) return 'contato';
    if (pathname.startsWith('/minha-nua')) return 'minha-nua';
    return '';
  }, [pathname, activeSection]);

  const [currentSection, setCurrentSection] = useState<string>(resolveActiveSection);

  useScrollLock(mobileMenuOpen);

  useEffect(() => {
    setIsLocal(isLocalhost());
  }, []);

  useEffect(() => {
    setCurrentSection(resolveActiveSection());
  }, [pathname, activeSection, resolveActiveSection]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Início', id: 'inicio', href: '/' },
    { label: 'Acervo VIP', id: 'acervo', href: '/acervo' },
    { label: 'Avulsos', id: 'avulsos', href: '/avulsos' },
    { label: 'Chamadas', id: 'chamadas', href: '/chamadas' },
    { label: 'Personalizados', id: 'personalizados', href: '/personalizados' },
    { label: 'Sobre mim', id: 'sobre', href: '/sobre' },
    { label: 'Contato', id: 'contato', href: '/contato' },
  ];

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-black/94 backdrop-blur-xl border-b border-white/[0.05] py-3 shadow-[0_1px_40px_rgba(0,0,0,0.7)]'
          : 'bg-gradient-to-b from-black/75 via-black/25 to-transparent py-4 sm:py-5'
      }`}
    >
      <div className="max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-12 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          prefetch={false}
          className="group flex items-center gap-1.5 select-none"
          aria-label={`${brandName} — Página Inicial`}
          onClick={() => {
            setMobileMenuOpen(false);
          }}
        >
          <span className="font-serif text-[13px] sm:text-[15px] tracking-[0.22em] sm:tracking-[0.28em] uppercase text-zinc-100 font-medium group-hover:text-white transition-all duration-300 whitespace-nowrap">
            {brandName}
          </span>
          <span className="text-[#90364B] text-[10px] sm:text-xs font-sans font-light not-italic opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300">
            ♡
          </span>
        </Link>

        {/* Desktop Navigation — Slugs limpos sem # */}
        <nav
          className="hidden md:flex items-center gap-7 text-[13px] tracking-wide"
          aria-label="Navegação principal"
        >
          {navItems.map((item) => {
            const isActive = currentSection === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-1 transition-colors duration-200 font-light ${
                  isActive ? 'text-[#F5EEE9] font-medium' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute -bottom-1.5 left-0 right-0 h-[1.5px] bg-gradient-to-r from-[#661C30] via-[#7A293D] to-[#90364B] rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 36 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right */}
        <div className="hidden md:flex items-center gap-3 text-zinc-300">
          {showInstagram && (
            <a
              href="https://www.instagram.com/nuaborges"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram de ${brandName}`}
              className="text-zinc-400 hover:text-[#F5EEE9] transition-all duration-200 p-2 rounded-full hover:bg-white/[0.05] border border-transparent hover:border-white/10"
            >
              <Instagram className="w-[17px] h-[17px]" strokeWidth={1.7} />
            </a>
          )}

          {NUA_ID_ENABLED && (
            <Link
              href="/minha-nua"
              prefetch={false}
              aria-label="Acessar Minha NUA"
              className={`inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border text-[11px] font-medium tracking-wider uppercase transition-all duration-200 ${
                currentSection === 'minha-nua'
                  ? 'border-[#90364B] bg-[#431322]/60 text-[#F5EEE9]'
                  : 'border-white/10 hover:border-[#7A293D]/60 text-zinc-300 hover:text-[#F5EEE9] hover:bg-white/[0.04]'
              }`}
            >
              <User className="w-3 h-3" />
              <span>Minha NUA</span>
            </Link>
          )}

          {showOnlyFans && (
            <Link
              href="/acervo"
              className="inline-flex items-center gap-2 px-4 py-[7px] rounded-full border border-[#661C30]/40 hover:border-[#7A293D] bg-gradient-to-r from-[#431322]/40 to-[#661C30]/30 hover:from-[#431322] hover:to-[#661C30] text-[#F5EEE9] text-[11px] font-semibold tracking-wider uppercase transition-all duration-200 shadow-[0_2px_12px_rgba(67,19,34,0.25)] hover:shadow-[0_4px_16px_rgba(102,28,48,0.4)]"
              aria-label="Acessar Acervo Exclusivo"
            >
              <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
              <span>Acervo VIP</span>
            </Link>
          )}
        </div>

        {/* Mobile Buttons */}
        <div className="flex md:hidden items-center gap-1.5">
          {NUA_ID_ENABLED && (
            <Link
              href="/minha-nua"
              prefetch={false}
              aria-label="Acessar Minha NUA"
              className="text-zinc-200 bg-white/[0.05] active:bg-white/10 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center transition-all touch-manipulation"
            >
              <User className="w-[15px] h-[15px]" strokeWidth={1.8} />
            </Link>
          )}

          {showOnlyFans && (
            <Link
              href="/acervo"
              aria-label="Acessar Acervo Exclusivo"
              className="text-[#F5EEE9] bg-gradient-to-br from-[#431322] to-[#661C30] active:from-[#350f1b] active:to-[#431322] w-10 h-10 rounded-full border border-[#7A293D]/40 flex items-center justify-center transition-all shadow-[0_2px_10px_rgba(67,19,34,0.3)] touch-manipulation"
            >
              <Lock className="w-[15px] h-[15px]" strokeWidth={2} />
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            className="text-zinc-300 hover:text-white active:bg-white/8 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-colors touch-manipulation"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileMenuOpen ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 45, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <CloseIcon className="w-5 h-5" />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ rotate: 45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -45, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Menu className="w-5 h-5" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 top-[56px] bg-black/65 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            <motion.div
              key="drawer"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-40 md:hidden bg-[#0d0b0e]/98 border-b border-white/[0.08] px-5 py-4 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.85)]"
            >
              <nav className="flex flex-col gap-0.5 text-sm" aria-label="Menu mobile">
                {navItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.16, delay: i * 0.04 }}
                  >
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={currentSection === item.id ? 'page' : undefined}
                      className={`flex items-center justify-between py-3 px-3 rounded-xl transition-colors text-[15px] font-light touch-manipulation ${
                        currentSection === item.id
                          ? 'text-[#F5EEE9] font-medium bg-[#661C30]/20 border border-[#661C30]/30'
                          : 'text-zinc-400 hover:text-[#F5EEE9] hover:bg-white/[0.03]'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.id === 'chamadas' && !CHAMADAS_PUBLIC_ENABLED && (
                        <span className="px-2 py-0.5 rounded-full bg-[#661C30]/20 border border-[#7A293D]/40 text-[#90364B] text-[9px] font-mono uppercase tracking-[0.18em]">
                          Em breve
                        </span>
                      )}
                    </Link>
                  </motion.div>
                ))}

                <div className="pt-3 mt-2 border-t border-white/[0.08] flex items-center justify-between gap-3">
                  {showInstagram && (
                    <a
                      href="https://www.instagram.com/nuaborges"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-zinc-400 hover:text-[#F5EEE9] py-2.5 px-3 rounded-xl active:bg-white/5 touch-manipulation transition-colors"
                    >
                      <Instagram className="w-4.5 h-4.5" strokeWidth={1.7} />
                      <span className="text-sm font-light">@nuaborges</span>
                    </a>
                  )}

                  {NUA_ID_ENABLED && (
                    <Link
                      href="/minha-nua"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-white/12 text-[#F5EEE9] text-[11px] font-medium uppercase tracking-wider min-h-[44px] touch-manipulation"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Minha NUA</span>
                    </Link>
                  )}

                  {showOnlyFans && (
                    <Link
                      href="/acervo"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] active:from-[#350f1b] active:to-[#431322] text-white text-[11px] font-bold uppercase tracking-wider min-h-[44px] shadow-[0_4px_16px_rgba(102,28,48,0.35)] touch-manipulation"
                    >
                      <Lock className="w-3 h-3" strokeWidth={2.5} />
                      <span>Acervo VIP</span>
                    </Link>
                  )}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
