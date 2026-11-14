/**
 * Gerenciador centralizado de Bloqueio de Scroll (Scroll Lock)
 * com contagem de referências para suportar múltiplos modais/camadas abertos simultaneamente.
 *
 * Bloqueia tanto document.body quanto document.documentElement,
 * adicionando overscroll e touch containment para evitar qualquer vazamento
 * de rolagem para o site ao fundo (Desktop mousewheel, trackpad e Mobile touch drag).
 */

let activeLocks = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalBodyTouchAction = '';

export function lockScroll(): void {
  if (typeof document === 'undefined') return;

  if (activeLocks === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalHtmlOverflow = document.documentElement.style.overflow;
    originalBodyTouchAction = document.body.style.touchAction;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }
  activeLocks++;
}

export function unlockScroll(): void {
  if (typeof document === 'undefined') return;

  activeLocks = Math.max(0, activeLocks - 1);
  if (activeLocks === 0) {
    document.documentElement.style.overflow = originalHtmlOverflow || '';
    document.body.style.overflow = originalBodyOverflow || '';
    document.body.style.touchAction = originalBodyTouchAction || '';
  }
}
