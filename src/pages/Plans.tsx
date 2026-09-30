import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Check, Gift, Loader2, PartyPopper, Clock, Sparkles, Ticket, Send } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { SheetHeader, Segmented, fieldClass, primaryButton, secondaryButton } from '../components/ui';
import {
  fetchVipStatus, fetchMyLatestRequest, subscribeToMembership, redeemPromoCode, requestVip,
  type VipStatus, type VipRequest, type PromoResult
} from '../lib/api';
import { PACKAGES, PERIODS, type Period, periodMinutes, yearlySaving, formatUsd, planKey, describePlan } from '../lib/plans';

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const PROMO_MESSAGES: Record<Exclude<PromoResult, 'ok'>, string> = {
  invalid: 'Bu kod geçerli değil.',
  used_up: 'Bu kodun kullanım hakkı dolmuş.',
  already_used: 'Bu kodu daha önce kullandın.',
  too_many_attempts: 'Çok fazla deneme yaptın. 15 dakika sonra tekrar dene.',
};

type Notice = { tone: 'success' | 'error' | 'info'; text: string } | null;

export default function Plans() {
  const navigate = useNavigate();
  const profile = useStore((s) => s.profile);
  const [status, setStatus] = useState<VipStatus | null>(null);
  const [request, setRequest] = useState<VipRequest | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');
  const [giftOpen, setGiftOpen] = useState(false);
  const [code, setCode] = useState('');
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
    void refresh();
    const unsubscribe = subscribeToMembership(profile.id, () => { void refresh(); });
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { unsubscribe(); document.removeEventListener('visibilitychange', onVisible); };
  }, [profile.id]);

  const redeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy('code');
    setNotice(null);
    try {
      const result = await redeemPromoCode(code);
      if (result === 'ok') {
        setCode('');
        await refresh();
        setCelebrate(true);
      } else {
        setNotice({ tone: 'error', text: PROMO_MESSAGES[result] });
      }
    } catch {
      setNotice({ tone: 'error', text: 'Bir sorun oluştu. Bağlantını kontrol et.' });
    } finally {
      setBusy(null);
    }
  };

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

  const isVip = !!status?.vipUntil;
  const pending = request?.status === 'pending' ? request : null;

  return (
    <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden app-page-bg">
      <SheetHeader title="Üyelik planları" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-12">
        <div className="max-w-lg mx-auto space-y-5">
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

          {/* Gift / promo code */}
          <div className="rounded-[1.75rem] border-2 border-dashed border-(--theme-accent) bg-(--theme-accent-light) overflow-hidden">
            <button
              type="button"
              onClick={() => setGiftOpen(o => !o)}
              aria-expanded={giftOpen}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
            >
              <span className="w-10 h-10 shrink-0 rounded-2xl bg-(--theme-accent) text-(--theme-on-accent) flex items-center justify-center">
                <Gift className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-[15px] text-(--theme-ink)">Hediyemiz var 🎁</span>
                <span className="block text-[13px] text-(--theme-muted)">Promosyon kodu gir ya da VIP'i ücretsiz dene</span>
              </span>
            </button>
            <AnimatePresence initial={false}>
              {giftOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 space-y-3"
                >
                  <form onSubmit={redeem} className="flex gap-2">
                    <div className="relative flex-1 min-w-0">
                      <Ticket className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-(--theme-muted)" aria-hidden />
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16))}
                        placeholder="PROMOSYON KODU"
                        aria-label="Promosyon kodu"
                        autoCapitalize="characters"
                        className={cn(fieldClass, 'pl-10 font-display tracking-[0.12em]')}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!code.trim() || !!busy}
                      className="shrink-0 px-4 rounded-2xl bg-(--theme-accent) text-(--theme-on-accent) font-bold text-sm disabled:opacity-45 cursor-pointer flex items-center gap-1.5"
                    >
                      {busy === 'code' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kodu kullan'}
                    </button>
                  </form>
                  <div className="flex items-center gap-3 text-[12px] font-bold text-(--theme-muted)">
                    <span className="flex-1 h-px bg-(--theme-border)" /> ya da <span className="flex-1 h-px bg-(--theme-border)" />
                  </div>
                  <button
                    type="button"
                    disabled={!!busy || !!pending}
                    onClick={() => sendRequest('gift', null)}
                    className={cn(secondaryButton, 'py-3 bg-(--theme-card-bg)')}
                  >
                    {busy === 'gift' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {pending?.kind === 'gift' ? 'İsteğin gönderildi, onay bekleniyor' : 'Ücretsiz dene — yöneticiye istek gönder'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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

            {PACKAGES.map(pkg => {
              const key = planKey(pkg.id, period);
              const unit = PERIODS.find(p => p.id === period)!.unit;
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
                      <div className="font-display font-semibold text-2xl text-(--theme-ink)">{formatUsd(pkg.prices[period])}</div>
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
                    disabled={!!busy || !!pending}
                    onClick={() => sendRequest('purchase', key)}
                    className={cn(pkg.highlight ? primaryButton : secondaryButton, 'mt-5 py-3.5')}
                  >
                    {busy === key ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {pending?.plan === key ? 'Talebin onay bekliyor' : `${formatUsd(pkg.prices[period])} ile satın al`}
                  </button>
                </div>
              );
            })}

            <div className="rounded-[1.75rem] p-5 border-2 border-(--theme-border) bg-(--theme-card-bg)">
              <div className="font-display font-semibold text-lg text-(--theme-ink)">Ücretsiz</div>
              <div className="text-[13px] text-(--theme-muted) mb-3">Her zaman ücretsiz</div>
              <ul className="space-y-2">
                {['Tarayıcının kendi sesli çevirisi (1–2 sn gecikmeli)', 'Sınırsız yazılı çeviri', 'Yazıyor göstergesi, yanıtlama, okundu bilgisi'].map(f => (
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
