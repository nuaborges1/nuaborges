/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X as CloseIcon } from 'lucide-react';
import { SiteContent } from '@/lib/types';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileMenuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const pathname = usePathname();

  const resolveActiveSection = React.useCallback((): string => {
    if (activeSection) return activeSection;
    if (pathname === '/') return 'inicio';
    if (pathname.startsWith('/acervo')) return 'acervo';
    if (pathname.startsWith('/avulsos') || pathname.startsWith('/assistir')) return 'avulsos';
    if (pathname.startsWith('/chamadas')) return 'chamadas';
    if (pathname.startsWith('/personalizados')) return 'personalizados';
    if (pathname.startsWith('/sobre')) return 'sobre';
    if (pathname.startsWith('/contato')) return 'contato';
    if (pathname.startsWith('/conta') || pathname.startsWith('/minha-nua')) return 'conta';
    return '';
  }, [pathname, activeSection]);

  const [currentSection, setCurrentSection] = useState<string>(resolveActiveSection);

  useScrollLock(mobileMenuOpen);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const desktop = window.matchMedia('(min-width: 64rem)');
    const handleDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setMobileMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    desktop.addEventListener('change', handleDesktop);
    window.addEventListener('keydown', handleEscape);
    return () => {
      desktop.removeEventListener('change', handleDesktop);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setCurrentSection(resolveActiveSection());
  }, [pathname, activeSection, resolveActiveSection]);

  useEffect(() => {
    let lastScrolled = window.scrollY > 20;
    setScrolled(lastScrolled);
    const handleScroll = () => {
      const next = window.scrollY > 20;
      if (next !== lastScrolled) {
        lastScrolled = next;
        setScrolled(next);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Início', id: 'inicio', href: '/' },
    { label: 'Avulsos', id: 'avulsos', href: '/avulsos' },
    { label: 'Chamadas', id: 'chamadas', href: '/chamadas' },
    { label: 'Personalizados', id: 'personalizados', href: '/personalizados' },
    { label: 'Sobre mim', id: 'sobre', href: '/sobre' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-[background-color,border-color] duration-300 ${
        scrolled
          ? 'bg-black border-white/[0.06]'
          : 'bg-gradient-to-b from-black/75 via-black/25 to-transparent border-transparent'
      }`}
    >
      <div className="h-16 sm:h-[72px] max-w-[72rem] mx-auto px-4 sm:px-8 md:px-10 lg:px-10 xl:px-12 flex items-center justify-between lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
        {/* Brand Logo — Tipografia Oficial Nua Borges */}
        <Link
          href="/"
          prefetch={false}
          className="group flex min-w-0 max-w-full items-center gap-1.5 select-none lg:justify-self-start"
          aria-label={`${brandName} — Página Inicial`}
          onClick={() => setMobileMenuOpen(false)}
        >
          <span className="font-serif text-[13px] sm:text-[15px] tracking-[0.22em] sm:tracking-[0.28em] uppercase text-zinc-100 font-medium group-hover:text-white transition-all duration-300 truncate">
            {brandName}
          </span>
          <span className="shrink-0 text-[#90364B] text-[10px] sm:text-xs font-sans font-light not-italic opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300">
            ♡
          </span>
        </Link>

        {/* Desktop Navigation — colunas laterais iguais mantêm os links centralizados */}
        <nav
          className="hidden lg:flex lg:justify-self-center items-center gap-5 xl:gap-6 text-[13px] tracking-wide"
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
                className={`relative py-1 transition-colors duration-200 font-light whitespace-nowrap ${
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

        <div className="flex lg:hidden items-center shrink-0">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileMenuOpen ? mobileMenuId : undefined}
            className="text-zinc-300 hover:text-white active:bg-white/8 w-11 h-11 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-colors touch-manipulation"
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
              className="fixed inset-0 top-16 sm:top-[72px] bg-black/65 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            <motion.div
              key="drawer"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-40 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] lg:hidden bg-[#0d0b0e]/98 border-b border-white/[0.08] px-5 py-4 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.85)]"
            >
              <nav id={mobileMenuId} className="flex flex-col gap-0.5 text-sm" aria-label="Menu mobile">
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
                {NUA_ID_ENABLED && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06]">
                    <Link
                      href="/conta"
                      prefetch={false}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={currentSection === 'conta' ? 'page' : undefined}
                      className={`flex items-center justify-between py-3 px-3 rounded-xl transition-colors text-[15px] font-light touch-manipulation ${
                        currentSection === 'conta'
                          ? 'text-[#F5EEE9] font-medium bg-[#661C30]/20 border border-[#661C30]/30'
                          : 'text-zinc-300 hover:text-[#F5EEE9] hover:bg-white/[0.03]'
                      }`}
                    >
                      <span>Minha Conta</span>
                    </Link>
                  </div>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
