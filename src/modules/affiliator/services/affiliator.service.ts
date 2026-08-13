import type { PrismaClient } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import { hashPassword } from '../../../shared/utils/password.js';
import {
  getUsagePlan,
  startOfMonth,
  startOfNextMonth,
} from '../../usage/plans.js';
import type { IAffiliatorRepository } from '../interfaces/affiliator.repository.interface.js';
import type {
  CreateAffiliatorInput,
  UpdateAffiliatorInput,
} from '../validators/affiliator.validator.js';

export interface AffiliatorDashboardDto {
  account: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    name: string | null;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    totalScans: number;
    totalMatches: number;
    matchRate: number;
    productCount: number;
    revenueTotal: number;
    invoiceCount: number;
  };
  products: Array<{
    id: string;
    brand: string;
    name: string;
    category: string;
    subcategory: string | null;
    imageUrl: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
  leads: Array<{
    id: string;
    scanId: string;
    guestName: string;
    summary: string;
    skinTone: string;
    undertone: string;
    faceShape: string;
    confidence: number;
    topProduct: string | null;
    matchedProductCount: number;
    createdAt: string;
  }>;
  subscription: {
    planId: string;
    planName: string;
    priceIdr: number;
    quota: number;
    used: number;
    remaining: number;
    usagePercent: number;
    periodStart: string;
    periodEnd: string;
  } | null;
  invoices: Array<{
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
    quota: number | null;
    lines: Array<{
      description: string;
      quantity: number;
      unitAmount: number;
      amount: number;
    }>;
  }>;
  earnings: {
    total: number;
    months: Array<{
      key: string;
      label: string;
      total: number;
      payments: number;
    }>;
  };
}

function planNameOf(planId: string): string {
  return getUsagePlan(planId)?.name ?? planId;
}

function parseGuestName(summary: string, guestName: string | null): string {
  if (guestName?.trim()) return guestName.trim();
  const before = summary.split(':')[0]?.trim();
  return before || 'Guest';
}

export class AffiliatorService {
  constructor(
    private readonly affiliatorRepository: IAffiliatorRepository,
    private readonly db: PrismaClient,
  ) {}

  list() {
    return this.affiliatorRepository.list();
  }

  async getById(id: string) {
    const row = await this.affiliatorRepository.findById(id);
    if (!row) throw new NotFoundError('Affiliator not found');
    return row;
  }

