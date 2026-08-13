import type { Request, Response } from 'express';
import { z } from 'zod';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../shared/errors/app-error.js';
import { sendCreated, sendSuccess } from '../../../shared/utils/api-response.js';
import type { IUserRepository } from '../../user/interfaces/user.repository.interface.js';
import type { LeadService } from '../services/lead.service.js';
import type { ScanService } from '../services/scan.service.js';

export const leadQuerySchema = z.object({
  q: z.string().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class ScanController {
  constructor(
    private readonly scanService: ScanService,
    private readonly userRepository?: IUserRepository,
    private readonly leadService?: LeadService,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const result = await this.scanService.performScan(req.user.id, req.file);
    sendCreated(res, result);
  };

  /**
   * Guest / follower scan — no JWT.
   * Body fields (multipart): image, affiliatorId (required), guestName (optional).
   */
  createPublic = async (req: Request, res: Response): Promise<void> => {
    const affiliatorId = String(req.body?.affiliatorId ?? '').trim();
    if (!affiliatorId) {
      throw new ValidationError('affiliatorId is required');
    }
    if (!this.userRepository) {
      throw new ValidationError('Public scan is not configured');
    }

    const affiliator = await this.userRepository.findById(affiliatorId);
    if (!affiliator || !affiliator.isActive || affiliator.role !== 'AFFILIATOR') {
      throw new NotFoundError('Affiliator not found');
    }

    const guestName = String(req.body?.guestName ?? '').trim() || undefined;
    const rawChannel = String(req.body?.channel ?? req.query?.channel ?? 'referral').trim().toLowerCase();
    const channel = rawChannel === 'qr' ? 'qr' : 'referral';
    const rawConsent = String(req.body?.trainingConsent ?? '').trim().toLowerCase();
    const trainingConsent =
      rawConsent === 'true' || rawConsent === '1' || rawConsent === 'on' || rawConsent === 'yes';
    const result = await this.scanService.performPublicScan(affiliator.id, req.file, {
      guestName,
      channel,
      trainingConsent,
    });
    sendCreated(res, result);
  };

  getPublic = async (req: Request, res: Response): Promise<void> => {
    const scanId = String(req.params.id);
    const affiliatorId =
      typeof req.query.affiliatorId === 'string' ? req.query.affiliatorId : undefined;
    const data = await this.scanService.getPublicResult(scanId, affiliatorId);
    sendSuccess(res, data);
  };

  listLeads = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    if (!this.leadService) throw new ValidationError('Leads are not configured');
    const parsed = leadQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters');
    }
    const data = await this.leadService.list(req.user.id, parsed.data);
    sendSuccess(res, data);
  };

  getLead = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    if (!this.leadService) throw new ValidationError('Leads are not configured');
    const data = await this.leadService.getByScanId(req.user.id, String(req.params.id));
    sendSuccess(res, data);
  };
}
