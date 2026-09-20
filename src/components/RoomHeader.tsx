import { ArrowLeft, Settings, Copy, CheckCircle2, Share2, Users, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { t } from '../lib/i18n';

interface RoomHeaderProps {
  roomCode: string;
  partnerName?: string;
  partnerGender?: string;
  partnerAvatar?: string;
  partnerStatus?: string;
  participantsCount?: number;
  isConnected: boolean;
  onOpenSettings: () => void;
  onOpenParticipants?: () => void;
}

export default function RoomHeader({ roomCode, partnerName, partnerGender, partnerAvatar, partnerStatus, participantsCount = 0, isConnected, onOpenSettings, onOpenParticipants }: RoomHeaderProps) {
  const navigate = useNavigate();
  const { profile, savedRooms, hideProfile } = useStore();
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const roomUrl = window.location.origin + window.location.pathname;

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback
    }
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    } catch (err) {
      console.error('Fallback copy failed', err);
      return false;
    }
  };

  const copyCode = async () => {
    const ok = await copyToClipboard(roomCode);
    if (ok) {
      setCopiedCode(true);
      showToast(t('create.copied', profile.language));
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const inviteText = `❤️ Benimle çeviri sohbetine katıl!\nOda kodu: ${roomCode}\nBuradan katıl:\n${roomUrl}`;

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(inviteText);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.location.href = `whatsapp://send?text=${encoded}`;
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
    }
  };

  // Find custom name for the room
  const currentRoom = savedRooms.find(r => r.code === roomCode);
  const displayName = currentRoom?.customName || partnerName;

  return (
    <header className="sticky top-0 z-20 shrink-0 select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-slate-800 text-white text-xs font-medium px-3.5 py-2 rounded-full shadow-lg flex items-center gap-1.5 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Navigation Bar */}
      <div className="app-header-bg backdrop-blur-md border-b p-3.5 sm:p-4 flex items-center justify-between shadow-xs transition-colors relative z-20">
        {/* Left side: Back button & Partner Info */}
        <div className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {partnerName || currentRoom?.customName ? (
              <>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-pink-50 dark:bg-pink-950/40 rounded-full flex items-center justify-center text-lg sm:text-xl shrink-0 overflow-hidden">
                  {partnerAvatar ? (
                    <img src={partnerAvatar} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    partnerGender === 'female' ? '👩' : (partnerGender === 'male' ? '👨' : '👥')
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate">{displayName}</h2>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${!isConnected ? 'bg-red-500' : partnerStatus === 'busy' ? 'bg-red-500' : partnerStatus === 'away' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                      {!isConnected 
                        ? t('room.no_connection', profile.language) 
                        : partnerStatus === 'busy' ? 'Rahatsız Etmeyin'
                        : partnerStatus === 'away' ? 'Dışarıda'
                        : t('room.online', profile.language)}
                      {participantsCount > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] border border-slate-200 dark:border-slate-700">
                          {participantsCount}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="min-w-0">
                <h2 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate">{t('room.waiting_partner', profile.language)}</h2>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                    {t('room.connecting', profile.language)}
                    {participantsCount > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[10px] border border-slate-200 dark:border-slate-700">
                        {participantsCount}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Share Button, Friends, Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
          {/* Incognito Active Indicator */}
          {hideProfile && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold"
              title="Gizli Profil Aktif (Değiştirmek için tıkla)"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Gizli</span>
            </button>
          )}

          {/* Friends Button */}
          {onOpenParticipants && (
            <button 
              onClick={onOpenParticipants}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Arkadaşlar"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Share Button */}
          <button 
            onClick={handleWhatsAppShare}
            className="p-2 rounded-xl transition-all cursor-pointer active:scale-95 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400"
            title={t('room.share', profile.language)}
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          {/* Settings Button */}
          <button 
            onClick={onOpenSettings}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title={t('room.settings', profile.language)}
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Pinned Room Code Button Area - Pinned right below top bar matching the user's drawing */}
      <div className="flex items-center justify-center pt-2.5 pb-1 px-4 pointer-events-none relative z-10">
        <button 
          onClick={copyCode}
          className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-mono font-semibold shadow-xs border border-slate-200/90 dark:border-slate-750 transition-all active:scale-95 group cursor-pointer"
          title={t('room.copy', profile.language)}
        >
          {copiedCode ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <Copy className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
          )}
          <span className="tracking-wider font-bold text-slate-900 dark:text-slate-100">{roomCode}</span>
          <span className="text-[11px] font-sans font-medium text-slate-400 dark:text-slate-500 border-l border-slate-200 dark:border-slate-750 pl-2">
            {copiedCode ? 'Kopyalandı' : 'Kodu Kopyala'}
          </span>
        </button>
      </div>

      {/* Share Modal Dialog Removed */}
    </header>
  );
}