  async getDashboard(id: string): Promise<AffiliatorDashboardDto> {
    const account = await this.affiliatorRepository.findById(id);
    if (!account) throw new NotFoundError('Affiliator not found');

    const now = new Date();

    const [products, histories, subscription, payments, totalScans, matchedScans] =
      await Promise.all([
        this.db.product.findMany({
          where: { ownerId: id },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            brand: true,
            name: true,
            category: true,
            subcategory: true,
            imageUrl: true,
            isActive: true,
            createdAt: true,
          },
        }),
        this.db.scanHistory.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            scan: {
              select: {
                guestName: true,
                skinTone: true,
                undertone: true,
                faceShape: true,
                confidence: true,
                recommendation: {
                  include: {
                    products: {
                      orderBy: { matchScore: 'desc' },
                      take: 1,
                      include: {
                        product: { select: { name: true } },
                      },
                    },
                    _count: { select: { products: true } },
                  },
                },
              },
            },
          },
        }),
        this.db.subscription.findFirst({
          where: { userId: id, isActive: true, periodEnd: { gt: now } },
          orderBy: { periodEnd: 'desc' },
        }),
        this.db.payment.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          include: {
            subscription: {
              select: {
                planName: true,
                periodStart: true,
                periodEnd: true,
                quota: true,
              },
            },
          },
        }),
        this.db.scan.count({ where: { userId: id } }),
        this.db.scan.count({
          where: { userId: id, recommendation: { isNot: null } },
        }),
      ]);

    let used = 0;
    if (subscription) {
      used = await this.db.scan.count({
        where: {
          userId: id,
          createdAt: {
            gte: subscription.periodStart,
            lt: subscription.periodEnd,
          },
        },
      });
    }

    const paidPayments = payments.filter((item) => item.status === 'paid');
    const revenueTotal = paidPayments.reduce((sum, item) => sum + item.total, 0);
    const matchRate =
      totalScans > 0 ? Math.round((matchedScans / totalScans) * 100) : 0;

    const monthStartCursor = startOfMonth(now);
    const months: AffiliatorDashboardDto['earnings']['months'] = [];
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
      const inMonth = paidPayments.filter((payment) => {
        const paidAt = payment.paidAt ?? payment.createdAt;
        return paidAt >= start && paidAt < end;
      });
      months.push({
        key: start.toISOString().slice(0, 7),
        label: start.toLocaleDateString('id-ID', {
          month: 'short',
          year: 'numeric',
        }),
        total: inMonth.reduce((sum, item) => sum + item.total, 0),
        payments: inMonth.length,
      });
    }

    const quota = subscription?.quota ?? 0;
    const remaining = Math.max(0, quota - used);
    const usagePercent =
      quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;

    return {
      account,
      summary: {
        totalScans,
        totalMatches: matchedScans,
        matchRate,
        productCount: products.length,
        revenueTotal,
        invoiceCount: paidPayments.length,
      },
      products: products.map((product) => ({
        id: product.id,
        brand: product.brand,
        name: product.name,
        category: product.category,
        subcategory: product.subcategory,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
      })),
      leads: histories.map((row) => {
        const top = row.scan.recommendation?.products[0]?.product.name ?? null;
        const matchedProductCount = row.scan.recommendation?._count.products ?? 0;
        return {
          id: row.id,
          scanId: row.scanId,
          guestName: parseGuestName(row.summary, row.scan.guestName),
          summary: row.summary,
          skinTone: row.scan.skinTone,
          undertone: row.scan.undertone,
          faceShape: row.scan.faceShape,
          confidence: row.scan.confidence,
          topProduct: top,
          matchedProductCount,
          createdAt: row.createdAt.toISOString(),
        };
      }),
      subscription: subscription
        ? {
            planId: subscription.planId,
            planName: subscription.planName,
            priceIdr: subscription.priceIdr,
            quota,
            used,
            remaining,
            usagePercent,
            periodStart: subscription.periodStart.toISOString(),
            periodEnd: subscription.periodEnd.toISOString(),
          }
        : null,
      invoices: payments.map((payment) => {
        const plan = getUsagePlan(payment.planId);
        const planName =
          payment.subscription.planName || planNameOf(payment.planId);
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
              description: `Paket ${planName}${
                plan ? ` · ${plan.scans.toLocaleString('id-ID')} scans` : ''
              }`,
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
      }),
      earnings: {
        total: revenueTotal,
        months,
      },
    };
  }

  async create(input: CreateAffiliatorInput) {
    const existing = await this.affiliatorRepository.findByEmail(input.email);
    if (existing) throw new ConflictError('Email is already registered');

    const passwordHash = await hashPassword(input.password);
    return this.affiliatorRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
      isActive: input.isActive,
    });
  }

  async update(id: string, input: UpdateAffiliatorInput) {
    const existing = await this.affiliatorRepository.findById(id);
    if (!existing) throw new NotFoundError('Affiliator not found');

    if (input.email && input.email !== existing.email) {
      const taken = await this.affiliatorRepository.findByEmail(input.email);
      if (taken) throw new ConflictError('Email is already registered');
    }

    const passwordHash = input.password ? await hashPassword(input.password) : undefined;
    return this.affiliatorRepository.update(id, {
      email: input.email,
      passwordHash,
      name: input.name,
      isActive: input.isActive,
    });
  }

  async remove(id: string) {
    const existing = await this.affiliatorRepository.findById(id);
    if (!existing) throw new NotFoundError('Affiliator not found');
    if (!existing.isActive) throw new NotFoundError('Affiliator not found');
    await this.affiliatorRepository.softDelete(id);
  }
}
