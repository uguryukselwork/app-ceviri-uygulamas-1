import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Sparkles, EyeOff, Zap, Bell, Check, X, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/useStore';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  featureTitle?: string;
}

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

  const handleCancelPremium = () => {
    setIsPremium(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-200/50 dark:border-amber-500/20 overflow-hidden relative"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-amber-500 via-indigo-600 to-purple-600 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-14 h-14 mx-auto mb-3 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner border border-white/30">
              <Crown className="w-8 h-8 text-amber-300 drop-shadow-md animate-pulse" />
            </div>

            <span className="inline-block px-3 py-0.5 mb-1 text-[11px] font-bold tracking-widest uppercase bg-amber-400 text-slate-900 rounded-full shadow-sm">
              LiveTranslate VIP
            </span>
            <h3 className="text-xl font-bold tracking-tight">Premium Deneyimi</h3>
            <p className="text-xs text-white/80 mt-1">
              {featureTitle 
                ? `"${featureTitle}" özelliğini kullanmak için Premium'a geçin.`
                : 'Sohbetlerinizi gizli ve ayrıcalıklı bir seviyeye taşıyın.'}
            </p>
          </div>

          {/* Features List */}
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Profili Gizle (Gizli Mod)</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Odalarda adınız 'Gizli Kullanıcı' ve profil resminiz tamamen gizli görünür.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ultra Hızlı Çeviri</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sohbetlerde öncelikli sunucu hattı ve sıfır gecikmeli çeviri motoru.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">VIP Rozeti & Sınırsız Sesler</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Özel altın taç rozeti ve tüm bildirim seslerine anında tam erişim.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Area */}
            {isPremium ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-2xl border border-green-200 dark:border-green-800 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  Premium Üyeliğiniz Aktif!
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm transition-colors"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={handleCancelPremium}
                  className="w-full py-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                >
                  Premium üyeliği sonlandır (Test Modu)
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={celebrating}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 hover:from-amber-600 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {celebrating ? (
                    <>
                      <Check className="w-4 h-4" /> Premium Aktifleştirildi!
                    </>
                  ) : (
                    <>
                      <Crown className="w-4 h-4 text-amber-300" /> Premium'u Ücretsiz Aktif Et
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-slate-400">
                  Deneme sürümü kapsamındadır. Herhangi bir kart gerekmez.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
