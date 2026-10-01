import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioLines, Crown, Check, Lock, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { primaryButton } from './ui';
import AnnouncementBanner from './AnnouncementBanner';
import type { VipStatus } from '../lib/api';
import type { VoiceMode } from '../lib/voice';
import { formatTalkTime } from '../lib/plans';

interface VoiceModeSheetProps {
  open: boolean;
  /** null while loading */
  status: VipStatus | null;
  onClose: () => void;
  onStart: (mode: VoiceMode) => void;
  onOpenPlans: () => void;
}

/** Shown when starting or joining voice translation: free (browser) or VIP (Gemini Live). Free is preselected. */
export default function VoiceModeSheet({ open, status, onClose, onStart, onOpenPlans }: VoiceModeSheetProps) {
  const [mode, setMode] = useState<VoiceMode>('free');

  // Always start from the free option
  useEffect(() => { if (open) setMode('free'); }, [open]);

  const vipLocked = !status?.canUseVip;
  const vipOff = status?.access === 'off';

  const option = (id: VoiceMode, icon: ReactNode, title: string, badge: string, description: string, locked = false) => {
    const selected = mode === id;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={locked}
        onClick={() => setMode(id)}
        className={cn(
          'w-full text-left rounded-3xl border-2 p-4 transition-colors',
          selected ? 'border-(--theme-accent) bg-(--theme-accent-light)' : 'border-(--theme-border) bg-(--theme-card-bg)',
          locked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-(--theme-accent)'
        )}
      >
        <div className="flex items-center gap-3">
          {icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[15px] text-(--theme-ink)">{title}</span>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[11px] font-bold',
                id === 'free' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-500/15 text-amber-700'
              )}>{badge}</span>
            </div>
            <p className="text-[13px] text-(--theme-muted) mt-0.5">{description}</p>
          </div>
          <span className={cn(
            'w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center',
            selected ? 'border-(--theme-accent) bg-(--theme-accent) text-(--theme-on-accent)' : 'border-(--theme-border)'
          )}>
            {locked ? <Lock className="w-3.5 h-3.5 text-(--theme-muted)" /> : selected && <Check className="w-4 h-4" />}
          </span>
        </div>
      </button>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-50 flex items-end bg-black/40 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Sesli çeviri"
            className="w-full app-page-bg rounded-t-[2rem] border-t border-(--theme-border) px-5 pt-3 pb-8 max-h-[90%] overflow-y-auto"
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-(--theme-border)" aria-hidden />
            <h2 className="font-display font-semibold text-xl text-(--theme-ink) mb-1">Sesli çeviri</h2>
            <p className="text-[13px] text-(--theme-muted) mb-4">Telefon görüşmesi gibi konuş, karşı taraf kendi dilinde duysun.</p>
            <AnnouncementBanner className="mb-4" />

            <div className="space-y-3" role="radiogroup" aria-label="Üyelik seçeneği">
              {option(
                'free',
                <span className="w-11 h-11 shrink-0 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center"><AudioLines className="w-5 h-5" /></span>,
                'Ücretsiz üyelik', 'Ücretsiz',
                'Tarayıcının kendi ses tanıması. 1–2 saniye gecikmeli, bazı telefonlarda kalite değişebilir.'
              )}
              {option(
                'paid',
                <span className="w-11 h-11 shrink-0 rounded-2xl bg-amber-500 text-white flex items-center justify-center"><Crown className="w-5 h-5" /></span>,
                'VIP üyelik', 'VIP',
                vipOff ? 'VIP sesli çeviri şu an kapalı.'
                : status?.access === 'everyone' ? 'Gemini canlı ses: akıcı, gerçek görüşme gibi. Şu an herkese ücretsiz!'
                : status && !status.vipUntil && status.vipSeconds > 0
                  ? `Gemini canlı ses. Kalan konuşma hakkın: ${formatTalkTime(status.vipSeconds)}`
                  : 'Gemini canlı ses: akıcı, gerçek görüşme gibi.',
                !status || vipLocked
              )}
            </div>

            {status && vipLocked && !vipOff && (
              <button
                type="button"
                onClick={onOpenPlans}
                className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[14px] font-bold text-amber-700 bg-amber-500/12 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> VIP paketlerini gör
              </button>
            )}

            <button type="button" onClick={() => onStart(mode)} className={cn(primaryButton, 'mt-5')}>
              {!status ? <Loader2 className="w-5 h-5 animate-spin" /> : <AudioLines className="w-5 h-5" />}
              {mode === 'paid' ? 'VIP ile başlat' : 'Ücretsiz başlat'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
