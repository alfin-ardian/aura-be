import type { PrismaClient, Subscription } from '@prisma/client';
import { ROLES } from '../../../constants/index.js';
import { NotFoundError } from '../../../shared/errors/app-error.js';
import {
  USAGE_PLANS,
  getUsagePlan,
  startOfMonth,
  startOfNextMonth,
  type UsagePlanId,
} from '../../usage/plans.js';

export interface BillingDto {
  planId: UsagePlanId | null;
  planName: string;
  priceIdr: number;
  priceLabel: string;
  quota: number;
  used: number;
  remaining: number;
  percent: number;
  periodStart: string;
  periodEnd: string;
  renewsAt: string;
  autoRenew: boolean;
  annualPromo: {
    enabled: boolean;
    title: string;
    body: string;
    savingsPercent: number;
    ctaLabel: string;
    ctaHref: string;
  };
  payment: {
    provider: string;
    methodLabel: string;
    status: string;
    last4: string | null;
    manageUrl: string | null;
  };
  includedUsage: Array<{
    item: string;
    allowance: string;
    usage: string;
    percent: number;
  }>;
  plans: Array<{
    id: UsagePlanId;
    name: string;
    priceIdr: number;
    scans: number;
    featured: boolean;
    contactSales: boolean;
    description: string;
    active: boolean;
  }>;
}

export interface SpendingDto {
  monthToDate: number;
  previousMonth: number;
  currency: 'IDR';
  projectedMonth: number;
  averagePerMonth: number;
  months: Array<{
    label: string;
    key: string;
    total: number;
    payments: number;
  }>;
  recent: Array<{
    id: string;
    invoiceNumber: string;
    planName: string;
    total: number;
    status: string;
    paidAt: string | null;
  }>;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  planId: string;
  planName: string;
  method: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface InvoiceDetail extends InvoiceListItem {
  quota: number | null;
  lines: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
    amount: number;
  }>;
}

export interface PlatformFinanceRow {
  affiliatorId: string;
  name: string;
  email: string;
  isActive: boolean;
  planId: string | null;
  planName: string;
  priceIdr: number;
  quota: number;
  used: number;
  remaining: number;
  usagePercent: number;
  revenueTotal: number;
  paidInvoices: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface PlatformFinanceDto {
  currency: 'IDR';
  totalRevenue: number;
  affiliatorCount: number;
  items: PlatformFinanceRow[];
}

export interface FinanceReportBucket {
  key: string;
  label: string;
  total: number;
  payments: number;
}

export interface PlatformFinanceReportDto {
  currency: 'IDR';
  months: FinanceReportBucket[];
  years: FinanceReportBucket[];
  byPlan: Array<{
    planId: string;
    planName: string;
    total: number;
    payments: number;
  }>;
  thisMonthTotal: number;
  thisYearTotal: number;
}

function idMonthLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
}

