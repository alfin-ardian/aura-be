import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendCreated, sendSuccess } from '../../../shared/utils/api-response.js';
import type { UsageService } from '../services/usage.service.js';
import type { CheckoutInput } from '../validators/usage.validator.js';

export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  getUsage = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const data = await this.usageService.getUsage(req.user.id);
    sendSuccess(res, data);
  };

  checkout = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const data = await this.usageService.checkout(req.user.id, req.body as CheckoutInput);
    sendCreated(res, data);
  };
}
