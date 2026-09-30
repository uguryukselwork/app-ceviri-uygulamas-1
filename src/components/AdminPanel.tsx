import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Check, Loader2, Sparkles, BadgeDollarSign } from 'lucide-react';
import { cn } from '../lib/utils';
import { fieldClass, primaryButton, IconTile } from './ui';
import { fetchVoiceMode, adminCheckPin, adminSetVoiceMode } from '../lib/api';
import type { VoiceMode } from '../lib/voice';

const MODES: { id: VoiceMode; title: string; badge: string; description: string; tone: 'emerald' | 'amber' }[] = [
  {
    id: 'free',
    title: 'Tarayıcının kendi özelliği',
    badge: 'Ücretsiz',
    description: 'Kullanıcı konuşur, konuşma yazıya dökülür, mevcut çeviri sisteminden geçer; karşı tarafta hem yazı olarak görünür hem de sesli okunur. Arada 1–2 saniye gecikme olur. Bazı telefonlarda, özellikle iPhone\'da, tanıma kalitesi değişken olabilir.',
    tone: 'emerald',
  },
  {
    id: 'paid',
    title: 'Gemini canlı ses sistemi',
    badge: 'Ücretli',
    description: 'Gerçek bir telefon görüşmesine daha yakın, daha akıcı ve daha kaliteli. Dakika başı ücretlidir ve Supabase\'de GEMINI_API_KEY tanımlı olmalıdır.',
    tone: 'amber',
  },
];

/** Hidden admin panel (5 taps on the logo). The PIN is verified by the database, never in the browser. */
export default function AdminPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<VoiceMode | null>(null);
  const [saved, setSaved] = useState(false);

  // Forget the PIN whenever the panel closes
  useEffect(() => {
    if (open) return;
    setPin('');
    setUnlocked(false);
    setError(null);
    setSaved(false);
  }, [open]);

  const explain = (err: unknown) =>
    err instanceof Error && err.message === 'too_many_attempts'
      ? 'Çok fazla yanlış deneme. 15 dakika sonra tekrar dene.'
      : 'Bir sorun oluştu. Bağlantını kontrol et.';

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (await adminCheckPin(pin)) {
        setMode(await fetchVoiceMode());
        setUnlocked(true);
      } else {
        setError('Şifre yanlış.');
        setPin('');
      }
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  const chooseMode = async (next: VoiceMode) => {
    if (next === mode || busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      if (await adminSetVoiceMode(pin, next)) {
        setMode(next);
        setSaved(true);
      } else {
        setError('Şifre artık geçerli değil. Paneli kapatıp yeniden aç.');
      }
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
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
            aria-label="Yönetici paneli"
            className="w-full app-page-bg rounded-t-[2rem] border-t border-(--theme-border) px-5 pt-3 pb-8 max-h-[90%] overflow-y-auto"
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-(--theme-border)" aria-hidden />

            <div className="flex items-center gap-3 mb-5">
              <IconTile tone="accent"><ShieldCheck className="w-5 h-5" /></IconTile>
              <div>
                <h2 className="font-display font-semibold text-xl text-(--theme-ink)">Yönetici paneli</h2>
                <p className="text-[13px] text-(--theme-muted)">
                  {unlocked ? 'Seçim tüm kullanıcılar için geçerlidir.' : 'Devam etmek için şifreyi gir.'}
                </p>
              </div>
            </div>

            {!unlocked ? (
              <form onSubmit={submitPin} className="space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  aria-label="Yönetici şifresi"
                  className={cn(fieldClass, 'text-center font-display text-2xl tracking-[0.6em]')}
                />
                {error && <p role="alert" className="text-[13px] font-bold text-red-600 text-center">{error}</p>}
                <button type="submit" disabled={pin.length !== 4 || busy} className={cn(primaryButton, 'w-full')}>
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Giriş'}
                </button>
              </form>
            ) : (
              <div className="space-y-3" role="radiogroup" aria-label="Sesli çeviri modu">
                <h3 className="text-xs font-bold uppercase tracking-wide text-(--theme-muted) px-1">Sesli çeviri modu</h3>
                {MODES.map(m => {
                  const selected = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={busy}
                      onClick={() => chooseMode(m.id)}
                      className={cn(
                        'w-full text-left rounded-3xl border-2 p-4 transition-colors cursor-pointer disabled:cursor-wait',
                        selected ? 'border-(--theme-accent) bg-(--theme-accent-light)' : 'border-(--theme-border) bg-(--theme-card-bg) hover:border-(--theme-accent)'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <IconTile tone={m.tone}>
                          {m.id === 'free' ? <Sparkles className="w-5 h-5" /> : <BadgeDollarSign className="w-5 h-5" />}
                        </IconTile>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[15px] text-(--theme-ink)">{m.title}</span>
                          </div>
                          <span className={cn(
                            'inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold',
                            m.id === 'free' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-500/15 text-amber-700'
                          )}>{m.badge}</span>
                        </div>
                        <span className={cn(
                          'w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center',
                          selected ? 'border-(--theme-accent) bg-(--theme-accent) text-(--theme-on-accent)' : 'border-(--theme-border)'
                        )}>
                          {selected && <Check className="w-4 h-4" />}
                        </span>
                      </div>
                      <p className="mt-3 text-[13px] leading-relaxed text-(--theme-muted)">{m.description}</p>
                    </button>
                  );
                })}
                {error && <p role="alert" className="text-[13px] font-bold text-red-600 text-center">{error}</p>}
                {saved && !error && (
                  <p role="status" className="text-[13px] font-bold text-emerald-700 text-center flex items-center justify-center gap-1">
                    <Check className="w-4 h-4" /> Kaydedildi. Yeni görüşmelerde geçerli olur.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
