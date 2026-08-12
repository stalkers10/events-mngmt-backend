import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, resolveClientId } from '../middlewares/auth.middleware';
import { RoleType } from '../types/auth';
import { BuildingsService } from '../services/buildings.service';

const router = Router();

// Both SUPER_ADMIN and CLIENT_ADMIN can manage buildings
router.use(requireAuth, requireRole(RoleType.SUPER_ADMIN, RoleType.CLIENT_ADMIN));

const createSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
});

/** GET /buildings — SUPER_ADMIN sees all; CLIENT_ADMIN sees only theirs */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userRole = req.user!.role as RoleType;
    const clientId = resolveClientId(req.user!);
    const buildings = await BuildingsService.list(userRole, clientId);
    res.json(buildings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

/** POST /buildings — creates building owned by the authenticated client */
router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const userRole = req.user!.role as RoleType;
    const clientId = resolveClientId(req.user!);
    const building = await BuildingsService.create(parsed.data.name, parsed.data.address, userRole, clientId);
    res.status(201).json(building);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create building' });
  }
});

/** DELETE /buildings/:id — only the owning client (or SUPER_ADMIN) can delete */
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userRole = req.user!.role as RoleType;
    const clientId = resolveClientId(req.user!);
    await BuildingsService.delete(req.params.id, userRole, clientId);
    res.status(204).send();
  } catch (err) {
    res.status((err as any).statusCode ?? 500).json({ error: (err as Error).message });
  }
});

export default router;