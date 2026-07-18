import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { GateStaffService } from '../services/gateStaff.service';

const router = Router();

const createSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  eventIds: z.array(z.string().uuid()).optional(),
});

// All Gate Staff management routes are Admin-only.
router.use(requireAuth, requireRole(RoleType.ADMIN));

router.get('/', async (_req: Request, res: Response) => {
  const staff = await GateStaffService.list();
  res.json(staff);
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const user = await GateStaffService.create(
      parsed.data.username,
      parsed.data.password,
      parsed.data.eventIds ?? []
    );
    res.status(201).json(user);
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  await GateStaffService.deactivate(req.params.id);
  res.status(204).send();
});

router.post('/:id/reactivate', async (req: Request<{ id: string }>, res: Response) => {
  await GateStaffService.reactivate(req.params.id);
  res.status(204).send();
});
 
router.post(
  '/:id/assignments/:eventId',
  async (req: Request<{ id: string; eventId: string }>, res: Response) => {
    await GateStaffService.assignToEvent(req.params.id, req.params.eventId);
    res.status(204).send();
  }
);

export default router;
