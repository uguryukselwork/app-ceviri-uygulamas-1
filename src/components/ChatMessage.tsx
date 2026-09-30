import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { Copy, Check, CheckCheck, RotateCcw, Reply, MoreHorizontal, Mic, AlertCircle } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { t, LANGUAGES, plainLanguageName } from '../lib/i18n';
import { getBubbleClass } from '../lib/themes';

export interface MessageType {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_gender: string;
  sender_avatar?: string;
  original_text: string;
  original_language?: string | null;
  translated_text: string | null;
  target_language: string | null;
  created_at: string;
  translation_status: 'pending' | 'completed' | 'error';
  is_read?: boolean;
  reactions?: Record<string, string[]>;
  reply_to_id?: string | null;
  is_voice?: boolean;
}

interface ChatMessageProps {
  message: MessageType;
  showOriginal: boolean;
  onRetry?: (messageId: string) => void;
  /** Swipe right or "Yanıtla" in the ⋯ menu */
  onReply?: (message: MessageType) => void;
  /** The message this one answers, when it is still loaded */
  replyTo?: MessageType | null;
  /** Tap on the quoted message: scroll to it */
  onJumpTo?: (messageId: string) => void;
  /** Briefly outlined after jumping to it from a reply */
  highlighted?: boolean;
  /** First message in a run from the same sender: shows the sender name */
  isFirstInGroup?: boolean;
  /** Last message in a run from the same sender: shows the avatar and the bubble tail */
  isLastInGroup?: boolean;
  /** The sender's current photo from the room's participant list; falls back to the one saved with the message */
  avatarUrl?: string | null;
}

// Language name for a code ("English"), or null when unknown / auto-detected
const languageLabel = (code?: string | null) => {
  const found = LANGUAGES.find(l => l.code === code && l.code !== 'auto');
  return found ? plainLanguageName(found.name) : null;
};

/** The text a viewer reads for a message: their own words, or the translation of the partner's */
export const readableText = (m: MessageType, myId: string) =>
  m.sender_id === myId ? m.original_text : (m.translated_text || m.original_text);

/** How far (px) a bubble must be dragged right to count as "reply" */
const SWIPE_TRIGGER = 64;

function Avatar({ url, name, lang }: { url?: string | null; name?: string; lang: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-(--theme-accent-light) text-(--theme-accent) flex items-center justify-center shrink-0 overflow-hidden font-display font-semibold text-sm">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (name || '?')[0].toLocaleUpperCase(lang)}
    </div>
  );
}

function TranslatingDots({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] opacity-80" role="status">
      <span className="translating-dots inline-flex items-center gap-1" aria-hidden>
        <span /><span /><span />
      </span>
      {label}
    </span>
  );
}

