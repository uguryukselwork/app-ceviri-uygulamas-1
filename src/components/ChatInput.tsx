import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap, Plus, X, Pencil, Trash2, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../store/useStore';
import { t } from '../lib/i18n';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const { profile, quickMessages, addQuickMessage, removeQuickMessage, updateQuickMessage } = useStore();
  const [text, setText] = useState('');
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const [newQuickMsg, setNewQuickMsg] = useState('');
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const startEditing = (msg: string) => {
    setEditingMsg(msg);
    setEditText(msg);
  };

  const handleSaveEdit = () => {
    if (editingMsg && editText.trim()) {
      updateQuickMessage(editingMsg, editText.trim());
    }
    setEditingMsg(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingMsg(null);
    setEditText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [text]);

  // Handle outside click to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowQuickMessages(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <form 
      onSubmit={handleSubmit}
      className="p-3.5 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex items-end gap-2 shrink-0 pb-safe z-20 shadow-sm transition-colors"
    >
      <div className="flex-1 relative bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-indigo-300 dark:focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-500/20 transition-all flex items-end">
        <div className="relative shrink-0 flex items-center justify-center p-2 pl-3" ref={popoverRef}>
          <button
            type="button"
            title="Hazır Mesajlar"
            onClick={() => setShowQuickMessages(!showQuickMessages)}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              showQuickMessages 
                ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400" 
                : "text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            <Zap className="w-5 h-5" />
          </button>
          
          {/* Quick Messages Popover */}
          {showQuickMessages && (
            <div className="absolute bottom-full left-0 mb-3 w-72 sm:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
              <div className="p-3 border-b border-slate-100 dark:border-slate-700 font-medium text-sm text-slate-700 dark:text-slate-300 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/80">
                <span className="flex items-center gap-1.5 font-semibold text-xs tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                  Hazır Mesajlar
                </span>
                <button 
                  type="button"
                  onClick={() => {
                    setShowQuickMessages(false);
                    setEditingMsg(null);
                  }} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-700/50">
                {quickMessages.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 py-4">Kayıtlı hazır mesaj yok.</p>
                ) : (
                  quickMessages.map((msg, index) => (
                    <div key={`${msg}-${index}`} className="pt-1.5 first:pt-0">
                      {editingMsg === msg ? (
                        <div className="p-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800/60">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            autoFocus
                            placeholder="Mesajı düzenle..."
                            className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEdit();
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <button
                            type="button"
                            title="Kaydet"
                            onClick={handleSaveEdit}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="İptal"
                            onClick={handleCancelEdit}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors p-1 group">
                          <button 
                            type="button"
                            onClick={() => {
                              setShowQuickMessages(false);
                              onSend(msg);
                            }}
                            className="flex-1 min-w-0 text-left px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            title={msg}
                          >
                            {msg}
                          </button>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              title="Düzenle"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(msg);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer active:scale-95"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Sil"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeQuickMessage(msg);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="p-2.5 border-t border-slate-100 dark:border-slate-700 flex gap-2 bg-slate-50/30 dark:bg-slate-800/40">
                <input 
                  type="text" 
                  value={newQuickMsg}
                  onChange={(e) => setNewQuickMsg(e.target.value)}
                  placeholder="Yeni hazır mesaj ekle..."
                  className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newQuickMsg.trim()) {
                        addQuickMessage(newQuickMsg.trim());
                        setNewQuickMsg('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  title="Ekle"
                  onClick={() => {
                    if (newQuickMsg.trim()) {
                      addQuickMessage(newQuickMsg.trim());
                      setNewQuickMsg('');
                    }
                  }}
                  disabled={!newQuickMsg.trim()}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('room.type_message', profile.language)}
          disabled={disabled}
          rows={1}
          className="w-full max-h-32 bg-transparent border-none focus:ring-0 resize-none py-3 pr-4 text-[16px] sm:text-[15px] text-slate-800 dark:text-slate-200 disabled:opacity-50"
        />
      </div>
      
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className={cn(
          "p-3 rounded-xl flex items-center justify-center transition-all shrink-0",
          text.trim() && !disabled
            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
        )}
      >
        <Send className="w-6 h-6" />
      </button>
    </form>
  );
}
