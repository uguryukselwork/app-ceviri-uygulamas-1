import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Profile from './pages/Profile';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import Room from './pages/Room';
import { useStore } from './store/useStore';
import SecurityLockModal from './components/SecurityLockModal';

export default function App() {
  const theme = useStore((state) => state.theme);
  const colorTheme = useStore((state) => state.colorTheme);
  const fontSize = useStore((state) => state.fontSize);
  const fontFamily = useStore((state) => state.fontFamily);
  const setDeferredPrompt = useStore((state) => state.setDeferredPrompt);

  const appPin = useStore((state) => state.appPin);
  const isAppLockEnabled = useStore((state) => state.isAppLockEnabled);
  const isAppUnlocked = useStore((state) => state.isAppUnlocked);

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-color-theme', colorTheme || 'indigo');
  }, [colorTheme]);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-font-size', fontSize || 'medium');
  }, [fontSize]);

  const fontClass = fontFamily === 'serif' ? 'font-app-serif' : fontFamily === 'mono' ? 'font-app-mono' : 'font-app-sans';

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [setDeferredPrompt]);

  const isAppLocked = isAppLockEnabled && !!appPin && !isAppUnlocked;

  return (
    <BrowserRouter>
      <div className={`h-[100dvh] w-full app-outer-bg text-slate-900 dark:text-slate-100 ${fontClass} selection:bg-indigo-100 dark:selection:bg-indigo-900/50 selection:text-indigo-900 dark:selection:text-indigo-100 flex justify-center overflow-hidden`}>
        <div className="w-full max-w-md h-full app-page-bg shadow-2xl overflow-hidden flex flex-col relative">
          <Routes>
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<Home />} />
            <Route path="/create-room" element={<CreateRoom />} />
            <Route path="/join-room" element={<JoinRoom />} />
            <Route path="/room/:roomCode" element={<Room />} />
          </Routes>

          {/* Full-Screen App Start Lock */}
          {isAppLocked && (
            <SecurityLockModal
              isOpen={true}
              mode="unlock"
              title="LiveTranslate Kilitli"
              subtitle="Uygulamayı açmak için 4 haneli PIN kodunuzu girin"
            />
          )}
        </div>
      </div>
    </BrowserRouter>
  );
}

