import React from 'react';
import { ArrowLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';

// Shared building blocks for settings screens and sheets.
// All colors come from the theme tokens in index.css, so every color theme follows along.

export const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--theme-accent)';

export const softIconButton = cn(
  'w-10 h-10 rounded-full flex items-center justify-center text-(--theme-muted) hover:text-(--theme-ink) hover:bg-(--theme-subtle-bg) transition-colors cursor-pointer',
  focusRing
);

export const primaryButton = cn(
  'w-full py-4 px-5 rounded-[1.75rem] bg-(--theme-accent) text-(--theme-on-accent) font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-(--theme-accent-hover) transition-colors active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-(--theme-accent)'
);

export const secondaryButton = cn(
  'w-full py-4 px-5 rounded-[1.75rem] bg-(--theme-accent-light) text-(--theme-accent) font-bold text-[15px] flex items-center justify-center gap-2 transition-colors active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer',
  focusRing
);

export const fieldClass = cn(
  'w-full px-4 py-3 rounded-2xl border-2 border-(--theme-border) bg-(--theme-card-bg) text-(--theme-ink) placeholder:text-(--theme-muted) text-[15px] font-semibold focus:outline-none focus:border-(--theme-accent) transition-colors'
);

export function Toggle({ checked, onChange, disabled, label }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'relative w-12 h-7 rounded-full shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-(--theme-accent)' : 'bg-(--theme-border)',
        focusRing
      )}
    >
      <span
        className={cn(
          'absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform',
          checked && 'translate-x-5'
        )}
      />
    </button>
  );
}

// Each settings row gets its own color so the list is easy to scan
const ICON_TONES = {
  accent: 'bg-(--theme-accent-light) text-(--theme-accent)',
  muted: 'bg-(--theme-subtle-bg) text-(--theme-muted)',
  rainbow: 'bg-gradient-to-br from-pink-500 via-violet-500 to-sky-500 text-white',
  indigo: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
  sky: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  teal: 'bg-teal-500/15 text-teal-600 dark:text-teal-300',
  emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  amber: 'bg-amber-500/20 text-amber-600 dark:text-amber-300',
  orange: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  slate: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  red: 'bg-red-500/15 text-red-600 dark:text-red-300',
} as const;

export type IconTone = keyof typeof ICON_TONES;

export function IconTile({ children, tone = 'accent' }: { children: React.ReactNode; tone?: IconTone }) {
  return (
    <span className={cn('w-9 h-9 rounded-2xl flex items-center justify-center shrink-0', ICON_TONES[tone])}>
      {children}
    </span>
  );
}

export function SettingsGroup({ title, action, children, className }: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-2 min-h-6">
          {title && <h3 className="text-sm font-bold text-(--theme-muted)">{title}</h3>}
          {action}
        </div>
      )}
      <div className="rounded-3xl bg-(--theme-card-bg) border border-(--theme-border) divide-y divide-(--theme-border) overflow-hidden">
        {children}
      </div>
    </section>
  );
}

export function SettingsRow({ icon, tone, title, description, trailing, onClick, disabled, chevron }: {
  icon?: React.ReactNode;
  tone?: IconTone;
  title: React.ReactNode;
  description?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  chevron?: boolean;
}) {
  const content = (
    <>
      {icon && <IconTile tone={tone}>{icon}</IconTile>}
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-[15px] font-bold text-(--theme-ink)">{title}</span>
        {description && <span className="block text-[13px] leading-snug text-(--theme-muted) mt-0.5">{description}</span>}
      </span>
      {trailing}
      {chevron && <ChevronRight className="w-5 h-5 text-(--theme-muted) shrink-0" />}
    </>
  );
  const base = cn('w-full flex items-center gap-3 px-4 py-3.5', disabled && 'opacity-50');

  // A row that only holds a toggle stays a div, so the switch is the single control
  if (!onClick) return <div className={base}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(base, 'hover:bg-(--theme-subtle-bg) transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:bg-(--theme-subtle-bg)')}
    >
      {content}
    </button>
  );
}

export function SheetHeader({ title, onBack, backLabel, onClose }: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-2.5 app-header-bg border-b shrink-0">
      {onBack ? (
        <button type="button" onClick={onBack} className={softIconButton} aria-label={backLabel || 'Geri'}>
          <ArrowLeft className="w-5 h-5" />
        </button>
      ) : (
        <span className="w-2" />
      )}
      <h2 className="flex-1 min-w-0 font-display font-semibold text-xl text-(--theme-ink) truncate">{title}</h2>
      {onClose && (
        <button type="button" onClick={onClose} className={softIconButton} aria-label="Kapat">
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

/** A two-to-five option segmented control, used for sound, text size and similar picks */
export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { id: T; label: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 p-1 rounded-full bg-(--theme-subtle-bg)">
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.id)}
            className={cn(
              'flex-1 min-w-0 py-2 px-2 rounded-full text-[13px] font-bold transition-colors cursor-pointer truncate',
              selected ? 'bg-(--theme-card-bg) text-(--theme-accent) shadow-sm' : 'text-(--theme-muted) hover:text-(--theme-ink)',
              focusRing
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
