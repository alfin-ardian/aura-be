import type { Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import { ROLES } from '../../../constants/index.js';
import type { AnalyticsService } from '../services/analytics.service.js';
import type { AnalyticsQuery } from '../validators/analytics.validator.js';

function resolveScopeUserId(req: Request, affiliatorId?: string): string {
  if (!req.user) throw new UnauthorizedError();
  if (affiliatorId && affiliatorId !== req.user.id) {
    if (req.user.role !== ROLES.SUPER_ADMIN) {
      throw new ForbiddenError('Only SUPER_ADMIN can view another affiliator analytics');
    }
    return affiliatorId;
  }
  return req.user.id;
}

export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const query = req.query as unknown as AnalyticsQuery;
    const scopeUserId = resolveScopeUserId(req, query.affiliatorId);
    const data = await this.analyticsService.getDashboard(scopeUserId, query.range);
    sendSuccess(res, data);
  };

  getOverview = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const affiliatorId =
      typeof req.query.affiliatorId === 'string' ? req.query.affiliatorId : undefined;
    const scopeUserId = resolveScopeUserId(req, affiliatorId);
    const data = await this.analyticsService.getOverview(scopeUserId);
    sendSuccess(res, data);
  };

  getPlatformOverview = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const data = await this.analyticsService.getPlatformOverview();
    sendSuccess(res, data);
  };
}
