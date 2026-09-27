import React, { useState } from 'react';
import { CheckCircle2, Download, EllipsisVertical, PlusSquare, Share } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Segmented, primaryButton } from './ui';

type Platform = 'ios' | 'android';

const detectPlatform = (): Platform =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS reports itself as a Mac; touch support gives it away
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    ? 'ios'
    : 'android';

export const isInstalledApp = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

type Step = { icon?: React.ReactNode; text: React.ReactNode };

const STEPS: Record<Platform, { browser: string; steps: Step[] }> = {
  ios: {
    browser: 'iPhone ve iPad’de Safari ile',
    steps: [
      { text: <>Bu sayfayı <b>Safari</b>’de aç.</> },
      { icon: <Share className="w-4 h-4" />, text: <>Alttaki <b>Paylaş</b> düğmesine dokun (yukarı oklu kare).</> },
      { icon: <PlusSquare className="w-4 h-4" />, text: <>Listeyi biraz kaydır ve <b>Ana Ekrana Ekle</b>’yi seç.</> },
      { text: <>Sağ üstteki <b>Ekle</b>’ye dokun. LiveTranslate ana ekranında belirir.</> },
    ],
  },
  android: {
    browser: 'Android’de Chrome ile',
    steps: [
      { text: <>Bu sayfayı <b>Chrome</b>’da aç.</> },
      { icon: <EllipsisVertical className="w-4 h-4" />, text: <>Sağ üstteki <b>üç nokta</b> menüsüne dokun.</> },
      { icon: <Download className="w-4 h-4" />, text: <><b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>’yi seç.</> },
      { text: <><b>Yükle</b>’ye dokun. LiveTranslate uygulamaların arasında belirir.</> },
    ],
  },
};

/** "Download the app": one-tap install where the browser allows it, plus step-by-step iOS and Android guides */
export default function InstallGuide() {
  const deferredPrompt = useStore((s) => s.deferredPrompt);
  const setDeferredPrompt = useStore((s) => s.setDeferredPrompt);
  const [platform, setPlatform] = useState<Platform>(detectPlatform);
  const installed = isInstalledApp();

  const installNow = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  if (installed) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-6 px-4">
        <CheckCircle2 className="w-12 h-12 text-(--theme-accent)" />
        <p className="font-display font-semibold text-xl text-(--theme-ink)">Uygulama zaten yüklü</p>
        <p className="text-[15px] text-(--theme-muted)">LiveTranslate’i şu an ana ekranından açmışsın.</p>
      </div>
    );
  }

  const guide = STEPS[platform];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 px-1">
        <img src="/icon-192.png" alt="" className="w-16 h-16 rounded-[1.25rem] shadow-sm shrink-0" />
        <div className="min-w-0">
          <p className="font-display font-semibold text-xl text-(--theme-ink)">LiveTranslate</p>
          <p className="text-[13px] font-semibold text-(--theme-muted)">
            Ana ekranına ekle, uygulama gibi tam ekran açılsın. Mağazadan indirmen gerekmez.
          </p>
        </div>
      </div>

      {deferredPrompt && (
        <button type="button" onClick={installNow} className={primaryButton}>
          <Download className="w-[18px] h-[18px]" />
          Şimdi yükle
        </button>
      )}

      <Segmented<Platform>
        label="Telefonun"
        value={platform}
        onChange={setPlatform}
        options={[{ id: 'ios', label: 'iPhone (iOS)' }, { id: 'android', label: 'Android' }]}
      />

      <section className="rounded-3xl bg-(--theme-card-bg) border border-(--theme-border) p-4 space-y-4">
        <h3 className="text-sm font-bold text-(--theme-muted)">{guide.browser}</h3>
        <ol className="space-y-3.5">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-(--theme-accent-light) text-(--theme-accent) text-sm font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="flex-1 pt-0.5 text-[15px] leading-snug text-(--theme-ink)">
                {step.text}
                {step.icon && (
                  <span className="inline-flex align-middle ml-1.5 w-6 h-6 rounded-lg bg-(--theme-subtle-bg) text-(--theme-muted) items-center justify-center">
                    {step.icon}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {platform === 'ios' && (
        <p className="text-[13px] leading-snug text-center text-(--theme-muted) px-2">
          iPhone’da Chrome kullanıyorsan da olur: adres çubuğundaki Paylaş düğmesinden aynı adımları izle.
        </p>
      )}
    </div>
  );
}
