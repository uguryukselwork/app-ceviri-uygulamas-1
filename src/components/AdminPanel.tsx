import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Check, Loader2, Crown, Users, Ban, Gift, ShoppingBag, X, Trash2, Copy, Wand2, RefreshCw, Ticket
} from 'lucide-react';
import { cn } from '../lib/utils';
import { fieldClass, primaryButton, IconTile, softIconButton } from './ui';
import {
  adminCheckPin, adminOverview, adminSetVipAccess, adminCreatePromo, adminDeletePromo, adminDecideRequest,
  type AdminOverview, type VipAccess, type VipRequest
} from '../lib/api';
import { describePlan } from '../lib/plans';

const ACCESS_OPTIONS: { id: VipAccess; title: string; description: string; icon: React.ReactNode; tone: string }[] = [
  {
    id: 'members',
    title: 'Sadece VIP üyeler',
    description: 'VIP sesli çeviriyi (Gemini) yalnızca VIP üyeliği olanlar kullanır. Diğerleri ücretsiz modu kullanır.',
    icon: <Crown className="w-5 h-5" />,
    tone: 'bg-amber-500/15 text-amber-600',
  },
  {
    id: 'everyone',
    title: 'Herkes VIP\'i ücretsiz kullansın',
    description: 'Tüm kullanıcılar VIP sesli çeviriyi ücretsiz seçebilir. Gemini ücreti sana yansır.',
    icon: <Users className="w-5 h-5" />,
    tone: 'bg-emerald-500/15 text-emerald-600',
  },
  {
    id: 'off',
    title: 'Herkes ücretsiz modu kullansın',
    description: 'VIP kapalı. Herkes tarayıcının ücretsiz sesli çevirisini kullanır, VIP üyeler dahil.',
    icon: <Ban className="w-5 h-5" />,
    tone: 'bg-slate-500/15 text-slate-600',
  },
];

const GIFT_DURATIONS = [
  { days: 7, label: '1 hafta' },
  { days: 30, label: '1 ay' },
  { days: 365, label: '1 yıl' },
];

const randomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'VIP' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const sectionTitle = 'text-xs font-bold uppercase tracking-wide text-(--theme-muted) px-1';

