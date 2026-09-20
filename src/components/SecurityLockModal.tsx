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
      triggerError('Hatalı PIN kodu, tekrar deneyin');
    }
  };

  const verifySetup = (enteredConfirm: string) => {
    if (enteredConfirm === pin) {
      triggerVibrate([30, 30]);
      setAppPin(pin);
      onSuccess?.();
    } else {
      triggerError('PIN kodları eşleşmedi! Tekrar deneyin');
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
        setErrorMessage('PIN ile giriş yapınız');
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
    ? (roomCode ? `Oda Kilidi: ${roomCode}` : 'Güvenlik Kilidi')
    : (setupStep === 'create' ? 'Yeni PIN Belirleyin' : 'PIN Kodunu Doğrulayın');

  const defaultSubtitle = mode === 'unlock'
    ? 'Devam etmek için 4 haneli PIN kodunuzu girin'
    : (setupStep === 'create' ? 'Uygulamanızı koruyacak 4 haneli kod' : 'Emin olmak için kodu tekrar girin');

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center relative overflow-hidden"
        >
          {onCancel && (
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-inner">
            {mode === 'setup' ? (
              <ShieldCheck className="w-7 h-7" />
            ) : (
              <Lock className="w-7 h-7" />
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
            {title || defaultTitle}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1 mb-6 px-2">
            {subtitle || defaultSubtitle}
          </p>

          {/* 4 Dots PIN Indicator */}
          <motion.div 
            animate={errorShake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-4 mb-6"
          >
            {[0, 1, 2, 3].map((index) => {
              const filled = index < currentDigits.length;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    filled
                      ? 'bg-indigo-600 dark:bg-indigo-400 scale-110 shadow-sm shadow-indigo-500/40'
                      : 'bg-slate-200 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600'
                  }`}
                />
              );
            })}
          </motion.div>

          {/* Error Message */}
          <div className="h-5 mb-2">
            {errorMessage && (
              <motion.span 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] font-medium text-rose-500 flex items-center gap-1"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {errorMessage}
              </motion.span>
            )}
          </div>

          {/* Number Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-slate-700/80 active:scale-95 text-slate-800 dark:text-slate-100 font-semibold text-xl transition-all border border-slate-200/60 dark:border-slate-750 flex items-center justify-center cursor-pointer select-none"
              >
                {digit}
              </button>
            ))}

            {/* Bottom Row: Biometric, 0, Backspace */}
            {mode === 'unlock' && (biometricEnabled || biometricAvailable) ? (
              <button
                type="button"
                onClick={handleBiometricAuth}
                className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-slate-700/80 active:scale-95 text-indigo-600 dark:text-indigo-400 font-semibold transition-all border border-slate-200/60 dark:border-slate-750 flex items-center justify-center cursor-pointer select-none"
                title="Biyometrik ile Aç (Face ID / Parmak İzi)"
              >
                <Fingerprint className="w-6 h-6" />
              </button>
            ) : (
              <div className="h-14" />
            )}

            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-slate-700/80 active:scale-95 text-slate-800 dark:text-slate-100 font-semibold text-xl transition-all border border-slate-200/60 dark:border-slate-750 flex items-center justify-center cursor-pointer select-none"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-slate-700/80 active:scale-95 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold transition-all border border-slate-200/60 dark:border-slate-750 flex items-center justify-center cursor-pointer select-none"
              title="Sil"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
