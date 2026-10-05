'use client';

import React, { useEffect, useRef, ReactNode } from 'react';

// ─── Page-level entrance wrapper ───────────────────────────────────────────
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <div className={`page-enter ${className}`}>
      {children}
    </div>
  );
}

// ─── Scroll-reveal hook (Intersection Observer) ────────────────────────────
export function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          observer.disconnect(); // Fires only once
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}

// ─── Section reveal wrapper ────────────────────────────────────────────────
interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number; // ms
  as?: React.ElementType;
}

export function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (delay) el.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
