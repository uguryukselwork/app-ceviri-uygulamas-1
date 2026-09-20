import React, { useState } from 'react';
import { Palette, Sparkles, MessageSquare, Wallpaper, RotateCcw, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { THEMES, BUBBLE_COLORS, CHAT_PATTERNS, getBubbleClass, getChatPatternStyle, ColorThemeId, BubbleColorId, ChatPatternId } from '../lib/themes';

export default function ThemeSettingsSection() {
  const {
    colorTheme,
    setColorTheme,
    bubbleColor,
    setBubbleColor,
    chatPattern,
    setChatPattern,
    resetThemeSettings,
    theme,
  } = useStore();

  const [resetToast, setResetToast] = useState(false);

  const isDark = theme === 'dark';
  const previewBubbleClass = getBubbleClass(bubbleColor, colorTheme);

  const isDefaultTheme = colorTheme === 'indigo' && bubbleColor === 'theme' && chatPattern === 'none';

  const handleReset = () => {
    resetThemeSettings();
    setResetToast(true);
    setTimeout(() => setResetToast(false), 2200);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-500" /> Tema & Görünüm
        </h3>

        <button
          type="button"
          onClick={handleReset}
          disabled={isDefaultTheme}
          title="Tüm tema ve renk ayarlarını ilk baştaki haline döndür"
          className={`text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
            isDefaultTheme
              ? 'text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed'
              : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer active:scale-95'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Sıfırla</span>
        </button>
      </div>

      {/* 1. Ready-Made Themes */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Hazır Renk Temaları
          </span>
          <span className="text-[11px] text-slate-400">
            {THEMES.find(t => t.id === colorTheme)?.name}
          </span>
        </label>
        
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((item) => {
            const isSelected = colorTheme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setColorTheme(item.id as ColorThemeId);
                  document.documentElement.setAttribute('data-color-theme', item.id);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-850/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-base">{item.emoji}</span>
                  <div className="flex -space-x-1">
                    <span 
                      className="w-3 h-3 rounded-full shadow-xs border border-white dark:border-slate-800"
                      style={{ backgroundColor: item.previewColors[0] }}
                    />
                    <span 
                      className="w-3 h-3 rounded-full shadow-xs border border-white dark:border-slate-800"
                      style={{ backgroundColor: item.previewColors[1] }}
                    />
                  </div>
                </div>
                <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {item.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Chat Bubble Color */}
      <div className="space-y-2 pt-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Sohbet Balonu Rengi
          </span>
          <span className="text-[11px] text-slate-400">
            {BUBBLE_COLORS.find(b => b.id === bubbleColor)?.name || 'Varsayılan'}
          </span>
        </label>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          {BUBBLE_COLORS.map((bubble) => {
            const isSelected = bubbleColor === bubble.id;
            return (
              <button
                key={bubble.id}
                type="button"
                onClick={() => setBubbleColor(bubble.id as BubbleColorId)}
                title={bubble.name}
                className={`flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500/30'
                    : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div 
                  className={`w-7 h-7 rounded-full shadow-xs flex items-center justify-center transition-transform ${
                    isSelected ? 'scale-110' : 'hover:scale-105'
                  }`}
                  style={{
                    background: bubble.id === 'theme' 
                      ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' 
                      : bubble.color
                  }}
                >
                  {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                  {bubble.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Chat Background Pattern */}
      <div className="space-y-2 pt-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Wallpaper className="w-3.5 h-3.5 text-indigo-500" /> Sohbet Arka Plan Deseni
          </span>
          <span className="text-[11px] text-slate-400">
            {CHAT_PATTERNS.find(p => p.id === chatPattern)?.name}
          </span>
        </label>

        <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
          {CHAT_PATTERNS.map((pattern) => {
            const isSelected = chatPattern === pattern.id;
            return (
              <button
                key={pattern.id}
                type="button"
                onClick={() => setChatPattern(pattern.id as ChatPatternId)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="text-sm mb-0.5">{pattern.icon}</span>
                <span className="text-[10px] truncate max-w-full">{pattern.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Live Chat Preview */}
      <div className="space-y-1 pt-1">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Canlı Sohbet Önizlemesi</span>
        <div 
          className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-750 space-y-2.5 relative overflow-hidden app-page-bg transition-colors"
          style={getChatPatternStyle(chatPattern, isDark)}
        >
          {/* Partner Mock Message */}
          <div className="flex items-start gap-2 max-w-[85%]">
            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs shrink-0">
              👩
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 px-3 py-2 rounded-2xl rounded-tl-sm shadow-xs">
              <p className="text-xs text-slate-800 dark:text-slate-200">Hello! How are you?</p>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium border-t border-slate-100 dark:border-slate-700/60 pt-0.5 mt-0.5">
                Merhaba! Nasılsın?
              </p>
            </div>
          </div>

          {/* User Mock Message with chosen bubble */}
          <div className="flex items-end justify-end">
            <div className={`px-3 py-2 rounded-2xl rounded-br-sm shadow-xs max-w-[85%] ${previewBubbleClass}`}>
              <p className="text-xs text-white">Harikayım, yeni temayı test ediyorum ✨</p>
              <span className="text-[9px] text-white/80 block text-right mt-0.5">14:00 ✓✓</span>
            </div>
          </div>
        </div>

        {/* Reset Theme Settings Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isDefaultTheme}
            className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
              isDefaultTheme
                ? 'border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-900/30 cursor-not-allowed'
                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-750 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shadow-xs active:scale-98'
            }`}
          >
            {resetToast ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Temalar En Baştaki Haline Sıfırlandı!</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Tema Ayarlarını Sıfırla (En Baştaki Renkler)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
