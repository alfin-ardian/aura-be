import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/api-response.js';
import type { AffiliatorService } from '../services/affiliator.service.js';
import type {
  CreateAffiliatorInput,
  UpdateAffiliatorInput,
} from '../validators/affiliator.validator.js';

export class AffiliatorController {
  constructor(private readonly affiliatorService: AffiliatorService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const rows = await this.affiliatorService.list();
    sendSuccess(res, rows, 200, { count: rows.length });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const row = await this.affiliatorService.getById(String(req.params.id));
    sendSuccess(res, row);
  };

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const data = await this.affiliatorService.getDashboard(String(req.params.id));
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const row = await this.affiliatorService.create(req.body as CreateAffiliatorInput);
    sendCreated(res, row);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const row = await this.affiliatorService.update(
      String(req.params.id),
      req.body as UpdateAffiliatorInput,
    );
    sendSuccess(res, row);
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.affiliatorService.remove(String(req.params.id));
    sendSuccess(res, { message: 'Affiliator deactivated' });
  };
}