/** Hidden admin panel (5 taps on the logo). The PIN is verified by the database on every call, never in the browser. */
export default function AdminPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pin, setPin] = useState('');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [giftDays, setGiftDays] = useState<Record<string, number>>({});
  const [newCode, setNewCode] = useState(randomCode);
  const [newDays, setNewDays] = useState(30);
  const [newUses, setNewUses] = useState(10);
  const [copied, setCopied] = useState<string | null>(null);

  // Forget the PIN whenever the panel closes
  useEffect(() => {
    if (open) return;
    setPin('');
    setOverview(null);
    setError(null);
    setNotice(null);
  }, [open]);

  const explain = (err: unknown) => {
    const message = err instanceof Error ? err.message : '';
    if (message === 'too_many_attempts') return 'Çok fazla yanlış deneme. 15 dakika sonra tekrar dene.';
    if (message.includes('code_exists')) return 'Bu kod zaten var. Başka bir kod dene.';
    if (message.includes('request_not_pending')) return 'Bu istek zaten yanıtlanmış.';
    return 'Bir sorun oluştu. Bağlantını kontrol et.';
  };

  const load = async (withPin = pin) => {
    const data = await adminOverview(withPin);
    if (!data) {
      setOverview(null);
      setError('Şifre yanlış.');
      setPin('');
      return false;
    }
    setOverview(data);
    return true;
  };

  /** Runs an admin action, then reloads the panel */
  const run = async (key: string, action: () => Promise<boolean>, done?: string) => {
    if (busy) return;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      if (!(await action())) {
        setError('Şifre artık geçerli değil. Paneli kapatıp yeniden aç.');
        return;
      }
      await load();
      if (done) setNotice(done);
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(null);
    }
  };

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4 || busy) return;
    setBusy('pin');
    setError(null);
    try {
      if (await adminCheckPin(pin)) await load(pin);
      else { setError('Şifre yanlış.'); setPin(''); }
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(null);
    }
  };

  const decide = (req: VipRequest, approve: boolean) => {
    const plan = describePlan(req.plan);
    const days = approve ? (req.kind === 'purchase' && plan ? plan.days : giftDays[req.id] ?? 30) : null;
    return run(`req-${req.id}`, () => adminDecideRequest(pin, req.id, approve, days),
      approve ? `${req.user_name} artık VIP (${req.kind === 'purchase' && plan ? plan.duration : `${days} gün`}).` : 'İstek reddedildi.');
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* clipboard blocked */ }
  };

  const pending = overview?.requests.filter(r => r.status === 'pending') ?? [];
  const decided = overview?.requests.filter(r => r.status !== 'pending').slice(0, 8) ?? [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-50 flex items-end bg-black/40 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Yönetici paneli"
            className="w-full app-page-bg rounded-t-[2rem] border-t border-(--theme-border) px-5 pt-3 pb-8 max-h-[92%] overflow-y-auto"
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-(--theme-border)" aria-hidden />

            <div className="flex items-center gap-3 mb-5">
              <IconTile tone="accent"><ShieldCheck className="w-5 h-5" /></IconTile>
              <div className="flex-1">
                <h2 className="font-display font-semibold text-xl text-(--theme-ink)">Yönetici paneli</h2>
                <p className="text-[13px] text-(--theme-muted)">
                  {overview ? `${overview.vip_members} aktif VIP üye` : 'Devam etmek için şifreyi gir.'}
                </p>
              </div>
              {overview && (
                <button type="button" onClick={() => run('refresh', async () => true)} className={softIconButton} aria-label="Yenile" title="Yenile">
                  <RefreshCw className={cn('w-5 h-5', busy === 'refresh' && 'animate-spin')} />
                </button>
              )}
            </div>

            {!overview ? (
              <form onSubmit={submitPin} className="space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  aria-label="Yönetici şifresi"
                  className={cn(fieldClass, 'text-center font-display text-2xl tracking-[0.6em]')}
                />
                {error && <p role="alert" className="text-[13px] font-bold text-red-600 text-center">{error}</p>}
                <button type="submit" disabled={pin.length !== 4 || !!busy} className={primaryButton}>
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Giriş'}
                </button>
              </form>
            ) : (
              <div className="space-y-7">
                {(error || notice) && (
                  <p
                    role={error ? 'alert' : 'status'}
                    className={cn('rounded-2xl px-4 py-2.5 text-[13px] font-bold', error ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/12 text-emerald-700')}
                  >
                    {error || notice}
                  </p>
                )}

                {/* VIP access for everyone */}
                <section className="space-y-2.5" role="radiogroup" aria-label="VIP erişimi">
                  <h3 className={sectionTitle}>VIP erişimi</h3>
                  {ACCESS_OPTIONS.map(o => {
                    const selected = overview.vip_access === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={!!busy}
                        onClick={() => !selected && run(`access-${o.id}`, () => adminSetVipAccess(pin, o.id), 'Kaydedildi. Yeni görüşmelerde geçerli olur.')}
                        className={cn(
                          'w-full text-left rounded-3xl border-2 p-3.5 flex items-center gap-3 transition-colors cursor-pointer disabled:cursor-wait',
                          selected ? 'border-(--theme-accent) bg-(--theme-accent-light)' : 'border-(--theme-border) bg-(--theme-card-bg) hover:border-(--theme-accent)'
                        )}
                      >
                        <span className={cn('w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center', o.tone)}>{o.icon}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-bold text-[15px] text-(--theme-ink)">{o.title}</span>
                          <span className="block text-[12.5px] leading-snug text-(--theme-muted) mt-0.5">{o.description}</span>
                        </span>
                        <span className={cn(
                          'w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center',
                          selected ? 'border-(--theme-accent) bg-(--theme-accent) text-(--theme-on-accent)' : 'border-(--theme-border)'
                        )}>
                          {busy === `access-${o.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : selected && <Check className="w-4 h-4" />}
                        </span>
                      </button>
                    );
                  })}
                </section>

                {/* Requests */}
                <section className="space-y-2.5">
                  <h3 className={sectionTitle}>Bekleyen istekler ({pending.length})</h3>
                  {pending.length === 0 && (
                    <p className="text-[13px] text-(--theme-muted) px-1">Bekleyen istek yok.</p>
                  )}
                  {pending.map(req => {
                    const plan = describePlan(req.plan);
                    return (
                      <div key={req.id} className="rounded-3xl border-2 border-(--theme-border) bg-(--theme-card-bg) p-3.5 space-y-3">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center',
                            req.kind === 'gift' ? 'bg-rose-500/15 text-rose-600' : 'bg-amber-500/15 text-amber-600'
                          )}>
                            {req.kind === 'gift' ? <Gift className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[15px] text-(--theme-ink) truncate">{req.user_name}</div>
                            <div className="text-[12.5px] text-(--theme-muted)">
                              {req.kind === 'gift' ? 'Hediye / ücretsiz deneme isteği' : `${plan?.label ?? req.plan} · ${plan?.price ?? ''}`}
                              {' · '}{formatDate(req.created_at)}
                            </div>
                          </div>
                        </div>
                        {req.kind === 'gift' && (
                          <div className="flex gap-1 p-1 rounded-full bg-(--theme-subtle-bg)" role="radiogroup" aria-label="VIP süresi">
                            {GIFT_DURATIONS.map(d => {
                              const selected = (giftDays[req.id] ?? 30) === d.days;
                              return (
                                <button
                                  key={d.days}
                                  type="button"
                                  role="radio"
                                  aria-checked={selected}
                                  onClick={() => setGiftDays(g => ({ ...g, [req.id]: d.days }))}
                                  className={cn('flex-1 py-1.5 rounded-full text-[12.5px] font-bold cursor-pointer', selected ? 'bg-(--theme-card-bg) text-(--theme-accent) shadow-sm' : 'text-(--theme-muted)')}
                                >
                                  {d.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => decide(req, true)}
                            className="flex-1 py-2.5 rounded-2xl bg-emerald-600 text-white text-[14px] font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                          >
                            {busy === `req-${req.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                            VIP ata{req.kind === 'purchase' && plan ? ` (${plan.duration})` : ''}
                          </button>
                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => decide(req, false)}
                            className="px-4 py-2.5 rounded-2xl bg-(--theme-subtle-bg) text-(--theme-ink) text-[14px] font-bold flex items-center gap-1.5 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                          >
                            <X className="w-4 h-4" /> Reddet
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {decided.length > 0 && (
                    <details className="px-1">
                      <summary className="text-[13px] font-bold text-(--theme-muted) cursor-pointer">Son yanıtlanan istekler</summary>
                      <ul className="mt-2 space-y-1">
                        {decided.map(r => (
                          <li key={r.id} className="text-[13px] text-(--theme-ink) flex justify-between gap-2">
                            <span className="truncate">{r.user_name} · {r.kind === 'gift' ? 'Hediye' : describePlan(r.plan)?.label}</span>
                            <span className={r.status === 'approved' ? 'text-emerald-700 font-bold' : 'text-(--theme-muted)'}>
                              {r.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </section>

                {/* Promo codes */}
                <section className="space-y-2.5">
                  <h3 className={sectionTitle}>Promosyon kodları</h3>
                  <form
                    className="rounded-3xl border-2 border-(--theme-border) bg-(--theme-card-bg) p-3.5 space-y-2.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run('promo-create', () => adminCreatePromo(pin, newCode, newDays, newUses), `${newCode} kodu oluşturuldu.`)
                        .then(() => setNewCode(randomCode()));
                    }}
                  >
                    <div className="relative">
                      <input
                        type="text"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16))}
                        aria-label="Yeni kod"
                        className={cn(fieldClass, 'pr-12 font-display tracking-[0.12em]')}
                      />
                      <button
                        type="button"
                        onClick={() => setNewCode(randomCode())}
                        aria-label="Rastgele kod üret"
                        title="Rastgele kod üret"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-(--theme-muted) hover:text-(--theme-accent) cursor-pointer"
                      >
                        <Wand2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1 min-w-0">
                        <span className="block text-[12px] font-bold text-(--theme-muted) mb-1 px-1">VIP süresi</span>
                        <select value={newDays} onChange={(e) => setNewDays(Number(e.target.value))} className={cn(fieldClass, 'py-2.5')}>
                          <option value={3}>3 gün</option>
                          <option value={7}>1 hafta</option>
                          <option value={30}>1 ay</option>
                          <option value={90}>3 ay</option>
                          <option value={365}>1 yıl</option>
                        </select>
                      </label>
                      <label className="w-28 shrink-0">
                        <span className="block text-[12px] font-bold text-(--theme-muted) mb-1 px-1">Kullanım hakkı</span>
                        <input
                          type="number"
                          min={1}
                          max={100000}
                          value={newUses}
                          onChange={(e) => setNewUses(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))}
                          className={cn(fieldClass, 'py-2.5')}
                        />
                      </label>
                    </div>
                    <button type="submit" disabled={newCode.length < 4 || !!busy} className={cn(primaryButton, 'py-3')}>
                      {busy === 'promo-create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                      Kod oluştur
                    </button>
                  </form>

                  {overview.promos.length === 0 ? (
                    <p className="text-[13px] text-(--theme-muted) px-1">Henüz kod yok.</p>
                  ) : (
                    <ul className="rounded-3xl border-2 border-(--theme-border) bg-(--theme-card-bg) divide-y divide-(--theme-border)">
                      {overview.promos.map(p => (
                        <li key={p.code} className="flex items-center gap-2 pl-4 pr-2 py-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="font-display font-semibold tracking-[0.1em] text-(--theme-ink)">{p.code}</div>
                            <div className="text-[12px] text-(--theme-muted)">
                              {p.days} gün VIP · {p.uses}/{p.max_uses} kullanıldı{p.uses >= p.max_uses ? ' · doldu' : ''}
                            </div>
                          </div>
                          <button type="button" onClick={() => copy(p.code)} className={softIconButton} aria-label="Kodu kopyala" title="Kopyala">
                            {copied === p.code ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            disabled={!!busy}
                            onClick={() => run(`promo-del-${p.code}`, () => adminDeletePromo(pin, p.code), `${p.code} silindi.`)}
                            className={cn(softIconButton, 'hover:text-red-600 hover:bg-red-500/10')}
                            aria-label="Kodu sil"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
