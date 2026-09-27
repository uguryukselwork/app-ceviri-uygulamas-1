import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles, EyeOff, Zap, Check, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { IconTile, primaryButton, focusRing } from './ui';
import { cn } from '../lib/utils';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  featureTitle?: string;
}

const FEATURES = [
  { icon: EyeOff, title: 'Profili gizle', desc: 'Odalarda adın "Gizli Kullanıcı" olarak görünür, fotoğrafın gizlenir.' },
  { icon: Zap, title: 'Öncelikli çeviri', desc: 'Mesajların çeviri sırasında öne alınır.' },
  { icon: Sparkles, title: 'VIP rozeti ve tüm sesler', desc: 'Profilinde taç rozeti, tüm bildirim melodileri açık.' },
];

export default function PremiumModal({ isOpen, onClose, onSuccess, featureTitle }: PremiumModalProps) {
  const { isPremium, setIsPremium } = useStore();
  const [celebrating, setCelebrating] = useState(false);

  if (!isOpen) return null;

  const handleActivate = () => {
    setIsPremium(true);
    setCelebrating(true);
    setTimeout(() => {
      setCelebrating(false);
      if (onSuccess) onSuccess();
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="LiveTranslate VIP"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md app-page-bg rounded-t-[2rem] sm:rounded-[2rem] border border-(--theme-border) shadow-2xl relative px-6 pt-8 pb-6"
        >
          <button
            onClick={onClose}
            className={cn('absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-(--theme-muted) hover:text-(--theme-ink) hover:bg-(--theme-subtle-bg) transition-colors cursor-pointer', focusRing)}
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-(--theme-accent-light) text-(--theme-accent) flex items-center justify-center mb-4">
              <Crown className="w-8 h-8" />
            </div>
            <h3 className="font-display font-semibold text-2xl text-(--theme-ink)">LiveTranslate VIP</h3>
            <p className="text-sm text-(--theme-muted) mt-1.5 max-w-[18rem]">
              {featureTitle
                ? `"${featureTitle}" VIP üyelere açık.`
                : 'Sohbetlerini daha özel hale getir.'}
            </p>
          </div>

          <ul className="mt-6 space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3">
                <IconTile><Icon className="w-[18px] h-[18px]" /></IconTile>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-(--theme-ink)">{title}</p>
                  <p className="text-[13px] leading-snug text-(--theme-muted)">{desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-7 space-y-2">
            {isPremium ? (
              <>
                <p className="flex items-center justify-center gap-2 py-3 rounded-[1.75rem] bg-(--theme-accent-light) text-(--theme-accent) text-sm font-bold">
                  <Check className="w-4 h-4" /> VIP üyeliğin açık
                </p>
                <button
                  type="button"
                  onClick={() => setIsPremium(false)}
                  className={cn('w-full py-2 rounded-full text-[13px] font-bold text-(--theme-muted) hover:text-red-600 transition-colors cursor-pointer', focusRing)}
                >
                  VIP üyeliği bitir (test modu)
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleActivate} disabled={celebrating} className={primaryButton}>
                  {celebrating ? <Check className="w-[18px] h-[18px]" /> : <Crown className="w-[18px] h-[18px]" />}
                  {celebrating ? 'VIP açıldı' : "VIP'i ücretsiz aç"}
                </button>
                <p className="text-center text-xs text-(--theme-muted)">Deneme sürümü, kart bilgisi gerekmez.</p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
