import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import RoomHeader from '../components/RoomHeader';
import ChatInput from '../components/ChatInput';
import ChatMessage, { MessageType } from '../components/ChatMessage';
import { motion, AnimatePresence } from 'motion/react';
import { X, Pencil, Trash2, Check, Plus, Wand2, Lock, Unlock } from 'lucide-react';
import { LANGUAGES, t, plainLanguageName } from '../lib/i18n';
import { playNotificationSound, generateRoomCode } from '../lib/utils';
import { getChatPatternStyle } from '../lib/themes';
import SettingsSheet from '../components/SettingsSheet';
import { SettingsGroup, SheetHeader, fieldClass } from '../components/ui';
import { cn } from '../lib/utils';
import SecurityLockModal from '../components/SecurityLockModal';
import { primaryButton } from '../components/ui';
import {
  findRoom, upsertParticipant, fetchParticipants, fetchMessages, sendMessage,
  requestTranslation, markMessagesRead, subscribeToRoom, type Participant
} from '../lib/api';

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const {
    profile, theme, soundEnabled, notificationSound, hideProfile, vibrationEnabled,
    savedRooms, addOrUpdateRoom, removeRoom, updateRoomName,
    chatPattern, appPin, isRoomLockEnabled, lockedRooms, unlockedRooms, unlockRoom, toggleRoomLock
  } = useStore();
  
  const [roomId, setRoomId] = useState<string | null>(null);

  const [editingRoomCode, setEditingRoomCode] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [newRoomCode, setNewRoomCode] = useState("");
  const [newRoomName, setNewRoomName] = useState("");

  const [messages, setMessages] = useState<MessageType[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();

    // Mark the partner's messages as read while the room is open
    if (roomId && messages.some(m => m.sender_id !== profile.id && !m.is_read)) {
      void markMessagesRead(roomId, profile.id);
    }
  }, [messages, roomId, profile.id]);

  // Latest notification preferences, read inside the realtime callback without resubscribing
  const notifyPrefs = useRef({ soundEnabled, notificationSound, vibrationEnabled });
  notifyPrefs.current = { soundEnabled, notificationSound, vibrationEnabled };

  const participantInput = () => ({
    name: hideProfile ? 'Gizli Kullanıcı' : (profile.name || 'Misafir'),
    gender: hideProfile ? null : profile.gender,
    language: profile.language,
    avatarUrl: hideProfile ? null : profile.avatarUrl,
    status: hideProfile ? 'Gizli' : profile.status,
  });

  // Initial load & realtime subscription
  useEffect(() => {
    if (!roomCode) return;

    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const loadParticipants = async (rId: string) => {
      const data = await fetchParticipants(rId);
      if (!mounted) return;
      setParticipants(data);

      // Remember the room (and who is in it) for the recent chats list
      const other = data.find(p => p.user_id !== profile.id);
      addOrUpdateRoom({
        code: roomCode,
        lastAccessed: Date.now(),
        partnerName: other?.name,
        partnerAvatar: other?.avatarUrl ?? undefined,
        partnerGender: other?.gender
      });
    };

    const initRoom = async () => {
      try {
        const room = await findRoom(roomCode);
        if (!room) {
          if (mounted) setRoomError(t('room.not_found', profile.language));
          return;
        }
        if (!mounted) return;
        setRoomId(room.id);

        await upsertParticipant(room.id, profile.id, participantInput());
        await loadParticipants(room.id);

        const initialMessages = await fetchMessages(room.id);
        if (!mounted) return;
        setMessages(initialMessages);
        setIsConnected(true);

        unsubscribe = subscribeToRoom(room.id, {
          onMessageInsert: (msg) => {
            if (!mounted) return;
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              const { soundEnabled, notificationSound, vibrationEnabled } = notifyPrefs.current;
              if (msg.sender_id !== profile.id) {
                if (soundEnabled) playNotificationSound(notificationSound);
                if (vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
                  try { navigator.vibrate(100); } catch { /* not allowed */ }
                }
              }
              return [...prev, msg];
            });
          },
          onMessageUpdate: (msg) => {
            if (mounted) setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
          },
          onParticipantsChange: () => { void loadParticipants(room.id); },
        });
      } catch (error) {
        console.error('Room init error:', error);
        if (mounted) setRoomError(t('room.load_error', profile.language));
      }
    };

    initRoom();

    return () => {
      mounted = false;
      unsubscribe?.();
      setIsConnected(false);
    };
  }, [roomCode, profile.id]);

  // Keep my name, language and photo in the room up to date
  useEffect(() => {
    if (roomId) {
      upsertParticipant(roomId, profile.id, participantInput()).catch(console.error);
    }
  }, [profile.language, profile.avatarUrl, profile.status, profile.name, profile.gender, hideProfile, roomId]);

  const handleSendMessage = async (text: string) => {
    if (!roomId) return;

    // Target language: my explicit choice, else the partner's language, else the other of tr/en
    const otherParticipant = participants.find(p => p.user_id !== profile.id);
    let targetLang = profile.language === 'tr' ? 'en' : 'tr';
    if (profile.partnerLanguage && profile.partnerLanguage !== 'auto') {
      targetLang = profile.partnerLanguage;
    } else if (otherParticipant?.language && otherParticipant.language !== 'auto') {
      targetLang = otherParticipant.language;
    }

    try {
      const input = participantInput();
      const sent = await sendMessage({
        room_id: roomId,
        sender_name: input.name,
        sender_gender: input.gender,
        sender_avatar: input.avatarUrl,
        original_text: text,
        original_language: profile.language,
        target_language: targetLang
      });
      // Show it right away; the realtime insert for the same id is ignored
      setMessages(prev => prev.some(m => m.id === sent.id) ? prev : [...prev, sent]);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleRetryTranslation = async (msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, translation_status: 'pending' } : m));
    await requestTranslation(msgId);
  };

  const partner = participants.find(p => p.user_id !== profile.id);
  const isThisRoomLocked = (isRoomLockEnabled || (roomCode ? lockedRooms.includes(roomCode) : false)) && !!appPin && !(roomCode && unlockedRooms.includes(roomCode));

  if (roomError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-5 app-page-bg">
        <h1 className="font-display font-semibold text-2xl text-(--theme-ink)">{roomError}</h1>
        <p className="text-[15px] text-(--theme-muted)">{t('room.not_found_hint', profile.language)}</p>
        <button onClick={() => navigate('/')} className={primaryButton}>{t('room.back_home', profile.language)}</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden app-page-bg relative transition-colors">
      <RoomHeader 
        roomCode={roomCode || ''} 
        partnerName={partner?.name}
        partnerGender={partner?.gender}
        partnerAvatar={partner?.avatarUrl}
        partnerStatus={partner?.status}
        participantsCount={participants.length}
        isConnected={isConnected}
        onOpenSettings={() => setShowSettings(true)}
        onOpenParticipants={() => setShowParticipants(true)}
      />

      {/* Chat Area - Header and Input stay fixed while only messages scroll */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-3 pb-1 flex flex-col transition-colors"
        style={getChatPatternStyle(chatPattern, theme === 'dark')}
      >
        {!partner && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
            <div className="w-full max-w-xs rounded-[2rem] bg-(--theme-card-bg) border border-(--theme-border) px-6 py-7 space-y-4">
              <h2 className="font-display font-semibold text-xl text-(--theme-ink)">{t('room.waiting_title', profile.language)}</h2>
              <p className="text-sm text-(--theme-muted) leading-relaxed">{t('room.waiting_desc', profile.language)}</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(roomCode || '');
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  } catch (err) {
                    console.error('Failed to copy', err);
                  }
                }}
                className="w-full rounded-3xl bg-(--theme-accent-light) py-4 flex flex-col items-center gap-1 cursor-pointer active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--theme-accent)"
              >
                <span className="font-display font-semibold text-4xl tracking-[0.12em] text-(--theme-accent)">{roomCode}</span>
                <span className="text-xs font-bold text-(--theme-accent)">
                  {codeCopied ? t('create.copied', profile.language) : t('create.copy_code', profile.language)}
                </span>
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            showOriginal={showOriginal}
            onRetry={handleRetryTranslation}
            isFirstInGroup={messages[i - 1]?.sender_id !== msg.sender_id}
            isLastInGroup={messages[i + 1]?.sender_id !== msg.sender_id}
          />
        ))}
        <div ref={messagesEndRef} className="h-4 shrink-0" />
      </div>

      <ChatInput onSend={handleSendMessage} disabled={!isConnected} />

      {/* Settings Overlay */}
      <AnimatePresence>
        {showParticipants && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="absolute inset-0 z-50 app-page-bg flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Odalarım"
          >
            <SheetHeader title="Odalarım" onClose={() => setShowParticipants(false)} />

            <div className="flex-1 overflow-y-auto px-4 pt-5 pb-10 space-y-6">
              <SettingsGroup title="Oda kaydet">
                <form
                  className="p-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newRoomCode.trim()) return;
                    addOrUpdateRoom({
                      code: newRoomCode.trim(),
                      lastAccessed: Date.now(),
                      customName: newRoomName.trim() || undefined
                    });
                    setNewRoomCode("");
                    setNewRoomName("");
                  }}
                >
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Oda kodu"
                      aria-label="Oda kodu"
                      value={newRoomCode}
                      maxLength={6}
                      onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                      className={cn(fieldClass, 'pr-12 font-display tracking-[0.1em] uppercase')}
                    />
                    <button
                      type="button"
                      title="Rastgele kod üret"
                      aria-label="Rastgele kod üret"
                      onClick={() => setNewRoomCode(generateRoomCode())}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-(--theme-muted) hover:text-(--theme-accent) hover:bg-(--theme-accent-light) transition-colors cursor-pointer"
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Ad (isteğe bağlı)`}
                      aria-label="Oda adı"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className={cn(fieldClass, 'flex-1 min-w-0')}
                    />
                    <button
                      type="submit"
                      disabled={!newRoomCode.trim()}
                      aria-label="Kaydet"
                      className="w-[52px] shrink-0 rounded-2xl bg-(--theme-accent) text-(--theme-on-accent) flex items-center justify-center hover:bg-(--theme-accent-hover) transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </SettingsGroup>

              {savedRooms.length === 0 ? (
                <p className="text-center text-[15px] text-(--theme-muted) py-8">
                  Henüz kayıtlı odan yok. Girdiğin odalar burada birikir.
                </p>
              ) : (
                <SettingsGroup title="Kayıtlı odalar">
                  {[...savedRooms].sort((a, b) => b.lastAccessed - a.lastAccessed).map(room => {
                    const label = room.customName || room.partnerName || t('room.unnamed', profile.language);
                    const isEditing = editingRoomCode === room.code;
                    const isLocked = lockedRooms.includes(room.code);
                    const saveName = () => {
                      updateRoomName(room.code, editRoomName.trim());
                      setEditingRoomCode(null);
                    };
                    const rowButton = "w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer";
                    return (
                      <div key={room.code} className="flex items-center gap-3 px-3 py-3">
                        <button
                          type="button"
                          disabled={isEditing}
                          onClick={() => {
                            setShowParticipants(false);
                            if (room.code !== roomCode) {
                              setMessages([]); // Clear current messages for smoother transition
                              navigate(`/room/${room.code}`);
                            }
                          }}
                          className="flex-1 flex items-center gap-3 min-w-0 text-left cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--theme-accent)"
                        >
                          <span className="w-12 h-12 rounded-full overflow-hidden bg-(--theme-accent-light) text-(--theme-accent) flex items-center justify-center shrink-0 font-display font-semibold text-lg">
                            {room.partnerAvatar
                              ? <img src={room.partnerAvatar} alt="" className="w-full h-full object-cover" />
                              : label[0].toLocaleUpperCase(profile.language)}
                          </span>
                          <span className="flex-1 min-w-0">
                            {isEditing ? (
                              <input
                                type="text"
                                autoFocus
                                value={editRoomName}
                                placeholder={t('room.unnamed', profile.language)}
                                aria-label="Oda adı"
                                onChange={(e) => setEditRoomName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveName();
                                  if (e.key === 'Escape') setEditingRoomCode(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className={cn(fieldClass, 'py-1.5 px-3 text-sm')}
                              />
                            ) : (
                              <span className="block font-bold text-[15px] text-(--theme-ink) truncate">{label}</span>
                            )}
                            <span className="flex items-center gap-2 text-[13px] text-(--theme-muted) mt-0.5">
                              <span className="font-display tracking-[0.08em]">{room.code}</span>
                              {room.code === roomCode && (
                                <span className="px-2 py-0.5 rounded-full bg-(--theme-accent-light) text-(--theme-accent) text-[11px] font-bold">Şu an burada</span>
                              )}
                            </span>
                          </span>
                        </button>

                        <div className="flex items-center shrink-0">
                          {appPin && (
                            <button
                              type="button"
                              onClick={() => toggleRoomLock(room.code)}
                              aria-label={isLocked ? 'Oda kilidini kaldır' : 'Odayı PIN ile kilitle'}
                              aria-pressed={isLocked}
                              title={isLocked ? 'Oda kilidini kaldır' : 'Odayı PIN ile kilitle'}
                              className={cn(rowButton, isLocked ? 'text-(--theme-accent) bg-(--theme-accent-light)' : 'text-(--theme-muted) hover:text-(--theme-ink) hover:bg-(--theme-subtle-bg)')}
                            >
                              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          )}
                          {isEditing ? (
                            <button type="button" onClick={saveName} aria-label="Adı kaydet" className={cn(rowButton, 'text-(--theme-accent) hover:bg-(--theme-accent-light)')}>
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditRoomName(room.customName || room.partnerName || '');
                                setEditingRoomCode(room.code);
                              }}
                              aria-label="Yeniden adlandır"
                              className={cn(rowButton, 'text-(--theme-muted) hover:text-(--theme-ink) hover:bg-(--theme-subtle-bg)')}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeRoom(room.code)}
                            aria-label="Listeden kaldır"
                            className={cn(rowButton, 'text-(--theme-muted) hover:text-red-600 hover:bg-red-500/10')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </SettingsGroup>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        room={{
          partnerLanguageName: partner
            ? plainLanguageName(LANGUAGES.find(l => l.code === partner.language)?.name || partner.language)
            : t('room.waiting_partner', profile.language),
          showOriginal,
          setShowOriginal,
          onLeave: () => navigate('/'),
        }}
      />

      {/* Room Security Lock Modal */}
      {isThisRoomLocked && (
        <SecurityLockModal
          isOpen={true}
          mode="unlock"
          title={`${roomCode} kilitli`}
          subtitle="Bu odaya girmek için 4 haneli PIN kodunu gir."
          onSuccess={() => {
            if (roomCode) unlockRoom(roomCode);
          }}
          onCancel={() => {
            navigate('/');
          }}
        />
      )}
    </div>
  );
}
