import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, ArrowLeft, Loader2, RefreshCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateRoomCode } from '../lib/utils';
import { useStore } from '../store/useStore';
import { t } from '../lib/i18n';
import { motion as m } from 'motion/react';
import createBanner from '../assets/images/create_room_banner_1789675517877.jpg';

export default function CreateRoom() {
  const navigate = useNavigate();
  const profile = useStore((state) => state.profile);
  
  const [isCreating, setIsCreating] = useState(true);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const hasCreated = useRef(false);

  useEffect(() => {
    if (!hasCreated.current) {
      hasCreated.current = true;
      createRoom();
    }
  }, []);

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

  const createRoom = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const code = generateRoomCode();
      
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, created_by: profile.id })
      });

      if (!response.ok) {
        throw new Error('Oda oluşturulamadı.');
      }
      
      setRoomCode(code);
      triggerConfetti();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Oda oluşturulamadı.');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
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
        {!roomCode ? (
          <m.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center"
          >
            {error ? (
              <div className="space-y-6">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/50">
                  {error}
                </div>
                <button
                  onClick={createRoom}
                  className="w-full py-4 rounded-xl bg-indigo-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                >
                  <RefreshCcw className="w-5 h-5" />
                  Tekrar Dene
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4 text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="font-medium">Oda oluşturuluyor...</p>
              </div>
            )}
          </m.div>
        ) : (
          <m.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm space-y-5"
          >
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-4 shadow-sm border border-slate-100 dark:border-slate-700/50">
              <div className="w-full h-40 sm:h-48 rounded-2xl overflow-hidden mb-6 relative">
                <img 
                  src={createBanner} 
                  alt="Room Created" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>

              <div className="text-center space-y-1 mb-6 mt-4">
                <div className="text-4xl mb-2">❤️</div>
                <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t('create.title', profile.language)}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{t('create.subtitle', profile.language)}</p>
              </div>

              {/* Room Code Card - Only code + copy button */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-inner space-y-3 text-center transition-colors">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {t('create.room_code', profile.language)}
                </p>
                
                <div className="inline-flex items-center justify-center gap-3 bg-white dark:bg-slate-800 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <span className="text-3xl sm:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-widest font-mono select-all">
                    {roomCode}
                  </span>

                  <button
                    onClick={copyToClipboard}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700/50 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                    title={t('create.copy_code', profile.language)}
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {copied && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium animate-in fade-in duration-150">
                    {t('create.copied', profile.language)}
                  </p>
                )}
              </div>
            </div>

            {/* Odaya Giriş Yap Button */}
            <m.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/room/${roomCode}`)}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base sm:text-lg shadow-[0_8px_30px_rgb(79,70,229,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {t('create.go_room', profile.language)}
            </m.button>
          </m.div>
        )}
      </div>
    </div>
  );
}
