import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PUBLIC_SUBSCRIPTION_PLANS } from '../config/subscriptionPlans';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { SubscriptionsService } from '../services/subscriptions.service';
import { RoleType } from '../types/auth';

const router = Router();

/** Public plan catalogue. Paid prices intentionally remain null until approved. */
router.get('/plans', (_req: Request, res: Response) => {
  res.json(PUBLIC_SUBSCRIPTION_PLANS);
});

router.use(requireAuth, requireRole(RoleType.CLIENT_ADMIN));

router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const subscription = await SubscriptionsService.getForClient(req.user!.clientId!);
    res.json(subscription);
  } catch (error) { 
    console.error('Failed to fetch subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

router.get('/usage', async (req: Request, res: Response) => {
  try {
    const usage = await SubscriptionsService.getUsageForClient(req.user!.clientId!);
    res.json(usage);
  } catch (error) {
    console.error('Failed to fetch subscription usage:', error);
    res.status(500).json({ error: 'Failed to fetch subscription usage' });
  }
});

router.post('/cancel', async (req: Request, res: Response) => {
  try {
    res.json(await SubscriptionsService.cancelAtPeriodEnd(req.user!.clientId!));
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ error: error.message });
  }
});

router.post('/resume', async (req: Request, res: Response) => {
  try {
    res.json(await SubscriptionsService.resumeRenewal(req.user!.clientId!));
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ error: error.message });
  }
});

/**
 * Super Admin only: inspect and manage a specific client's subscription.
 * Each route carries its own guard so these never collide with the
 * CLIENT_ADMIN-guarded routes above.
 */
export const adminSubscriptionRouter = Router();

adminSubscriptionRouter.get('/admin/subscription', requireAuth, requireRole(RoleType.SUPER_ADMIN), async (req: Request, res: Response) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : '';
  if (!clientId) {
    res.status(400).json({ error: 'clientId query parameter is required' });
    return;
  }
  try {
    res.json(await SubscriptionsService.getForClient(clientId));
  } catch (error) {
    console.error('Failed to fetch client subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

adminSubscriptionRouter.get('/admin/usage', requireAuth, requireRole(RoleType.SUPER_ADMIN), async (req: Request, res: Response) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : '';
  if (!clientId) {
    res.status(400).json({ error: 'clientId query parameter is required' });
    return;
  }
  try {
    res.json(await SubscriptionsService.getUsageForClient(clientId));
  } catch (error) {
    console.error('Failed to fetch client usage:', error);
    res.status(500).json({ error: 'Failed to fetch subscription usage' });
  }
});

const adminCancelSchema = z.object({ clientId: z.string().min(1) });
adminSubscriptionRouter.post('/admin/cancel', requireAuth, requireRole(RoleType.SUPER_ADMIN), async (req: Request, res: Response) => {
  const parsed = adminCancelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'clientId is required' });
    return;
  }
  try {
    res.json(await SubscriptionsService.cancelAtPeriodEnd(parsed.data.clientId));
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ error: error.message });
  }
});

const adminResumeSchema = z.object({ clientId: z.string().min(1) });
adminSubscriptionRouter.post('/admin/resume', requireAuth, requireRole(RoleType.SUPER_ADMIN), async (req: Request, res: Response) => {
  const parsed = adminResumeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'clientId is required' });
    return;
  }
  try {
    res.json(await SubscriptionsService.resumeRenewal(parsed.data.clientId));
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ error: error.message });
  }
});

const adminGrantSchema = z.object({
  clientId: z.string().min(1),
  planCode: z.enum(['FREE', 'GO', 'PRO']),
  status: z.enum(['FREE', 'ACTIVE', 'CANCEL_AT_PERIOD_END', 'PAST_DUE', 'EXPIRED', 'PENDING_PAYMENT']).optional(),
  periodMonths: z.number().int().min(1).max(600).optional(),
});
adminSubscriptionRouter.post('/admin/grant', requireAuth, requireRole(RoleType.SUPER_ADMIN), async (req: Request, res: Response) => {
  const parsed = adminGrantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    res.json(
      await SubscriptionsService.grantOrUpdate(parsed.data.clientId, parsed.data.planCode, {
        status: parsed.data.status,
        periodMonths: parsed.data.periodMonths,
      }),
    );
  } catch (error: any) {
    res.status(error.statusCode ?? 500).json({ error: error.message });
  }
});

export default router;
