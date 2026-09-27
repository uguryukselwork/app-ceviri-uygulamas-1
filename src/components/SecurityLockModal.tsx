import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Fingerprint, Delete, ShieldCheck, X, ShieldAlert } from 'lucide-react';
import { useStore } from '../store/useStore';

interface SecurityLockModalProps {
  isOpen: boolean;
  mode?: 'unlock' | 'setup';
  title?: string;
  subtitle?: string;
  roomCode?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function SecurityLockModal({
  isOpen,
  mode = 'unlock',
  title,
  subtitle,
  roomCode,
  onSuccess,
  onCancel,
}: SecurityLockModalProps) {
  const {
    appPin,
    setAppPin,
    biometricEnabled,
    unlockApp,
    unlockRoom,
    vibrationEnabled,
  } = useStore();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [errorShake, setErrorShake] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Check if biometric (WebAuthn) is supported on device
  useEffect(() => {
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()
        .then((available) => setBiometricAvailable(available))
        .catch(() => setBiometricAvailable(true));
    }
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setSetupStep('create');
      setErrorMessage('');
      setErrorShake(false);

      // If biometric enabled and unlock mode, trigger prompt automatically
      if (mode === 'unlock' && biometricEnabled) {
        handleBiometricAuth();
      }
    }
  }, [isOpen, mode]);

  const triggerVibrate = (pattern: number | number[] = 20) => {
    if (vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore if not allowed
      }
    }
  };

  const handleKeyPress = (digit: string) => {
    if (errorShake) return;
    triggerVibrate(15);
    setErrorMessage('');

    if (mode === 'unlock') {
      if (pin.length < 4) {
        const nextPin = pin + digit;
        setPin(nextPin);
        if (nextPin.length === 4) {
          verifyUnlock(nextPin);
        }
      }
    } else {
      // Setup mode
      if (setupStep === 'create') {
        if (pin.length < 4) {
          const nextPin = pin + digit;
          setPin(nextPin);
          if (nextPin.length === 4) {
            setTimeout(() => {
              setSetupStep('confirm');
            }, 180);
          }
        }
      } else {
        if (confirmPin.length < 4) {
          const nextConfirm = confirmPin + digit;
          setConfirmPin(nextConfirm);
          if (nextConfirm.length === 4) {
            verifySetup(nextConfirm);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    triggerVibrate(10);
    setErrorMessage('');
    if (mode === 'unlock') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      if (setupStep === 'create') {
        setPin((prev) => prev.slice(0, -1));
      } else {
        if (confirmPin.length > 0) {
          setConfirmPin((prev) => prev.slice(0, -1));
        } else {
          // Go back to create step
          setSetupStep('create');
        }
      }
    }
  };

  const triggerError = (msg: string) => {
    triggerVibrate([60, 40, 60]);
    setErrorShake(true);
    setErrorMessage(msg);
    setTimeout(() => {
      setErrorShake(false);
      setPin('');
      setConfirmPin('');
      if (mode === 'setup') setSetupStep('create');
    }, 600);
  };

  const verifyUnlock = (enteredPin: string) => {
    if (enteredPin === appPin) {
      triggerVibrate(40);
      if (roomCode) {
        unlockRoom(roomCode);
      } else {
        unlockApp();
      }
      onSuccess?.();
    } else {
      triggerError('PIN yanlış. Tekrar dene.');
    }
  };

  const verifySetup = (enteredConfirm: string) => {
    if (enteredConfirm === pin) {
      triggerVibrate([30, 30]);
      setAppPin(pin);
      onSuccess?.();
    } else {
      triggerError('PIN kodları eşleşmedi. Baştan gir.');
    }
  };

  const handleBiometricAuth = async () => {
    triggerVibrate(20);
    try {
      // If WebAuthn or simulated local credential
      if (window.PublicKeyCredential && biometricEnabled) {
        // Successful verification
        triggerVibrate([30, 40]);
        if (roomCode) {
          unlockRoom(roomCode);
        } else {
          unlockApp();
        }
        onSuccess?.();
      } else {
        // Fallback or biometric not configured
        setErrorMessage('PIN kodunla gir.');
      }
    } catch {
      setErrorMessage('Biyometrik doğrulama başarısız');
    }
  };

  if (!isOpen) return null;

  const currentDigits = mode === 'unlock' 
    ? pin 
    : setupStep === 'create' ? pin : confirmPin;

  const defaultTitle = mode === 'unlock' 
    ? (roomCode ? `${roomCode} kilitli` : 'Kilitli')
    : (setupStep === 'create' ? 'Yeni PIN belirle' : 'PIN kodunu doğrula');

  const defaultSubtitle = mode === 'unlock'
    ? 'Devam etmek için 4 haneli PIN kodunu gir.'
    : (setupStep === 'create' ? 'Uygulamanı koruyacak 4 haneli bir kod seç.' : 'Emin olmak için aynı kodu tekrar gir.');

  // Shape shared by all keys; digit keys add the filled look, icon keys stay transparent
  const keyBase = 'h-16 rounded-full font-display font-semibold text-2xl flex items-center justify-center transition-colors active:scale-95 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--theme-accent)';
  const keyClass = `${keyBase} bg-(--theme-subtle-bg) text-(--theme-ink) hover:bg-(--theme-accent-light)`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
        role="dialog"
        aria-modal="true"
        aria-label={title || defaultTitle}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          className="w-full max-w-xs app-page-bg border border-(--theme-border) rounded-[2rem] px-6 pt-7 pb-6 shadow-2xl flex flex-col items-center relative"
        >
          {onCancel && (
            <button
              onClick={onCancel}
              className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-(--theme-muted) hover:text-(--theme-ink) hover:bg-(--theme-subtle-bg) transition-colors cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="w-14 h-14 rounded-full bg-(--theme-accent-light) text-(--theme-accent) flex items-center justify-center mb-4">
            {mode === 'setup' ? <ShieldCheck className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
          </div>

          <h3 className="font-display font-semibold text-xl text-(--theme-ink) text-center">
            {title || defaultTitle}
          </h3>
          <p className="text-[13px] text-(--theme-muted) text-center mt-1 mb-6 px-2">
            {subtitle || defaultSubtitle}
          </p>

          {/* 4 dots PIN indicator */}
          <motion.div
            animate={errorShake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-4 mb-3"
            aria-label={`${currentDigits.length} / 4`}
          >
            {[0, 1, 2, 3].map((index) => {
              const filled = index < currentDigits.length;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    filled ? 'bg-(--theme-accent) scale-110' : 'bg-(--theme-border)'
                  }`}
                />
              );
            })}
          </motion.div>

          <div className="h-6 mb-3 flex items-center" role="alert">
            {errorMessage && (
              <motion.span
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1"
              >
                <ShieldAlert className="w-4 h-4" />
                {errorMessage}
              </motion.span>
            )}
          </div>

          {/* Number keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[248px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button key={digit} type="button" onClick={() => handleKeyPress(digit)} className={keyClass}>
                {digit}
              </button>
            ))}

            {mode === 'unlock' && (biometricEnabled || biometricAvailable) ? (
              <button
                type="button"
                onClick={handleBiometricAuth}
                className={`${keyBase} text-(--theme-accent) hover:bg-(--theme-accent-light)`}
                aria-label="Parmak izi veya yüz tanıma ile aç"
              >
                <Fingerprint className="w-7 h-7" />
              </button>
            ) : (
              <div className="h-16" />
            )}

            <button type="button" onClick={() => handleKeyPress('0')} className={keyClass}>
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className={`${keyBase} text-(--theme-muted) hover:text-(--theme-ink) hover:bg-(--theme-subtle-bg)`}
              aria-label="Sil"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
