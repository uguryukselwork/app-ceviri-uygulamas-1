import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import RoomHeader from '../components/RoomHeader';
import ChatInput from '../components/ChatInput';
import ChatMessage, { MessageType } from '../components/ChatMessage';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, X, Moon, Sun, Bell, BellOff, Camera, Download, Pencil, Trash2, Check, Plus, Wand2, Play, Volume2, Crown, EyeOff, Sparkles, Type, Smartphone, ShieldCheck, Lock, Unlock, Palette, ChevronRight, ArrowLeft } from 'lucide-react';
import { LANGUAGES, t } from '../lib/i18n';
import { playNotificationSound, compressImage, generateRoomCode } from '../lib/utils';
import { THEMES, getChatPatternStyle } from '../lib/themes';
import PremiumModal from '../components/PremiumModal';
import ThemeSettingsSection from '../components/ThemeSettingsSection';
import TypographySettingsSection from '../components/TypographySettingsSection';
import SecuritySettingsSection from '../components/SecuritySettingsSection';
import SecurityLockModal from '../components/SecurityLockModal';

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { 
    profile, setProfile, theme, setTheme, soundEnabled, setSoundEnabled, 
    notificationSound, setNotificationSound,
    colorTheme,
    fontSize, setFontSize, fontFamily, setFontFamily,
    isPremium, setIsPremium, hideProfile, setHideProfile,
    vibrationEnabled, setVibrationEnabled,
    deferredPrompt, setDeferredPrompt, savedRooms, addOrUpdateRoom, removeRoom, updateRoomName,
    chatPattern, appPin, isRoomLockEnabled, lockedRooms, unlockedRooms, unlockRoom, toggleRoomLock
  } = useStore();
  
  const [roomId, setRoomId] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'theme' | 'typography'>('main');

  const [editingRoomCode, setEditingRoomCode] = useState<string | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [newRoomCode, setNewRoomCode] = useState("");
  const [newRoomName, setNewRoomName] = useState("");

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    
    // Mark messages as read
    if (roomId) {
      const hasUnreadFromPartner = messages.some(m => m.sender_id !== profile.id && !m.is_read);
      if (hasUnreadFromPartner) {
        fetch(`/api/rooms/${roomId}/messages/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: profile.id })
        }).catch(console.error);
      }
    }
  }, [messages, roomId, profile.id]);

  // Initial Load & Realtime Setup
  useEffect(() => {
    if (!roomCode) return;

    let mounted = true;
    let sse: EventSource | null = null;

    const initRoom = async () => {
      try {
        // 1. Get room by code
        const resRoom = await fetch(`/api/rooms/by-code/${roomCode}`);
        if (!resRoom.ok) throw new Error('Oda bulunamadı');
        const roomData = await resRoom.json();
        const rId = roomData.id;
        
        if (mounted) setRoomId(rId);

        // 2. Join as participant
        await fetch(`/api/rooms/${rId}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profile.id,
            name: hideProfile ? 'Gizli Kullanıcı' : profile.name,
            gender: hideProfile ? null : profile.gender,
            language: profile.language,
            avatarUrl: hideProfile ? '' : profile.avatarUrl,
            status: hideProfile ? 'Gizli' : profile.status
          })
        });

        // 3. Fetch participants
        const fetchParticipants = async () => {
          const res = await fetch(`/api/rooms/${rId}/participants`);
          if (res.ok && mounted) {
            const data = await res.json();
            setParticipants(data);
            
            // Extract partner info to save to rooms history
            const partner = data.find((p: any) => p.user_id !== profile.id);
            if (roomCode) {
              addOrUpdateRoom({
                code: roomCode,
                lastAccessed: Date.now(),
                partnerName: partner?.name,
                partnerAvatar: partner?.avatarUrl,
                partnerGender: partner?.gender
              });
            }
          }
        };
        await fetchParticipants();

        // 4. Fetch old messages
        const resMsg = await fetch(`/api/rooms/${rId}/messages`);
        if (resMsg.ok && mounted) {
          const initialMessages = await resMsg.json();
          setMessages(initialMessages);
        }

        if (mounted) setIsConnected(true);

        // 5. Subscribe to Realtime via SSE
        sse = new EventSource(`/api/rooms/${rId}/events`);
        
        sse.addEventListener('message_new', (e: any) => {
          const msg = JSON.parse(e.data);
          if (mounted) {
            setMessages(prev => {
              // Play sound & vibrate if not my message
              if (soundEnabled && msg.sender_id !== profile.id) {
                // Prevent playing if it's already in the list
                if (!prev.some(m => m.id === msg.id)) {
                  playNotificationSound(notificationSound);
                  if (vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
                    try { navigator.vibrate(100); } catch (e) {}
                  }
                }
              }
              return [...prev, msg];
            });
          }
        });
        
        sse.addEventListener('message_update', (e: any) => {
          const msg = JSON.parse(e.data);
          if (mounted) setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
        });
        
        sse.addEventListener('participant_update', () => {
          fetchParticipants();
        });

      } catch (error) {
        console.error('Room init error:', error);
        if (mounted) navigate('/');
      }
    };

    initRoom();

    return () => {
      mounted = false;
      if (sse) sse.close();
    };
  }, [roomCode, profile.id, soundEnabled, notificationSound]); // Depend on soundEnabled and notificationSound to get fresh value

  // Update participant when profile or privacy changes
  useEffect(() => {
    if (roomId) {
      fetch(`/api/rooms/${roomId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          name: hideProfile ? 'Gizli Kullanıcı' : profile.name,
          gender: hideProfile ? null : profile.gender,
          language: profile.language,
          avatarUrl: hideProfile ? '' : profile.avatarUrl,
          status: hideProfile ? 'Gizli' : profile.status
        })
      }).catch(console.error);
    }
  }, [profile.language, profile.avatarUrl, profile.status, profile.name, profile.gender, hideProfile, roomId]);

  const handleSendMessage = async (text: string) => {
    if (!roomId) return;

    // Determine target language (from other participant, or opposite default)
    const otherParticipant = participants.find(p => p.user_id !== profile.id);
    let targetLang = profile.language === 'tr' ? 'en' : 'tr';
    
    if (profile.partnerLanguage && profile.partnerLanguage !== 'auto') {
      targetLang = profile.partnerLanguage;
    } else if (otherParticipant && otherParticipant.language && otherParticipant.language !== 'auto') {
      targetLang = otherParticipant.language;
    }

    try {
      await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: profile.id,
          sender_name: hideProfile ? 'Gizli Kullanıcı' : profile.name,
          sender_gender: hideProfile ? null : profile.gender,
          sender_avatar: hideProfile ? '' : profile.avatarUrl,
          original_text: text,
          original_language: profile.language,
          target_language: targetLang
        })
      });
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleRetryTranslation = async (msgId: string) => {
    if (!roomId) return;
    try {
      await fetch(`/api/rooms/${roomId}/messages/${msgId}/retry`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Failed to retry translation', err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setProfile({ avatarUrl: compressed });
      } catch (err) {
        console.error('Avatar upload failed', err);
      }
    }
  };

  const partner = participants.find(p => p.user_id !== profile.id);
  const isThisRoomLocked = (isRoomLockEnabled || (roomCode ? lockedRooms.includes(roomCode) : false)) && !!appPin && !(roomCode && unlockedRooms.includes(roomCode));

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
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 flex flex-col space-y-2.5 transition-colors"
        style={getChatPatternStyle(chatPattern, theme === 'dark')}
      >
        {!partner && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 text-slate-500 dark:text-slate-400">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm text-2xl border border-slate-100 dark:border-slate-700">⏳</div>
            <p>{t('room.waiting', profile.language)}</p>
            <p className="text-sm">{t('room.your_code', profile.language)} <span className="font-bold text-indigo-600 dark:text-indigo-400">{roomCode}</span></p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage 
            key={msg.id} 
            message={msg} 
            showOriginal={showOriginal} 
            onRetry={handleRetryTranslation} 
          />
        ))}
        <div ref={messagesEndRef} className="h-4 shrink-0" />
      </div>

      <ChatInput onSend={handleSendMessage} disabled={!isConnected} />

      {/* Settings Overlay */}
      <AnimatePresence>
        {showParticipants && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 app-page-bg flex flex-col transition-colors"
          >
            <div className="flex items-center justify-between p-4 border-b app-header-bg shadow-sm shrink-0">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Odalarım</h2>
              <button 
                onClick={() => setShowParticipants(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-2 mb-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Yeni Oda Kaydet</h3>
                <div className="flex gap-2">
                  <div className="relative flex-[1.2] min-w-0">
                    <input 
                      type="text" 
                      placeholder="Oda Kodu" 
                      value={newRoomCode}
                      maxLength={6}
                      onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                      className="w-full h-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-12 py-1.5 text-sm outline-none focus:border-indigo-500"
                    />
                    <button
                      title="Otomatik Kod Oluştur"
                      onClick={() => setNewRoomCode(generateRoomCode())}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="İsimsiz Sohbet" 
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="flex-[2] min-w-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                  />
                  <button 
                    onClick={() => {
                      if (newRoomCode.trim()) {
                        addOrUpdateRoom({
                          code: newRoomCode.trim(),
                          lastAccessed: Date.now(),
                          customName: newRoomName.trim() || undefined
                        });
                        setNewRoomCode("");
                        setNewRoomName("");
                      }
                    }}
                    disabled={!newRoomCode.trim()}
                    className="bg-indigo-600 text-white rounded-lg p-2 disabled:opacity-50 flex items-center justify-center shrink-0 hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {savedRooms.sort((a, b) => b.lastAccessed - a.lastAccessed).map(room => (
                <div 
                  key={room.code} 
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group"
                >
                  <div 
                    className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                    onClick={() => {
                      if (editingRoomCode === room.code) return; // prevent navigating if editing
                      setShowParticipants(false);
                      if (room.code !== roomCode) {
                        setMessages([]); // Clear current messages for smoother transition
                        navigate(`/room/${room.code}`);
                      }
                    }}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      {room.partnerAvatar ? (
                        <img src={room.partnerAvatar} alt={room.customName || room.partnerName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">{room.partnerGender === 'female' ? '👩' : (room.partnerGender === 'male' ? '👨' : '👥')}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        {editingRoomCode === room.code ? (
                          <input
                            type="text"
                            autoFocus
                            value={editRoomName}
                            placeholder="İsimsiz Sohbet"
                            onChange={(e) => setEditRoomName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateRoomName(room.code, editRoomName.trim());
                                setEditingRoomCode(null);
                              }
                            }}
                            className="bg-slate-100 dark:bg-slate-900 border border-indigo-500 rounded px-2 py-0.5 text-sm w-full outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate pr-2">
                            {room.customName || room.partnerName || 'İsimsiz Sohbet'}
                          </h3>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Kod: <span className="font-mono">{room.code}</span>
                        {room.code === roomCode && (
                          <span className="ml-2 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">Aktif</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {appPin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRoomLock(room.code);
                        }}
                        title={lockedRooms.includes(room.code) ? "Oda Kilidini Kaldır" : "Bu Odayı PIN ile Kilitle"}
                        className={`p-2 rounded-full transition-colors cursor-pointer ${
                          lockedRooms.includes(room.code)
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {lockedRooms.includes(room.code) ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    )}

                    {editingRoomCode === room.code ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateRoomName(room.code, editRoomName.trim());
                          setEditingRoomCode(null);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-full transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditRoomName(room.customName || room.partnerName || 'İsimsiz Sohbet');
                          setEditingRoomCode(room.code);
                        }}
                        className="p-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors opacity-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRoom(room.code);
                        if (room.code === roomCode) {
                           // Option: they deleted current room. Maybe leave it.
                        }
                      }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {savedRooms.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 py-10">
                  <p>Henüz kayıtlı bir odanız yok.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 app-page-bg flex flex-col transition-colors"
          >
            <div className="flex items-center justify-between p-4 border-b app-header-bg shrink-0">
              {settingsView === 'main' ? (
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t('room.settings', profile.language)}</h2>
              ) : (
                <button 
                  onClick={() => setSettingsView('main')}
                  className="flex items-center gap-1.5 py-1 px-2.5 -ml-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Ayarlar</span>
                </button>
              )}

              {settingsView !== 'main' && (
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {settingsView === 'theme' ? 'Tema & Görünüm' : 'Yazı Tipi & Boyut'}
                </h2>
              )}

              <button 
                onClick={() => { setShowSettings(false); setSettingsView('main'); }}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {settingsView === 'theme' && (
                <ThemeSettingsSection />
              )}

              {settingsView === 'typography' && (
                <TypographySettingsSection />
              )}

              {settingsView === 'main' && (
                <>
                  {/* Profile Avatar Update */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl">{profile.gender === 'female' ? '👩' : '👨'}</span>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                    {hideProfile && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-semibold">
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Gizli Profil Aktif</span>
                      </div>
                    )}
                  </div>

                  {/* Theme & Sound Toggles */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                      className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-slate-200 dark:hover:border-slate-600 transition-colors cursor-pointer"
                    >
                      {theme === 'light' ? <Moon className="w-6 h-6 text-indigo-500" /> : <Sun className="w-6 h-6 text-yellow-500" />}
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {theme === 'light' ? 'Gece Modu' : 'Gündüz Modu'}
                      </span>
                    </button>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl hover:border-slate-200 dark:hover:border-slate-600 transition-colors cursor-pointer"
                    >
                      {soundEnabled ? <Bell className="w-6 h-6 text-green-500" /> : <BellOff className="w-6 h-6 text-slate-400" />}
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {soundEnabled ? 'Ses Açık' : 'Ses Kapalı'}
                      </span>
                    </button>
                  </div>

                  {/* Compact & Ergonomic Notification Sound Selection */}
                  {soundEnabled && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Volume2 className="w-3.5 h-3.5 text-indigo-500" /> Melodi
                        </span>
                        <button
                          type="button"
                          onClick={() => playNotificationSound(notificationSound)}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" /> Sesi Dinle
                        </button>
                      </div>

                      {/* Sleek inline segmented pills */}
                      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                        {[
                          { id: 'pop', label: 'Pop', icon: '🫧' },
                          { id: 'chime', label: 'Zil', icon: '🔔' },
                          { id: 'bell', label: 'Çan', icon: '🛎️' },
                          { id: 'digital', label: 'Dijital', icon: '⚡' }
                        ].map(sound => {
                          const isSelected = notificationSound === sound.id;
                          return (
                            <button
                              key={sound.id}
                              type="button"
                              onClick={() => {
                                setNotificationSound(sound.id);
                                playNotificationSound(sound.id);
                              }}
                              className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-xs transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-semibold shadow-xs'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                              }`}
                              title={`${sound.label} melodisini seç ve dinle`}
                            >
                              <span className="text-xs">{sound.icon}</span>
                              <span className="truncate">{sound.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Vibration Toggle */}
                  <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer">
                    <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                      <Smartphone className="w-5 h-5 text-indigo-500" />
                      <div>
                        <span className="font-medium text-sm">Bildirim Titreşimi</span>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Gelen yeni mesajlarda cihaz titresin</p>
                      </div>
                    </div>
                    <div className="relative inline-block w-12 h-6 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors" style={{ backgroundColor: vibrationEnabled ? '#6366f1' : undefined }}>
                      <input 
                        type="checkbox" 
                        className="opacity-0 w-0 h-0"
                        checked={vibrationEnabled}
                        onChange={(e) => setVibrationEnabled(e.target.checked)}
                      />
                      <span 
                        className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm"
                        style={{ transform: vibrationEnabled ? 'translateX(24px)' : 'translateX(0)' }}
                      />
                    </div>
                  </label>

                  {/* Dedicated Buttons for Theme and Typography */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" /> Kişiselleştirme
                    </h3>

                    {/* 1. Dedicated Theme Button */}
                    <button
                      type="button"
                      onClick={() => setSettingsView('theme')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/90 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-xs shrink-0">
                          <Palette className="w-5 h-5" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Tema ve Renkler</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                              {THEMES.find(t => t.id === colorTheme)?.name || 'İndigo'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Hazır renk temaları, sohbet balonları, arka plan deseni
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors pl-2">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </button>

                    {/* 2. Dedicated Typography Button */}
                    <button
                      type="button"
                      onClick={() => setSettingsView('typography')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/90 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-xs shrink-0">
                          <Type className="w-5 h-5" />
                        </div>
                        <div className="text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Yazı Tipi & Boyut</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-medium">
                              {fontSize === 'small' ? 'Küçük' : fontSize === 'large' ? 'Büyük' : 'Standart'} • {fontFamily === 'serif' ? 'Serif' : fontFamily === 'mono' ? 'Mono' : 'Sans'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Metin ölçeği, yazı stili, canlı metin önizlemesi
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors pl-2">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </button>
                  </div>

                  {/* Security PIN & Biometrics Lock */}
                  <SecuritySettingsSection />
                </>
              )}

              {/* Privacy & Premium (Profili Gizle) */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" /> Gizlilik & Premium
                </h3>

                {/* VIP Status Banner */}
                {isPremium ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          VIP Üyelik Aktif <Crown className="w-4 h-4 text-amber-500" />
                        </h4>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Tüm premium ayrıcalıklar açık</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPremiumModal(true)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium underline"
                    >
                      Yönet
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                        <Crown className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          LiveTranslate VIP <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 font-extrabold uppercase">Premium</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Gizli profil & VIP ayrıcalıklar</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPremiumModal(true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-xs font-semibold rounded-xl shadow hover:opacity-95 transition-opacity"
                    >
                      Yükselt
                    </button>
                  </div>
                )}

                {/* Profili Gizle Toggle (Requires Premium) */}
                <div 
                  onClick={() => {
                    if (!isPremium) {
                      setShowPremiumModal(true);
                    } else {
                      setHideProfile(!hideProfile);
                    }
                  }}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                    hideProfile 
                      ? 'bg-indigo-50/80 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 pr-3">
                    <div className={`p-2 rounded-xl shrink-0 ${hideProfile ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      <EyeOff className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                          Profili Gizle (Gizli Mod)
                        </span>
                        {!isPremium ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            <Crown className="w-3 h-3 text-amber-600 dark:text-amber-300" /> PREMİUM
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                            VIP
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Odadaki diğer kullanıcılara adınız 'Gizli Kullanıcı' ve profil fotoğrafınız gizli olarak gösterilir.
                      </p>
                    </div>
                  </div>

                  <div className="relative inline-block w-12 h-6 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors shrink-0" style={{ backgroundColor: hideProfile ? '#6366f1' : undefined }}>
                    <span 
                      className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm"
                      style={{ transform: hideProfile ? 'translateX(24px)' : 'translateX(0)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Install App */}
              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                >
                  <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-300">
                    <Download className="w-6 h-6" />
                    <span className="font-medium text-sm">Uygulamayı Ana Ekrana Ekle</span>
                  </div>
                </button>
              )}

              {/* Languages */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Languages className="w-4 h-4" /> {t('room.settings', profile.language)}
                </h3>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('room.my_language', profile.language)}</label>
                  <select
                    value={profile.language}
                    onChange={(e) => setProfile({ language: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('room.partner_language', profile.language)}</label>
                  <select
                    value={profile.partnerLanguage || 'auto'}
                    onChange={(e) => setProfile({ partnerLanguage: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="auto">{t('room.auto_detect', profile.language)}</option>
                    {LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                      <option key={`partner-${lang.code}`} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t('room.auto_desc', profile.language, { lang: partner ? (LANGUAGES.find(l => l.code === partner.language)?.name || partner.language) : t('room.waiting_partner', profile.language) })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('room.appearance', profile.language)}</h3>
                
                <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{t('room.show_original', profile.language)}</span>
                  <div className="relative inline-block w-12 h-6 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors" style={{ backgroundColor: showOriginal ? '#6366f1' : undefined }}>
                    <input 
                      type="checkbox" 
                      className="opacity-0 w-0 h-0"
                      checked={showOriginal}
                      onChange={(e) => setShowOriginal(e.target.checked)}
                    />
                    <span 
                      className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform"
                      style={{ transform: showOriginal ? 'translateX(24px)' : 'translateX(0)' }}
                    />
                  </div>
                </label>
              </div>

              <div className="pt-8 pb-12">
                <button 
                  onClick={() => {
                    navigate('/');
                  }}
                  className="w-full py-4 text-red-500 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  {t('room.leave', profile.language)}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Upgrade Modal */}
      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onSuccess={() => {
          setHideProfile(true);
        }}
        featureTitle="Profili Gizle (Gizli Mod)"
      />

      {/* Room Security Lock Modal */}
      {isThisRoomLocked && (
        <SecurityLockModal
          isOpen={true}
          mode="unlock"
          title={`Korumalı Oda (${roomCode})`}
          subtitle="Bu odaya girmek için 4 haneli PIN kodunuzu girin"
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
