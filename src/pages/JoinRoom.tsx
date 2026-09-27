import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, LogIn, Link as LinkIcon } from 'lucide-react';
import { primaryButton, softIconButton } from '../components/ui';
import confetti from 'canvas-confetti';
import { useStore } from '../store/useStore';
import { t } from '../lib/i18n';
import { findRoom } from '../lib/api';

export default function JoinRoom() {
  const navigate = useNavigate();
  const profile = useStore((state) => state.profile);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0.1, y: 0.7 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 0.9, y: 0.7 }
        });
      }, 200);
    } catch (e) {
      console.error('Confetti error', e);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setError('Oda kodu 6 karakter olmalıdır.');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      if (!(await findRoom(cleanCode))) {
        setError('Bu kodla bir oda yok. Kodu kontrol et.');
        setIsJoining(false);
        return;
      }

      // Trigger confetti on successful join
      triggerConfetti();

      // Navigate to room after a short delay so confetti is visible
      setTimeout(() => {
        navigate(`/room/${cleanCode}`);
      }, 400);
    } catch (err: any) {
      setError('Odaya bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.');
      setIsJoining(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col app-page-bg transition-colors overflow-y-auto">
      <div className="px-2 pt-3">
        <button onClick={() => navigate(-1)} className={softIconButton} aria-label="Geri">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-7"
        >
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-(--theme-accent-light) text-(--theme-accent) flex items-center justify-center">
              <LinkIcon className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display font-semibold text-3xl text-(--theme-ink)">{t('join.title', profile.language)}</h1>
              <p className="text-[15px] text-(--theme-muted)">{t('join.subtitle', profile.language)}</p>
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <label className="block space-y-2">
              <span className="sr-only">{t('join.code_label', profile.language)}</span>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="ABC123"
                maxLength={6}
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                aria-invalid={!!error}
                className="w-full px-4 py-5 text-center font-display font-semibold text-4xl tracking-[0.2em] rounded-[2rem] border-2 border-(--theme-border) bg-(--theme-card-bg) text-(--theme-accent) placeholder:text-(--theme-border) focus:outline-none focus:border-(--theme-accent) transition-colors uppercase"
              />
            </label>
            {error && <p role="alert" className="text-sm font-bold text-center text-red-600 dark:text-red-400">{error}</p>}

            <button type="submit" disabled={isJoining || code.length !== 6} className={primaryButton}>
              <LogIn className="w-[18px] h-[18px]" />
              {isJoining ? t('join.joining', profile.language) : t('join.button', profile.language)}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
