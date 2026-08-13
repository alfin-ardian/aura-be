export const PPN_RATE = 0.11;

export const USAGE_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    priceIdr: 50_000,
    scans: 1_000,
    featured: false,
    validityDays: 30,
    description: 'Cocok untuk uji coba dan audiens kecil.',
  },
  {
    id: 'growth',
    name: 'Growth',
    priceIdr: 100_000,
    scans: 3_000,
    featured: true,
    validityDays: 30,
    description: 'Paling hemat untuk partner yang aktif setiap minggu.',
  },
  {
    id: 'scale',
    name: 'Scale',
    priceIdr: 200_000,
    scans: 7_000,
    featured: false,
    validityDays: 30,
    description: 'Untuk klinik, studio, dan partner volume tinggi.',
  },
] as const;

export type UsagePlanId = (typeof USAGE_PLANS)[number]['id'];
export type UsagePlan = (typeof USAGE_PLANS)[number];

export function getUsagePlan(id: string): UsagePlan | undefined {
  return USAGE_PLANS.find((plan) => plan.id === id);
}

export function planTotals(priceIdr: number) {
  const tax = Math.round(priceIdr * PPN_RATE);
  return {
    subtotal: priceIdr,
    tax,
    total: priceIdr + tax,
  };
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
}

export function weekIndexInMonth(date: Date): number {
  return Math.min(4, Math.floor((date.getDate() - 1) / 7));
}
