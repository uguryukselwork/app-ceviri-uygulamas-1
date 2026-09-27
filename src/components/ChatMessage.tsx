import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { Copy, Check, CheckCheck, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
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
}

interface ChatMessageProps {
  message: MessageType;
  showOriginal: boolean;
  onRetry?: (messageId: string) => void;
  /** First message in a run from the same sender: shows the sender name */
  isFirstInGroup?: boolean;
  /** Last message in a run from the same sender: shows the avatar and the bubble tail */
  isLastInGroup?: boolean;
}

// Language name for a code ("English"), or null when unknown / auto-detected
const languageLabel = (code?: string | null) => {
  const found = LANGUAGES.find(l => l.code === code && l.code !== 'auto');
  return found ? plainLanguageName(found.name) : null;
};

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

export default function ChatMessage({ message, showOriginal, onRetry, isFirstInGroup = true, isLastInGroup = true }: ChatMessageProps) {
  const profile = useStore((state) => state.profile);
  const colorTheme = useStore((state) => state.colorTheme);
  const bubbleColor = useStore((state) => state.bubbleColor);
  const isMe = message.sender_id === profile.id;
  const isTranslating = message.translation_status === 'pending';
  const isError = message.translation_status === 'error';
  const lang = profile.language;

  const [copied, setCopied] = useState(false);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Sender reads what they wrote, with the translation underneath.
  // Receiver reads the translation, with the original underneath.
  const mainText = isMe ? message.original_text : (message.translated_text || message.original_text);
  const panelText = isMe ? message.translated_text : message.original_text;
  const panelLanguage = isMe ? message.target_language : message.original_language;
  const showPanel = !!message.translated_text && (isMe || showOriginal);

  // One copy action per message: the translation when there is one, otherwise the original
  const copyText = message.translated_text || message.original_text;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex w-full items-end gap-2",
        isMe ? "justify-end" : "justify-start",
        isLastInGroup ? "mb-3" : "mb-0.5"
      )}
    >
      {!isMe && (
        isLastInGroup ? (
          <div className="w-8 h-8 rounded-full bg-(--theme-accent-light) text-(--theme-accent) flex items-center justify-center shrink-0 overflow-hidden font-display font-semibold text-sm">
            {message.sender_avatar ? (
              <img src={message.sender_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              (message.sender_name || '?')[0].toLocaleUpperCase(lang)
            )}
          </div>
        ) : (
          <div className="w-8 shrink-0" aria-hidden />
        )
      )}

      <div className={cn("max-w-[80%] flex flex-col min-w-0", isMe ? "items-end" : "items-start")}>
        {!isMe && isFirstInGroup && (
          <span className="text-xs font-bold text-(--theme-muted) ml-3 mb-1">
            {message.sender_name}
          </span>
        )}

        <div className={cn(
          "px-4 pt-2.5 pb-2 rounded-[1.4rem] min-w-[5.5rem]",
          isMe
            ? cn(getBubbleClass(bubbleColor, colorTheme), isLastInGroup && "rounded-br-md")
            : cn("bg-(--theme-card-bg) text-(--theme-ink) border border-(--theme-border)", isLastInGroup && "rounded-bl-md")
        )}>
          {!isMe && isTranslating ? (
            <TranslatingDots label={t('msg.translating', lang)} />
          ) : (
            <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">{mainText}</p>
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
              <p className={cn("text-[14px] leading-snug whitespace-pre-wrap break-words", !isMe && "text-(--theme-muted)")}>
                {panelText}
              </p>
            </div>
          )}

          {isError && (
            <div className={cn(
              "mt-2 rounded-2xl px-3 py-2 flex items-center justify-between gap-3 text-[13px]",
              isMe ? "bg-black/10" : "bg-(--theme-subtle-bg)"
            )}>
              <span className={isMe ? "" : "text-(--theme-muted)"}>{t('msg.error', lang)}</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(message.id)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-opacity hover:opacity-85",
                    isMe ? "bg-white/25" : "bg-(--theme-accent) text-(--theme-on-accent)"
                  )}
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('msg.retry', lang)}
                </button>
              )}
            </div>
          )}

          <div className={cn(
            "flex items-center gap-2 mt-1.5 text-[11px]",
            isMe ? "justify-end opacity-80" : "justify-end text-(--theme-muted)"
          )}>
            {!isTranslating && (
              <button
                type="button"
                onClick={() => handleCopy(copyText)}
                aria-label={copied ? t('msg.copied', lang) : t('msg.copy', lang)}
                title={t('msg.copy', lang)}
                className="p-1 -m-1 rounded-full opacity-60 hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
            <span>
              {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMe && !isTranslating && (
              message.is_read
                ? <CheckCheck className="w-3.5 h-3.5" aria-label="Okundu" />
                : <Check className="w-3.5 h-3.5 opacity-70" aria-label="Gönderildi" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
