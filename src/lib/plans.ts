// VIP membership plans. Prices are shown in US dollars (also in Turkey).
// Edit prices and features here; the plans page and the admin panel read from this file.

export type Period = 'daily' | 'hourly' | 'weekly' | 'monthly' | 'yearly';
export type PackageId = 'free' | 'standard' | 'premium';

export const PERIODS: { id: Period; label: string; days: number; unit: string }[] = [
  { id: 'daily', label: 'Günlük', days: 1, unit: 'gün' },
  { id: 'hourly', label: 'Saatlik', days: 1/24, unit: 'saat' },
  { id: 'weekly', label: 'Haftalık', days: 7, unit: 'hafta' },
  { id: 'monthly', label: 'Aylık', days: 30, unit: 'ay' },
  { id: 'yearly', label: 'Yıllık', days: 365, unit: 'yıl' },
];

export interface Package {
  id: PackageId;
  name: string;
  /** VIP voice translation minutes per month */
  monthlyMinutes: number;
  tagline: string;
  /** base price before counter */
  basePrices: Record<Period, number>;
  /** additional credit (USD) given to user account when purchasing this period */
  creditOptions: number[]; // e.g., [5, 10, 0] for $5, $10, or no credit
  features: string[];
  highlight?: string;
}

export const PACKAGES: Package[] = [
  {
    id: 'free',
    name: 'Ücretsiz',
    monthlyMinutes: 0,
    tagline: 'Sınırsız yazılı çeviri ve temel özellikler',
    basePrices: { daily: 0, hourly: 0, weekly: 0, monthly: 0, yearly: 0 },
    creditOptions: [0],
    features: [
      'Tarayıcının kendi sesli çevirisi (1–2 sn gecikmeli)',
      'Sınırsız yazılı çeviri',
      'Yazıyor göstergesi, yanıtlama, okundu bilgisi',
    ],
  },
  {
    id: 'standard',
    name: 'Standart',
    monthlyMinutes: 200,
    tagline: 'Her gün konuşan çiftler ve arkadaşlar için',
    basePrices: { daily: 0.99, hourly: 0.04, weekly: 6.99, monthly: 19.99, yearly: 199.99 },
    creditOptions: [5, 10, 0], // $5, $10, or no credit
    features: [
      'Gemini canlı sesli çeviri (VIP ses kalitesi)',
      'Konuşurken canlı altyazı',
      'Sınırsız yazılı çeviri',
      'Sınırsız ücretsiz sesli çeviri modu',
    ],
    highlight: 'En çok tercih edilen',
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyMinutes: 300,
    tagline: 'İş, seyahat ve uzun görüşmeler için',
    basePrices: { daily: 1.49, hourly: 0.06, weekly: 10.49, monthly: 29.99, yearly: 299.99 },
    creditOptions: [5, 10, 0], // $5, $10, or no credit
    features: [
      'Standart\'daki her şey',
      'İki kat sesli çeviri süresi',
      'Yeni özelliklere erken erişim',
      'Öncelikli destek (aynı gün yanıt)',
    ],
  },
];

/** Minutes included in one period of a package */
export const periodMinutes = (pkg: Package, period: Period) => {
  switch (period) {
    case 'daily': return Math.round(pkg.monthlyMinutes / 30);
    case 'hourly': return Math.round(pkg.monthlyMinutes / (30 * 24));
    case 'weekly': return Math.round(pkg.monthlyMinutes / 4);
    case 'yearly': return pkg.monthlyMinutes * 12;
    default: return pkg.monthlyMinutes; // monthly
  }
};

/** Yearly saving compared with paying monthly for 12 months, in percent */
export const yearlySaving = (pkg: Package) =>
  Math.round((1 - pkg.basePrices.yearly / (pkg.basePrices.monthly * 12)) * 100);

export const formatUsd = (value: number) => `$${value.toFixed(2)}`;

/** 'standard:monthly', as stored with a purchase request */
export const planKey = (pkg: PackageId, period: Period) => `${pkg}:${period}`;

export function describePlan(key: string | null) {
  if (!key) return null;
  const [pkgId, periodId] = key.split(':');
  const pkg = PACKAGES.find(p => p.id === pkgId);
  const period = PERIODS.find(p => p.id === periodId);
  if (!pkg || !period) return null;
  return { pkg, period, label: `${pkg.name} · ${period.label}`, price: formatUsd(pkg.basePrices[period.id]),
    // Whole days for the admin RPC; hourly plans are granted one hour server-side
    days: Math.max(1, Math.round(period.days)),
    duration: period.id === 'hourly' ? '1 saat' : `${Math.round(period.days)} gün` };
}