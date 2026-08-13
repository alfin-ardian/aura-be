import type { PrismaClient } from '@prisma/client';
import { parseGuestName } from '../../scan/utils/guest-name.js';

export type AnalyticsRange = '7d' | '30d' | '90d';

export interface AnalyticsDto {
  range: AnalyticsRange;
  periodStart: string;
  periodEnd: string;
  summary: {
    totalScans: number;
    totalMatches: number;
    scansWithMatches: number;
    matchRate: number;
    scansTrend: number;
    matchesTrend: number;
    matchRateTrend: number;
  };
  trends: Array<{ label: string; scans: number; matches: number }>;
  undertones: Array<{ name: string; count: number; percentage: number; color: string }>;
  skinTones: Array<{ name: string; count: number; percentage: number }>;
  categories: Array<{ name: string; count: number; percentage: number; color: string }>;
  products: Array<{
    productId: string;
    name: string;
    brand: string;
    category: string;
    imageUrl: string | null;
    matches: number;
    topPickCount: number;
  }>;
}

const UNDERTONE_COLORS: Record<string, string> = {
  Warm: '#F59E0B',
  Cool: '#3B82F6',
  Neutral: '#EC4899',
  Olive: '#10B981',
};

const CATEGORY_COLORS = ['#F26CA7', '#0F0F11', '#A78BFA', '#34D399', '#FBBF24', '#60A5FA'];

