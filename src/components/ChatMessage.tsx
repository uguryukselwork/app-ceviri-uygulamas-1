import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { Loader2, Copy, Check, RotateCcw, CheckCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { t } from '../lib/i18n';
import { getBubbleClass } from '../lib/themes';

export interface MessageType {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_gender: string;
  sender_avatar?: string;
  original_text: string;
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
}

export default function ChatMessage({ message, showOriginal, onRetry }: ChatMessageProps) {
  const profile = useStore((state) => state.profile);
  const colorTheme = useStore((state) => state.colorTheme);
  const bubbleColor = useStore((state) => state.bubbleColor);
  const isMe = message.sender_id === profile.id;
  const isTranslating = message.translation_status === 'pending';
  const isError = message.translation_status === 'error';

  const [copiedType, setCopiedType] = useState<'original' | 'translated' | null>(null);

  const handleCopy = async (text: string, type: 'original' | 'translated') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const senderBubbleClass = getBubbleClass(bubbleColor, colorTheme);

  // For sender: Show Original first, Translation below
  // For receiver: Show Translation first, Original below
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex w-full mb-4 group/message", isMe ? "justify-end" : "justify-start")}
    >
      {!isMe && (
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg mr-2 shrink-0 mt-auto overflow-hidden shadow-sm">
          {message.sender_avatar ? (
            <img src={message.sender_avatar} alt={message.sender_name} className="w-full h-full object-cover" />
          ) : (
            message.sender_gender === 'female' ? '👩' : '👨'
          )}
        </div>
      )}
      
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 shadow-xs relative group",
        isMe 
          ? cn(senderBubbleClass, "rounded-br-sm shadow-sm") 
          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-100 dark:border-slate-700 shadow-xs"
      )}>
        {!isMe && (
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 block">
            {message.sender_name}
          </span>
        )}

        <div className="space-y-1">
          {isMe ? (
            <>
              {/* Sender View */}
              <div className="relative group/text">
                <p className="text-[15px] leading-relaxed break-words pr-6">{message.original_text}</p>
                <button 
                  onClick={() => handleCopy(message.original_text, 'original')}
                  className="absolute right-0 top-0 p-1 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded opacity-100 sm:opacity-0 sm:group-hover/text:opacity-100 transition-opacity active:scale-95 cursor-pointer"
                  title={t('msg.copy', profile.language)}
                >
                  {copiedType === 'original' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              
              {isTranslating ? (
                <div className="flex items-center gap-1.5 text-white/80 text-xs mt-2 border-t border-white/20 pt-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t('msg.translating', profile.language)}
                </div>
              ) : message.translated_text ? (
                <div className="relative group/text">
                  <p className="text-[13px] text-white/90 border-t border-white/20 pt-1 mt-1 font-medium break-words pr-6">
                    {message.translated_text}
                  </p>
                  <button 
                    onClick={() => handleCopy(message.translated_text!, 'translated')}
                    className="absolute right-0 top-2 p-1 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded opacity-100 sm:opacity-0 sm:group-hover/text:opacity-100 transition-opacity active:scale-95 cursor-pointer"
                    title={t('msg.copy', profile.language)}
                  >
                    {copiedType === 'translated' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : isError ? (
                <div className="flex items-center justify-between border-t border-white/20 pt-1 mt-1">
                  <p className="text-[12px] text-red-200">{t('msg.error', profile.language)}</p>
                  {onRetry && (
                    <button 
                      onClick={() => onRetry(message.id)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-100 rounded text-[10px] hover:bg-red-500/40 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {t('msg.retry', profile.language)}
                    </button>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <>
              {/* Receiver View */}
              {isTranslating ? (
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span className="text-sm italic">{t('msg.translating', profile.language)}</span>
                </div>
              ) : (
                <>
                  <div className="relative group/text">
                    <p className="text-[15px] leading-relaxed break-words pr-6">
                      {message.translated_text || message.original_text}
                    </p>
                    <button 
                      onClick={() => handleCopy(message.translated_text || message.original_text, 'translated')}
                      className="absolute right-0 top-0 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/80 dark:bg-slate-800/80 rounded opacity-100 sm:opacity-0 sm:group-hover/text:opacity-100 transition-opacity shadow-xs border border-slate-100 dark:border-slate-700 active:scale-95 cursor-pointer"
                      title={t('msg.copy', profile.language)}
                    >
                      {copiedType === 'translated' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  
                  {isError && onRetry && (
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-[12px] text-red-500 dark:text-red-400">{t('msg.error', profile.language)}</p>
                      <button 
                        onClick={() => onRetry(message.id)}
                        className="flex items-center gap-1 px-2 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded text-[10px] hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-100 dark:border-red-500/20 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {t('msg.retry', profile.language)}
                      </button>
                    </div>
                  )}

                  {showOriginal && message.translated_text && (
                    <div className="relative group/orig">
                      <p className="text-[12px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-1 mt-1 break-words pr-6">
                        {message.original_text}
                      </p>
                      <button 
                        onClick={() => handleCopy(message.original_text, 'original')}
                        className="absolute right-0 top-1 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded opacity-100 sm:opacity-0 sm:group-hover/orig:opacity-100 transition-opacity active:scale-95 cursor-pointer"
                        title={t('msg.copy', profile.language)}
                      >
                        {copiedType === 'original' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
        
        <div className={cn(
          "flex items-center gap-1 mt-2",
          isMe ? "justify-end text-white/80" : "justify-start text-slate-400 dark:text-slate-500 relative"
        )}>
          <span className="text-[10px]">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isMe && !isTranslating && (
            <CheckCheck className={cn("w-3.5 h-3.5", message.is_read ? "text-emerald-300" : "text-white/60")} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
