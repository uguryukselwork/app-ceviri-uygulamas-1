import React, { useState } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SettingsGroup, focusRing } from './ui';
import { cn } from '../lib/utils';

const SIZES = [
  { id: 'small', label: 'Küçük', sample: 'text-[13px]', desc: 'Ekrana daha çok mesaj sığar' },
  { id: 'medium', label: 'Standart', sample: 'text-base', desc: 'Dengeli' },
  { id: 'large', label: 'Büyük', sample: 'text-xl', desc: 'Daha rahat okunur' },
] as const;

const FAMILIES = [
  { id: 'sans', label: 'Yuvarlak', cls: 'font-app-sans' },
  { id: 'serif', label: 'Klasik', cls: 'font-app-serif' },
  { id: 'mono', label: 'Daktilo', cls: 'font-app-mono' },
] as const;

export default function TypographySettingsSection() {
  const { fontSize, setFontSize, fontFamily, setFontFamily } = useStore();
  const [resetDone, setResetDone] = useState(false);

  const isDefault = fontSize === 'large' && fontFamily === 'sans';

  const handleReset = () => {
    setFontSize('large');
    setFontFamily('sans');
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2000);
  };

  const optionClass = (selected: boolean) => cn(
    'rounded-2xl border-2 px-2 py-3 flex flex-col items-center gap-1 transition-colors cursor-pointer',
    selected ? 'border-(--theme-accent) bg-(--theme-accent-light)' : 'border-transparent bg-(--theme-subtle-bg) hover:border-(--theme-border)',
    focusRing
  );

  return (
    <div className="space-y-6">
      {/* Live preview in the chosen size and face (both apply app-wide immediately) */}
      <div className="rounded-3xl bg-(--theme-card-bg) border border-(--theme-border) px-5 py-4 space-y-2">
        <p className="text-[15px] leading-relaxed text-(--theme-ink)">
          Sevdiklerinle kendi dilinde konuş, o da seni kendi dilinde okusun.
        </p>
        <div className="rounded-2xl bg-(--theme-subtle-bg) px-3 py-2">
          <p className="text-[11px] font-bold text-(--theme-muted)">English</p>
          <p className="text-sm text-(--theme-muted)">Talk to your loved ones in your language, and they read you in theirs.</p>
        </div>
      </div>

      <SettingsGroup title="Yazı boyutu">
        <div role="radiogroup" aria-label="Yazı boyutu" className="grid grid-cols-3 gap-2 p-3">
          {SIZES.map((item) => {
            const selected = fontSize === item.id;
            return (
              <button key={item.id} type="button" role="radio" aria-checked={selected} onClick={() => setFontSize(item.id)} className={optionClass(selected)}>
                <span className={cn('font-display font-semibold h-7 flex items-end', item.sample, selected ? 'text-(--theme-accent)' : 'text-(--theme-ink)')}>Aa</span>
                <span className={cn('text-xs font-bold', selected ? 'text-(--theme-accent)' : 'text-(--theme-ink)')}>{item.label}</span>
                <span className="text-[10px] leading-tight text-center text-(--theme-muted)">{item.desc}</span>
              </button>
            );
          })}
        </div>
      </SettingsGroup>

      <SettingsGroup title="Yazı tipi">
        <div role="radiogroup" aria-label="Yazı tipi" className="grid grid-cols-3 gap-2 p-3">
          {FAMILIES.map((f) => {
            const selected = fontFamily === f.id;
            return (
              <button key={f.id} type="button" role="radio" aria-checked={selected} onClick={() => setFontFamily(f.id)} className={optionClass(selected)}>
                <span className={cn('text-2xl font-bold', f.cls, selected ? 'text-(--theme-accent)' : 'text-(--theme-ink)')}>Ağ</span>
                <span className={cn('text-xs font-bold', f.cls, selected ? 'text-(--theme-accent)' : 'text-(--theme-ink)')}>{f.label}</span>
              </button>
            );
          })}
        </div>
      </SettingsGroup>

      <button
        type="button"
        onClick={handleReset}
        disabled={isDefault && !resetDone}
        className={cn(
          'w-full py-3.5 rounded-[1.75rem] flex items-center justify-center gap-2 text-sm font-bold transition-colors cursor-pointer disabled:cursor-default disabled:opacity-45',
          'bg-(--theme-subtle-bg) text-(--theme-ink) hover:text-(--theme-accent)',
          focusRing
        )}
      >
        {resetDone ? <Check className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
        {resetDone ? 'Standart yazıya dönüldü' : 'Standart yazıya dön'}
      </button>
    </div>
  );
}
