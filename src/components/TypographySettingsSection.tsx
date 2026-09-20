import React, { useState } from 'react';
import { Type, RotateCcw, Check, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function TypographySettingsSection() {
  const { fontSize, setFontSize, fontFamily, setFontFamily } = useStore();
  const [resetToast, setResetToast] = useState(false);

  const isDefault = fontSize === 'medium' && fontFamily === 'sans';

  const handleReset = () => {
    setFontSize('medium');
    setFontFamily('sans');
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header with Quick Reset */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Type className="w-4 h-4 text-emerald-500" /> Metin & Tipografi
        </h3>

        <button
          type="button"
          onClick={handleReset}
          disabled={isDefault}
          title="Yazı boyutu ve tipini varsayılan standart ayarlara döndür"
          className={`text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
            isDefault
              ? 'text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed'
              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer active:scale-95'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Sıfırla</span>
        </button>
      </div>

      {/* 1. Font Size Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
          <span>Metin Ölçeği (Boyut)</span>
          <span className="text-[11px] text-slate-400 font-normal">
            {fontSize === 'small' ? '%85 Ölçek' : fontSize === 'large' ? '%115 Ölçek' : '%100 Standart'}
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'small', label: 'Küçük', symbol: 'A⁻', scale: '%85', desc: 'Daha fazla mesaj' },
            { id: 'medium', label: 'Standart', symbol: 'A', scale: '%100', desc: 'Dengeli görünüm' },
            { id: 'large', label: 'Büyük', symbol: 'A⁺', scale: '%115', desc: 'Rahat okuma' },
          ].map((item) => {
            const isSelected = fontSize === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFontSize(item.id as any)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 dark:bg-emerald-950/40 dark:border-emerald-500 text-emerald-800 dark:text-emerald-200 font-semibold shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span className="text-xl font-bold tracking-tight">{item.symbol}</span>
                <span className="text-xs font-medium">{item.label}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Font Family Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
          <span>Yazı Tipi Karakteri (Stil)</span>
          <span className="text-[11px] text-slate-400 font-normal">
            {fontFamily === 'serif' ? 'Klasik Serif' : fontFamily === 'mono' ? 'Daktilo Mono' : 'Modern Sans'}
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'sans', label: 'Modern', sub: 'Sans-Serif', cls: 'font-sans', sample: 'Aa' },
            { id: 'serif', label: 'Klasik', sub: 'Zarif Serif', cls: 'font-serif', sample: 'Aa' },
            { id: 'mono', label: 'Daktilo', sub: 'Monospace', cls: 'font-mono', sample: '01' },
          ].map((f) => {
            const isSelected = fontFamily === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFontFamily(f.id as any)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 dark:bg-emerald-950/40 dark:border-emerald-500 text-emerald-800 dark:text-emerald-200 font-semibold shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <span className={`text-xl font-bold ${f.cls}`}>{f.sample}</span>
                <span className={`text-xs ${f.cls}`}>{f.label}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{f.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Live Interactive Reading Preview Box */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-500" /> Canlı Metin Önizlemesi
          </span>
          <span className="text-slate-400">Seçilen font ve boyutla eşzamanlı</span>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">💬</span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Örnek Sohbet Görünümü</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Canlı Önizleme</span>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-100/90 dark:bg-slate-750 p-2.5 rounded-xl max-w-[90%]">
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                Anlık canlı çeviri sayesinde dünyanın her yerindeki sevdiklerinizle kendi dilinizde akıcı bir şekilde iletişim kurabilirsiniz.
              </p>
              <span className="text-[10px] text-slate-400 block mt-1">Orijinal: İngilizce • Çevrildi: Türkçe</span>
            </div>
          </div>
        </div>

        {/* Reset Typography Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isDefault}
            className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
              isDefault
                ? 'border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/30 cursor-not-allowed'
                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-750 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer shadow-xs active:scale-98'
            }`}
          >
            {resetToast ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Yazı Ayarları Standart Haline Getirildi!</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Yazı Boyutu ve Tipini Sıfırla (Standart)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
