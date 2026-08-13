import type { Prisma, PrismaClient, Scan, ScanHistory } from '@prisma/client';
import type { AiPrediction } from '../../../shared/services/ai-client.js';

export interface CreateScanData {
  userId: string;
  imagePath: string | null;
  prediction: AiPrediction;
  guestName?: string | null;
  channel?: 'referral' | 'qr';
  trainingConsent?: boolean;
}

export interface LeadProductMatch {
  productId: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  matchScore: number;
  explanations: string[];
}

export interface LeadRecord {
  id: string;
  scanId: string;
  summary: string;
  createdAt: Date;
  scan: {
    id: string;
    skinTone: string;
    undertone: string;
    faceShape: string;
    confidence: number;
    guestName: string | null;
    createdAt: Date;
    recommendation: {
      products: Array<{
        matchScore: number;
        explanations: string[];
        product: {
          id: string;
          name: string;
          brand: string;
          category: string;
          imageUrl: string | null;
        };
      }>;
    } | null;
  };
}

export interface LeadListFilter {
  q?: string;
  page?: number;
  limit?: number;
}

export interface ScanHistoryItem {
  id: string;
  scanId: string;
  summary: string;
  createdAt: Date;
  scan: {
    id: string;
    skinTone: string;
    undertone: string;
    faceShape: string;
    confidence: number;
    createdAt: Date;
  };
}

export interface PublicScanProduct {
  matchScore: number;
  explanations: string[];
  product: {
    id: string;
    brand: string;
    name: string;
    category: string;
    subcategory: string | null;
    imageUrl: string | null;
    description: string;
    affiliateUrl: string | null;
    sourceUrl: string | null;
  };
}

export interface PublicScanRecord {
  id: string;
  userId: string;
  skinTone: string;
  undertone: string;
  faceShape: string;
  confidence: number;
  skinType: string | null;
  concerns: string[];
  guestName: string | null;
  recommendation: {
    id: string;
    ingredients: Array<{
      ingredient: { id: string; name: string; slug: string };
    }>;
    products: PublicScanProduct[];
  } | null;
}

export interface IScanRepository {
  create(data: CreateScanData): Promise<Scan>;
  findByIdForUser(scanId: string, userId: string): Promise<Scan | null>;
  findPublicById(scanId: string): Promise<PublicScanRecord | null>;
}

export interface IHistoryRepository {
  create(data: { userId: string; scanId: string; summary: string }): Promise<ScanHistory>;
  listByUserId(userId: string, limit?: number): Promise<ScanHistoryItem[]>;
  listLeads(userId: string, filter?: LeadListFilter): Promise<{ rows: LeadRecord[]; total: number }>;
  findLeadByScanId(userId: string, scanId: string): Promise<LeadRecord | null>;
}

export class ScanRepository implements IScanRepository {
  constructor(private readonly db: PrismaClient) {}

  create(data: CreateScanData): Promise<Scan> {
    return this.db.scan.create({
      data: {
        userId: data.userId,
        imagePath: data.imagePath,
        guestName: data.guestName ?? null,
        channel: data.channel ?? 'referral',
        trainingConsent: data.trainingConsent ?? false,
        skinTone: data.prediction.skin_tone,
        undertone: data.prediction.undertone,
        faceShape: data.prediction.face_shape,
        confidence: data.prediction.confidence,
        skinType: data.prediction.skin_type ?? null,
        concerns: data.prediction.concerns ?? [],
        acne: data.prediction.acne ?? 0,
        oiliness: data.prediction.oiliness ?? 0,
        redness: data.prediction.redness ?? 0,
        modelVersion: data.prediction.model_version ?? null,
        rawAiResponse: data.prediction as unknown as Prisma.InputJsonValue,
      },
    });
  }

  findByIdForUser(scanId: string, userId: string): Promise<Scan | null> {
    return this.db.scan.findFirst({ where: { id: scanId, userId } });
  }

  async findPublicById(scanId: string): Promise<PublicScanRecord | null> {
    const row = await this.db.scan.findUnique({
      where: { id: scanId },
      select: {
        id: true,
        userId: true,
        skinTone: true,
        undertone: true,
        faceShape: true,
        confidence: true,
        skinType: true,
        concerns: true,
        guestName: true,
        recommendation: {
          select: {
            id: true,
            ingredients: {
              select: {
                ingredient: { select: { id: true, name: true, slug: true } },
              },
            },
            products: {
              orderBy: { matchScore: 'desc' },
              select: {
                matchScore: true,
                explanations: true,
                product: {
                  select: {
                    id: true,
                    brand: true,
                    name: true,
                    category: true,
                    subcategory: true,
                    imageUrl: true,
                    description: true,
                    affiliateUrl: true,
                    sourceUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return row;
  }
}

export class HistoryRepository implements IHistoryRepository {
  constructor(private readonly db: PrismaClient) {}

  create(data: { userId: string; scanId: string; summary: string }): Promise<ScanHistory> {
    return this.db.scanHistory.create({ data });
  }

  listByUserId(userId: string, limit = 50): Promise<ScanHistoryItem[]> {
    return this.db.scanHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        scan: {
          select: {
            id: true,
            skinTone: true,
            undertone: true,
            faceShape: true,
            confidence: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async listLeads(
    userId: string,
    filter: LeadListFilter = {},
  ): Promise<{ rows: LeadRecord[]; total: number }> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const q = filter.q?.trim();
    const where: Prisma.ScanHistoryWhereInput = {
      userId,
      ...(q
        ? {
            OR: [
              { summary: { contains: q, mode: 'insensitive' } },
              { scan: { guestName: { contains: q, mode: 'insensitive' } } },
              { scan: { skinTone: { contains: q, mode: 'insensitive' } } },
              { scan: { undertone: { contains: q, mode: 'insensitive' } } },
              { scan: { faceShape: { contains: q, mode: 'insensitive' } } },
              {
                scan: {
                  recommendation: {
                    products: {
                      some: {
                        product: { name: { contains: q, mode: 'insensitive' } },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.db.scanHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: leadInclude,
      }),
      this.db.scanHistory.count({ where }),
    ]);

    return { rows: rows as LeadRecord[], total };
  }

  async findLeadByScanId(userId: string, scanId: string): Promise<LeadRecord | null> {
    const row = await this.db.scanHistory.findFirst({
      where: { userId, scanId },
      include: leadInclude,
    });
    return (row as LeadRecord | null) ?? null;
  }
}

const leadInclude = {
  scan: {
    include: {
      recommendation: {
        include: {
          products: {
            orderBy: { matchScore: 'desc' as const },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  category: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
