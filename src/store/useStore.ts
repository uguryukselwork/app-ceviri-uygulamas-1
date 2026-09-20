import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getBrowserLanguage } from '../lib/i18n';
import { ColorThemeId, ChatPatternId, BubbleColorId } from '../lib/themes';

export type Gender = 'male' | 'female';

export interface SavedRoom {
  code: string;
  lastAccessed: number;
  partnerName?: string;
  partnerAvatar?: string;
  partnerGender?: Gender | null;
  customName?: string;
  isLocked?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  gender: Gender | null;
  language: string;
  partnerLanguage: string;
  avatarUrl?: string;
  status?: string;
}

interface AppState {
  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  colorTheme: ColorThemeId;
  setColorTheme: (colorTheme: ColorThemeId) => void;
  bubbleColor: BubbleColorId;
  setBubbleColor: (bubbleColor: BubbleColorId) => void;
  chatPattern: ChatPatternId;
  setChatPattern: (chatPattern: ChatPatternId) => void;
  resetThemeSettings: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  notificationSound: string;
  setNotificationSound: (sound: string) => void;
  deferredPrompt: any;
  setDeferredPrompt: (prompt: any) => void;
  fontSize: 'small' | 'medium' | 'large';
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  fontFamily: 'sans' | 'serif' | 'mono';
  setFontFamily: (family: 'sans' | 'serif' | 'mono') => void;
  isPremium: boolean;
  setIsPremium: (isPremium: boolean) => void;
  hideProfile: boolean;
  setHideProfile: (hide: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (enabled: boolean) => void;
  // Security PIN & Biometrics
  appPin: string | null;
  setAppPin: (pin: string | null) => void;
  isAppLockEnabled: boolean;
  setIsAppLockEnabled: (enabled: boolean) => void;
  isRoomLockEnabled: boolean;
  setIsRoomLockEnabled: (enabled: boolean) => void;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  lockedRooms: string[];
  toggleRoomLock: (roomCode: string) => void;
  isAppUnlocked: boolean;
  unlockApp: () => void;
  unlockedRooms: string[];
  unlockRoom: (roomCode: string) => void;
  lockAppNow: () => void;
  // Saved Rooms & Quick Messages
  savedRooms: SavedRoom[];
  addOrUpdateRoom: (room: SavedRoom) => void;
  removeRoom: (code: string) => void;
  updateRoomName: (code: string, customName: string) => void;
  quickMessages: string[];
  addQuickMessage: (msg: string) => void;
  removeQuickMessage: (msg: string) => void;
  updateQuickMessage: (oldMsg: string, newMsg: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      profile: {
        id: uuidv4(),
        name: '',
        gender: null,
        language: getBrowserLanguage(),
        partnerLanguage: 'auto',
        status: 'online',
      },
      setProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      colorTheme: 'indigo',
      setColorTheme: (colorTheme) => set({ colorTheme }),
      bubbleColor: 'theme',
      setBubbleColor: (bubbleColor) => set({ bubbleColor }),
      chatPattern: 'none',
      setChatPattern: (chatPattern) => set({ chatPattern }),
      resetThemeSettings: () => {
        set({ colorTheme: 'indigo', bubbleColor: 'theme', chatPattern: 'none' });
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-color-theme', 'indigo');
        }
      },
      soundEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      notificationSound: 'pop',
      setNotificationSound: (notificationSound) => set({ notificationSound }),
      deferredPrompt: null,
      setDeferredPrompt: (deferredPrompt) => set({ deferredPrompt }),
      fontSize: 'medium',
      setFontSize: (fontSize) => set({ fontSize }),
      fontFamily: 'sans',
      setFontFamily: (fontFamily) => set({ fontFamily }),
      isPremium: false,
      setIsPremium: (isPremium) => set({ isPremium }),
      hideProfile: false,
      setHideProfile: (hideProfile) => set({ hideProfile }),
      vibrationEnabled: true,
      setVibrationEnabled: (vibrationEnabled) => set({ vibrationEnabled }),
      // Security
      appPin: null,
      setAppPin: (appPin) => set({ appPin }),
      isAppLockEnabled: false,
      setIsAppLockEnabled: (isAppLockEnabled) => set({ isAppLockEnabled }),
      isRoomLockEnabled: false,
      setIsRoomLockEnabled: (isRoomLockEnabled) => set({ isRoomLockEnabled }),
      biometricEnabled: false,
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
      lockedRooms: [],
      toggleRoomLock: (roomCode) =>
        set((state) => {
          const exists = state.lockedRooms.includes(roomCode);
          return {
            lockedRooms: exists 
              ? state.lockedRooms.filter(c => c !== roomCode)
              : [...state.lockedRooms, roomCode]
          };
        }),
      isAppUnlocked: false,
      unlockApp: () => set({ isAppUnlocked: true }),
      unlockedRooms: [],
      unlockRoom: (roomCode) =>
        set((state) => ({
          unlockedRooms: state.unlockedRooms.includes(roomCode)
            ? state.unlockedRooms
            : [...state.unlockedRooms, roomCode]
        })),
      lockAppNow: () => set({ isAppUnlocked: false, unlockedRooms: [] }),
      savedRooms: [],
      addOrUpdateRoom: (room) => 
        set((state) => {
          const existing = state.savedRooms.find(r => r.code === room.code);
          const filtered = state.savedRooms.filter(r => r.code !== room.code);
          return { savedRooms: [{ ...room, customName: room.customName || existing?.customName }, ...filtered] };
        }),
      removeRoom: (code) =>
        set((state) => ({
          savedRooms: state.savedRooms.filter(r => r.code !== code)
        })),
      updateRoomName: (code, customName) =>
        set((state) => ({
          savedRooms: state.savedRooms.map(r => 
            r.code === code ? { ...r, customName } : r
          )
        })),
      quickMessages: ['Tamam', 'Seni seviyorum', 'Görüşürüz', 'Nasılsın?'],
      addQuickMessage: (msg) => 
        set((state) => {
          if (!state.quickMessages.includes(msg)) {
            return { quickMessages: [...state.quickMessages, msg] };
          }
          return state;
        }),
      removeQuickMessage: (msg) =>
        set((state) => ({
          quickMessages: state.quickMessages.filter(m => m !== msg)
        })),
      updateQuickMessage: (oldMsg, newMsg) =>
        set((state) => {
          const trimmed = newMsg.trim();
          if (!trimmed) return state;
          return {
            quickMessages: state.quickMessages.map(m => m === oldMsg ? trimmed : m)
          };
        }),
    }),
    {
      name: 'livetranslate-storage',
      partialize: (state) => ({ 
        profile: state.profile, 
        theme: state.theme, 
        colorTheme: state.colorTheme,
        bubbleColor: state.bubbleColor,
        chatPattern: state.chatPattern,
        soundEnabled: state.soundEnabled,
        notificationSound: state.notificationSound,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        isPremium: state.isPremium,
        hideProfile: state.hideProfile,
        vibrationEnabled: state.vibrationEnabled,
        appPin: state.appPin,
        isAppLockEnabled: state.isAppLockEnabled,
        isRoomLockEnabled: state.isRoomLockEnabled,
        biometricEnabled: state.biometricEnabled,
        lockedRooms: state.lockedRooms,
        savedRooms: state.savedRooms,
        quickMessages: state.quickMessages
      }), // Don't persist deferredPrompt, isAppUnlocked, or unlockedRooms
    }
  )
);
