import type { PrismaClient, Subscription } from '@prisma/client';
import { ValidationError } from '../../../shared/errors/app-error.js';
import {
  USAGE_PLANS,
  addDays,
  getUsagePlan,
  planTotals,
  startOfDay,
  startOfMonth,
  startOfNextMonth,
  weekIndexInMonth,
  type UsagePlanId,
} from '../plans.js';
import type { CheckoutInput } from '../validators/usage.validator.js';

const WEEKDAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export interface UsageDto {
  planId: UsagePlanId | null;
  planName: string;
  priceIdr: number;
  quota: number;
  used: number;
  remaining: number;
  percent: number;
  matchRate: number;
  avgPerDay: number;
  peakDay: string;
  peakValue: number;
  projectedDays: number;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  renewsAt: string;
  history: Array<{ label: string; used: number; matches: number }>;
  daily: Array<{ label: string; date: string; scans: number; matches: number }>;
  channels: Array<{ label: string; value: number }>;
  plans: Array<{
    id: UsagePlanId;
    name: string;
    priceIdr: number;
    scans: number;
    featured: boolean;
    description: string;
    active: boolean;
  }>;
}

export interface CheckoutResult {
  invoice: string;
  method: string;
  planId: UsagePlanId;
  planName: string;
  quotaAdded: number;
  totals: { subtotal: number; tax: number; total: number };
  usage: UsageDto;
}

function idDayLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function idPeriodLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function laterDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

export class UsageService {
  constructor(private readonly db: PrismaClient) {}