function rangeToDays(range: AnalyticsRange): number {
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  return 90;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function percentOf(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function buildTrendLabels(range: AnalyticsRange, periodStart: Date, periodEnd: Date): string[] {
  if (range === '7d') {
    const labels: string[] = [];
    const cursor = new Date(periodStart);
    while (cursor <= periodEnd) {
      labels.push(cursor.toLocaleDateString('en-US', { weekday: 'short' }));
      cursor.setDate(cursor.getDate() + 1);
    }
    return labels;
  }
  if (range === '30d') {
    return ['W1', 'W2', 'W3', 'W4', 'W5'];
  }
  // 90d → last ~3 months labels from period
  const labels: string[] = [];
  const cursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
  while (cursor <= periodEnd) {
    labels.push(cursor.toLocaleDateString('en-US', { month: 'short' }));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return labels;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
}

function trendBucketFor(date: Date, range: AnalyticsRange, periodStart: Date): string {
  if (range === '7d') {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  if (range === '30d') {
    const diffDays = Math.floor(
      (startOfDay(date).getTime() - startOfDay(periodStart).getTime()) / (24 * 60 * 60 * 1000),
    );
    const week = Math.min(4, Math.max(0, Math.floor(diffDays / 7))) + 1;
    return `W${week}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export class AnalyticsService {
  constructor(private readonly db: PrismaClient) {}

  async getDashboard(affiliatorId: string, range: AnalyticsRange): Promise<AnalyticsDto> {
    const days = rangeToDays(range);
    const periodEnd = new Date();
    const periodStart = startOfDay(new Date(periodEnd.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
    const prevEnd = new Date(periodStart.getTime() - 1);
    const prevStart = startOfDay(new Date(prevEnd.getTime() - (days - 1) * 24 * 60 * 60 * 1000));

    const [currentScans, previousScans] = await Promise.all([
      this.db.scan.findMany({
        where: {
          userId: affiliatorId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: {
          id: true,
          undertone: true,
          skinTone: true,
          createdAt: true,
          recommendation: {
            select: {
              products: {
                select: {
                  matchScore: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      brand: true,
                      category: true,
                      subcategory: true,
                      imageUrl: true,
                    },
                  },
                },
                orderBy: { matchScore: 'desc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.db.scan.findMany({
        where: {
          userId: affiliatorId,
          createdAt: { gte: prevStart, lte: prevEnd },
        },
        select: {
          id: true,
          recommendation: {
            select: {
              products: { select: { productId: true } },
            },
          },
        },
      }),
    ]);

    const totalScans = currentScans.length;
    let totalMatches = 0;
    let scansWithMatches = 0;
    const undertoneCounts = new Map<string, number>();
    const skinToneCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    const productStats = new Map<
      string,
      {
        productId: string;
        name: string;
        brand: string;
        category: string;
        imageUrl: string | null;
        matches: number;
        topPickCount: number;
      }
    >();

    const trendScan = new Map<string, number>();
    const trendMatch = new Map<string, number>();
    const labels = buildTrendLabels(range, periodStart, periodEnd);
    for (const label of labels) {
      trendScan.set(label, 0);
      trendMatch.set(label, 0);
    }

    for (const scan of currentScans) {
      const label = trendBucketFor(scan.createdAt, range, periodStart);
      if (trendScan.has(label)) {
        trendScan.set(label, (trendScan.get(label) || 0) + 1);
      }

      undertoneCounts.set(scan.undertone, (undertoneCounts.get(scan.undertone) || 0) + 1);
      skinToneCounts.set(scan.skinTone, (skinToneCounts.get(scan.skinTone) || 0) + 1);

      const products = scan.recommendation?.products ?? [];
      if (products.length > 0) {
        scansWithMatches += 1;
        totalMatches += products.length;
        if (trendMatch.has(label)) {
          trendMatch.set(label, (trendMatch.get(label) || 0) + products.length);
        }

        products.forEach((row, index) => {
          const p = row.product;
          const cat = p.subcategory || p.category || 'Other';
          categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);

          const existing = productStats.get(p.id) || {
            productId: p.id,
            name: p.name,
            brand: p.brand,
            category: cat,
            imageUrl: p.imageUrl,
            matches: 0,
            topPickCount: 0,
          };
          existing.matches += 1;
          if (index === 0) existing.topPickCount += 1;
          productStats.set(p.id, existing);
        });
      }
    }

    let prevMatches = 0;
    let prevScansWithMatches = 0;
    for (const scan of previousScans) {
      const n = scan.recommendation?.products.length ?? 0;
      if (n > 0) {
        prevScansWithMatches += 1;
        prevMatches += n;
      }
    }

    const matchRate = percentOf(scansWithMatches, totalScans);
    const prevMatchRate = percentOf(prevScansWithMatches, previousScans.length);

    const undertones = [...undertoneCounts.entries()]
      .map(([name, count]) => ({
        name,
        count,
        percentage: percentOf(count, totalScans),
        color: UNDERTONE_COLORS[name] || '#A1A1AA',
      }))
      .sort((a, b) => b.count - a.count);

    const skinTones = [...skinToneCounts.entries()]
      .map(([name, count]) => ({
        name,
        count,
        percentage: percentOf(count, totalScans),
      }))
      .sort((a, b) => b.count - a.count);

    const categoryTotal = [...categoryCounts.values()].reduce((a, b) => a + b, 0);
    const categories = [...categoryCounts.entries()]
      .map(([name, count], i) => ({
        name,
        count,
        percentage: percentOf(count, categoryTotal),
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const products = [...productStats.values()]
      .sort((a, b) => b.matches - a.matches || b.topPickCount - a.topPickCount)
      .slice(0, 20);

    return {
      range,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      summary: {
        totalScans,
        totalMatches,
        scansWithMatches,
        matchRate,
        scansTrend: pctChange(totalScans, previousScans.length),
        matchesTrend: pctChange(totalMatches, prevMatches),
        matchRateTrend: Math.round((matchRate - prevMatchRate) * 10) / 10,
      },
      trends: labels.map((label) => ({
        label,
        scans: trendScan.get(label) || 0,
        matches: trendMatch.get(label) || 0,
      })),
      undertones,
      skinTones,
      categories,
      products,
    };
  }

  /**
   * Home dashboard payload for affiliator Overview page.
   * Month-to-date KPIs + recent leads + top products + funnel + usage.
   * Estimated revenue is intentionally omitted (not tracked).
   */
  async getOverview(affiliatorId: string): Promise<OverviewDto> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const resetsInDays = Math.max(
      1,
      Math.ceil((nextMonth.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );

    const weekStart = startOfWeekMonday(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [monthStats, weekScans, recentHistories, monthScanCount, subscription] = await Promise.all([
      this.getDashboard(affiliatorId, '30d'),
      this.db.scan.findMany({
        where: {
          userId: affiliatorId,
          createdAt: { gte: weekStart, lte: weekEnd },
        },
        select: {
          createdAt: true,
          recommendation: {
            select: { products: { select: { productId: true } } },
          },
        },
      }),
      this.db.scanHistory.findMany({
        where: { userId: affiliatorId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          scan: {
            select: {
              id: true,
              guestName: true,
              skinTone: true,
              undertone: true,
              faceShape: true,
              confidence: true,
              imagePath: true,
              createdAt: true,
              recommendation: {
                select: {
                  products: {
                    orderBy: { matchScore: 'desc' },
                    take: 5,
                    select: {
                      product: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.db.scan.count({
        where: {
          userId: affiliatorId,
          createdAt: { gte: monthStart, lte: now },
        },
      }),
      this.db.subscription.findFirst({
        where: { userId: affiliatorId, isActive: true, periodEnd: { gt: now } },
        orderBy: { periodEnd: 'desc' },
      }),
    ]);

    const recentLeads: OverviewLeadDto[] = recentHistories.map((row) => {
      const followerName = parseGuestName(row.summary, row.scan.guestName);
      const topProduct = row.scan.recommendation?.products[0]?.product.name || '—';

      return {
        id: row.id,
        scanId: row.scanId,
        followerName,
        scanDate: row.createdAt.toISOString(),
        selfieUrl: null,
        detectedSkinTone: row.scan.skinTone,
        detectedUndertone: row.scan.undertone,
        faceShape: row.scan.faceShape,
        topMatchedProduct: topProduct,
        matchedProductCount: row.scan.recommendation?.products.length ?? 0,
        clickedAffiliate: false,
      };
    });

    const { summary, products } = monthStats;
    const scanRateBase = summary.totalScans || 1;
    const matchFunnelPct = percentOf(summary.scansWithMatches, summary.totalScans);
    const topPickTotal = products.reduce((sum, p) => sum + p.topPickCount, 0);
    const topPickFunnelPct = percentOf(topPickTotal, summary.totalScans);
    const quota = subscription?.quota ?? 0;
    const used = monthScanCount;

    const weekScan = new Map<string, number>();
    const weekMatch = new Map<string, number>();
    for (const label of WEEKDAY_LABELS) {
      weekScan.set(label, 0);
      weekMatch.set(label, 0);
    }
    for (const scan of weekScans) {
      const label = scan.createdAt.toLocaleDateString('en-US', { weekday: 'short' });
      if (!weekScan.has(label)) continue;
      weekScan.set(label, (weekScan.get(label) || 0) + 1);
      const productCount = scan.recommendation?.products.length ?? 0;
      if (productCount > 0) {
        weekMatch.set(label, (weekMatch.get(label) || 0) + productCount);
      }
    }

    return {
      affiliatorId,
      period: '30d',
      summary: {
        totalScans: summary.totalScans,
        totalMatches: summary.totalMatches,
        scansWithMatches: summary.scansWithMatches,
        matchRate: summary.matchRate,
        scansTrend: summary.scansTrend,
        matchesTrend: summary.matchesTrend,
        matchRateTrend: summary.matchRateTrend,
      },
      weekTrends: WEEKDAY_LABELS.map((label) => ({
        label,
        scans: weekScan.get(label) || 0,
        matches: weekMatch.get(label) || 0,
      })),
      recentLeads,
      topProducts: products.slice(0, 5).map((p) => ({
        productId: p.productId,
        name: p.name,
        brand: p.brand,
        category: p.category,
        imageUrl: p.imageUrl,
        matches: p.matches,
        topPickCount: p.topPickCount,
      })),
      funnel: {
        scans: summary.totalScans,
        scansWithMatches: summary.scansWithMatches,
        topPicks: topPickTotal,
        scanBarPct: 100,
        matchBarPct: matchFunnelPct,
        topPickBarPct: topPickFunnelPct,
        matchRate: matchFunnelPct,
        topPickRate: percentOf(topPickTotal, scanRateBase),
      },
      usage: {
        plan: subscription?.planName ?? 'Belum berlangganan',
        used,
        limit: quota,
        remaining: Math.max(0, quota - used),
        resetsInDays: subscription
          ? Math.max(
              1,
              Math.ceil((subscription.periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
            )
          : resetsInDays,
      },
    };
  }

  /** Super Admin home — platform-wide KPIs, weekly trend, recent affiliators. */
  async getPlatformOverview(): Promise<PlatformOverviewDto> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const weekStart = startOfWeekMonday(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [
      totalAffiliators,
      activeAffiliators,
      newThisMonth,
      totalScans,
      matchedScans,
      prevMonthScans,
      weekScans,
      recentUsers,
    ] = await Promise.all([
      this.db.user.count({ where: { role: 'AFFILIATOR' } }),
      this.db.user.count({ where: { role: 'AFFILIATOR', isActive: true } }),
      this.db.user.count({
        where: { role: 'AFFILIATOR', createdAt: { gte: monthStart } },
      }),
      this.db.scan.count(),
      this.db.scan.count({ where: { recommendation: { isNot: null } } }),
      this.db.scan.count({
        where: {
          createdAt: { gte: prevMonthStart, lt: monthStart },
        },
      }),
      this.db.scan.findMany({
        where: { createdAt: { gte: weekStart, lte: weekEnd } },
        select: {
          createdAt: true,
          recommendation: { select: { id: true } },
        },
      }),
      this.db.user.findMany({
        where: { role: 'AFFILIATOR' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          profile: { select: { name: true } },
          _count: { select: { scans: true } },
        },
      }),
    ]);

    const thisMonthScans = await this.db.scan.count({
      where: { createdAt: { gte: monthStart, lte: now } },
    });

    const weekTrends: Array<{ label: string; scans: number; matches: number }> = [];
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const key = startOfDay(day).toISOString().slice(0, 10);
      const dayScans = weekScans.filter(
        (scan) => startOfDay(scan.createdAt).toISOString().slice(0, 10) === key,
      );
      weekTrends.push({
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        scans: dayScans.length,
        matches: dayScans.filter((scan) => scan.recommendation).length,
      });
    }

    const matchRate =
      totalScans > 0 ? Math.round((matchedScans / totalScans) * 1000) / 10 : 0;
    const activeRate =
      totalAffiliators > 0
        ? Math.round((activeAffiliators / totalAffiliators) * 1000) / 10
        : 0;

    return {
      summary: {
        totalAffiliators,
        activeAffiliators,
        newAffiliatorsThisMonth: newThisMonth,
        activeRate,
        totalScans,
        matchedScans,
        matchRate,
        scansTrend: pctChange(thisMonthScans, prevMonthScans),
      },
      weekTrends,
      recentAffiliators: recentUsers.map((user) => ({
        id: user.id,
        name: user.profile?.name?.trim() || user.email.split('@')[0] || user.email,
        email: user.email,
        isActive: user.isActive,
        totalScans: user._count.scans,
        createdAt: user.createdAt.toISOString(),
      })),
    };
  }
}

export interface PlatformOverviewDto {
  summary: {
    totalAffiliators: number;
    activeAffiliators: number;
    newAffiliatorsThisMonth: number;
    activeRate: number;
    totalScans: number;
    matchedScans: number;
    matchRate: number;
    scansTrend: number;
  };
  weekTrends: Array<{ label: string; scans: number; matches: number }>;
  recentAffiliators: Array<{
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    totalScans: number;
    createdAt: string;
  }>;
}

export interface OverviewLeadDto {
  id: string;
  scanId: string;
  followerName: string;
  scanDate: string;
  selfieUrl: string | null;
  detectedSkinTone: string;
  detectedUndertone: string;
  faceShape: string;
  topMatchedProduct: string;
  matchedProductCount: number;
  clickedAffiliate: boolean;
}

export interface OverviewDto {
  affiliatorId: string;
  period: '30d';
  summary: AnalyticsDto['summary'];
  weekTrends: Array<{ label: string; scans: number; matches: number }>;
  recentLeads: OverviewLeadDto[];
  topProducts: Array<{
    productId: string;
    name: string;
    brand: string;
    category: string;
    imageUrl: string | null;
    matches: number;
    topPickCount: number;
  }>;
  funnel: {
    scans: number;
    scansWithMatches: number;
    topPicks: number;
    scanBarPct: number;
    matchBarPct: number;
    topPickBarPct: number;
    matchRate: number;
    topPickRate: number;
  };
  usage: {
    plan: string;
    used: number;
    limit: number;
    remaining: number;
    resetsInDays: number;
  };
}
