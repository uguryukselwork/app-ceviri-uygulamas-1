// VIP membership plans. Prices are shown in US dollars (also in Turkey).
// Edit prices and features here; the plans page and the admin panel read from this file.

export type Period = 'weekly' | 'monthly' | 'yearly';
export type PackageId = 'basic' | 'standard' | 'platinum';

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
  prices: Record<Period, number>;
  features: string[];
  highlight?: string;
}

export const PACKAGES: Package[] = [
  {
    id: 'basic',
    name: 'Temel',
    monthlyMinutes: 100,
    tagline: 'Arada bir sesli konuşanlar için',
    prices: { weekly: 1.99, monthly: 5.99, yearly: 49.99 },
    features: [
      'Gemini canlı sesli çeviri (VIP ses kalitesi)',
      'Konuşurken canlı altyazı',
      'Sınırsız yazılı çeviri',
      'Sınırsız ücretsiz sesli çeviri modu',
    ],
  },
  {
    id: 'standard',
    name: 'Standart',
    monthlyMinutes: 200,
    tagline: 'Her gün konuşan çiftler ve arkadaşlar için',
    prices: { weekly: 3.49, monthly: 9.99, yearly: 83.99 },
    highlight: 'En çok tercih edilen',
    features: [
      'Temel\'deki her şey',
      'İki kat sesli çeviri süresi',
      'Öncelikli destek',
    ],
  },
  {
    id: 'platinum',
    name: 'Platin',
    monthlyMinutes: 300,
    tagline: 'İş, seyahat ve uzun görüşmeler için',
    prices: { weekly: 4.99, monthly: 13.99, yearly: 116.99 },
    features: [
      'Standart\'daki her şey',
      'En yüksek sesli çeviri süresi',
      'Yeni özelliklere erken erişim',
      'Öncelikli destek (aynı gün yanıt)',
    ],
  },
];

/** Minutes included in one period of a package */
export const periodMinutes = (pkg: Package, period: Period) =>
  period === 'weekly' ? Math.round(pkg.monthlyMinutes / 4)
  : period === 'yearly' ? pkg.monthlyMinutes * 12
  : pkg.monthlyMinutes;

/** Yearly saving compared with paying monthly for 12 months, in percent */
export const yearlySaving = (pkg: Package) =>
  Math.round((1 - pkg.prices.yearly / (pkg.prices.monthly * 12)) * 100);

export const formatUsd = (value: number) => `$${value.toFixed(2)}`;

/** 'vip200:monthly', as stored with a purchase request */
export const planKey = (pkg: PackageId, period: Period) => `${pkg}:${period}`;

export function describePlan(key: string | null) {
  if (!key) return null;
  const [pkgId, periodId] = key.split(':');
  const pkg = PACKAGES.find(p => p.id === pkgId);
  const period = PERIODS.find(p => p.id === periodId);
  if (!pkg || !period) return null;
  return { pkg, period, label: `${pkg.name} · ${period.label}`, price: formatUsd(pkg.prices[period.id]), days: period.days };
}
