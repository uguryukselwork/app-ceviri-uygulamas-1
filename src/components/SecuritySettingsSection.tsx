import React, { useState } from 'react';
import { Shield, Lock, Unlock, Fingerprint, KeyRound, Check, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import SecurityLockModal from './SecurityLockModal';

export default function SecuritySettingsSection() {
  const {
    appPin,
    setAppPin,
    isAppLockEnabled,
    setIsAppLockEnabled,
    isRoomLockEnabled,
    setIsRoomLockEnabled,
    biometricEnabled,
    setBiometricEnabled,
    lockAppNow,
  } = useStore();

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupMode, setSetupMode] = useState<'setup' | 'unlock'>('setup');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCreatePin = () => {
    setSetupMode('setup');
    setShowSetupModal(true);
  };

  const handleRemovePin = () => {
    if (confirm('PIN kilidini kaldırmak istediğinize emin misiniz?')) {
      setAppPin(null);
      setIsAppLockEnabled(false);
      setIsRoomLockEnabled(false);
      setBiometricEnabled(false);
      showToast('PIN kodu ve güvenlik kilitleri kaldırıldı');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" /> Güvenlik & Kilit
        </h3>
        {appPin && (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Check className="w-3 h-3" /> PIN Aktif
          </span>
        )}
      </div>

      {toastMessage && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PIN Card */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-750">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              appPin 
                ? 'bg-emerald-500 text-white shadow-xs' 
                : 'bg-slate-200 dark:bg-slate-750 text-slate-600 dark:text-slate-300'
            }`}>
              {appPin ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {appPin ? '4 Haneli Güvenlik PIN Kodu' : 'PIN Kodu Belirlenmedi'}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {appPin ? 'PIN kodunuz ayarlandı ve aktif' : 'Sohbet ve odalarınızı kilitlemek için PIN oluşturun'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-750/80">
          {!appPin ? (
            <button
              type="button"
              onClick={handleCreatePin}
              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" /> PIN Kodu Oluştur
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCreatePin}
                className="flex-1 py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> PIN Değiştir
              </button>
              <button
                type="button"
                onClick={handleRemovePin}
                className="py-1.5 px-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Kaldır
              </button>
            </>
          )}
        </div>
      </div>

      {/* Security Options (Toggles) */}
      <div className="space-y-2">
        {/* Toggle 1: Lock on App Start */}
        <label 
          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
            !appPin 
              ? 'opacity-60 bg-slate-50/50 dark:bg-slate-850/50 border-slate-100 dark:border-slate-800 cursor-not-allowed'
              : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-750 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block">
                Uygulama Başlangıcında Kilitle
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Uygulama açılırken PIN kodu veya biyometrik kilit sorulur
              </span>
            </div>
          </div>
          <div 
            className="relative inline-block w-10 h-5 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors shrink-0"
            style={{ backgroundColor: isAppLockEnabled && appPin ? '#6366f1' : undefined }}
          >
            <input 
              type="checkbox" 
              className="opacity-0 w-0 h-0"
              disabled={!appPin}
              checked={isAppLockEnabled && !!appPin}
              onChange={(e) => {
                if (!appPin) {
                  handleCreatePin();
                } else {
                  setIsAppLockEnabled(e.target.checked);
                }
              }}
            />
            <span 
              className="absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-xs"
              style={{ transform: isAppLockEnabled && appPin ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </div>
        </label>

        {/* Toggle 2: Lock on Room Entry */}
        <label 
          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
            !appPin 
              ? 'opacity-60 bg-slate-50/50 dark:bg-slate-850/50 border-slate-100 dark:border-slate-800 cursor-not-allowed'
              : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-750 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block">
                Odalara Girişte Kilitle
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Sohbet odalarına girerken güvenlik doğrulaması ister
              </span>
            </div>
          </div>
          <div 
            className="relative inline-block w-10 h-5 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors shrink-0"
            style={{ backgroundColor: isRoomLockEnabled && appPin ? '#10b981' : undefined }}
          >
            <input 
              type="checkbox" 
              className="opacity-0 w-0 h-0"
              disabled={!appPin}
              checked={isRoomLockEnabled && !!appPin}
              onChange={(e) => {
                if (!appPin) {
                  handleCreatePin();
                } else {
                  setIsRoomLockEnabled(e.target.checked);
                }
              }}
            />
            <span 
              className="absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-xs"
              style={{ transform: isRoomLockEnabled && appPin ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </div>
        </label>

        {/* Toggle 3: Biometric Lock */}
        <label 
          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
            !appPin 
              ? 'opacity-60 bg-slate-50/50 dark:bg-slate-850/50 border-slate-100 dark:border-slate-800 cursor-not-allowed'
              : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-750 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Fingerprint className="w-4 h-4 text-purple-500 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block">
                Biyometrik Kilit (Face ID / Touch ID)
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Cihaz parmak izi veya yüz tanıma ile tek dokunuşta açın
              </span>
            </div>
          </div>
          <div 
            className="relative inline-block w-10 h-5 rounded-full bg-slate-200 dark:bg-slate-600 transition-colors shrink-0"
            style={{ backgroundColor: biometricEnabled && appPin ? '#8b5cf6' : undefined }}
          >
            <input 
              type="checkbox" 
              className="opacity-0 w-0 h-0"
              disabled={!appPin}
              checked={biometricEnabled && !!appPin}
              onChange={(e) => {
                if (!appPin) {
                  handleCreatePin();
                } else {
                  setBiometricEnabled(e.target.checked);
                }
              }}
            />
            <span 
              className="absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow-xs"
              style={{ transform: biometricEnabled && appPin ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </div>
        </label>
      </div>

      {/* Lock App Now Test Button */}
      {appPin && isAppLockEnabled && (
        <button
          type="button"
          onClick={() => lockAppNow()}
          className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-indigo-500" />
          <span>Uygulamayı Şimdi Kilitle (Kilit Ekranını Test Et)</span>
        </button>
      )}

      {/* PIN Setup/Change Modal */}
      <SecurityLockModal
        isOpen={showSetupModal}
        mode={setupMode}
        onSuccess={() => {
          setShowSetupModal(false);
          showToast('4 haneli PIN kodunuz başarıyla kaydedildi!');
          if (!isAppLockEnabled && !isRoomLockEnabled) {
            setIsAppLockEnabled(true);
          }
        }}
        onCancel={() => setShowSetupModal(false)}
      />
    </div>
  );
}
