import React, { useState } from 'react';
import { Lock, Unlock, Fingerprint, DoorClosed, KeyRound, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import SecurityLockModal from './SecurityLockModal';
import { SettingsGroup, SettingsRow, Toggle } from './ui';

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleRemovePin = () => {
    if (confirm('PIN kilidini kaldırmak istediğinize emin misiniz?')) {
      setAppPin(null);
      setIsAppLockEnabled(false);
      setIsRoomLockEnabled(false);
      setBiometricEnabled(false);
      showToast('PIN ve tüm kilitler kaldırıldı.');
    }
  };

  const pillButton = 'px-3 py-1.5 rounded-full text-[13px] font-bold shrink-0 cursor-pointer transition-colors';

  return (
    <div className="space-y-2">
      <SettingsGroup title="Güvenlik">
        <SettingsRow
          icon={appPin ? <Lock className="w-[18px] h-[18px]" /> : <Unlock className="w-[18px] h-[18px]" />}
          title="PIN kodu"
          description={appPin ? '4 haneli PIN ayarlı.' : 'Uygulamayı ve odaları kilitlemek için bir PIN oluştur.'}
          trailing={
            <button
              type="button"
              onClick={() => setShowSetupModal(true)}
              className={appPin
                ? `${pillButton} bg-(--theme-subtle-bg) text-(--theme-ink) hover:text-(--theme-accent)`
                : `${pillButton} bg-(--theme-accent) text-(--theme-on-accent) hover:bg-(--theme-accent-hover)`}
            >
              {appPin ? 'Değiştir' : 'Oluştur'}
            </button>
          }
        />
        <SettingsRow
          icon={<KeyRound className="w-[18px] h-[18px]" />}
          title="Açılışta kilitle"
          description="Uygulama açılırken PIN sorulur."
          disabled={!appPin}
          trailing={<Toggle label="Açılışta kilitle" disabled={!appPin} checked={isAppLockEnabled && !!appPin} onChange={setIsAppLockEnabled} />}
        />
        <SettingsRow
          icon={<DoorClosed className="w-[18px] h-[18px]" />}
          title="Odalara girişte kilitle"
          description="Her odaya girerken PIN sorulur."
          disabled={!appPin}
          trailing={<Toggle label="Odalara girişte kilitle" disabled={!appPin} checked={isRoomLockEnabled && !!appPin} onChange={setIsRoomLockEnabled} />}
        />
        <SettingsRow
          icon={<Fingerprint className="w-[18px] h-[18px]" />}
          title="Parmak izi veya yüz tanıma"
          description="PIN yerine tek dokunuşla aç."
          disabled={!appPin}
          trailing={<Toggle label="Parmak izi veya yüz tanıma" disabled={!appPin} checked={biometricEnabled && !!appPin} onChange={setBiometricEnabled} />}
        />
        {appPin && (
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            {isAppLockEnabled ? (
              <button type="button" onClick={() => lockAppNow()} className={`${pillButton} -ml-3 text-(--theme-accent) hover:bg-(--theme-accent-light)`}>
                Şimdi kilitle
              </button>
            ) : <span />}
            <button type="button" onClick={handleRemovePin} className={`${pillButton} -mr-3 text-red-600 dark:text-red-400 hover:bg-red-500/10`}>
              PIN'i kaldır
            </button>
          </div>
        )}
      </SettingsGroup>

      {toastMessage && (
        <p role="status" className="flex items-center gap-1.5 px-2 text-[13px] font-bold text-(--theme-accent)">
          <Check className="w-4 h-4 shrink-0" /> {toastMessage}
        </p>
      )}

      <SecurityLockModal
        isOpen={showSetupModal}
        mode="setup"
        onSuccess={() => {
          setShowSetupModal(false);
          showToast('PIN kaydedildi.');
          if (!isAppLockEnabled && !isRoomLockEnabled) {
            setIsAppLockEnabled(true);
          }
        }}
        onCancel={() => setShowSetupModal(false)}
      />
    </div>
  );
}
