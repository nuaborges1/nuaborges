'use client';

import React, { useEffect } from 'react';
import { X, Minus, Plus, Check } from 'lucide-react';
import type { HelpId } from '../help/types';
import { HelpTriggerButton } from '../help/HelpTriggerButton';
import { useFirstVisitHelp } from '../help/useFirstVisitHelp';

/* -------------------------------------------------------------------------- */
/* 1. PageHeader — Single top-level page header (fixed uniform typography)    */
/* -------------------------------------------------------------------------- */
export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  backAction?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  helpId?: HelpId;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  badge,
  actions,
  backAction,
  children,
  className = '',
  helpId,
}: PageHeaderProps) {
  useFirstVisitHelp(helpId);

  return (
    <header className={`pb-5 border-b border-white/[0.06] ${className}`}>
      {backAction && <div className="mb-3">{backAction}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="flex items-center gap-2 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              {eyebrow}
            </div>
          )}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[22px] font-semibold text-white tracking-tight leading-snug font-sans">
              {title}
            </h1>
            {badge}
            {helpId && <HelpTriggerButton helpId={helpId} />}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed font-normal font-sans">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. SectionHeader — Clean section heading without heavy containers          */
/* -------------------------------------------------------------------------- */
export interface SectionHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  badge,
  actions,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. FormSection — Clean surface block for logical form groups               */
/* -------------------------------------------------------------------------- */
export interface FormSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function FormSection({
  title,
  description,
  badge,
  actions,
  children,
  className = '',
  bodyClassName = '',
}: FormSectionProps) {
  return (
    <section
      className={`rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 sm:p-6 transition-colors ${className}`}
    >
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 mb-5 border-b border-white/[0.05]">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  {title}
                </h3>
                {badge}
              </div>
            )}
            {description && (
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. FormField — Accessible label + helper text + validation feedback        */
/* -------------------------------------------------------------------------- */
export interface FormFieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  rightLabel?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  rightLabel,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="block text-xs font-medium text-zinc-300"
        >
          {label}
          {required && <span className="text-rose-400 ml-1">*</span>}
        </label>
        {rightLabel && (
          <span className="text-[11px] text-zinc-400">{rightLabel}</span>
        )}
      </div>
      {children}
      {error ? (
        <p className="text-[11px] text-rose-400 font-medium">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-zinc-400 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. AdminTabs — Integrated secondary navigation                             */
/* -------------------------------------------------------------------------- */
export interface AdminTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
}

export interface AdminTabsProps<T extends string = string> {
  items: AdminTabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function AdminTabs<T extends string = string>({
  items,
  activeId,
  onChange,
  ariaLabel = 'Navegação secundária',
  className = '',
}: AdminTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#14161d] border border-white/[0.06] ${className}`}
    >
      {items.map((tab) => {
        const Icon = tab.icon;
        const active = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              active
                ? 'bg-[#e89bb0]/15 text-[#f3b6c7] border border-[#e89bb0]/30 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            {Icon && (
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  active ? 'text-[#e89bb0]' : 'text-zinc-400'
                }`}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  active
                    ? 'bg-[#e89bb0]/20 text-[#f3b6c7]'
                    : 'bg-white/[0.06] text-zinc-400'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. StatusBadge — Consistent semantic badge                                 */
/* -------------------------------------------------------------------------- */
export interface StatusBadgeProps {
  tone?: 'default' | 'pink' | 'emerald' | 'amber' | 'rose' | 'sky';
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({
  tone = 'default',
  dot = false,
  children,
  className = '',
}: StatusBadgeProps) {
  const toneStyles: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
    default: 'bg-white/[0.05] text-zinc-300 border-white/[0.08]',
    pink: 'bg-[#e89bb0]/15 text-[#f3b6c7] border-[#e89bb0]/30',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    sky: 'bg-sky-500/10 text-sky-300 border-sky-500/25',
  };

  const dotStyles: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
    default: 'bg-zinc-400',
    pink: 'bg-[#e89bb0]',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    sky: 'bg-sky-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${toneStyles[tone]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[tone]}`} />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. EmptyState — Discreet, informative empty state                          */
/* -------------------------------------------------------------------------- */
export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl bg-[#14161d] border border-white/[0.06] px-6 py-12 text-center flex flex-col items-center justify-center ${className}`}
    >
      {Icon && (
        <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3 text-zinc-400">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {description && (
        <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. SidePanel — Integrated lateral drawer for contextual inspection         */
/* -------------------------------------------------------------------------- */
export interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
  children: React.ReactNode;
}

export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  headerActions,
  footer,
  widthClassName = 'max-w-md sm:max-w-lg',
  children,
}: SidePanelProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex justify-end bg-black/60 backdrop-blur-[2px] animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <aside
        className={`relative w-full ${widthClassName} h-full bg-[#13151c] border-l border-white/[0.08] shadow-2xl flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/[0.07] bg-[#161821]">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-semibold text-white truncate">
              {title}
            </h2>
            {subtitle && (
              <div className="text-xs text-zinc-400 mt-0.5 truncate">
                {subtitle}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar painel lateral"
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {children}
        </div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-white/[0.07] bg-[#161821]">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. AdminCard — Base card container for all admin surfaces                   */
/* -------------------------------------------------------------------------- */
export interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function AdminCard({ children, className = '', ...props }: AdminCardProps) {
  return (
    <div
      className={`rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 sm:p-6 shadow-xs ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 10. AdminButton — Canonical standardized button (Primary, Ghost, Danger)    */
/* -------------------------------------------------------------------------- */
export interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

export function AdminButton({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  children,
  className = '',
  disabled,
  ...props
}: AdminButtonProps) {
  const variantStyles = {
    primary:
      'bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold shadow-xs disabled:opacity-50',
    secondary:
      'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/[0.08] disabled:opacity-40',
    ghost:
      'bg-transparent hover:bg-white/[0.05] text-zinc-400 hover:text-white disabled:opacity-40',
    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 disabled:opacity-40',
  };

  const sizeStyles = {
    sm: 'h-7 px-2.5 rounded-lg text-xs gap-1.5',
    md: 'h-9 px-3.5 rounded-xl text-xs gap-2',
    lg: 'h-10 px-4 rounded-xl text-sm gap-2.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium transition-colors cursor-pointer select-none whitespace-nowrap disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className={`${iconSizes[size]} shrink-0`} />}
      <span>{children}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* 11. AdminNumberStepper — Canonical + / - Stepper (From Personalizados)     */
/* -------------------------------------------------------------------------- */
export interface AdminNumberStepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  prefix?: string;
  variant?: 'card' | 'inline' | 'compact';
  disabled?: boolean;
  className?: string;
}

export function AdminNumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit,
  prefix,
  variant = 'card',
  disabled = false,
  className = '',
}: AdminNumberStepperProps) {
  const handleDecrement = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = Math.max(min, value - step);
    onChange(next);
  };

  const handleIncrement = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = max !== undefined ? Math.min(max, value + step) : value + step;
    onChange(next);
  };

  if (variant === 'inline') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 h-9 px-2 rounded-lg bg-[#0e1015] border border-white/[0.08] select-none ${className}`}
      >
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && value <= min)}
          className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          aria-label="Diminuir valor"
        >
          <Minus className="w-2.5 h-2.5" />
        </button>
        <div className="flex items-center justify-center gap-0.5">
          {prefix && <span className="text-zinc-500 text-xs font-mono shrink-0">{prefix}</span>}
          <input
            type="number"
            disabled={disabled}
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const num = parseFloat(e.target.value);
              if (!isNaN(num)) onChange(num);
            }}
            onBlur={(e) => {
              let num = parseFloat(e.target.value);
              if (isNaN(num)) num = min ?? 0;
              if (min !== undefined && num < min) num = min;
              if (max !== undefined && num > max) num = max;
              onChange(num);
            }}
            className="w-14 bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#f4a7b9] rounded py-0.5 px-1 font-mono text-xs font-bold text-white text-center outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {unit && <span className="text-zinc-400 text-xs font-normal shrink-0">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          aria-label="Aumentar valor"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1 select-none ${className}`}>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && value <= min)}
          className="w-6 h-6 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          aria-label="Diminuir"
        >
          <Minus className="w-2.5 h-2.5" />
        </button>
        <div className="flex items-center justify-center gap-0.5">
          {prefix && <span className="text-zinc-500 text-[11px] font-mono shrink-0">{prefix}</span>}
          <input
            type="number"
            disabled={disabled}
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const num = parseFloat(e.target.value);
              if (!isNaN(num)) onChange(num);
            }}
            onBlur={(e) => {
              let num = parseFloat(e.target.value);
              if (isNaN(num)) num = min ?? 0;
              if (min !== undefined && num < min) num = min;
              if (max !== undefined && num > max) num = max;
              onChange(num);
            }}
            className="w-12 bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#f4a7b9] rounded py-0.5 px-1 font-mono text-[11px] font-bold text-white text-center outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {unit && <span className="text-zinc-400 text-[11px] font-normal shrink-0">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          className="w-6 h-6 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          aria-label="Aumentar"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  // variant === 'card' (Padrão canônico do Mínimo de Fotos e Preços)
  return (
    <div
      className={`p-3.5 rounded-xl bg-[#0e1015] border border-white/[0.06] space-y-2 select-none ${className}`}
    >
      {label && (
        <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
          {label}
        </label>
      )}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || (min !== undefined && value <= min)}
          className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          aria-label="Diminuir valor"
        >
          <Minus className="w-3 h-3" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-1 min-w-0">
          {prefix && <span className="text-zinc-500 font-mono text-xs shrink-0">{prefix}</span>}
          <input
            type="number"
            disabled={disabled}
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const num = parseFloat(e.target.value);
              if (!isNaN(num)) {
                onChange(num);
              }
            }}
            onBlur={(e) => {
              let num = parseFloat(e.target.value);
              if (isNaN(num)) num = min ?? 0;
              if (min !== undefined && num < min) num = min;
              if (max !== undefined && num > max) num = max;
              onChange(num);
            }}
            className="w-full max-w-[90px] bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#f4a7b9] rounded-lg py-1 px-1.5 font-mono text-xs font-bold text-white text-center outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {unit && <span className="text-zinc-400 font-normal text-xs shrink-0">{unit}</span>}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          aria-label="Aumentar valor"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 12. AdminSwitch — Canonical Toggle Switch (Personalizados / Settings)      */