function formatIdrPlain(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function planNameOf(planId: string): string {
  return getUsagePlan(planId)?.name ?? planId;
}

export class BillingService {
  constructor(private readonly db: PrismaClient) {}

  async getBilling(userId: string): Promise<BillingDto> {
    const now = new Date();
    const subscription = await this.getActiveSubscription(userId, now);
    const periodStart = subscription?.periodStart ?? startOfMonth(now);
    const periodEnd = subscription?.periodEnd ?? startOfNextMonth(now);
    const quota = subscription?.quota ?? 0;

    const used = subscription
      ? await this.db.scan.count({
          where: {
            userId,
            createdAt: { gte: periodStart, lt: periodEnd },
          },
        })
      : 0;
    const remaining = Math.max(0, quota - used);
    const percent = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
    const planId = (subscription?.planId as UsagePlanId | null) ?? null;

    return {
      planId,
      planName: subscription?.planName ?? 'Belum berlangganan',
      priceIdr: subscription?.priceIdr ?? 0,
      priceLabel: subscription
        ? `${formatIdrPlain(subscription.priceIdr)}/bln`
        : '—',
      quota,
      used,
      remaining,
      percent,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      renewsAt: periodEnd.toISOString(),
      autoRenew: Boolean(subscription),
      annualPromo: {
        enabled: true,
        title: 'Hemat 20% dengan billing tahunan',
        body: 'Bayar sekali setahun untuk paket Growth atau Scale dan hemat hingga 20%.',
        savingsPercent: 20,
        ctaLabel: subscription ? 'Upgrade sekarang' : 'Pilih paket',
        ctaHref: subscription ? '/affiliate/usage#upgrade' : '/affiliate/plans',
      },
      payment: {
        provider: 'Aura Pay (simulasi)',
        methodLabel: 'QRIS · VA · E-wallet',
        status: subscription ? 'active' : 'inactive',
        last4: null,
        manageUrl: null,
      },
      includedUsage: [
        {
          item: 'Scan credits',
          allowance: subscription
            ? `${quota.toLocaleString('id-ID')} scans`
            : 'Belum ada kuota',
          usage: `${used.toLocaleString('id-ID')} / ${quota.toLocaleString('id-ID')}`,
          percent,
        },
        {
          item: 'Product matches',
          allowance: subscription ? 'Unlimited' : '—',
          usage: subscription ? 'Included' : '—',
          percent: 0,
        },
        {
          item: 'Referral analytics',
          allowance: subscription ? 'Included' : '—',
          usage: subscription ? 'Included' : '—',
          percent: 0,
        },
      ],
      plans: USAGE_PLANS.map((plan) => ({
        id: plan.id,
        name: plan.name,
        priceIdr: plan.priceIdr,
        scans: plan.scans,
        featured: plan.featured,
        contactSales: plan.contactSales,
        description: plan.description,
        active: subscription?.planId === plan.id,
      })),
    };
  }

  async getSpending(userId: string): Promise<SpendingDto> {
    const now = new Date();
    const months: SpendingDto['months'] = [];
    const monthStartCursor = startOfMonth(now);

    for (let offset = 5; offset >= 0; offset -= 1) {
      const start = new Date(
        monthStartCursor.getFullYear(),
        monthStartCursor.getMonth() - offset,
        1,
        0,
        0,
        0,
        0,
      );
      const end = startOfNextMonth(start);
      const payments = await this.db.payment.findMany({
        where: {
          userId,
          status: 'paid',
          paidAt: { gte: start, lt: end },
        },
        select: { total: true },
      });
      months.push({
        label: idMonthLabel(start),
        key: start.toISOString().slice(0, 7),
        total: payments.reduce((sum, item) => sum + item.total, 0),
        payments: payments.length,
      });
    }

    const thisMonth = months[months.length - 1]?.total ?? 0;
    const previousMonth = months[months.length - 2]?.total ?? 0;
    const averagePerMonth =
      months.length > 0
        ? Math.round(months.reduce((sum, item) => sum + item.total, 0) / months.length)
        : 0;

    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedMonth =
      day > 0 ? Math.round((thisMonth / day) * daysInMonth) : thisMonth;

    const recentPayments = await this.db.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return {
      monthToDate: thisMonth,
      previousMonth,
      currency: 'IDR',
      projectedMonth,
      averagePerMonth,
      months,
      recent: recentPayments.map((payment) => ({
        id: payment.id,
        invoiceNumber: payment.invoiceNumber,
        planName: planNameOf(payment.planId),
        total: payment.total,
        status: payment.status,
        paidAt: payment.paidAt?.toISOString() ?? null,
      })),
    };
  }

  async listInvoices(userId: string): Promise<{ items: InvoiceListItem[] }> {
    const payments = await this.db.payment.findMany({
      where: { userId },
      include: {
        subscription: {
          select: { periodStart: true, periodEnd: true, planName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      items: payments.map((payment) => ({
        id: payment.id,
        invoiceNumber: payment.invoiceNumber,
        planId: payment.planId,
        planName: payment.subscription.planName || planNameOf(payment.planId),
        method: payment.method,
        subtotal: payment.subtotal,
        tax: payment.tax,
        total: payment.total,
        status: payment.status,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
        periodStart: payment.subscription.periodStart.toISOString(),
        periodEnd: payment.subscription.periodEnd.toISOString(),
      })),
    };
  }

  async getInvoice(userId: string, invoiceNumber: string): Promise<InvoiceDetail> {
    const payment = await this.db.payment.findFirst({
      where: { userId, invoiceNumber },
      include: {
        subscription: {
          select: {
            periodStart: true,
            periodEnd: true,
            planName: true,
            quota: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Invoice not found');
    }

    const plan = getUsagePlan(payment.planId);
    const planName = payment.subscription.planName || planNameOf(payment.planId);

    return {
      id: payment.id,
      invoiceNumber: payment.invoiceNumber,
      planId: payment.planId,
      planName,
      method: payment.method,
      subtotal: payment.subtotal,
      tax: payment.tax,
      total: payment.total,
      status: payment.status,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      periodStart: payment.subscription.periodStart.toISOString(),
      periodEnd: payment.subscription.periodEnd.toISOString(),
      quota: plan?.scans ?? payment.subscription.quota,
      lines: [
        {
          description: `Paket ${planName}${plan ? ` · ${plan.scans.toLocaleString('id-ID')} scans` : ''}`,
          quantity: 1,
          unitAmount: payment.subtotal,
          amount: payment.subtotal,
        },
        {
          description: 'PPN 11%',
          quantity: 1,
          unitAmount: payment.tax,
          amount: payment.tax,
        },
      ],
    };
  }

  async getPlatformFinance(): Promise<PlatformFinanceDto> {
    const now = new Date();
    const affiliators = await this.db.user.findMany({
      where: { role: ROLES.AFFILIATOR },
      orderBy: { createdAt: 'asc' },
      include: {
        profile: { select: { name: true } },
        subscriptions: {
          where: { isActive: true, periodEnd: { gt: now } },
          orderBy: { periodEnd: 'desc' },
          take: 1,
        },
        payments: {
          where: { status: 'paid' },
          select: { total: true },
        },
      },
    });

    const items: PlatformFinanceRow[] = [];

    for (const user of affiliators) {
      const subscription = user.subscriptions[0] ?? null;
      const periodStart = subscription?.periodStart ?? null;
      const periodEnd = subscription?.periodEnd ?? null;
      const quota = subscription?.quota ?? 0;

      let used = 0;
      if (periodStart && periodEnd) {
        used = await this.db.scan.count({
          where: {
            userId: user.id,
            createdAt: { gte: periodStart, lt: periodEnd },
          },
        });
      }

      const remaining = Math.max(0, quota - used);
      const usagePercent =
        quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
      const revenueTotal = user.payments.reduce((sum, payment) => sum + payment.total, 0);

      items.push({
        affiliatorId: user.id,
        name: user.profile?.name?.trim() || user.email.split('@')[0] || user.email,
        email: user.email,
        isActive: user.isActive,
        planId: subscription?.planId ?? null,
        planName: subscription?.planName ?? '—',
        priceIdr: subscription?.priceIdr ?? 0,
        quota,
        used,
        remaining,
        usagePercent,
        revenueTotal,
        paidInvoices: user.payments.length,
        periodStart: periodStart?.toISOString() ?? null,
        periodEnd: periodEnd?.toISOString() ?? null,
      });
    }

    items.sort((a, b) => b.revenueTotal - a.revenueTotal);

    return {
      currency: 'IDR',
      totalRevenue: items.reduce((sum, item) => sum + item.revenueTotal, 0),
      affiliatorCount: items.length,
      items,
    };
  }

  async getPlatformFinanceReport(): Promise<PlatformFinanceReportDto> {
    const now = new Date();
    const monthStartCursor = startOfMonth(now);
    const months: FinanceReportBucket[] = [];

    for (let offset = 11; offset >= 0; offset -= 1) {
      const start = new Date(
        monthStartCursor.getFullYear(),
        monthStartCursor.getMonth() - offset,
        1,
        0,
        0,
        0,
        0,
      );
      const end = startOfNextMonth(start);
      const payments = await this.db.payment.findMany({
        where: {
          status: 'paid',
          paidAt: { gte: start, lt: end },
        },
        select: { total: true },
      });
      months.push({
        key: start.toISOString().slice(0, 7),
        label: idMonthLabel(start),
        total: payments.reduce((sum, item) => sum + item.total, 0),
        payments: payments.length,
      });
    }

    const currentYear = now.getFullYear();
    const years: FinanceReportBucket[] = [];
    for (let year = currentYear - 4; year <= currentYear; year += 1) {
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year + 1, 0, 1, 0, 0, 0, 0);
      const payments = await this.db.payment.findMany({
        where: {
          status: 'paid',
          paidAt: { gte: start, lt: end },
        },
        select: { total: true },
      });
      years.push({
        key: String(year),
        label: String(year),
        total: payments.reduce((sum, item) => sum + item.total, 0),
        payments: payments.length,
      });
    }

    const planAgg = await this.db.payment.groupBy({
      by: ['planId'],
      where: { status: 'paid' },
      _sum: { total: true },
      _count: { _all: true },
    });

    const byPlan = planAgg
      .map((row) => ({
        planId: row.planId,
        planName: planNameOf(row.planId),
        total: row._sum.total ?? 0,
        payments: row._count._all,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      currency: 'IDR',
      months,
      years,
      byPlan,
      thisMonthTotal: months[months.length - 1]?.total ?? 0,
      thisYearTotal: years[years.length - 1]?.total ?? 0,
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
}
