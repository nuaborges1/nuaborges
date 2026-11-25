'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { HeroPhotoItem } from '@/lib/data';

const SLIDE_DURATION = 4200;

export function useHeroCarousel(photos: HeroPhotoItem[]) {
  const reduceMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const touchDeltaY = useRef<number>(0);

  const pauseTemporarily = useCallback((ms = 2500) => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, ms);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Autoplay
  useEffect(() => {
    if (photos.length <= 1 || reduceMotion) return;
    const timer = setInterval(() => {
      if (!isPaused && !document.hidden) {
        nextSlide();
      }
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide, photos.length, reduceMotion]);

  useEffect(() => () => { if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current); }, []);

  const handleMouseEnter = () => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      setIsPaused(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current !== null && touchStartY.current !== null) {
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
      touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null) {
      const isHorizontalSwipe =
        Math.abs(touchDeltaX.current) > 35 &&
        Math.abs(touchDeltaX.current) > Math.abs(touchDeltaY.current) * 1.2;
      if (isHorizontalSwipe) {
        pauseTemporarily(2800);
        if (touchDeltaX.current < -35) nextSlide();
        else if (touchDeltaX.current > 35) prevSlide();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
  };

  const safeIndex = currentIndex < photos.length ? currentIndex : 0;

  return {
    currentIndex,
    setCurrentIndex,
    safeIndex,
    nextSlide,
    prevSlide,
    pauseTemporarily,
    touchHandlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
  };
}