  async getUsage(userId: string): Promise<UsageDto> {
    const now = new Date();
    const subscription = await this.getActiveSubscription(userId, now);
    const periodStart = subscription?.periodStart ?? startOfMonth(now);
    const periodEnd = subscription?.periodEnd ?? startOfNextMonth(now);
    const quota = subscription?.quota ?? 0;

    const fourteenStart = startOfDay(addDays(now, -13));
    const queryStart = fourteenStart < periodStart ? fourteenStart : periodStart;
    const scans = await this.db.scan.findMany({
      where: {
        userId,
        createdAt: { gte: queryStart, lte: now },
      },
      select: {
        createdAt: true,
        channel: true,
        recommendation: { select: { id: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const inPeriod = scans.filter(
      (scan) => scan.createdAt >= periodStart && scan.createdAt < periodEnd,
    );
    const used = inPeriod.length;
    const matched = inPeriod.filter((scan) => scan.recommendation).length;
    const remaining = Math.max(0, quota - used);
    const percent = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
    const matchRate = used > 0 ? Math.round((matched / used) * 100) : 0;

    const dailyMap = new Map<string, { scans: number; matches: number; date: Date }>();
    for (let offset = 0; offset < 14; offset += 1) {
      const day = startOfDay(addDays(fourteenStart, offset));
      const key = day.toISOString().slice(0, 10);
      dailyMap.set(key, { scans: 0, matches: 0, date: day });
    }

    const monthStart = startOfMonth(periodStart);
    const monthEnd = startOfNextMonth(periodStart);
    const weekCount = weekIndexInMonth(addDays(monthEnd, -1)) + 1;
    const weekly = Array.from({ length: weekCount }, (_, index) => ({
      label: `Minggu ${index + 1}`,
      used: 0,
      matches: 0,
    }));

    let referral = 0;
    let qr = 0;

    for (const scan of scans) {
      const day = startOfDay(scan.createdAt);
      const key = day.toISOString().slice(0, 10);
      const hasMatch = Boolean(scan.recommendation);
      const bucket = dailyMap.get(key);
      if (bucket) {
        bucket.scans += 1;
        if (hasMatch) bucket.matches += 1;
      }

      if (scan.createdAt >= monthStart && scan.createdAt < monthEnd) {
        const week = weekly[weekIndexInMonth(scan.createdAt)];
        if (week) {
          week.used += 1;
          if (hasMatch) week.matches += 1;
        }
      }

      if (scan.createdAt >= periodStart && scan.createdAt < periodEnd) {
        if (scan.channel === 'qr') qr += 1;
        else referral += 1;
      }
    }

    const daily = [...dailyMap.values()].map((item) => ({
      label: idDayLabel(item.date),
      date: item.date.toISOString(),
      scans: item.scans,
      matches: item.matches,
    }));

    const last14Scans = daily.reduce((sum, item) => sum + item.scans, 0);
    const avgPerDay = Math.round(last14Scans / 14);
    const peakDaily = [...dailyMap.values()].reduce(
      (best, item) => (item.scans > best.scans ? item : best),
      { scans: 0, matches: 0, date: now },
    );
    const peakValue = peakDaily.scans;
    const peakDay = peakValue > 0 ? WEEKDAYS_ID[peakDaily.date.getDay()] ?? '—' : '—';

    return {
      planId: (subscription?.planId as UsagePlanId | undefined) ?? null,
      planName: subscription?.planName ?? 'Belum berlangganan',
      priceIdr: subscription?.priceIdr ?? 0,
      quota,
      used,
      remaining,
      percent,
      matchRate,
      avgPerDay,
      peakDay: peakValue > 0 ? peakDay : '—',
      peakValue,
      projectedDays: avgPerDay > 0 ? Math.floor(remaining / avgPerDay) : remaining > 0 ? 30 : 0,
      periodLabel: idPeriodLabel(periodStart),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      renewsAt: periodEnd.toISOString(),
      history: weekly,
      daily,
      channels: [
        { label: 'Link referral', value: referral },
        { label: 'QR code', value: qr },
      ],
      plans: USAGE_PLANS.map((plan) => ({
        id: plan.id,
        name: plan.name,
        priceIdr: plan.priceIdr,
        scans: plan.scans,
        featured: plan.featured,
        description: plan.description,
        active: subscription?.planId === plan.id,
      })),
    };
  }

  async checkout(userId: string, input: CheckoutInput): Promise<CheckoutResult> {
    const plan = getUsagePlan(input.planId);
    if (!plan) {
      throw new ValidationError('Unknown plan');
    }

    const now = new Date();
    const totals = planTotals(plan.priceIdr);
    const invoice = this.makeInvoice(now);
    let subscription = await this.getActiveSubscription(userId, now);

    if (subscription) {
      const periodEnd = laterDate(subscription.periodEnd, addDays(now, plan.validityDays));
      subscription = await this.db.subscription.update({
        where: { id: subscription.id },
        data: {
          planId: plan.id,
          planName: plan.name,
          priceIdr: plan.priceIdr,
          quota: subscription.quota + plan.scans,
          periodEnd,
          isActive: true,
        },
      });
    } else {
      subscription = await this.db.subscription.create({
        data: {
          userId,
          planId: plan.id,
          planName: plan.name,
          priceIdr: plan.priceIdr,
          quota: plan.scans,
          periodStart: startOfMonth(now),
          periodEnd: addDays(now, plan.validityDays),
          isActive: true,
        },
      });
    }

    await this.db.payment.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        planId: plan.id,
        method: input.method,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        invoiceNumber: invoice,
        status: 'paid',
        paidAt: now,
      },
    });

    return {
      invoice,
      method: input.method,
      planId: plan.id,
      planName: plan.name,
      quotaAdded: plan.scans,
      totals,
      usage: await this.getUsage(userId),
    };
  }

  private async getActiveSubscription(userId: string, now: Date): Promise<Subscription | null> {
    await this.db.subscription.updateMany({
      where: { userId, isActive: true, periodEnd: { lte: now } },
      data: { isActive: false },
    });
    return this.db.subscription.findFirst({
      where: { userId, isActive: true, periodEnd: { gt: now } },
      orderBy: { periodEnd: 'desc' },
    });
  }

  private makeInvoice(now: Date): string {
    const stamp = now.toISOString().slice(0, 10).replaceAll('-', '');
    const rand = String(Math.floor(Math.random() * 90) + 10);
    return `AURA-${stamp}-${rand}`;
  }
}
