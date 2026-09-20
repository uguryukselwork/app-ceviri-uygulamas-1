import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, LogIn } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../store/useStore';
import { t } from '../lib/i18n';

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
      // Check if room exists via local API
      const response = await fetch(`/api/rooms/by-code/${cleanCode}`);
      
      if (!response.ok) {
        throw new Error('Oda bulunamadı veya süresi dolmuş.');
      }

      // Trigger confetti on successful join
      triggerConfetti();

      // Navigate to room after a short delay so confetti is visible
      setTimeout(() => {
        navigate(`/room/${cleanCode}`);
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Odaya bağlanırken bir hata oluştu.');
      setIsJoining(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col app-page-bg transition-colors overflow-y-auto">
      <div className="p-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 -mt-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('join.title', profile.language)}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t('join.subtitle', profile.language)}</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t('join.code_placeholder', profile.language)}
                maxLength={6}
                className="w-full px-4 py-4 text-center text-3xl font-bold tracking-[0.25em] rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all uppercase placeholder:font-normal placeholder:text-lg placeholder:tracking-normal"
              />
              {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isJoining || code.length !== 6}
              className="w-full py-4 rounded-xl bg-pink-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-pink-700 transition-all active:scale-[0.98]"
            >
              <LogIn className="w-5 h-5" />
              {isJoining ? t('join.joining', profile.language) : t('join.button', profile.language)}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
