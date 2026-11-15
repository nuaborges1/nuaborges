'use client';

import React, { useState, useEffect } from 'react';
import { cleanBrlInput, formatBrlPrice, parseBrlPrice } from '@/lib/formatters';

interface BrlCurrencyInputProps {
  value: string | number | undefined;
  onChange: (formatted: string, numeric: number) => void;
  onBlur?: (formatted: string, numeric: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  prefix?: string;
}

export function BrlCurrencyInput({
  value,
  onChange,
  onBlur,
  placeholder = '0,00',
  className = '',
  disabled = false,
  required = false,
  autoFocus = false,
  prefix = 'R$',
}: BrlCurrencyInputProps) {
  const [internalVal, setInternalVal] = useState<string>('');

  useEffect(() => {
    if (value === undefined || value === null || value === '') {
      setInternalVal('');
    } else {
      setInternalVal(cleanBrlInput(value));
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir teclas de navegação, edição e controle
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Enter',
      'Escape',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];

    if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
      return;
    }

    // Permitir dígitos 0-9
    if (/^[0-9]$/.test(e.key)) {
      return;
    }

    // Permitir vírgula ou ponto (apenas uma vírgula no total)
    if ((e.key === ',' || e.key === '.') && !internalVal.includes(',')) {
      return;
    }

    // Bloqueia qualquer outra tecla (letras, símbolos etc.)
    e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = cleanBrlInput(raw);
    setInternalVal(cleaned);
    const parsed = parseBrlPrice(cleaned);
    onChange(cleaned, parsed);
  };

  const handleBlur = () => {
    if (!internalVal.trim()) {
      const formatted = '0,00';
      setInternalVal(formatted);
      onChange(formatted, 0);
      onBlur?.(formatted, 0);
      return;
    }

    const formatted = formatBrlPrice(internalVal);
    const parsed = parseBrlPrice(formatted);
    setInternalVal(formatted);
    onChange(formatted, parsed);
    onBlur?.(formatted, parsed);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const cleaned = cleanBrlInput(pasted);
    if (cleaned) {
      const formatted = formatBrlPrice(cleaned);
      const parsed = parseBrlPrice(formatted);
      setInternalVal(formatted);
      onChange(formatted, parsed);
    }
  };

  return (
    <div className="relative flex-1 flex items-center">
      {prefix && (
        <span className="text-xs font-mono text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none select-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        value={internalVal}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder={placeholder}
        className={
          className ||
          `w-full ${prefix ? 'pl-9' : 'px-3'} pr-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 font-mono text-xs font-bold text-white outline-none focus:border-[#f4a7b9] transition-colors`
        }
      />
    </div>
  );
}
