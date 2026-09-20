import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Link as LinkIcon, Languages, User, Camera, Sun, Moon, Menu, Settings as SettingsIcon, Volume2, VolumeX, X, Pencil, Download, Crown, EyeOff, Type, Smartphone, Play, ShieldCheck, Bell, BellOff, Palette, ChevronRight, ArrowLeft } from 'lucide-react';
import { useStore, Gender } from '../store/useStore';
import { t, LANGUAGES } from '../lib/i18n';
import { cn, compressImage, playNotificationSound } from '../lib/utils';
import { THEMES } from '../lib/themes';
import PremiumModal from '../components/PremiumModal';
import ThemeSettingsSection from '../components/ThemeSettingsSection';
import TypographySettingsSection from '../components/TypographySettingsSection';
import SecuritySettingsSection from '../components/SecuritySettingsSection';

const DEFAULT_MALE_AVATAR = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces';
const DEFAULT_FEMALE_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces';

export default function Home() {
  const navigate = useNavigate();
  const { 
    profile, setProfile, theme, setTheme, soundEnabled, setSoundEnabled, 
    notificationSound, setNotificationSound,
    colorTheme,
    fontSize, setFontSize, fontFamily, setFontFamily,
    isPremium, setIsPremium, hideProfile, setHideProfile,
    vibrationEnabled, setVibrationEnabled,
    deferredPrompt, setDeferredPrompt 
  } = useStore();

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [settingsView, setSettingsView] = useState<'main' | 'theme' | 'typography'>('main');

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };
  
  const [name, setName] = useState(profile.name || '');
  const [gender, setGender] = useState<Gender | null>(profile.gender);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const getAvatarImage = () => {
    if (profile.avatarUrl) return profile.avatarUrl;
    if (gender === 'male') return DEFAULT_MALE_AVATAR;
    if (gender === 'female') return DEFAULT_FEMALE_AVATAR;
    return null;
  };

  const handleSaveProfile = () => {
    setProfile({ name: name.trim(), gender });
  };

  const isProfileComplete = name.trim().length > 0 && gender !== null;

  return (
    <div className="flex-1 flex flex-col items-center app-page-bg relative overflow-y-auto overflow-x-hidden">
      {/* Decorative background blobs matched to theme */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-500"
        style={{ backgroundColor: 'var(--theme-blob-1)' }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-500"
        style={{ backgroundColor: 'var(--theme-blob-2)' }}
      />

      {/* Header */}
      <header className="w-full flex items-center justify-between p-4 z-20">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-xl text-indigo-500 dark:text-indigo-400">
            <Languages className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-slate-800 dark:text-slate-100">LiveTranslate</span>
        </div>
        
        <div className="flex items-center gap-2 relative">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-2xl p-1.5 z-50 origin-top-right"
                >
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      setShowSettings(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors text-left"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    {t('room.settings', profile.language)}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col flex-1 justify-center space-y-5 z-10 px-6 pb-6"
      >
        {/* Unified Profile & Actions Area */}
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-100 dark:border-slate-700/50 rounded-3xl p-5 shadow-sm space-y-5 transition-colors">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              {t('profile.title', profile.language)}
            </h2>
            
            {/* Avatar Selection */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-white dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  {getAvatarImage() ? (
                    <img src={getAvatarImage()!} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                
                {/* Pencil Button Add-on */}
                <button 
                  className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full shadow-md border-2 border-white dark:border-slate-800 hover:bg-indigo-700 transition-colors"
                  title={t('profile.upload_photo', profile.language)}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300 pl-1">{t('profile.name_label', profile.language)}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setProfile({ name: e.target.value.trim() });
                }}
                onBlur={handleSaveProfile}
                placeholder="..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            {/* Gender Selection */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-slate-700 dark:text-slate-300 pl-1">{t('profile.gender_label', profile.language)}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setGender('male');
                    setProfile({ gender: 'male' });
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5",
                    gender === 'male' 
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" 
                      : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400"
                  )}
                >
                  <img src={DEFAULT_MALE_AVATAR} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="Male" />
                  <span className="font-medium text-[13px]">{t('profile.male', profile.language)}</span>
                </button>
                
                <button
                  onClick={() => {
                    setGender('female');
                    setProfile({ gender: 'female' });
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5",
                    gender === 'female' 
                      ? "border-pink-500 bg-pink-50/50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300" 
                      : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400"
                  )}
                >
                  <img src={DEFAULT_FEMALE_AVATAR} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="Female" />
                  <span className="font-medium text-[13px]">{t('profile.female', profile.language)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Side-by-Side */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <button
            onClick={() => isProfileComplete ? navigate('/create-room') : null}
            disabled={!isProfileComplete}
            className={cn(
              "group relative flex items-center justify-center gap-2 py-3 px-2 rounded-2xl border-2 transition-all active:scale-[0.98]",
              isProfileComplete 
                ? "bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-500 hover:shadow-sm hover:shadow-indigo-500/10 cursor-pointer"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-60 cursor-not-allowed"
            )}
          >
            <div className="w-8 h-8 shrink-0 bg-indigo-50 dark:bg-indigo-900/50 rounded-full flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors text-indigo-500">
              <Heart className="w-4 h-4" />
            </div>
            <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{t('home.create_room', profile.language)}</div>
          </button>

          <button
            onClick={() => isProfileComplete ? navigate('/join-room') : null}
            disabled={!isProfileComplete}
            className={cn(
              "group relative flex items-center justify-center gap-2 py-3 px-2 rounded-2xl border-2 transition-all active:scale-[0.98]",
              isProfileComplete 
                ? "bg-white dark:bg-slate-800 border-pink-100 dark:border-pink-900/50 hover:border-pink-500 hover:shadow-sm hover:shadow-pink-500/10 cursor-pointer"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-60 cursor-not-allowed"
            )}
          >
            <div className="w-8 h-8 shrink-0 bg-pink-50 dark:bg-pink-900/50 rounded-full flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-colors text-pink-500">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{t('home.join_room', profile.language)}</div>
          </button>
        </div>
      </motion.div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md app-page-bg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] border border-slate-200/80 dark:border-slate-700/80 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b app-header-bg shrink-0">
                {settingsView === 'main' ? (
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('room.settings', profile.language)}</h2>
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
                  className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {settingsView === 'theme' && (
                  <ThemeSettingsSection />
                )}

                {settingsView === 'typography' && (
                  <TypographySettingsSection />
                )}

                {settingsView === 'main' && (
                  <>
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
                    </div>

                    {/* Appearance & Customization (Dedicated entry buttons) */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t('room.appearance', profile.language)}</h3>
                      
                      {/* Dark/Light mode toggle */}
                      <button
                        type="button"
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-slate-200 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {theme === 'light' ? <Moon className="w-5 h-5 text-indigo-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
                          <span>Görünüm Modu</span>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold shadow-xs">
                          {theme === 'light' ? 'Gündüz Modu' : 'Gece Modu'}
                        </span>
                      </button>

                      {/* 1. Dedicated Theme Button */}
                      <button
                        type="button"
                        onClick={() => setSettingsView('theme')}
                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/90 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer group active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-xs shrink-0">
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
                              Hazır renk temaları, balon renkleri, arka plan deseni
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
                        className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/90 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer group active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-xs shrink-0">
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
                              Metin ölçeği, yazı karakteri, canlı metin önizlemesi
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors pl-2">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </button>
                    </div>

                    {/* Sound & Notifications */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bildirimler & Ses</h3>

                      {/* Sound Toggle */}
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => setSoundEnabled(!soundEnabled)}
                          className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-slate-200 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {soundEnabled ? <Bell className="w-4 h-4 text-emerald-500" /> : <BellOff className="w-4 h-4 text-slate-400" />}
                            <span>Bildirim Sesi</span>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {soundEnabled ? 'Açık' : 'Kapalı'}
                          </span>
                        </button>
                      </div>

                      {/* Compact & Ergonomic Notification Sound Selector */}
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
                      <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer">
                        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                          <Smartphone className="w-4 h-4 text-indigo-500" />
                          <span className="text-sm font-medium">Titreşim</span>
                        </div>
                        <div className="relative inline-block w-11 h-6 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors" style={{ backgroundColor: vibrationEnabled ? '#6366f1' : undefined }}>
                          <input 
                            type="checkbox" 
                            className="opacity-0 w-0 h-0"
                            checked={vibrationEnabled}
                            onChange={(e) => setVibrationEnabled(e.target.checked)}
                          />
                          <span 
                            className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm"
                            style={{ transform: vibrationEnabled ? 'translateX(20px)' : 'translateX(0)' }}
                          />
                        </div>
                      </label>

                      {deferredPrompt && (
                        <button 
                          onClick={handleInstallClick}
                          className="w-full flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-300">
                            <Download className="w-5 h-5" />
                            <span className="font-medium text-sm">Uygulamayı İndir</span>
                          </div>
                        </button>
                      )}
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
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                            VIP Üyelik Aktif <Crown className="w-3.5 h-3.5 text-amber-500" />
                          </h4>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Tüm ayrıcalıklar kullanımda</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPremiumModal(true)}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                      >
                        Yönet
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-200/80 dark:border-amber-800/40 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow">
                          <Crown className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                            LiveTranslate VIP <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 font-extrabold uppercase">Premium</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Gizli profil & VIP ayrıcalıklar</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPremiumModal(true)}
                        className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-xs font-semibold rounded-lg shadow hover:opacity-95 transition-opacity"
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
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                      hideProfile 
                        ? 'bg-indigo-50/80 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800' 
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 pr-2">
                      <div className={`p-1.5 rounded-lg shrink-0 ${hideProfile ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        <EyeOff className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                            Profili Gizle (Gizli Mod)
                          </span>
                          {!isPremium ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              <Crown className="w-2.5 h-2.5 text-amber-600 dark:text-amber-300" /> VIP
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                              VIP
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Odalarda adınız 'Gizli Kullanıcı' ve profil resminiz gizli görünür.
                        </p>
                      </div>
                    </div>

                    <div className="relative inline-block w-11 h-6 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors shrink-0" style={{ backgroundColor: hideProfile ? '#6366f1' : undefined }}>
                      <span 
                        className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm"
                        style={{ transform: hideProfile ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
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
    </div>
  );
}
