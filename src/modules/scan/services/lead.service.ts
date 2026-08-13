import { NotFoundError } from '../../../shared/errors/app-error.js';
import { analysisSummary, parseGuestName } from '../utils/guest-name.js';
import type { IHistoryRepository, LeadListFilter, LeadRecord } from '../repositories/scan.repository.js';

export interface ScanLeadProductDto {
  productId: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  matchScore: number;
  explanations: string[];
}

export interface ScanLeadDto {
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
  products: ScanLeadProductDto[];
  createdAt: string;
}

export interface ScanLeadListDto {
  items: ScanLeadDto[];
  page: number;
  limit: number;
  total: number;
}

export class LeadService {
  constructor(private readonly historyRepository: IHistoryRepository) {}

  async list(userId: string, filter: LeadListFilter): Promise<ScanLeadListDto> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const { rows, total } = await this.historyRepository.listLeads(userId, {
      ...filter,
      page,
      limit,
    });
    return {
      items: rows.map((row) => this.toDto(row)),
      page,
      limit,
      total,
    };
  }

  async getByScanId(userId: string, scanId: string): Promise<ScanLeadDto> {
    const row = await this.historyRepository.findLeadByScanId(userId, scanId);
    if (!row) {
      throw new NotFoundError('Scan lead not found');
    }
    return this.toDto(row);
  }

  private toDto(row: LeadRecord): ScanLeadDto {
    const products = (row.scan.recommendation?.products ?? []).map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      brand: item.product.brand,
      category: item.product.category,
      imageUrl: item.product.imageUrl,
      matchScore: item.matchScore,
      explanations: item.explanations,
    }));
    const analysis = {
      skinTone: row.scan.skinTone,
      undertone: row.scan.undertone,
      faceShape: row.scan.faceShape,
    };

    return {
      id: row.id,
      scanId: row.scanId,
      guestName: parseGuestName(row.summary, row.scan.guestName),
      summary: analysisSummary(analysis),
      skinTone: analysis.skinTone,
      undertone: analysis.undertone,
      faceShape: analysis.faceShape,
      confidence: row.scan.confidence,
      topProduct: products[0]?.name ?? null,
      matchedProductCount: products.length,
      products,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