export default function ChatMessage({
  message, showOriginal, onRetry, onReply, replyTo, onJumpTo, highlighted,
  isFirstInGroup = true, isLastInGroup = true, avatarUrl
}: ChatMessageProps) {
  const profile = useStore((state) => state.profile);
  const colorTheme = useStore((state) => state.colorTheme);
  const bubbleColor = useStore((state) => state.bubbleColor);
  const hideProfile = useStore((state) => state.hideProfile);
  const isMe = message.sender_id === profile.id;
  const senderAvatar = isMe
    ? (hideProfile ? null : profile.avatarUrl)
    : (avatarUrl ?? message.sender_avatar);
  // Avatar on the last bubble of each run, on both sides; a spacer keeps earlier bubbles aligned
  const avatarSlot = isLastInGroup
    ? <Avatar url={senderAvatar} name={isMe ? profile.name : message.sender_name} lang={profile.language} />
    : <div className="w-8 shrink-0" aria-hidden />;
  const isTranslating = message.translation_status === 'pending';
  const isError = message.translation_status === 'error';
  const lang = profile.language;

  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Swipe right to reply: the bubble follows the finger and a reply icon fades in behind it
  const dragX = useMotionValue(0);
  const replyIconOpacity = useTransform(dragX, [0, SWIPE_TRIGGER * 0.6], [0, 1]);
  const replyIconScale = useTransform(dragX, [0, SWIPE_TRIGGER * 0.6], [0.6, 1]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const startReply = () => {
    setMenuOpen(false);
    onReply?.(message);
  };

  // Sender reads what they wrote, with the translation underneath.
  // Receiver reads the translation, with the original underneath.
  const mainText = isMe ? message.original_text : (message.translated_text || message.original_text);
  const panelText = isMe ? message.translated_text : message.original_text;
  const panelLanguage = isMe ? message.target_language : message.original_language;
  const showPanel = !!message.translated_text && (isMe || showOriginal);

  // One copy action per message: the translation when there is one, otherwise the original
  const copyText = message.translated_text || message.original_text;

  const menuItem = "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold text-(--theme-ink) hover:bg-(--theme-subtle-bg) transition-colors cursor-pointer text-left";

  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative flex w-full items-end gap-2 rounded-3xl transition-colors duration-700",
        isMe ? "justify-end" : "justify-start",
        isLastInGroup ? "mb-3" : "mb-0.5",
        highlighted && "bg-(--theme-accent-light)"
      )}
    >
      {onReply && (
        <motion.div
          aria-hidden
          style={{ opacity: replyIconOpacity, scale: replyIconScale }}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-(--theme-card-bg) border border-(--theme-border) text-(--theme-accent) flex items-center justify-center"
        >
          <Reply className="w-4 h-4" />
        </motion.div>
      )}

      <motion.div
        drag={onReply ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.5 }}
        dragSnapToOrigin
        style={{ x: dragX }}
        onDragEnd={(_, info) => {
          if (info.offset.x > SWIPE_TRIGGER) {
            if (navigator.vibrate) { try { navigator.vibrate(15); } catch { /* not allowed */ } }
            startReply();
          }
        }}
        className={cn("flex items-end gap-2 max-w-full min-w-0", isMe ? "justify-end" : "justify-start")}
      >
      {!isMe && avatarSlot}

      <div className={cn("max-w-[75vw] sm:max-w-[28rem] flex flex-col min-w-0", isMe ? "items-end" : "items-start")}>
        {!isMe && isFirstInGroup && (
          <span className="text-xs font-bold text-(--theme-muted) ml-3 mb-1">
            {message.sender_name}
          </span>
        )}

        <div className={cn(
          "relative px-4 pt-2.5 pb-2 rounded-[1.4rem] min-w-[5.5rem] max-w-full",
          isMe
            ? cn(getBubbleClass(bubbleColor, colorTheme), isLastInGroup && "rounded-br-md")
            : cn("bg-(--theme-card-bg) text-(--theme-ink) border border-(--theme-border)", isLastInGroup && "rounded-bl-md")
        )}>
          {message.reply_to_id && (
            <button
              type="button"
              disabled={!replyTo}
              onClick={() => replyTo && onJumpTo?.(replyTo.id)}
              className={cn(
                "w-full mb-2 rounded-xl pl-2.5 pr-3 py-1.5 border-l-4 text-left cursor-pointer disabled:cursor-default",
                isMe ? "bg-black/10 border-white/70" : "bg-(--theme-subtle-bg) border-(--theme-accent)"
              )}
            >
              <span className={cn("block text-[12px] font-bold", isMe ? "opacity-90" : "text-(--theme-accent)")}>
                {replyTo ? (replyTo.sender_id === profile.id ? t('msg.you', lang) : replyTo.sender_name) : '…'}
              </span>
              <span className={cn("block text-[13px] leading-snug line-clamp-2 [overflow-wrap:anywhere]", isMe ? "opacity-85" : "text-(--theme-muted)")}>
                {replyTo ? readableText(replyTo, profile.id) : ''}
              </span>
            </button>
          )}

          {!isMe && isTranslating ? (
            <TranslatingDots label={t('msg.translating', lang)} />
          ) : (
            <p className="text-[15px] leading-snug whitespace-pre-wrap [overflow-wrap:anywhere]">{mainText}</p>
          )}

          {isMe && isTranslating && (
            <div className="mt-2">
              <TranslatingDots label={t('msg.translating', lang)} />
            </div>
          )}

          {showPanel && panelText && (
            <div className={cn(
              "mt-2 rounded-2xl px-3 py-2",
              isMe ? "bg-black/10" : "bg-(--theme-subtle-bg)"
            )}>
              <div className={cn("text-[11px] font-bold mb-0.5", isMe ? "opacity-75" : "text-(--theme-muted)")}>
                {languageLabel(panelLanguage) ?? (isMe ? t('msg.translated', lang) : '')}
              </div>
              <p className={cn("text-[14px] leading-snug whitespace-pre-wrap [overflow-wrap:anywhere]", !isMe && "text-(--theme-muted)")}>
                {panelText}
              </p>
            </div>
          )}

          {isError && (
            <div className={cn(
              "mt-2 rounded-2xl p-2 pl-3 flex items-center justify-between gap-3 text-[13px] font-bold border",
              isMe ? "bg-white/90 border-red-300 text-red-600" : "bg-red-500/10 border-red-500/40 text-red-600"
            )}>
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />
                {t('msg.error', lang)}
              </span>
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(message.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-600 text-white text-[13px] font-bold shadow-sm cursor-pointer transition-colors hover:bg-red-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('msg.retry', lang)}
                </button>
              )}
            </div>
          )}

          <div className={cn(
            "flex items-center gap-2 mt-1.5 text-[11px]",
            isMe ? "justify-end opacity-80" : "justify-end text-(--theme-muted)"
          )}>
            {message.is_voice && (
              <span className="flex items-center gap-0.5 font-bold" title={t('msg.voice', lang)}>
                <Mic className="w-3 h-3" aria-hidden />
                {t('msg.voice', lang)}
              </span>
            )}
            {!isTranslating && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(o => !o)}
                  aria-label={t('msg.more', lang)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  title={t('msg.more', lang)}
                  className="p-1 -m-1 rounded-full opacity-60 hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <MoreHorizontal className="w-4 h-4" />}
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className={cn(
                      "absolute bottom-full mb-2 z-30 w-40 py-1 rounded-2xl bg-(--theme-card-bg) border border-(--theme-border) shadow-xl overflow-hidden",
                      isMe ? "right-0" : "left-0"
                    )}
                  >
                    {onReply && (
                      <button type="button" role="menuitem" onClick={startReply} className={menuItem}>
                        <Reply className="w-4 h-4 text-(--theme-accent)" />
                        {t('msg.reply', lang)}
                      </button>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setMenuOpen(false); void handleCopy(copyText); }}
                      className={menuItem}
                    >
                      <Copy className="w-4 h-4 text-(--theme-accent)" />
                      {t('msg.copy', lang)}
                    </button>
                  </div>
                )}
              </div>
            )}
            <span>
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMe && (
              <span className={cn("flex items-center gap-0.5 font-bold", !message.is_read && "opacity-75")}>
                {message.is_read
                  ? <CheckCheck className="w-3.5 h-3.5" aria-hidden />
                  : <Check className="w-3.5 h-3.5" aria-hidden />}
                {t(message.is_read ? 'msg.seen' : 'msg.delivered', lang)}
              </span>
            )}
          </div>
        </div>
      </div>

      {isMe && avatarSlot}
      </motion.div>
    </motion.div>
  );
}
