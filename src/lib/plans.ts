// VIP membership plans. Prices are shown in US dollars (also in Turkey).
// Edit prices and features here; the plans page and the admin panel read from this file.

export type Period = 'weekly' | 'monthly' | 'yearly';
export type PackageId = 'free' | 'standard' | 'premium';

export const PERIODS: { id: Period; label: string; days: number; unit: string }[] = [
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
  features: string[];
  highlight?: string;
}

export const PACKAGES: Package[] = [
  {
    id: 'free',
    name: 'Ücretsiz',
    monthlyMinutes: 0,
    tagline: 'Sınırsız yazılı çeviri ve temel özellikler',
    basePrices: { weekly: 0, monthly: 0, yearly: 0 },
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
    basePrices: { weekly: 6.99, monthly: 19.99, yearly: 199.99 },
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
    basePrices: { weekly: 10.49, monthly: 29.99, yearly: 299.99 },
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
    case 'weekly': return Math.round(pkg.monthlyMinutes / 4);
    case 'yearly': return pkg.monthlyMinutes * 12;
    default: return pkg.monthlyMinutes; // monthly
  }
};

/** Yearly saving compared with paying monthly for 12 months, in percent */
export const yearlySaving = (pkg: Package) =>
  Math.round((1 - pkg.basePrices.yearly / (pkg.basePrices.monthly * 12)) * 100);

export const formatUsd = (value: number) => `$${value.toFixed(2)}`;

/** Talk time left: '1 sa 5 dk', '45 dk' */
export const formatTalkTime = (seconds: number) => {
  const minutes = Math.ceil(seconds / 60);
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? (m ? `${h} sa ${m} dk` : `${h} saat`) : `${m} dk`;
};

/** 'standard:monthly', as stored with a purchase request */
export const planKey = (pkg: PackageId, period: Period) => `${pkg}:${period}`;

export function describePlan(key: string | null) {
  if (!key) return null;
  const [pkgId, periodId] = key.split(':');
  const pkg = PACKAGES.find(p => p.id === pkgId);
  const period = PERIODS.find(p => p.id === periodId);
  if (!pkg || !period) return null;
  return { pkg, period, label: `${pkg.name} · ${period.label}`, price: formatUsd(pkg.basePrices[period.id]),
    days: period.days, duration: `${period.days} gün` };
}