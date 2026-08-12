import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, resolveClientId } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { GateStaffService } from '../services/gateStaff.service';

const router = Router();

const createSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8),
  eventIds: z.array(z.string().uuid()).optional(),
});

// Gate Staff management routes are accessible by SUPER_ADMIN and CLIENT_ADMIN
router.use(requireAuth, requireRole(RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN));

router.get('/', async (req: Request, res: Response) => {
  const userRole = req.user!.role as RoleType;
  const clientId = resolveClientId(req.user!);
  const staff = await GateStaffService.list(userRole, clientId);
  res.json(staff);
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const userRole = req.user!.role as RoleType;
    const clientId = resolveClientId(req.user!);
    const user = await GateStaffService.create(
      parsed.data.username,
      parsed.data.password,
      parsed.data.eventIds ?? [],
      userRole,
      clientId
    );
    res.status(201).json(user);
  } catch (err) {
    res.status(409).json({ error: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userRole = req.user!.role as RoleType;
    const clientId = resolveClientId(req.user!);
    await GateStaffService.deactivate(req.params.id,userRole, clientId);
    res.status(204).send();
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});

router.post('/:id/reactivate', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userRole = req.user!.role as RoleType;
    const clientId = resolveClientId(req.user!);
    await GateStaffService.reactivate(req.params.id,userRole, clientId);
    res.status(204).send();
  } catch (err: any) {
    res.status(err.statusCode ?? 500).json({ error: err.message });
  }
});
 
// assign gate staff to an event
router.post(
  '/:id/assignments/:eventId',
  async (req: Request<{ id: string; eventId: string }>, res: Response) => {
    try {
      const userRole = req.user!.role as RoleType;
      const clientId = resolveClientId(req.user!);
      await GateStaffService.assignToEvent(req.params.id, req.params.eventId,userRole, clientId);
      res.status(204).send();
    } catch (err: any) {
      res.status(err.statusCode ?? 500).json({ error: err.message });
    }
  }
);

// remove gate staff from an event assignment
router.delete(
  '/:id/assignments/:eventId',
  async (req: Request<{ id: string; eventId: string }>, res: Response) => {
    try {
      const userRole = req.user!.role as RoleType;
      const clientId = resolveClientId(req.user!);
      await GateStaffService.removeFromEvent(req.params.id, req.params.eventId,userRole, clientId);
      res.status(204).send();
    } catch (err: any) {
      res.status(err.statusCode ?? 500).json({ error: err.message });
    }
  }
);

// delete gate staff user completely from the database (not just deactivate)
router.delete(
  '/:id/permanent',
  async (req: Request<{ id: string }>, res: Response) => {
    try {
      const userRole = req.user!.role as RoleType;
      const clientId = resolveClientId(req.user!);
      await GateStaffService.deletePermanently(req.params.id, userRole, clientId);
      res.status(204).send();
    } catch (err: any) {
      res.status(err.statusCode ?? 500).json({ error: err.message });
    }
  }
);
export default router;
