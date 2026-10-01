import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Check, Loader2, PartyPopper, Clock, Sparkles, Wallet } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { SheetHeader, Segmented, primaryButton, secondaryButton } from '../components/ui';
import AnnouncementBanner from '../components/AnnouncementBanner';
import {
  fetchVipStatus, fetchMyLatestRequest, subscribeToMembership, requestVip, buyWithBalance,
  type VipStatus, type VipRequest
} from '../lib/api';
import { PACKAGES, PERIODS, type Period, periodMinutes, yearlySaving, formatUsd, formatTalkTime, planKey, describePlan } from '../lib/plans';

const formatDate = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

type Notice = { tone: 'success' | 'error' | 'info'; text: string } | null;

export default function Plans() {
  const navigate = useNavigate();
  const profile = useStore((s) => s.profile);
  const [status, setStatus] = useState<VipStatus | null>(null);
  const [request, setRequest] = useState<VipRequest | null>(null);
  const [period, setPeriod] = useState<Period>('yearly');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [celebrate, setCelebrate] = useState(false);
  const lastVipUntil = useRef<string | null | undefined>(undefined);

  const refresh = async () => {
    const [s, r] = await Promise.all([fetchVipStatus(profile.id), fetchMyLatestRequest(profile.id)]);
    // Became VIP (or VIP was extended) while the page is open: celebrate
    if (lastVipUntil.current !== undefined && s.vipUntil && s.vipUntil !== lastVipUntil.current) setCelebrate(true);
    lastVipUntil.current = s.vipUntil;
    setStatus(s);
    setRequest(r);
  };

  useEffect(() => {
    if (!profile.id) return;
    // Without this a failed load leaves the membership card spinning forever
    const load = () => refresh().catch(() => setNotice({ tone: 'error', text: 'Üyelik bilgileri yüklenemedi. Bağlantını kontrol et.' }));
    void load();
    const unsubscribe = subscribeToMembership(profile.id, () => { void load(); });
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { unsubscribe(); document.removeEventListener('visibilitychange', onVisible); };
  }, [profile.id]);

  const sendRequest = async (kind: 'gift' | 'purchase', plan: string | null) => {
    if (busy) return;
    setBusy(plan ?? 'gift');
    setNotice(null);
    try {
      const result = await requestVip(kind, plan, profile.name || 'Misafir');
      await refresh();
      setNotice(result === 'sent'
        ? { tone: 'success', text: kind === 'gift'
            ? 'İsteğin yöneticiye gönderildi. Onaylanınca VIP üyeliğin hemen başlar.'
            : 'Satın alma talebin yöneticiye iletildi. Onaylanınca VIP üyeliğin başlar.' }
        : { tone: 'info', text: 'Zaten bekleyen bir isteğin var. Yönetici yanıtlayınca yenisini gönderebilirsin.' });
    } catch {
      setNotice({ tone: 'error', text: 'İstek gönderilemedi. Bağlantını kontrol et.' });
    } finally {
      setBusy(null);
    }
  };

  const buy = async (plan: string) => {
    if (busy) return;
    setBusy(plan);
    setNotice(null);
    try {
      const result = await buyWithBalance(plan);
      if (result === 'ok') {
        await refresh();
        setCelebrate(true);
      } else {
        setNotice({ tone: 'error', text: result === 'insufficient' ? 'Bakiyen bu paket için yetmiyor.' : 'Bu paket bulunamadı.' });
      }
    } catch {
      setNotice({ tone: 'error', text: 'Satın alınamadı. Bağlantını kontrol et.' });
    } finally {
      setBusy(null);
    }
  };

  const isVip = !!status?.vipUntil;
  const pending = request?.status === 'pending' ? request : null;

  return (
    <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden app-page-bg">
      <SheetHeader title="Üyelik planları" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-12">
        <div className="max-w-lg mx-auto space-y-5">
          <AnnouncementBanner />
          {/* Current membership */}
          <div className={cn(
            'rounded-[1.75rem] p-5 border-2',
            isVip ? 'bg-amber-500/10 border-amber-500/40' : 'bg-(--theme-card-bg) border-(--theme-border)'
          )}>
            {!status ? (
              <div className="flex justify-center py-2 text-(--theme-accent)"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : (
              <div className="flex items-center gap-3">
                <span className={cn(
                  'w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center',
                  isVip ? 'bg-amber-500 text-white' : 'bg-(--theme-subtle-bg) text-(--theme-muted)'
                )}>
                  <Crown className="w-6 h-6" />
                </span>
                <div className="min-w-0">
                  <div className="font-display font-semibold text-lg text-(--theme-ink)">
                    {isVip ? 'VIP üyesin' : 'Ücretsiz üyelik'}
                  </div>
                  <div className="text-[13px] text-(--theme-muted)">
                    {isVip
                      ? `${formatDate(status.vipUntil!)} tarihine kadar geçerli`
                      : status.access === 'everyone'
                        ? 'Şu an VIP sesli çeviri herkese ücretsiz 🎉'
                        : 'Ücretsiz sesli çeviri ve sınırsız yazılı çeviri'}
                  </div>
                </div>
              </div>
            )}
            {status && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-(--theme-subtle-bg) px-4 py-3">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-(--theme-ink)">
                  <Wallet className="w-4 h-4 text-(--theme-accent)" /> Bakiyen
                </span>
                <span className="font-display font-semibold text-xl text-(--theme-ink)">{formatUsd(status.balanceUsd)}</span>
              </div>
            )}
            {status && status.vipSeconds > 0 && (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-amber-500/10 px-4 py-3">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-(--theme-ink)">
                  <Clock className="w-4 h-4 text-amber-600" /> VIP konuşma hakkın
                </span>
                <span className="font-display font-semibold text-xl text-(--theme-ink)">{formatTalkTime(status.vipSeconds)}</span>
              </div>
            )}
            {pending && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-(--theme-subtle-bg) px-3 py-2 text-[13px] font-semibold text-(--theme-ink)">
                <Clock className="w-4 h-4 shrink-0 text-(--theme-accent)" />
                {pending.kind === 'gift'
                  ? 'Hediye isteğin yöneticinin onayını bekliyor'
                  : `${describePlan(pending.plan)?.label ?? 'Satın alma'} talebin onay bekliyor`}
              </div>
            )}
            {request?.status === 'rejected' && !pending && (
              <p className="mt-3 text-[13px] text-(--theme-muted)">Son isteğin onaylanmadı.</p>
            )}
          </div>

          <AnimatePresence>
            {celebrate && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                role="status"
                className="rounded-[1.75rem] p-4 bg-emerald-500/12 border-2 border-emerald-500/40 flex items-center gap-3"
              >
                <PartyPopper className="w-7 h-7 shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <div className="font-bold text-emerald-700">VIP üyelik başarıyla atandı!</div>
                  <div className="text-[13px] text-(--theme-muted)">Artık odada VIP sesli çeviriyi seçebilirsin.</div>
                </div>
                <button type="button" onClick={() => setCelebrate(false)} className="text-[13px] font-bold text-emerald-700 px-2 py-1 cursor-pointer">Tamam</button>
              </motion.div>
            )}
          </AnimatePresence>

          {notice && (
            <p
              role={notice.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'rounded-2xl px-4 py-3 text-[13px] font-bold',
                notice.tone === 'error' ? 'bg-red-500/10 text-red-600'
                : notice.tone === 'success' ? 'bg-emerald-500/12 text-emerald-700'
                : 'bg-(--theme-subtle-bg) text-(--theme-ink)'
              )}
            >
              {notice.text}
            </p>
          )}

          {/* Plans */}
          <div className="space-y-3">
            <div className="flex items-end justify-between px-1">
              <h2 className="font-display font-semibold text-xl text-(--theme-ink)">VIP paketleri</h2>
              <span className="text-[12px] font-bold text-(--theme-muted)">Fiyatlar USD</span>
            </div>
            <Segmented<Period>
              label="Ödeme dönemi"
              value={period}
              onChange={setPeriod}
              options={PERIODS.map(p => ({ id: p.id, label: p.label }))}
            />

            {PACKAGES.filter(pkg => pkg.id !== 'free').map(pkg => {
              const key = planKey(pkg.id, period);
              const unit = PERIODS.find(p => p.id === period)!.unit;
              const price = pkg.basePrices[period];
              const affordable = (status?.balanceUsd ?? 0) >= price;
              return (
                <div
                  key={pkg.id}
                  className={cn(
                    'relative rounded-[1.75rem] p-5 border-2 bg-(--theme-card-bg)',
                    pkg.highlight ? 'border-(--theme-accent)' : 'border-(--theme-border)'
                  )}
                >
                  {pkg.highlight && (
                    <span className="absolute -top-3 left-5 px-3 py-1 rounded-full bg-(--theme-accent) text-(--theme-on-accent) text-[11px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {pkg.highlight}
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-xl text-(--theme-ink) flex items-center gap-1.5">
                        <Crown className="w-5 h-5 text-amber-500" /> {pkg.name}
                      </div>
                      <div className="text-[13px] text-(--theme-muted)">{pkg.tagline}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display font-semibold text-2xl text-(--theme-ink)">{formatUsd(pkg.basePrices[period])}</div>
                      <div className="text-[12px] font-semibold text-(--theme-muted)">/ {unit}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-(--theme-accent-light) text-(--theme-accent) text-[12px] font-bold">
                      {periodMinutes(pkg, period).toLocaleString('tr-TR')} dk VIP sesli çeviri / {unit}
                    </span>
                    {period === 'yearly' && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/12 text-emerald-700 text-[12px] font-bold">
                        Aylığa göre %{yearlySaving(pkg)} tasarruf
                      </span>
                    )}
                  </div>

                  <ul className="mt-4 space-y-2">
                    {pkg.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-[14px] text-(--theme-ink)">
                        <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" /> {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={!!busy || (!!pending && !affordable)}
                    onClick={() => affordable ? buy(key) : sendRequest('purchase', key)}
                    className={cn(pkg.highlight ? primaryButton : secondaryButton, 'mt-5 py-3.5')}
                  >
                    {busy === key ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {pending?.plan === key ? 'Talebin onay bekliyor'
                      : affordable ? `Bakiyeden öde (${formatUsd(price)})`
                      : `${formatUsd(price)} ile satın al`}
                  </button>
                </div>
              );
            })}

            <div className="rounded-[1.75rem] p-5 border-2 border-(--theme-border) bg-(--theme-card-bg)">
              <div className="font-display font-semibold text-lg text-(--theme-ink)">Ücretsiz</div>
              <div className="text-[13px] text-(--theme-muted) mb-3">Her zaman ücretsiz</div>
              <ul className="space-y-2">
                {['Tarayıcının kendi sesli çevirisi (1–2 sn gecikmeli)', 'Sesli yazma: konuş, mesajın yazılsın', 'Sınırsız yazılı çeviri', 'Yazıyor göstergesi, yanıtlama, okundu bilgisi'].map(f => (
                  <li key={f} className="flex items-start gap-2 text-[14px] text-(--theme-ink)">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-(--theme-muted)" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[12px] text-(--theme-muted) text-center px-4 leading-relaxed">
              Fiyatlar ABD doları (USD) cinsindendir ve Türkiye dahil tüm ülkelerde aynıdır.
              Satın alma talebin yönetici onayıyla etkinleşir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
