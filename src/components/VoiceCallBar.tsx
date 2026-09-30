import { Mic, MicOff, PhoneOff, AudioLines, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { t } from '../lib/i18n';
import type { VoiceState } from '../lib/voice';

interface VoiceCallBarProps {
  lang: string;
  partnerName: string;
  /** I am in the call */
  inCall: boolean;
  partnerInCall: boolean;
  state: VoiceState;
  muted: boolean;
  /** What I am saying right now (my language) */
  myCaption: string;
  /** What the partner is saying right now, translated into my language */
  partnerCaption: string;
  onJoin: () => void;
  onToggleMute: () => void;
  onEnd: () => void;
}

/** Sits above the message field: an invite when only the partner is in the voice call, the call controls when I am */
export default function VoiceCallBar({
  lang, partnerName, inCall, partnerInCall, state, muted, myCaption, partnerCaption, onJoin, onToggleMute, onEnd
}: VoiceCallBarProps) {
  if (!inCall && !partnerInCall) return null;

  if (!inCall) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-3 mb-1 flex items-center gap-3 rounded-3xl bg-(--theme-accent-light) border border-(--theme-border) pl-4 pr-2 py-2"
        role="status"
      >
        <AudioLines className="w-5 h-5 shrink-0 text-(--theme-accent) animate-pulse" aria-hidden />
        <span className="flex-1 min-w-0 text-sm font-bold text-(--theme-ink) truncate">
          {t('call.invite', lang, { name: partnerName })}
        </span>
        <button
          type="button"
          onClick={onJoin}
          className="shrink-0 h-10 px-4 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
        >
          <Mic className="w-4 h-4" />
          {t('call.join', lang)}
        </button>
      </motion.div>
    );
  }

  const status = state === 'connecting'
    ? t('call.connecting', lang)
    : muted ? t('call.muted', lang)
    : partnerInCall ? t('call.in_call', lang, { name: partnerName })
    : t('call.waiting', lang, { name: partnerName });
  const live = state === 'live' && !muted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 mb-1 rounded-3xl bg-(--theme-card-bg) border-2 border-(--theme-accent) p-2 pl-3"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className={cn(
          "relative w-10 h-10 shrink-0 rounded-full flex items-center justify-center",
          live ? "bg-(--theme-accent) text-(--theme-on-accent)" : "bg-(--theme-subtle-bg) text-(--theme-muted)"
        )}>
          {state === 'connecting'
            ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            : <AudioLines className="w-5 h-5" aria-hidden />}
          {live && <span className="absolute inset-0 rounded-full border-2 border-(--theme-accent) animate-ping opacity-40" aria-hidden />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-(--theme-ink) truncate">{t('call.start', lang)}</div>
          <div className="text-xs font-semibold text-(--theme-muted) truncate">
            {state === 'live' && !muted && !partnerCaption && !myCaption ? t('call.listening', lang) : status}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={t(muted ? 'call.unmute' : 'call.mute', lang)}
          aria-pressed={muted}
          title={t(muted ? 'call.unmute' : 'call.mute', lang)}
          className={cn(
            "w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-colors cursor-pointer",
            muted ? "bg-(--theme-ink) text-(--theme-page-bg)" : "bg-(--theme-subtle-bg) text-(--theme-ink) hover:bg-(--theme-accent-light)"
          )}
        >
          {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button
          type="button"
          onClick={onEnd}
          aria-label={t('call.end', lang)}
          title={t('call.end', lang)}
          className="h-11 px-4 shrink-0 rounded-full bg-red-600 text-white text-sm font-bold flex items-center gap-1.5 hover:bg-red-700 active:scale-95 transition cursor-pointer"
        >
          <PhoneOff className="w-4 h-4" />
          {t('call.end', lang)}
        </button>
      </div>

      {(partnerCaption || myCaption) && (
        <div className="mt-2 space-y-1 rounded-2xl bg-(--theme-subtle-bg) px-3 py-2 text-[14px] leading-snug">
          {partnerCaption && (
            <p className="text-(--theme-ink)">
              <span className="font-bold text-(--theme-accent)">{partnerName}: </span>{partnerCaption}
            </p>
          )}
          {myCaption && (
            <p className="text-(--theme-muted)">
              <span className="font-bold">{t('msg.you', lang)}: </span>{myCaption}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
