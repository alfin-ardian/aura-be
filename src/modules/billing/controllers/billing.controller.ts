import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/app-error.js';
import { sendSuccess } from '../../../shared/utils/api-response.js';
import type { BillingService } from '../services/billing.service.js';

export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  getBilling = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const data = await this.billingService.getBilling(req.user.id);
    sendSuccess(res, data);
  };

  getSpending = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const data = await this.billingService.getSpending(req.user.id);
    sendSuccess(res, data);
  };

  listInvoices = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const data = await this.billingService.listInvoices(req.user.id);
    sendSuccess(res, data);
  };

  getInvoice = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const invoiceNumber = String(req.params.invoiceNumber ?? '');
    const data = await this.billingService.getInvoice(req.user.id, invoiceNumber);
    sendSuccess(res, data);
  };

  getPlatformFinance = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const data = await this.billingService.getPlatformFinance();
    sendSuccess(res, data);
  };

  getPlatformFinanceReport = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new UnauthorizedError();
    const data = await this.billingService.getPlatformFinanceReport();
    sendSuccess(res, data);
  };
}
