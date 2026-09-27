import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, ArrowLeft, Loader2, RefreshCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateRoomCode } from '../lib/utils';
import { createRoom as createRoomRecord, upsertParticipant } from '../lib/api';
import { useStore } from '../store/useStore';
import { t } from '../lib/i18n';
import { motion as m } from 'motion/react';
import { primaryButton, softIconButton } from '../components/ui';
import createBanner from '../assets/images/create_room_banner_1789675517877.jpg';

export default function CreateRoom() {
  const navigate = useNavigate();
  const profile = useStore((state) => state.profile);
  const hideProfile = useStore((state) => state.hideProfile);
  
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
      // A random code can collide with an existing room; try a few fresh ones
      let room = null;
      for (let attempt = 0; attempt < 5 && !room; attempt++) {
        room = await createRoomRecord(generateRoomCode());
      }
      if (!room) throw new Error('Oda kurulamadı. Tekrar dene.');

      // Join right away, so the room is readable and shows up for the creator
      await upsertParticipant(room.id, profile.id, {
        name: hideProfile ? 'Gizli Kullanıcı' : (profile.name || 'Misafir'),
        gender: hideProfile ? null : profile.gender,
        language: profile.language,
        avatarUrl: hideProfile ? null : profile.avatarUrl,
      });

      setRoomCode(room.code);
      triggerConfetti();
    } catch (err: any) {
      console.error(err);
      setError('Oda kurulamadı. İnternet bağlantını kontrol edip tekrar dene.');
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
      <div className="px-2 pt-3">
        <button onClick={() => navigate(-1)} className={softIconButton} aria-label="Geri">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {!roomCode ? (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-sm text-center"
          >
            {error ? (
              <div className="space-y-5">
                <p role="alert" className="px-5 py-4 rounded-3xl bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-bold">
                  {error}
                </p>
                <button onClick={createRoom} className={primaryButton}>
                  <RefreshCcw className="w-[18px] h-[18px]" />
                  Tekrar dene
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-(--theme-accent)" role="status">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="font-bold text-(--theme-muted)">Oda kuruluyor…</p>
              </div>
            )}
          </m.div>
        ) : (
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm space-y-6"
          >
            <div className="w-full h-40 rounded-[2rem] overflow-hidden">
              <img src={createBanner} alt="" className="w-full h-full object-cover" />
            </div>

            <div className="text-center space-y-1.5">
              <h1 className="font-display font-semibold text-3xl text-(--theme-ink)">{t('create.title', profile.language)}</h1>
              <p className="text-[15px] text-(--theme-muted)">{t('create.subtitle', profile.language)}</p>
            </div>

            <button
              type="button"
              onClick={copyToClipboard}
              className="w-full rounded-[2rem] bg-(--theme-accent-light) py-6 flex flex-col items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--theme-accent)"
            >
              <span className="text-[13px] font-bold text-(--theme-accent)">{t('join.code_label', profile.language)}</span>
              <span className="font-display font-semibold text-5xl tracking-[0.12em] text-(--theme-accent) select-all">{roomCode}</span>
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-(--theme-accent)">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t('create.copied', profile.language) : t('create.copy_code', profile.language)}
              </span>
            </button>

            <button onClick={() => navigate(`/room/${roomCode}`)} className={primaryButton}>
              {t('create.go_room', profile.language)}
            </button>
          </m.div>
        )}
      </div>
    </div>
  );
}
