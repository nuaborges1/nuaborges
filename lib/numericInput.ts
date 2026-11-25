import type React from 'react';

const CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

/**
 * Remove qualquer caractere que não seja dígito 0-9.
 */
export function sanitizeDigitsOnly(value: string, maxLength?: number): string {
  const digits = String(value || '').replace(/\D/g, '');
  return typeof maxLength === 'number' ? digits.slice(0, maxLength) : digits;
}

/**
 * Mantém apenas dígitos e, opcionalmente, separador decimal (`.` ou `,`) e sinal negativo.
 */
export function sanitizeNumericText(
  value: string,
  options?: { allowDecimal?: boolean; allowNegative?: boolean }
): string {
  const allowDecimal = Boolean(options?.allowDecimal);
  const allowNegative = Boolean(options?.allowNegative);
  let raw = String(value || '').replace(/,/g, '.');
  const isNeg = allowNegative && raw.startsWith('-');
  raw = raw.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');
  if (allowDecimal) {
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = `${parts[0]}.${parts.slice(1).join('')}`;
    }
  }
  return isNeg ? `-${raw}` : raw;
}

/**
 * Handler de onKeyDown para bloquear letras e símbolos inválidos em campos numéricos.
 * Bloqueia inclusive `e`, `E`, `+` e `-` que o `<input type="number">` nativo normalmente permite.
 */
export function guardNumericKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  options?: { allowDecimal?: boolean; allowNegative?: boolean }
) {
  if (e.ctrlKey || e.metaKey || e.altKey || CONTROL_KEYS.has(e.key)) {
    return;
  }
  if (/^[0-9]$/.test(e.key)) {
    return;
  }
  if (options?.allowDecimal && (e.key === '.' || e.key === ',')) {
    return;
  }
  if (options?.allowNegative && e.key === '-') {
    return;
  }
  e.preventDefault();
}