/* -------------------------------------------------------------------------- */
export interface AdminSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function AdminSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
}: AdminSwitchProps) {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`flex items-start justify-between gap-3 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {(label || description) && (
        <div className="space-y-0.5">
          {label && <span className="text-xs font-semibold text-white block">{label}</span>}
          {description && (
            <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(!checked);
        }}
        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative shrink-0 ${
          checked ? 'bg-[#f4a7b9]' : 'bg-zinc-800'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0 bg-zinc-400'
          }`}
        />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 13. AdminInput & AdminTextarea — Standardized Form Controls                */
/* -------------------------------------------------------------------------- */
export interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
}

export function AdminInput({
  prefixNode,
  suffixNode,
  className = '',
  ...props
}: AdminInputProps) {
  if (prefixNode || suffixNode) {
    return (
      <div
        className={`flex items-center gap-2 h-9 px-3 rounded-xl bg-[#0e1015] border border-white/[0.08] focus-within:border-[#f4a7b9] transition-colors ${className}`}
      >
        {prefixNode && <span className="text-xs text-zinc-500 shrink-0">{prefixNode}</span>}
        <input
          className="w-full bg-transparent text-xs text-white placeholder-zinc-500 outline-none"
          {...props}
        />
        {suffixNode && <span className="text-xs text-zinc-500 shrink-0">{suffixNode}</span>}
      </div>
    );
  }

  return (
    <input
      className={`w-full h-9 px-3 rounded-xl bg-[#0e1015] border border-white/[0.08] text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors ${className}`}
      {...props}
    />
  );
}

export interface AdminTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function AdminTextarea({ className = '', ...props }: AdminTextareaProps) {
  return (
    <textarea
      className={`w-full p-3 rounded-xl bg-[#0e1015] border border-white/[0.08] text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed ${className}`}
      {...props}
    />
  );
}
